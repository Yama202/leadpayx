-- Regras operacionais de ciclo:
-- - Lote sempre por captador (não mistura captadores no mesmo lote).
-- - SLA de 1h para iniciar (assigned) e 1h para concluir (in_progress).
-- - Redistribuição automática com auditoria.

create or replace function public.assign_next_batch_to_operator(target_operator_id uuid, batch_size int default 2)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_role text;
  minimum_batch int;
  requested_batch int;
  selected_captador uuid;
  assigned_count int := 0;
  account_record record;
begin
  actor_role := public.current_user_role();

  if actor_role <> 'admin' and (actor_role <> 'operator' or target_operator_id <> auth.uid()) then
    raise exception 'assignment denied';
  end if;

  perform public.reassign_expired_operator_accounts();

  if not public.is_operator_eligible(target_operator_id) then
    raise exception 'operator not eligible';
  end if;

  minimum_batch := least(greatest(public.get_numeric_setting('operational_min_batch_size', 2)::int, 1), 2);
  requested_batch := greatest(least(batch_size, 2), minimum_batch);

  select candidate.captador_id
    into selected_captador
  from (
    select a.captador_id, min(a.created_at) as first_created_at, count(*) as pending_count
    from public.accounts a
    where a.status = 'pending'
    group by a.captador_id
    having count(*) >= minimum_batch
  ) as candidate
  order by candidate.first_created_at asc
  limit 1;

  if selected_captador is null then
    raise exception 'minimum operational batch not available';
  end if;

  for account_record in
    select id
    from public.accounts
    where status = 'pending'
      and captador_id = selected_captador
    order by created_at asc, id asc
    limit requested_batch
    for update skip locked
  loop
    update public.accounts
    set operador_id = target_operator_id,
        status = 'assigned',
        assigned_at = now(),
        operation_started_at = null,
        operation_deadline_at = now() + interval '1 hour',
        reassigned_at = null,
        reassign_reason = null
    where id = account_record.id;

    insert into public.operator_assignments(operador_id, account_id, status)
    values (target_operator_id, account_record.id, 'assigned')
    on conflict (account_id) do update
      set operador_id = excluded.operador_id,
          status = 'assigned';

    assigned_count := assigned_count + 1;
  end loop;

  if assigned_count > 0 then
    insert into public.audit_logs(action, entity_type, entity_id, metadata)
    values (
      'operator.batch_assigned',
      'profile',
      target_operator_id,
      jsonb_build_object(
        'count', assigned_count,
        'minimum_batch', minimum_batch,
        'captador_id', selected_captador
      )
    );
  end if;

  return assigned_count;
end;
$$;

create or replace function public.start_account(target_account_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  account_row public.accounts%rowtype;
  actor_role text;
  shared_deadline timestamptz := now() + interval '1 hour';
  minimum_batch int;
begin
  actor_role := public.current_user_role();

  select * into account_row
  from public.accounts
  where id = target_account_id
  for update;

  if account_row.id is null then
    return null;
  end if;

  if actor_role <> 'admin' and (actor_role <> 'operator' or account_row.operador_id <> auth.uid()) then
    raise exception 'start denied';
  end if;

  if account_row.status not in ('assigned', 'in_progress') then
    raise exception 'invalid account status for start';
  end if;

  if account_row.status = 'assigned'
    and account_row.operation_deadline_at is not null
    and account_row.operation_deadline_at < now() then
    perform public.reassign_account_due_to_sla(target_account_id, 'assigned_not_started_1h');
    raise exception 'account sla expired';
  end if;

  minimum_batch := least(greatest(public.get_numeric_setting('operational_min_batch_size', 2)::int, 1), 2);

  update public.accounts
  set status = 'in_progress',
      started_at = coalesce(started_at, now()),
      operation_started_at = coalesce(operation_started_at, now()),
      operation_deadline_at = shared_deadline
  where id in (
    select id
    from public.accounts
    where operador_id = account_row.operador_id
      and captador_id = account_row.captador_id
      and status = 'assigned'
    order by assigned_at asc, id asc
    limit minimum_batch
  );

  update public.operator_assignments
  set status = 'in_progress'
  where account_id in (
    select id
    from public.accounts
    where operador_id = account_row.operador_id
      and captador_id = account_row.captador_id
      and status = 'in_progress'
      and operation_deadline_at = shared_deadline
  );

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values (
    'account.operation_started',
    'account',
    target_account_id,
    jsonb_build_object(
      'operator_id', account_row.operador_id,
      'captador_id', account_row.captador_id,
      'operation_started_at', now(),
      'operation_deadline_at', shared_deadline,
      'minimum_batch', minimum_batch
    )
  );

  return target_account_id;
end;
$$;

create or replace function public.reassign_account_due_to_sla(target_account_id uuid, reason text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  account_row public.accounts%rowtype;
  next_operator uuid;
  is_expired boolean;
begin
  select * into account_row
  from public.accounts
  where id = target_account_id
  for update skip locked;

  if account_row.id is null or account_row.status not in ('assigned', 'in_progress') then
    return false;
  end if;

  is_expired := (
    account_row.status = 'assigned'
    and coalesce(account_row.operation_deadline_at, account_row.assigned_at + interval '1 hour') < now()
  ) or (
    account_row.status = 'in_progress'
    and coalesce(account_row.operation_deadline_at, account_row.operation_started_at + interval '1 hour') < now()
  );

  if not is_expired then
    return false;
  end if;

  next_operator := public.pick_balanced_operator(account_row.operador_id);

  if next_operator is null then
    update public.accounts
    set status = 'pending',
        last_operator_id = account_row.operador_id,
        operador_id = null,
        started_at = null,
        operation_started_at = null,
        operation_deadline_at = null,
        reassigned_at = now(),
        reassign_reason = reason,
        updated_at = now()
    where id = target_account_id;
  else
    update public.accounts
    set status = 'assigned',
        last_operator_id = account_row.operador_id,
        operador_id = next_operator,
        assigned_at = now(),
        started_at = null,
        operation_started_at = null,
        operation_deadline_at = now() + interval '1 hour',
        reassigned_at = now(),
        reassign_reason = reason,
        updated_at = now()
    where id = target_account_id;

    insert into public.operator_assignments(operador_id, account_id, status)
    values (next_operator, target_account_id, 'assigned')
    on conflict (account_id) do update
      set operador_id = excluded.operador_id,
          status = 'assigned';
  end if;

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values (
    'account.sla_reassigned',
    'account',
    target_account_id,
    jsonb_build_object(
      'reason', reason,
      'previous_operator_id', account_row.operador_id,
      'next_operator_id', next_operator,
      'previous_status', account_row.status,
      'previous_deadline_at', account_row.operation_deadline_at,
      'reassigned_at', now()
    )
  );

  return true;
end;
$$;

create or replace function public.reassign_expired_operator_accounts()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  expired_account record;
  reassigned_count int := 0;
  reason text;
begin
  for expired_account in
    select id, status
    from public.accounts
    where status in ('assigned', 'in_progress')
      and (
        (status = 'assigned' and coalesce(operation_deadline_at, assigned_at + interval '1 hour') < now())
        or
        (status = 'in_progress' and coalesce(operation_deadline_at, operation_started_at + interval '1 hour') < now())
      )
    order by operation_deadline_at asc nulls last, assigned_at asc
    for update skip locked
  loop
    reason := case
      when expired_account.status = 'assigned' then 'assigned_not_started_1h'
      else 'operation_deadline_1h'
    end;

    if public.reassign_account_due_to_sla(expired_account.id, reason) then
      reassigned_count := reassigned_count + 1;
    end if;
  end loop;

  return reassigned_count;
end;
$$;

grant execute on function public.assign_next_batch_to_operator(uuid, int) to authenticated;
grant execute on function public.start_account(uuid) to authenticated;
grant execute on function public.reassign_account_due_to_sla(uuid, text) to authenticated;
grant execute on function public.reassign_expired_operator_accounts() to authenticated;

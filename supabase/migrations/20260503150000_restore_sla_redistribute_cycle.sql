-- Restaura a redistribuição por SLA (20260430380000 deixou
-- `reassign_expired_operator_accounts` como no-op que só retorna 0).
--
-- Ciclo inteiro (mesmo operador + mesmo captador, status assigned/in_progress)
-- vai junto para outro operador (`pick_balanced_operator` exclui o atual) quando
-- qualquer conta do grupo ultrapassa o SLA.

create or replace function public.reassign_account_due_to_sla(target_account_id uuid, reason text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  seed public.accounts%rowtype;
  v_operador uuid;
  v_captador uuid;
  peek_status text;
  batch_has_expired boolean;
  next_operator uuid;
  r public.accounts%rowtype;
  prev_op uuid;
  prev_status text;
  prev_deadline timestamptz;
begin
  perform set_config('app.skip_account_row_protect', 'on', true);

  select operador_id, captador_id, status::text
  into v_operador, v_captador, peek_status
  from public.accounts
  where id = target_account_id;

  if peek_status is null or peek_status not in ('assigned', 'in_progress') then
    return false;
  end if;

  if v_operador is null then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtext('sla-batch:' || v_operador::text || ':' || coalesce(v_captador::text, 'null')));

  select *
  into seed
  from public.accounts
  where id = target_account_id
  for update;

  if seed.id is null or seed.status::text not in ('assigned', 'in_progress') then
    return false;
  end if;

  if seed.operador_id <> v_operador or seed.captador_id is distinct from v_captador then
    return false;
  end if;

  select coalesce(
    bool_or(
      (
        a.status = 'assigned'
        and coalesce(a.operation_deadline_at, a.assigned_at + interval '1 hour') < now()
      )
      or
      (
        a.status = 'in_progress'
        and coalesce(a.operation_deadline_at, a.operation_started_at + interval '1 hour') < now()
      )
    ),
    false
  )
  into batch_has_expired
  from public.accounts a
  where a.operador_id = v_operador
    and a.captador_id is not distinct from v_captador
    and a.status in ('assigned', 'in_progress');

  if not batch_has_expired then
    return false;
  end if;

  next_operator := public.pick_balanced_operator(v_operador);

  for r in
    select *
    from public.accounts a
    where a.operador_id = v_operador
      and a.captador_id is not distinct from v_captador
      and a.status in ('assigned', 'in_progress')
    order by a.id asc
    for update
  loop
    prev_op := r.operador_id;
    prev_status := r.status::text;
    prev_deadline := r.operation_deadline_at;

    if next_operator is null then
      update public.accounts
      set status = 'pending',
          last_operator_id = r.operador_id,
          operador_id = null,
          started_at = null,
          operation_started_at = null,
          operation_deadline_at = null,
          reassigned_at = now(),
          reassign_reason = reason,
          updated_at = now()
      where id = r.id;
    else
      update public.accounts
      set status = 'assigned',
          last_operator_id = r.operador_id,
          operador_id = next_operator,
          assigned_at = now(),
          started_at = null,
          operation_started_at = null,
          operation_deadline_at = now() + interval '1 hour',
          reassigned_at = now(),
          reassign_reason = reason,
          updated_at = now()
      where id = r.id;

      insert into public.operator_assignments(operador_id, account_id, status)
      values (next_operator, r.id, 'assigned')
      on conflict (account_id) do update
        set operador_id = excluded.operador_id,
            status = 'assigned';
    end if;

    insert into public.audit_logs(action, entity_type, entity_id, metadata)
    values (
      'account.sla_reassigned',
      'account',
      r.id,
      jsonb_build_object(
        'reason', reason,
        'batch_seed_account_id', target_account_id,
        'previous_operator_id', prev_op,
        'next_operator_id', next_operator,
        'previous_status', prev_status,
        'previous_deadline_at', prev_deadline,
        'reassigned_at', now()
      )
    );
  end loop;

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
  perform set_config('app.skip_account_row_protect', 'on', true);

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

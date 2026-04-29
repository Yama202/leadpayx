-- Corrige atribuição de lote e SLA: updates em accounts vindos de RPCs security definer
-- não devem ser bloqueados por protect_account_updates (operador_id/status/SLA).
-- Também: leitura da flag require_new_account_print por qualquer autenticado (pré-validação no app)
-- e leitura de prints no Storage para operador com conta atribuída (path = account_print_path).

create or replace function public.protect_account_updates()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_role text;
begin
  if session_user = 'postgres' then
    return new;
  end if;

  -- Transação-local: assign_next_batch_to_operator / reassign_account_due_to_sla / outras RPCs internas.
  if coalesce(nullif(current_setting('app.skip_account_row_protect', true), ''), '') = 'on' then
    return new;
  end if;

  actor_role := public.current_user_role();

  if actor_role = 'admin' then
    return new;
  end if;

  if actor_role <> 'operator' or old.operador_id is distinct from auth.uid() then
    raise exception 'account update denied';
  end if;

  if old.status in ('completed', 'rejected') then
    raise exception 'terminal account cannot be updated';
  end if;

  if new.captador_id is distinct from old.captador_id
    or new.operador_id is distinct from old.operador_id
    or new.account_identifier is distinct from old.account_identifier
    or coalesce(new.account_notes, '') is distinct from coalesce(old.account_notes, '')
    or coalesce(new.account_print_path, '') is distinct from coalesce(old.account_print_path, '')
    or new.source_registration_link_id is distinct from old.source_registration_link_id then
    raise exception 'operator cannot change account ownership or source data';
  end if;

  if new.status not in ('in_progress', 'completed', 'rejected') then
    raise exception 'invalid operator status transition';
  end if;

  if old.status = 'completed' and new.status is distinct from old.status then
    raise exception 'cannot change status of completed account';
  end if;

  if old.status = 'rejected' and new.status is distinct from old.status then
    raise exception 'cannot change status of rejected account';
  end if;

  if new.status = 'rejected' and length(coalesce(new.rejection_reason, '')) < 8 then
    raise exception 'rejection reason is required';
  end if;

  return new;
end;
$$;

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
  perform set_config('app.skip_account_row_protect', 'on', true);

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
  perform set_config('app.skip_account_row_protect', 'on', true);

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

drop policy if exists "app settings authenticated read require print flag" on public.app_settings;
create policy "app settings authenticated read require print flag"
on public.app_settings
for select
to authenticated
using (key = 'require_new_account_print');

drop policy if exists "app settings authenticated read operator dashboard keys" on public.app_settings;
create policy "app settings authenticated read operator dashboard keys"
on public.app_settings
for select
to authenticated
using (key in ('operator_min_completed_accounts', 'operational_min_batch_size'));

drop policy if exists "account prints operator read assigned" on storage.objects;
create policy "account prints operator read assigned"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'account-prints'
  and public.current_user_role() = 'operator'
  and exists (
    select 1
    from public.accounts a
    where a.account_print_path = storage.objects.name
      and a.operador_id = auth.uid()
  )
);

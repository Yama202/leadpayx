-- Corrige dois bloqueios no fluxo de recusa com requeue:
--
-- 1. Trigger protect_account_updates rejeitava transições para
--    rejected_no_balance / rejected_no_facial (apenas 'rejected' estava na lista).
--    Fix: adicionar os novos statuses + bypass via skip_account_row_protect
--    nas funções reject_account e requeue_account (security definer).
--
-- 2. requeue_account tinha REVOKE ALL e sem GRANT → captador não conseguia chamar.
--    Fix: grant execute to authenticated.

-- ── 1. Atualizar trigger ──────────────────────────────────────────────────────
create or replace function public.protect_account_updates()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_role text;
  skip_raw   text;
begin
  if session_user = 'postgres' then
    return new;
  end if;

  skip_raw := coalesce(current_setting('app.skip_account_row_protect', true), '');
  if lower(trim(skip_raw)) in ('on', 'true', '1', 'yes') then
    return new;
  end if;

  actor_role := public.current_user_role();

  if actor_role = 'admin' then
    return new;
  end if;

  if actor_role <> 'operator' or old.operador_id is distinct from auth.uid() then
    raise exception 'account update denied';
  end if;

  if old.status in ('completed', 'rejected', 'rejected_no_balance', 'rejected_no_facial') then
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

  if new.status not in ('in_progress', 'completed', 'rejected', 'rejected_no_balance', 'rejected_no_facial') then
    raise exception 'invalid operator status transition';
  end if;

  if old.status = 'completed' and new.status is distinct from old.status then
    raise exception 'cannot change status of completed account';
  end if;

  if old.status = 'rejected' and new.status is distinct from old.status then
    raise exception 'cannot change status of rejected account';
  end if;

  if new.status in ('rejected', 'rejected_no_balance', 'rejected_no_facial')
    and length(coalesce(new.rejection_reason, '')) < 8 then
    raise exception 'rejection reason is required';
  end if;

  return new;
end;
$$;

-- ── 2. reject_account com bypass do trigger ────────────────────────────────
create or replace function public.reject_account(
  target_account_id uuid,
  reason text,
  rejection_type text default 'permanent'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  account_row public.accounts%rowtype;
  actor_role  text;
  new_status  text;
begin
  perform set_config('app.skip_account_row_protect', 'on', true);

  if length(coalesce(reason, '')) < 8 then
    raise exception 'rejection reason is required';
  end if;

  if rejection_type not in ('permanent', 'no_balance', 'no_facial') then
    raise exception 'invalid rejection_type';
  end if;

  actor_role := public.current_user_role();

  select * into account_row
  from public.accounts
  where id = target_account_id
  for update;

  if account_row.id is null then
    return null;
  end if;

  if actor_role <> 'admin' and (actor_role <> 'operator' or account_row.operador_id <> auth.uid()) then
    raise exception 'rejection denied';
  end if;

  if account_row.status not in ('assigned', 'in_progress') then
    raise exception 'invalid account status for rejection';
  end if;

  new_status := case rejection_type
    when 'no_balance' then 'rejected_no_balance'
    when 'no_facial'  then 'rejected_no_facial'
    else                   'rejected'
  end;

  update public.accounts
  set status           = new_status,
      rejection_reason = reason,
      rejected_at      = now()
  where id = target_account_id;

  update public.operator_assignments
  set status = 'rejected'
  where account_id = target_account_id;

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values (
    'account.rejected',
    'account',
    target_account_id,
    jsonb_build_object('reason', reason, 'rejection_type', rejection_type)
  );

  perform public.notify_captador_account_rejected(target_account_id);

  return target_account_id;
end;
$$;

-- ── 3. requeue_account com bypass + grant ─────────────────────────────────
create or replace function public.requeue_account(target_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  account_row public.accounts%rowtype;
begin
  perform set_config('app.skip_account_row_protect', 'on', true);

  select * into account_row
  from public.accounts
  where id = target_account_id
  for update;

  if account_row.id is null then
    raise exception 'account not found';
  end if;

  if account_row.captador_id <> auth.uid() then
    raise exception 'requeue denied: not your account';
  end if;

  if account_row.status not in ('rejected_no_balance', 'rejected_no_facial') then
    raise exception 'account cannot be requeued';
  end if;

  update public.accounts
  set status           = 'pending',
      operador_id      = null,
      assigned_at      = null,
      started_at       = null,
      rejected_at      = null,
      rejection_reason = null,
      updated_at       = now()
  where id = target_account_id;

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values (
    'account.requeued',
    'account',
    target_account_id,
    jsonb_build_object('previous_status', account_row.status, 'captador_id', account_row.captador_id)
  );
end;
$$;

grant execute on function public.reject_account(uuid, text, text) to authenticated;
grant execute on function public.requeue_account(uuid) to authenticated;

select pg_notify('pgrst', 'reload schema');

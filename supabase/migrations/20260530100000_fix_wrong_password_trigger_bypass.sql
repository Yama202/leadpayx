-- Corrige dois problemas no fluxo wrong_password:
--
-- 1. protect_account_updates rejeitava transição para 'wrong_password'
--    (status não estava na lista permitida + sem bypass de trigger).
--    Fix: adicionar 'wrong_password' à lista E setar skip_account_row_protect.
--
-- 2. resubmit_corrected_account falha porque captador não tem role=operator,
--    e o trigger bloqueava a atualização mesmo em security definer.
--    Fix: mesma abordagem de bypass usada em reject_account / requeue_account.

-- ── 1. Atualizar trigger para incluir wrong_password ─────────────────────────
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

  if new.status not in ('in_progress', 'completed', 'rejected', 'rejected_no_balance', 'rejected_no_facial', 'wrong_password') then
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

-- ── 2. mark_account_wrong_password com bypass do trigger ─────────────────────
create or replace function public.mark_account_wrong_password(target_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_op     uuid;
begin
  perform set_config('app.skip_account_row_protect', 'on', true);

  select status, operador_id
    into v_status, v_op
  from public.accounts
  where id = target_account_id
  for update;

  if v_status not in ('assigned', 'in_progress') then
    raise exception 'only assigned/in_progress accounts can be marked wrong_password';
  end if;

  update public.accounts
  set
    status            = 'wrong_password',
    wrong_password_at = now()
  where id = target_account_id;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'account.wrong_password',
    'account',
    target_account_id,
    jsonb_build_object('previous_status', v_status, 'operator_id', v_op)
  );

  perform public.notify_captador_wrong_password(target_account_id);
end;
$$;

-- ── 3. resubmit_corrected_account com bypass do trigger ──────────────────────
create or replace function public.resubmit_corrected_account(target_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_captador uuid;
  v_status   text;
begin
  perform set_config('app.skip_account_row_protect', 'on', true);

  select captador_id, status
    into v_captador, v_status
  from public.accounts
  where id = target_account_id
  for update;

  if v_status <> 'wrong_password' then
    raise exception 'account is not in wrong_password status';
  end if;

  if v_captador <> auth.uid() then
    raise exception 'only the captador who submitted this account can resubmit it';
  end if;

  update public.accounts
  set
    status            = 'pending',
    operador_id       = null,
    assigned_at       = null,
    started_at        = null,
    wrong_password_at = null
  where id = target_account_id;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'account.resubmitted_after_correction',
    'account',
    target_account_id,
    jsonb_build_object('previous_status', 'wrong_password')
  );
end;
$$;

grant execute on function public.mark_account_wrong_password(uuid) to authenticated;
grant execute on function public.resubmit_corrected_account(uuid) to authenticated;

select pg_notify('pgrst', 'reload schema');

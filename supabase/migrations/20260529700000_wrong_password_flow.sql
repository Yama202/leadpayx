-- Fluxo "Senha incorreta": operador marca → captador corrige → volta pra fila.

-- ── 1. Novo status ─────────────────────────────────────────────────────────
alter table public.accounts
  drop constraint if exists accounts_status_check;

alter table public.accounts
  add constraint accounts_status_check check (
    status in (
      'pending', 'assigned', 'in_progress', 'completed',
      'rejected', 'rejected_no_balance', 'rejected_no_facial',
      'wrong_password'
    )
  );

alter table public.accounts
  add column if not exists wrong_password_at timestamptz;

-- ── 2. Estender kind de user_notifications ────────────────────────────────
alter table public.user_notifications
  drop constraint if exists user_notifications_kind_check;

alter table public.user_notifications
  add constraint user_notifications_kind_check check (
    kind in (
      'account_approved', 'account_completed', 'account_rejected',
      'payout_completed', 'referral_bonus', 'wrong_password'
    )
  );

-- ── 3. Notificação in-app para captador ───────────────────────────────────
create or replace function public.notify_captador_wrong_password(target_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_captador uuid;
  v_label    text;
begin
  if target_account_id is null then return; end if;

  select captador_id, account_identifier
    into v_captador, v_label
  from public.accounts
  where id = target_account_id;

  if v_captador is null then return; end if;

  v_label := coalesce(nullif(trim(v_label), ''), '—');

  insert into public.user_notifications(user_id, kind, title, body, metadata)
  values (
    v_captador,
    'wrong_password',
    'Senha incorreta — corrija para reenviar',
    'A conta ' || v_label || ' foi pausada pelo operador. Acesse "Minhas contas", insira a senha correta e reenvie para a fila.',
    jsonb_build_object(
      'account_id',         target_account_id,
      'account_identifier', v_label
    )
  );
end;
$$;

-- ── 4. RPC: operador marca senha incorreta ────────────────────────────────
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
    status           = 'wrong_password',
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

-- ── 5. RPC: captador recoloca na fila após corrigir senha ─────────────────
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

revoke all on function public.notify_captador_wrong_password(uuid) from public;

select pg_notify('pgrst', 'reload schema');

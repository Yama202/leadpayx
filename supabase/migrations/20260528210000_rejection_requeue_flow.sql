-- Três caminhos de recusa com possibilidade de reenvio à fila.
--
-- Novos statuses:
--   rejected_no_balance  → captador adiciona saldo e reenvia
--   rejected_no_facial   → captador faz selfie e reenvia
--   rejected             → permanente (conta não é nova / outro)
--
-- RPCs:
--   reject_account(id, reason, rejection_type)  — operador
--   requeue_account(id)                          — captador
--
-- Notificações in-app:
--   notify_captador_account_rejected(id)

-- ── 1. Estender constraint de status ──────────────────────────────────────
alter table public.accounts
  drop constraint if exists accounts_status_check;

alter table public.accounts
  add constraint accounts_status_check check (
    status in (
      'pending', 'assigned', 'in_progress', 'completed',
      'rejected', 'rejected_no_balance', 'rejected_no_facial'
    )
  );

-- ── 2. Estender constraint de motivo de recusa ────────────────────────────
alter table public.accounts
  drop constraint if exists rejected_requires_reason;

alter table public.accounts
  add constraint rejected_requires_reason check (
    status not in ('rejected', 'rejected_no_balance', 'rejected_no_facial')
    or length(coalesce(rejection_reason, '')) >= 8
  );

-- ── 3. Adicionar kind account_rejected às notificações ───────────────────
alter table public.user_notifications
  drop constraint if exists user_notifications_kind_check;

alter table public.user_notifications
  add constraint user_notifications_kind_check check (
    kind in ('account_approved', 'account_rejected')
  );

-- ── 4. reject_account: aceita rejection_type ─────────────────────────────
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

-- ── 5. requeue_account: captador reenvia conta para a fila ────────────────
create or replace function public.requeue_account(target_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  account_row public.accounts%rowtype;
begin
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
  set status          = 'pending',
      operador_id     = null,
      assigned_at     = null,
      started_at      = null,
      rejected_at     = null,
      rejection_reason = null,
      updated_at      = now()
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

-- ── 6. notify_captador_account_rejected ──────────────────────────────────
create or replace function public.notify_captador_account_rejected(target_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_captador uuid;
  v_label    text;
  v_status   text;
  v_title    text;
  v_body     text;
begin
  if target_account_id is null then return; end if;

  select captador_id, account_identifier, status
    into v_captador, v_label, v_status
  from public.accounts
  where id = target_account_id;

  if v_captador is null then return; end if;

  v_label := coalesce(nullif(trim(v_label), ''), '—');

  if v_status = 'rejected_no_balance' then
    v_title := 'Conta sem saldo — ação necessária';
    v_body  := 'A conta ' || v_label || ' foi recusada por falta de saldo. Deposite o valor e toque em "Já coloquei o saldo".';
  elsif v_status = 'rejected_no_facial' then
    v_title := 'Verificação facial pendente — ação necessária';
    v_body  := 'A conta ' || v_label || ' foi recusada por falta de selfie. Faça a verificação facial e toque em "Já fiz a selfie".';
  else
    v_title := 'Conta recusada';
    v_body  := 'A conta ' || v_label || ' foi recusada definitivamente. Não retornará para a fila.';
  end if;

  insert into public.user_notifications(user_id, kind, title, body, metadata)
  values (
    v_captador,
    'account_rejected',
    v_title,
    v_body,
    jsonb_build_object(
      'account_id',         target_account_id,
      'account_identifier', v_label,
      'rejection_status',   v_status
    )
  );
end;
$$;

revoke all on function public.requeue_account(uuid) from public;
revoke all on function public.notify_captador_account_rejected(uuid) from public;

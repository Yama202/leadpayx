-- Três melhorias no fluxo financeiro:
--
-- 1. `accounts`: balance_initial_brl + balance_final_brl
--    Informados pelo operador ao finalizar conta única.
--    Ajuste = balance_initial - balance_final (positivo → captador deve receber mais).
--
-- 2. `payouts`: amount_paid
--    Valor real transferido pelo admin — pode diferir de `amount` (calculado pelo sistema).
--
-- 3. complete_account: aceita balance_initial_brl / balance_final_brl
--    mark_payout_as_processed: aceita paid_amount

-- ── 1. Colunas de saldo na conta ─────────────────────────────────────────
alter table public.accounts
  add column if not exists balance_initial_brl numeric(12, 2),
  add column if not exists balance_final_brl   numeric(12, 2);

comment on column public.accounts.balance_initial_brl is
  'Saldo inicial (depósito) da conta informado pelo operador ao finalizar.';
comment on column public.accounts.balance_final_brl is
  'Saldo após a operação informado pelo operador ao finalizar.';

-- ── 2. Valor pago real no payout ─────────────────────────────────────────
alter table public.payouts
  add column if not exists amount_paid numeric(12, 2);

comment on column public.payouts.amount_paid is
  'Valor efetivamente transferido pelo admin — nulo = igual a amount.';

-- ── 3. complete_account com campos de saldo ──────────────────────────────
drop function if exists public.complete_account(uuid, text);

create or replace function public.complete_account(
  target_account_id  uuid,
  balance_destination text    default null,
  balance_initial_brl numeric default null,
  balance_final_brl   numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  account_row public.accounts%rowtype;
  actor_role  text;
  lock_key    bigint;
  updated_rows int;
  v_dest      text;
begin
  if target_account_id is null then
    raise exception 'account required';
  end if;

  lock_key := abs(hashtextextended(target_account_id::text, 0)::bigint);
  perform pg_advisory_xact_lock(lock_key);

  actor_role := public.current_user_role();

  select * into account_row
  from public.accounts
  where id = target_account_id
  for update;

  if account_row.id is null then
    return null;
  end if;

  if actor_role <> 'admin' and (actor_role <> 'operator' or account_row.operador_id <> auth.uid()) then
    raise exception 'completion denied';
  end if;

  if account_row.status = 'completed' then
    perform public.generate_account_earning(target_account_id);
    perform public.check_and_generate_referral_bonus(account_row.captador_id);
    return target_account_id;
  end if;

  if account_row.status not in ('assigned', 'in_progress') then
    raise exception 'invalid account status for completion';
  end if;

  if account_row.status = 'in_progress'
    and account_row.operation_deadline_at is not null
    and account_row.operation_deadline_at < now() then
    perform public.reassign_account_due_to_sla(target_account_id, 'operation_deadline_1h');
    raise exception 'account operation sla expired';
  end if;

  v_dest := trim(coalesce(balance_destination, ''));

  if actor_role = 'operator' and length(v_dest) < 8 then
    raise exception 'balance destination required for captador';
  end if;

  update public.accounts
  set status          = 'completed',
      started_at      = coalesce(started_at, now()),
      operation_started_at = coalesce(operation_started_at, now()),
      completed_at    = now(),
      completed_by_operador_id = coalesce(account_row.operador_id, account_row.completed_by_operador_id),
      operator_balance_destination = case
        when actor_role = 'operator' then v_dest
        else coalesce(nullif(v_dest, ''), account_row.operator_balance_destination)
      end,
      balance_initial_brl = coalesce(balance_initial_brl, account_row.balance_initial_brl),
      balance_final_brl   = coalesce(balance_final_brl,   account_row.balance_final_brl)
  where id = target_account_id
    and status in ('assigned', 'in_progress');

  get diagnostics updated_rows = row_count;
  if updated_rows = 0 then
    raise exception 'completion_race_or_invalid_state';
  end if;

  update public.operator_assignments
  set status = 'completed'
  where account_id = target_account_id;

  perform public.generate_account_earning(target_account_id);
  perform public.check_and_generate_referral_bonus(account_row.captador_id);
  perform public.notify_captador_account_completed(target_account_id);

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values (
    'account.operation_completed',
    'account',
    target_account_id,
    jsonb_build_object(
      'operator_id',              account_row.operador_id,
      'completed_by_operador_id', account_row.operador_id,
      'source',                   'complete_account',
      'has_balance_destination',  length(v_dest) >= 8,
      'has_balance_fields',       balance_initial_brl is not null and balance_final_brl is not null
    )
  );

  return target_account_id;
end;
$$;

grant execute on function public.complete_account(uuid, text, numeric, numeric) to authenticated;

-- ── 4. mark_payout_as_processed com paid_amount ───────────────────────────
create or replace function public.mark_payout_as_processed(
  target_payout_id uuid,
  proof_path       text    default null,
  admin_notes      text    default null,
  paid_amount      numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  payout_row public.payouts%rowtype;
  effective_paid numeric(12,2);
begin
  if not public.is_admin() then
    raise exception 'admin required';
  end if;

  select * into payout_row
  from public.payouts
  where id = target_payout_id and status = 'pending'
  for update;

  if payout_row.id is null then
    return null;
  end if;

  effective_paid := coalesce(paid_amount, payout_row.amount);

  update public.payouts
  set status            = 'processed',
      processed_at      = now(),
      processed_by      = auth.uid(),
      payment_proof_url = proof_path,
      notes             = admin_notes,
      amount_paid       = effective_paid
  where id = target_payout_id;

  update public.earnings
  set status  = 'paid',
      paid_at = now()
  where user_id = payout_row.user_id and status = 'pending';

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values (
    'payout.processed',
    'payout',
    target_payout_id,
    jsonb_build_object(
      'user_id',       payout_row.user_id,
      'amount',        payout_row.amount,
      'amount_paid',   effective_paid
    )
  );

  return target_payout_id;
end;
$$;

select pg_notify('pgrst', 'reload schema');

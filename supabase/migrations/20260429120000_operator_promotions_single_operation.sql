-- Operator read on global promotions + enforce single final operation per account (integrity + concurrency).

-- 1) RLS: captadores e operadores leem ofertas ativas (global).
drop policy if exists "promotion offers captador read active" on public.promotion_offers;
drop policy if exists "promotion offers operator read active" on public.promotion_offers;

create policy "promotion offers captador operator read active"
on public.promotion_offers
for select to authenticated
using (
  public.current_user_role() in ('captador', 'operator')
  and status = 'active'
  and (valid_until is null or valid_until > now())
);

-- 2) Auditoria explícita de quem concluiu a operação (além de operador_id corrente).
alter table public.accounts
  add column if not exists completed_by_operador_id uuid null references public.profiles(id) on delete set null;

create index if not exists accounts_completed_by_idx
  on public.accounts(completed_by_operador_id)
  where completed_by_operador_id is not null;

update public.accounts
set completed_by_operador_id = operador_id
where status = 'completed'
  and completed_by_operador_id is null
  and operador_id is not null;

-- 3) Impede mutação de contas já finalizadas (operador/captador); admin continua podendo corrigir.
create or replace function public.accounts_freeze_terminal_rows()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if session_user = 'postgres' or public.is_admin() then
    return new;
  end if;

  if old.status in ('completed', 'rejected') then
    raise exception 'account_finalized_immutable';
  end if;

  return new;
end;
$$;

drop trigger if exists accounts_freeze_terminal_rows on public.accounts;
create trigger accounts_freeze_terminal_rows
before update on public.accounts
for each row execute function public.accounts_freeze_terminal_rows();

-- 4) Operador não pode reabrir conta finalizada via UPDATE direto (camada app + RPC já usam funções).
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

  actor_role := public.current_user_role();

  if actor_role = 'admin' then
    return new;
  end if;

  if actor_role <> 'operator' or old.operador_id <> auth.uid() then
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

-- 5) Conclusão idempotente + trava de transação anti-corrida (advisory + linha).
create or replace function public.complete_account(target_account_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  account_row public.accounts%rowtype;
  actor_role text;
  lock_key bigint;
  updated_rows int;
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

  update public.accounts
  set status = 'completed',
      started_at = coalesce(started_at, now()),
      operation_started_at = coalesce(operation_started_at, now()),
      completed_at = now(),
      completed_by_operador_id = coalesce(account_row.operador_id, account_row.completed_by_operador_id)
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

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values (
    'account.operation_completed',
    'account',
    target_account_id,
    jsonb_build_object(
      'operator_id', account_row.operador_id,
      'completed_by_operador_id', account_row.operador_id,
      'source', 'complete_account'
    )
  );

  return target_account_id;
end;
$$;

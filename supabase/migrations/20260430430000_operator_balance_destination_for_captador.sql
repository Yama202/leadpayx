-- Operador informa ao captador em qual conta/destino foi aplicado o saldo ao finalizar a operação.

alter table public.accounts
  add column if not exists operator_balance_destination text;

comment on column public.accounts.operator_balance_destination is
  'Texto informado pelo operador ao finalizar: para qual conta/destino foi o saldo (visível ao captador dono da conta).';

drop function if exists public.complete_account(uuid);

create or replace function public.complete_account(
  target_account_id uuid,
  balance_destination text default null
)
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
  v_dest text;
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
  set status = 'completed',
      started_at = coalesce(started_at, now()),
      operation_started_at = coalesce(operation_started_at, now()),
      completed_at = now(),
      completed_by_operador_id = coalesce(account_row.operador_id, account_row.completed_by_operador_id),
      operator_balance_destination = case
        when actor_role = 'operator' then v_dest
        else coalesce(nullif(v_dest, ''), account_row.operator_balance_destination)
      end
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
      'source', 'complete_account',
      'has_balance_destination', length(v_dest) >= 8
    )
  );

  return target_account_id;
end;
$$;

grant execute on function public.complete_account(uuid, text) to authenticated;

select pg_notify('pgrst', 'reload schema');

-- Notificações in-app para o captador quando o operador conclui uma conta (comissão conforme get_captador_commission).

create table public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'account_approved'
    check (kind in ('account_approved')),
  title text not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index user_notifications_user_created_idx
  on public.user_notifications(user_id, created_at desc);

create index user_notifications_user_unread_idx
  on public.user_notifications(user_id)
  where read_at is null;

alter table public.user_notifications enable row level security;

create policy "user_notifications captador read own"
on public.user_notifications
for select
to authenticated
using (user_id = auth.uid());

create policy "user_notifications captador update own"
on public.user_notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.notify_captador_account_completed(target_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_captador uuid;
  v_amount numeric(12, 2);
  v_label text;
  v_body text;
begin
  if target_account_id is null then
    return;
  end if;

  select a.captador_id, a.account_identifier
    into v_captador, v_label
  from public.accounts a
  where a.id = target_account_id;

  if v_captador is null then
    return;
  end if;

  select e.amount into v_amount
  from public.earnings e
  where e.account_id = target_account_id
    and e.user_id = v_captador
    and e.type = 'account_completed'
  limit 1;

  if v_amount is null then
    v_amount := public.get_captador_commission(v_captador, target_account_id);
  end if;

  v_body :=
    'Parabéns! Sua conta indicada foi aprovada pela operação. '
    || 'Comissão creditada nesta conta: R$ '
    || replace(trim(to_char(coalesce(v_amount, 0), 'FM999999990.00')), '.', ',')
    || ' (valor conforme comissão global no admin, override do link ou do seu perfil).';

  insert into public.user_notifications(user_id, kind, title, body, metadata)
  values (
    v_captador,
    'account_approved',
    'Conta indicada aprovada',
    v_body,
    jsonb_build_object(
      'account_id', target_account_id,
      'commission_brl', coalesce(v_amount, 0),
      'account_identifier', coalesce(nullif(trim(v_label), ''), '—')
    )
  );
end;
$$;

revoke all on function public.notify_captador_account_completed(uuid) from public;

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
  perform public.notify_captador_account_completed(target_account_id);

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

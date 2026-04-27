alter table public.accounts
  add column if not exists operation_started_at timestamptz,
  add column if not exists operation_deadline_at timestamptz,
  add column if not exists reassigned_at timestamptz,
  add column if not exists reassign_reason text,
  add column if not exists last_operator_id uuid null references public.profiles(id) on delete set null;

create index if not exists accounts_sla_assigned_idx
  on public.accounts(status, assigned_at, operation_deadline_at)
  where status in ('assigned', 'in_progress');

create index if not exists accounts_last_operator_idx
  on public.accounts(last_operator_id)
  where last_operator_id is not null;

create index if not exists payouts_processed_at_idx
  on public.payouts(processed_at desc)
  where processed_at is not null;

create or replace function public.pick_balanced_operator(excluded_operator_id uuid default null)
returns uuid
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select p.id
  from public.profiles p
  left join public.accounts a
    on a.operador_id = p.id
    and a.status in ('assigned', 'in_progress', 'completed')
  where p.role = 'operator'
    and p.status = 'active'
    and (excluded_operator_id is null or p.id <> excluded_operator_id)
  group by p.id, p.created_at
  order by
    count(a.id) asc,
    count(a.id) filter (where a.status = 'in_progress') asc,
    p.created_at asc,
    p.id asc
  limit 1;
$$;

create or replace function public.assign_account_to_operator(target_account_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  chosen_operator uuid;
  updated_account uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  chosen_operator := public.pick_balanced_operator(null);

  if chosen_operator is null then
    return null;
  end if;

  update public.accounts
  set operador_id = chosen_operator,
      status = 'assigned',
      assigned_at = now(),
      operation_started_at = null,
      operation_deadline_at = now() + interval '3 hours',
      reassigned_at = null,
      reassign_reason = null
  where id = target_account_id
    and status = 'pending'
  returning id into updated_account;

  if updated_account is null then
    return null;
  end if;

  insert into public.operator_assignments(operador_id, account_id, status)
  values (chosen_operator, updated_account, 'assigned')
  on conflict (account_id) do update
    set operador_id = excluded.operador_id,
        status = 'assigned';

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values (
    'account.assigned',
    'account',
    updated_account,
    jsonb_build_object(
      'operador_id', chosen_operator,
      'operation_deadline_at', now() + interval '3 hours'
    )
  );

  return chosen_operator;
end;
$$;

create or replace function public.assign_next_batch_to_operator(target_operator_id uuid, batch_size int default 2)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  account_record record;
  assigned_count int := 0;
  actor_role text;
begin
  actor_role := public.current_user_role();

  if actor_role <> 'admin' and (actor_role <> 'operator' or target_operator_id <> auth.uid()) then
    raise exception 'assignment denied';
  end if;

  perform public.reassign_expired_operator_accounts();

  if not exists (
    select 1 from public.profiles
    where id = target_operator_id and role = 'operator' and status = 'active'
  ) then
    raise exception 'operator inactive or not found';
  end if;

  for account_record in
    select id
    from public.accounts
    where status = 'pending'
    order by created_at asc, id asc
    limit greatest(least(batch_size, 2), 1)
    for update skip locked
  loop
    update public.accounts
    set operador_id = target_operator_id,
        status = 'assigned',
        assigned_at = now(),
        operation_started_at = null,
        operation_deadline_at = now() + interval '3 hours',
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
    values ('operator.batch_assigned', 'profile', target_operator_id, jsonb_build_object('count', assigned_count));
  end if;

  return assigned_count;
end;
$$;

create or replace function public.start_account(target_account_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  account_row public.accounts%rowtype;
  actor_role text;
  shared_deadline timestamptz := now() + interval '1 hour';
begin
  actor_role := public.current_user_role();

  select * into account_row
  from public.accounts
  where id = target_account_id
  for update;

  if account_row.id is null then
    return null;
  end if;

  if actor_role <> 'admin' and (actor_role <> 'operator' or account_row.operador_id <> auth.uid()) then
    raise exception 'start denied';
  end if;

  if account_row.status not in ('assigned', 'in_progress') then
    raise exception 'invalid account status for start';
  end if;

  if account_row.status = 'assigned'
    and account_row.operation_deadline_at is not null
    and account_row.operation_deadline_at < now() then
    perform public.reassign_account_due_to_sla(target_account_id, 'assigned_not_started_3h');
    raise exception 'account sla expired';
  end if;

  update public.accounts
  set status = 'in_progress',
      started_at = coalesce(started_at, now()),
      operation_started_at = coalesce(operation_started_at, now()),
      operation_deadline_at = coalesce(
        case when status = 'in_progress' then operation_deadline_at else null end,
        shared_deadline
      )
  where id in (
    select id
    from public.accounts
    where operador_id = account_row.operador_id
      and status = 'assigned'
    order by assigned_at asc, id asc
    limit 2
  )
  or id = target_account_id;

  update public.operator_assignments
  set status = 'in_progress'
  where account_id in (
    select id
    from public.accounts
    where operador_id = account_row.operador_id
      and status = 'in_progress'
      and operation_deadline_at <= shared_deadline
  );

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values (
    'account.operation_started',
    'account',
    target_account_id,
    jsonb_build_object(
      'operator_id', account_row.operador_id,
      'operation_started_at', now(),
      'operation_deadline_at', shared_deadline
    )
  );

  return target_account_id;
end;
$$;

create or replace function public.complete_account(target_account_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  account_row public.accounts%rowtype;
  actor_role text;
begin
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
      completed_at = now()
  where id = target_account_id;

  update public.operator_assignments
  set status = 'completed'
  where account_id = target_account_id;

  perform public.generate_account_earning(target_account_id);
  perform public.check_and_generate_referral_bonus(account_row.captador_id);

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values ('account.operation_completed', 'account', target_account_id, jsonb_build_object('operator_id', account_row.operador_id));

  return target_account_id;
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
  select * into account_row
  from public.accounts
  where id = target_account_id
  for update skip locked;

  if account_row.id is null or account_row.status not in ('assigned', 'in_progress') then
    return false;
  end if;

  is_expired := (
    account_row.status = 'assigned'
    and coalesce(account_row.operation_deadline_at, account_row.assigned_at + interval '3 hours') < now()
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
        operation_deadline_at = now() + interval '3 hours',
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
  for expired_account in
    select id, status
    from public.accounts
    where status in ('assigned', 'in_progress')
      and (
        (status = 'assigned' and coalesce(operation_deadline_at, assigned_at + interval '3 hours') < now())
        or
        (status = 'in_progress' and coalesce(operation_deadline_at, operation_started_at + interval '1 hour') < now())
      )
    order by operation_deadline_at asc nulls last, assigned_at asc
    for update skip locked
  loop
    reason := case
      when expired_account.status = 'assigned' then 'assigned_not_started_3h'
      else 'operation_deadline_1h'
    end;

    if public.reassign_account_due_to_sla(expired_account.id, reason) then
      reassigned_count := reassigned_count + 1;
    end if;
  end loop;

  return reassigned_count;
end;
$$;

create or replace function public.get_financial_summary(period_start timestamptz default null, period_end timestamptz default null)
returns table (
  user_id uuid,
  name text,
  email text,
  role text,
  pending_amount numeric,
  paid_amount numeric,
  pending_payout_amount numeric,
  processed_payout_amount numeric,
  processed_payouts bigint
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select
    p.id,
    p.name,
    p.email,
    p.role,
    coalesce(sum(e.amount) filter (
      where e.status = 'pending'
        and (period_start is null or e.created_at >= period_start)
        and (period_end is null or e.created_at < period_end)
    ), 0)::numeric as pending_amount,
    coalesce(sum(e.amount) filter (
      where e.status = 'paid'
        and (period_start is null or coalesce(e.paid_at, e.created_at) >= period_start)
        and (period_end is null or coalesce(e.paid_at, e.created_at) < period_end)
    ), 0)::numeric as paid_amount,
    coalesce((
      select sum(po.amount)
      from public.payouts po
      where po.user_id = p.id
        and po.status = 'pending'
        and (period_start is null or po.created_at >= period_start)
        and (period_end is null or po.created_at < period_end)
    ), 0)::numeric as pending_payout_amount,
    coalesce((
      select sum(po.amount)
      from public.payouts po
      where po.user_id = p.id
        and po.status = 'processed'
        and (period_start is null or coalesce(po.processed_at, po.created_at) >= period_start)
        and (period_end is null or coalesce(po.processed_at, po.created_at) < period_end)
    ), 0)::numeric as processed_payout_amount,
    coalesce((
      select count(*)
      from public.payouts po
      where po.user_id = p.id
        and po.status = 'processed'
        and (period_start is null or coalesce(po.processed_at, po.created_at) >= period_start)
        and (period_end is null or coalesce(po.processed_at, po.created_at) < period_end)
    ), 0)::bigint as processed_payouts
  from public.profiles p
  left join public.earnings e on e.user_id = p.id
  where public.is_admin()
    and p.role in ('captador', 'operator')
  group by p.id, p.name, p.email, p.role
  order by paid_amount desc, pending_amount desc, p.created_at desc;
$$;

create or replace function public.get_captador_ranking(period_start timestamptz default null, period_end timestamptz default null)
returns table (
  captador_id uuid,
  name text,
  email text,
  accounts_submitted bigint,
  completed_accounts bigint,
  rejected_accounts bigint,
  completion_rate numeric,
  rejection_rate numeric,
  generated_amount numeric,
  active_days bigint,
  score numeric
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  /*
    Ranking LeadPayX:
    - Volume de contas enviadas: 25%
    - Taxa de conclusão: 25%
    - Ganhos gerados: 20%
    - Consistência por período: 15%
    - Qualidade operacional por baixa recusa: 15%
    Scores de volume/ganhos são normalizados por metas conservadoras para evitar
    que um único outlier domine o ranking.
  */
  with bounds as (
    select
      coalesce(period_start, now() - interval '30 days') as start_at,
      coalesce(period_end, now()) as end_at
  ),
  account_stats as (
    select
      p.id,
      p.name,
      p.email,
      count(a.id)::bigint as accounts_submitted,
      count(a.id) filter (where a.status = 'completed')::bigint as completed_accounts,
      count(a.id) filter (where a.status = 'rejected')::bigint as rejected_accounts,
      count(distinct date(a.created_at))::bigint as active_days,
      greatest(1, ceil(extract(epoch from ((select end_at from bounds) - (select start_at from bounds))) / 86400.0))::numeric as period_days
    from public.profiles p
    cross join bounds b
    left join public.accounts a
      on a.captador_id = p.id
      and a.created_at >= b.start_at
      and a.created_at < b.end_at
    left join public.earnings e
      on e.user_id = p.id
      and e.created_at >= b.start_at
      and e.created_at < b.end_at
    where public.is_admin()
      and p.role = 'captador'
    group by p.id, p.name, p.email
  ),
  earning_stats as (
    select
      p.id,
      coalesce(sum(e.amount) filter (where e.type in ('account_completed', 'referral_bonus')), 0)::numeric as generated_amount
    from public.profiles p
    cross join bounds b
    left join public.earnings e
      on e.user_id = p.id
      and e.created_at >= b.start_at
      and e.created_at < b.end_at
    where public.is_admin()
      and p.role = 'captador'
    group by p.id
  )
  select
    a.id,
    a.name,
    a.email,
    a.accounts_submitted,
    a.completed_accounts,
    a.rejected_accounts,
    case when a.accounts_submitted = 0 then 0 else round(a.completed_accounts::numeric / a.accounts_submitted, 4) end,
    case when a.accounts_submitted = 0 then 0 else round(a.rejected_accounts::numeric / a.accounts_submitted, 4) end,
    e.generated_amount,
    a.active_days,
    round((
      least(a.accounts_submitted::numeric / 20, 1) * 25
      + (case when a.accounts_submitted = 0 then 0 else a.completed_accounts::numeric / a.accounts_submitted end) * 25
      + least(e.generated_amount / 1000, 1) * 20
      + least(a.active_days::numeric / a.period_days, 1) * 15
      + (1 - case when a.accounts_submitted = 0 then 0 else a.rejected_accounts::numeric / a.accounts_submitted end) * 15
    ), 2) as score
  from account_stats a
  join earning_stats e on e.id = a.id
  order by score desc, a.completed_accounts desc, e.generated_amount desc;
$$;

grant execute on function public.pick_balanced_operator(uuid) to authenticated;
grant execute on function public.reassign_account_due_to_sla(uuid, text) to authenticated;
grant execute on function public.reassign_expired_operator_accounts() to authenticated;
grant execute on function public.get_financial_summary(timestamptz, timestamptz) to authenticated;
grant execute on function public.get_captador_ranking(timestamptz, timestamptz) to authenticated;

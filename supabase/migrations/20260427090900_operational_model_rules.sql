alter table public.registration_links
  add column if not exists captador_commission_override numeric(12,2)
  check (captador_commission_override is null or captador_commission_override > 0);

insert into public.app_settings(key, value) values
  ('operator_min_completed_accounts', '0'::jsonb),
  ('operational_min_batch_size', '2'::jsonb)
on conflict (key) do nothing;

create or replace function public.get_captador_commission(target_captador_id uuid, target_account_id uuid)
returns numeric
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  /*
    Precedência de comissão do captador:
    1. override do link de captação que originou a conta;
    2. override individual do captador;
    3. valor global commission_amount_brl.
  */
  select coalesce(
    (
      select rl.captador_commission_override
      from public.accounts a
      join public.registration_links rl on rl.id = a.source_registration_link_id
      where a.id = target_account_id
        and a.captador_id = target_captador_id
        and rl.captador_commission_override is not null
      limit 1
    ),
    (select captador_commission_override from public.profiles where id = target_captador_id),
    public.get_numeric_setting('commission_amount_brl', 30)
  );
$$;

create or replace function public.is_operator_eligible(target_operator_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_operator_id
      and p.role = 'operator'
      and p.status = 'active'
      and (
        select count(*)
        from public.accounts a
        where a.operador_id = target_operator_id
          and a.status = 'completed'
      ) >= public.get_numeric_setting('operator_min_completed_accounts', 0)
  );
$$;

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
    and public.is_operator_eligible(p.id)
    and (excluded_operator_id is null or p.id <> excluded_operator_id)
  group by p.id, p.created_at
  order by
    count(a.id) asc,
    count(a.id) filter (where a.status = 'in_progress') asc,
    p.created_at asc,
    p.id asc
  limit 1;
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
  minimum_batch int;
  requested_batch int;
  available_pending int;
begin
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

  select count(*) into available_pending
  from public.accounts
  where status = 'pending';

  if available_pending < minimum_batch then
    raise exception 'minimum operational batch not available';
  end if;

  for account_record in
    select id
    from public.accounts
    where status = 'pending'
    order by created_at asc, id asc
    limit requested_batch
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
    values (
      'operator.batch_assigned',
      'profile',
      target_operator_id,
      jsonb_build_object('count', assigned_count, 'minimum_batch', minimum_batch)
    );
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
  minimum_batch int;
  active_batch_count int;
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

  if not public.is_operator_eligible(account_row.operador_id) then
    raise exception 'operator not eligible';
  end if;

  minimum_batch := least(greatest(public.get_numeric_setting('operational_min_batch_size', 2)::int, 1), 2);

  select count(*) into active_batch_count
  from public.accounts
  where operador_id = account_row.operador_id
    and status in ('assigned', 'in_progress');

  if active_batch_count < minimum_batch then
    raise exception 'minimum operational batch not met';
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
      'operation_deadline_at', shared_deadline,
      'minimum_batch', minimum_batch
    )
  );

  return target_account_id;
end;
$$;

create or replace function public.generate_account_earning(target_account_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  account_row public.accounts%rowtype;
  captador_earning_id uuid;
begin
  select * into account_row
  from public.accounts
  where id = target_account_id and status = 'completed';

  if account_row.id is null then
    return null;
  end if;

  insert into public.earnings(user_id, account_id, type, amount, status)
  values (
    account_row.captador_id,
    account_row.id,
    'account_completed',
    public.get_captador_commission(account_row.captador_id, account_row.id),
    'pending'
  )
  on conflict do nothing
  returning id into captador_earning_id;

  if account_row.operador_id is not null then
    insert into public.earnings(user_id, account_id, type, amount, status)
    values (
      account_row.operador_id,
      account_row.id,
      'operator_account_completed',
      public.get_operator_commission(account_row.operador_id),
      'pending'
    )
    on conflict do nothing;
  end if;

  return captador_earning_id;
end;
$$;

create or replace function public.upsert_app_setting(setting_key text, setting_value jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'admin required';
  end if;

  if setting_key not in (
    'commission_amount_brl',
    'operator_commission_amount_brl',
    'referral_bonus_brl',
    'referral_completed_accounts_target',
    'require_new_account_print',
    'operator_min_completed_accounts',
    'operational_min_batch_size'
  ) then
    raise exception 'setting key denied';
  end if;

  insert into public.app_settings(key, value)
  values (setting_key, setting_value)
  on conflict (key) do update
    set value = excluded.value,
        updated_at = now();

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values ('settings.updated', 'app_setting', null, jsonb_build_object('key', setting_key));
end;
$$;

grant execute on function public.get_captador_commission(uuid, uuid) to authenticated;
grant execute on function public.is_operator_eligible(uuid) to authenticated;

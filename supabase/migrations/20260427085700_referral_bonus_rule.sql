drop index if exists public.earnings_unique_referral_bonus;

create unique index earnings_unique_referral_bonus
  on public.earnings(referral_user_id)
  where type = 'referral_bonus' and referral_user_id is not null;

create or replace function public.check_and_generate_referral_bonus(target_captador_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  indicated public.profiles%rowtype;
  completed_count int;
  target_count int;
  bonus_amount numeric;
  earning_id uuid;
  inserted_earning_id uuid;
begin
  select * into indicated
  from public.profiles
  where id = target_captador_id
  for update;

  if indicated.id is null or indicated.referred_by is null then
    return null;
  end if;

  select id into earning_id
  from public.earnings
  where type = 'referral_bonus'
    and referral_user_id = target_captador_id
  limit 1;

  if earning_id is not null then
    update public.profiles
    set referral_bonus_paid = true
    where id = target_captador_id
      and referral_bonus_paid = false;

    return earning_id;
  end if;

  target_count := public.get_numeric_setting('referral_completed_accounts_target', 2)::int;

  select count(*) into completed_count
  from public.accounts
  where captador_id = target_captador_id
    and status = 'completed';

  if completed_count < target_count then
    return null;
  end if;

  bonus_amount := public.get_numeric_setting('referral_bonus_brl', 60);

  insert into public.earnings(user_id, referral_user_id, type, amount, status)
  values (
    indicated.referred_by,
    target_captador_id,
    'referral_bonus',
    bonus_amount,
    'pending'
  )
  on conflict do nothing
  returning id into inserted_earning_id;

  if inserted_earning_id is null then
    select id into earning_id
    from public.earnings
    where type = 'referral_bonus'
      and referral_user_id = target_captador_id
    limit 1;

    return earning_id;
  end if;

  update public.profiles
  set referral_bonus_paid = true
  where id = target_captador_id
    and referral_bonus_paid = false;

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values (
    'earning.referral_bonus_generated',
    'profile',
    target_captador_id,
    jsonb_build_object(
      'referrer_id', indicated.referred_by,
      'completed_accounts', completed_count,
      'required_completed_accounts', target_count,
      'amount', bonus_amount,
      'earning_id', inserted_earning_id
    )
  );

  return inserted_earning_id;
end;
$$;

create or replace function public.get_referral_summary(target_user_id uuid)
returns table (
  profile_id uuid,
  name text,
  created_at timestamptz,
  completed_accounts bigint,
  qualified boolean,
  bonus_paid boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  actor_role text;
  target_count int;
begin
  actor_role := public.current_user_role();

  if actor_role <> 'admin' and target_user_id <> auth.uid() then
    raise exception 'referral summary denied';
  end if;

  target_count := public.get_numeric_setting('referral_completed_accounts_target', 2)::int;

  return query
  select
    p.id,
    p.name,
    p.created_at,
    count(a.id) filter (where a.status = 'completed') as completed_accounts,
    count(a.id) filter (where a.status = 'completed') >= target_count as qualified,
    exists (
      select 1
      from public.earnings e
      where e.type = 'referral_bonus'
        and e.referral_user_id = p.id
        and e.user_id = target_user_id
    ) as bonus_paid
  from public.profiles p
  left join public.accounts a on a.captador_id = p.id
  where p.referred_by = target_user_id
  group by p.id, p.name, p.created_at
  order by p.created_at desc;
end;
$$;

grant execute on function public.check_and_generate_referral_bonus(uuid) to authenticated;
grant execute on function public.get_referral_summary(uuid) to authenticated;

do $$
declare
  indicated record;
begin
  for indicated in
    select id
    from public.profiles
    where referred_by is not null
  loop
    perform public.check_and_generate_referral_bonus(indicated.id);
  end loop;
end;
$$;

-- Meta semanal de captação com prêmio resgatável pelo captador.

-- 1) Novo tipo de earning para prêmio semanal.
alter table public.earnings drop constraint if exists earnings_type_check;
alter table public.earnings add constraint earnings_type_check
  check (type in ('account_completed', 'operator_account_completed', 'referral_bonus', 'weekly_goal_bonus'));

-- 2) Configurações globais da meta semanal.
insert into public.app_settings(key, value) values
  ('weekly_goal_enabled', 'false'::jsonb),
  ('weekly_goal_target_accounts', '10'::jsonb),
  ('weekly_goal_reward_brl', '100'::jsonb)
on conflict (key) do nothing;

-- 3) Tabela de controle de resgate semanal (evita duplicidade).
create table if not exists public.weekly_goal_claims (
  id uuid primary key default gen_random_uuid(),
  captador_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  target_accounts int not null check (target_accounts > 0),
  completed_accounts int not null check (completed_accounts >= 0),
  reward_brl numeric(12,2) not null check (reward_brl > 0),
  earning_id uuid not null references public.earnings(id) on delete restrict,
  claimed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (captador_id, week_start)
);

alter table public.weekly_goal_claims enable row level security;

drop policy if exists "weekly goal claims admin full" on public.weekly_goal_claims;
create policy "weekly goal claims admin full"
  on public.weekly_goal_claims
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "weekly goal claims captador read own" on public.weekly_goal_claims;
create policy "weekly goal claims captador read own"
  on public.weekly_goal_claims
  for select
  to authenticated
  using (captador_id = auth.uid() and public.current_user_role() = 'captador');

grant select on public.weekly_goal_claims to authenticated;

-- 4) Whitelist de app_settings no RPC de upsert.
create or replace function public.upsert_app_setting(setting_key text, setting_value jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  previous jsonb;
  actor uuid;
begin
  if not public.is_admin() then
    raise exception 'admin required';
  end if;

  if setting_key not in (
    'captador_commission_per_account',
    'operator_commission_per_account',
    'commission_amount_brl',
    'operator_commission_amount_brl',
    'referral_bonus_brl',
    'referral_bonus_base_brl',
    'referral_bonus_increment_brl',
    'referral_bonus_tier2_brl',
    'referral_bonus_tier2_after_qualified_count',
    'referral_completed_accounts_target',
    'referral_bonus_enabled',
    'referral_utm_source',
    'referral_utm_medium',
    'referral_utm_campaign',
    'require_new_account_print',
    'operator_min_completed_accounts',
    'operational_min_batch_size',
    'whatsapp_group_url',
    'weekly_goal_enabled',
    'weekly_goal_target_accounts',
    'weekly_goal_reward_brl'
  ) then
    raise exception 'setting key denied';
  end if;

  actor := auth.uid();

  select a.value into previous
  from public.app_settings a
  where a.key = setting_key;

  insert into public.app_settings(key, value, updated_by)
  values (setting_key, setting_value, actor)
  on conflict (key) do update
    set value = excluded.value,
        updated_by = actor,
        updated_at = now();

  insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  values (
    actor,
    'settings.updated',
    'app_setting',
    null,
    jsonb_strip_nulls(jsonb_build_object(
      'key', setting_key,
      'previous', previous,
      'next', setting_value
    ))
  );
end;
$$;

-- 5) Progresso da meta semanal (captador/admin).
create or replace function public.get_weekly_goal_progress(target_captador_id uuid default null)
returns table (
  captador_id uuid,
  week_start date,
  week_end date,
  completed_accounts int,
  target_accounts int,
  reward_brl numeric,
  enabled boolean,
  eligible boolean,
  claimed boolean,
  claim_earning_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  actor_id uuid;
  actor_role text;
  v_target uuid;
  v_week_start date;
  v_week_end date;
  v_completed int;
  v_target_accounts int;
  v_reward numeric(12,2);
  v_enabled boolean;
  v_claim_earning_id uuid;
begin
  actor_id := auth.uid();
  actor_role := public.current_user_role();

  if actor_id is null or actor_role is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  v_target := coalesce(target_captador_id, actor_id);

  if actor_role <> 'admin' and v_target <> actor_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  v_week_start := date_trunc('week', now())::date;
  v_week_end := (v_week_start + 6);
  v_target_accounts := greatest(public.get_numeric_setting('weekly_goal_target_accounts', 10)::int, 1);
  v_reward := public.get_numeric_setting('weekly_goal_reward_brl', 100);
  v_enabled := public.get_boolean_setting('weekly_goal_enabled', false);

  select count(*)::int into v_completed
  from public.accounts a
  where a.captador_id = v_target
    and a.status = 'completed'
    and a.completed_at >= v_week_start::timestamptz
    and a.completed_at < (v_week_start + 7)::timestamptz;

  select c.earning_id into v_claim_earning_id
  from public.weekly_goal_claims c
  where c.captador_id = v_target
    and c.week_start = v_week_start
  limit 1;

  return query
  select
    v_target,
    v_week_start,
    v_week_end,
    v_completed,
    v_target_accounts,
    v_reward,
    v_enabled,
    (v_enabled and v_completed >= v_target_accounts),
    (v_claim_earning_id is not null),
    v_claim_earning_id;
end;
$$;

grant execute on function public.get_weekly_goal_progress(uuid) to authenticated;

-- 6) Ranking admin da meta semanal.
create or replace function public.get_weekly_goal_ranking()
returns table (
  captador_id uuid,
  name text,
  email text,
  completed_accounts int,
  target_accounts int,
  reward_brl numeric,
  progress_percent numeric,
  eligible boolean,
  claimed boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  v_week_start date;
  v_target_accounts int;
  v_reward numeric(12,2);
begin
  if not public.is_admin() then
    raise exception 'admin required' using errcode = '42501';
  end if;

  v_week_start := date_trunc('week', now())::date;
  v_target_accounts := greatest(public.get_numeric_setting('weekly_goal_target_accounts', 10)::int, 1);
  v_reward := public.get_numeric_setting('weekly_goal_reward_brl', 100);

  return query
  with completed as (
    select
      a.captador_id,
      count(*)::int as completed_accounts
    from public.accounts a
    where a.status = 'completed'
      and a.completed_at >= v_week_start::timestamptz
      and a.completed_at < (v_week_start + 7)::timestamptz
    group by a.captador_id
  )
  select
    p.id as captador_id,
    p.name,
    p.email,
    coalesce(c.completed_accounts, 0) as completed_accounts,
    v_target_accounts as target_accounts,
    v_reward as reward_brl,
    least((coalesce(c.completed_accounts, 0)::numeric / v_target_accounts::numeric) * 100, 100) as progress_percent,
    (coalesce(c.completed_accounts, 0) >= v_target_accounts) as eligible,
    exists (
      select 1
      from public.weekly_goal_claims w
      where w.captador_id = p.id
        and w.week_start = v_week_start
    ) as claimed
  from public.profiles p
  left join completed c on c.captador_id = p.id
  where p.role = 'captador'
    and p.status = 'active'
  order by progress_percent desc, completed_accounts desc, p.created_at asc;
end;
$$;

grant execute on function public.get_weekly_goal_ranking() to authenticated;

-- 7) Resgate do prêmio semanal pelo captador.
create or replace function public.claim_weekly_goal_bonus()
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid;
  v_actor_role text;
  v_week_start date;
  v_completed int;
  v_target_accounts int;
  v_reward numeric(12,2);
  v_enabled boolean;
  v_earning_id uuid;
begin
  v_actor_id := auth.uid();
  v_actor_role := public.current_user_role();

  if v_actor_id is null or v_actor_role <> 'captador' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  v_enabled := public.get_boolean_setting('weekly_goal_enabled', false);
  if not v_enabled then
    raise exception 'weekly_goal_disabled' using errcode = 'P0001';
  end if;

  v_week_start := date_trunc('week', now())::date;
  v_target_accounts := greatest(public.get_numeric_setting('weekly_goal_target_accounts', 10)::int, 1);
  v_reward := public.get_numeric_setting('weekly_goal_reward_brl', 100);

  if exists (
    select 1 from public.weekly_goal_claims w
    where w.captador_id = v_actor_id and w.week_start = v_week_start
  ) then
    raise exception 'weekly_goal_already_claimed' using errcode = 'P0001';
  end if;

  select count(*)::int into v_completed
  from public.accounts a
  where a.captador_id = v_actor_id
    and a.status = 'completed'
    and a.completed_at >= v_week_start::timestamptz
    and a.completed_at < (v_week_start + 7)::timestamptz;

  if v_completed < v_target_accounts then
    raise exception 'weekly_goal_not_reached' using errcode = 'P0001';
  end if;

  insert into public.earnings(user_id, type, amount, status)
  values (v_actor_id, 'weekly_goal_bonus', v_reward, 'pending')
  returning id into v_earning_id;

  insert into public.weekly_goal_claims(
    captador_id,
    week_start,
    target_accounts,
    completed_accounts,
    reward_brl,
    earning_id
  )
  values (
    v_actor_id,
    v_week_start,
    v_target_accounts,
    v_completed,
    v_reward,
    v_earning_id
  );

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values (
    'earning.weekly_goal_claimed',
    'earning',
    v_earning_id,
    jsonb_build_object(
      'captador_id', v_actor_id,
      'week_start', v_week_start,
      'completed_accounts', v_completed,
      'target_accounts', v_target_accounts,
      'reward_brl', v_reward
    )
  );

  return v_earning_id;
end;
$$;

grant execute on function public.claim_weekly_goal_bonus() to authenticated;

select pg_notify('pgrst', 'reload schema');

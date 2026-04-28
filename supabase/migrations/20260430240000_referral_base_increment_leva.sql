-- Indicação global (mesmo valor para todos os captadores):
--   • referral_bonus_base_brl: 1ª indicação qualificada do referrer.
--   • referral_bonus_increment_brl: cada indicação qualificada adicional.
--   • "Qualificado" = indicado com >= referral_completed_accounts_target contas status completed.
-- Fallback de leitura: referral_bonus_brl / referral_bonus_tier2_brl (legado).
-- Roda após global_role_commissions para preservar whitelist completa em upsert_app_setting.

insert into public.app_settings(key, value)
select 'referral_bonus_base_brl', value
from public.app_settings
where key = 'referral_bonus_brl'
limit 1
on conflict (key) do nothing;

insert into public.app_settings(key, value)
select
  'referral_bonus_increment_brl',
  coalesce(
    (select value from public.app_settings where key = 'referral_bonus_tier2_brl' limit 1),
    (select value from public.app_settings where key = 'referral_bonus_brl' limit 1)
  )
on conflict (key) do nothing;

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
  prior_qualified int;
  base_amt numeric;
  incr_amt numeric;
begin
  if not public.get_boolean_setting('referral_bonus_enabled', true) then
    return null;
  end if;

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

  target_count := greatest(public.get_numeric_setting('referral_completed_accounts_target', 2)::int, 1);

  select count(*) into completed_count
  from public.accounts
  where captador_id = target_captador_id
    and status = 'completed';

  if completed_count < target_count then
    return null;
  end if;

  base_amt := public.get_numeric_setting(
    'referral_bonus_base_brl',
    public.get_numeric_setting('referral_bonus_brl', 60)
  );
  incr_amt := public.get_numeric_setting(
    'referral_bonus_increment_brl',
    public.get_numeric_setting('referral_bonus_tier2_brl', base_amt)
  );

  select count(*)::int into prior_qualified
  from public.earnings
  where user_id = indicated.referred_by
    and type = 'referral_bonus'
    and referral_user_id is not null
    and referral_user_id <> target_captador_id;

  if prior_qualified = 0 then
    bonus_amount := base_amt;
  else
    bonus_amount := incr_amt;
  end if;

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

    if earning_id is not null then
      update public.profiles
         set referral_bonus_paid = true
       where id = target_captador_id
         and referral_bonus_paid = false;
    end if;

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
      'earning_id', inserted_earning_id,
      'prior_qualified_referrals', prior_qualified,
      'referral_bonus_base_brl', base_amt,
      'referral_bonus_increment_brl', incr_amt
    )
  );

  return inserted_earning_id;
end;
$$;

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
    'whatsapp_group_url'
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

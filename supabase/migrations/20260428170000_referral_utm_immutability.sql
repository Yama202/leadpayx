alter table public.app_settings
  add column if not exists updated_by uuid null references public.profiles(id) on delete set null;

insert into public.app_settings(key, value)
values
  ('referral_bonus_enabled', 'true'::jsonb),
  ('referral_utm_source', '"referral"'::jsonb),
  ('referral_utm_medium', '"captador"'::jsonb),
  ('referral_utm_campaign', '"invite"'::jsonb)
on conflict (key) do nothing;

create table if not exists public.promotion_offers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) >= 2),
  description text not null check (length(trim(description)) >= 8),
  reward_amount numeric(12,2) not null check (reward_amount > 0),
  promotion_url text not null check (promotion_url ~ '^https://'),
  status text not null default 'active' check (status in ('active', 'inactive')),
  valid_until timestamptz null,
  display_order int not null default 100,
  created_by uuid null references public.profiles(id) on delete set null,
  updated_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists promotion_offers_active_order_idx
  on public.promotion_offers(status, display_order, created_at desc);

drop trigger if exists promotion_offers_set_updated_at on public.promotion_offers;
create trigger promotion_offers_set_updated_at
before update on public.promotion_offers
for each row execute function public.set_updated_at();

alter table public.promotion_offers enable row level security;

drop policy if exists "promotion offers admin full" on public.promotion_offers;
create policy "promotion offers admin full"
on public.promotion_offers
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "promotion offers captador read active" on public.promotion_offers;
create policy "promotion offers captador read active"
on public.promotion_offers
for select to authenticated
using (
  public.current_user_role() = 'captador'
  and status = 'active'
  and (valid_until is null or valid_until > now())
);

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

  insert into public.app_settings(key, value, updated_by)
  values (setting_key, setting_value, auth.uid())
  on conflict (key) do update
    set value = excluded.value,
        updated_by = auth.uid(),
        updated_at = now();

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values ('settings.updated', 'app_setting', null, jsonb_build_object('key', setting_key));
end;
$$;

create or replace function public.prevent_referral_rebind()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.referral_code is distinct from old.referral_code then
    raise exception 'referral code is immutable';
  end if;

  if old.referred_by is not null and new.referred_by is distinct from old.referred_by then
    raise exception 'referral binding is immutable';
  end if;

  if old.referred_by is null
    and new.referred_by is not null
    and coalesce(current_setting('leadpayx.allow_referral_bind', true), '') <> 'on' then
    raise exception 'referral binding must use controlled function';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_referral_rebind on public.profiles;
create trigger profiles_prevent_referral_rebind
before update of referral_code, referred_by on public.profiles
for each row
execute function public.prevent_referral_rebind();

create or replace function public.validate_registration_code(submitted_code text)
returns table (
  valid boolean,
  kind text,
  referrer_name text
)
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  normalized_code text;
  link_row record;
  profile_row record;
begin
  normalized_code := upper(nullif(trim(coalesce(submitted_code, '')), ''));

  if normalized_code is null then
    return query select true, null::text, null::text;
    return;
  end if;

  if not public.get_boolean_setting('referral_bonus_enabled', true) then
    return query select false, null::text, null::text;
    return;
  end if;

  select rl.id, rl.captador_id, p.name
    into link_row
    from public.registration_links rl
    left join public.profiles p on p.id = rl.captador_id
   where rl.code = normalized_code
     and rl.role = 'captador'
     and rl.status = 'active'
     and (rl.expires_at is null or rl.expires_at > now())
     and (rl.max_uses is null or rl.uses_count < rl.max_uses)
   limit 1;

  if link_row.id is not null then
    return query select true, 'registration_link'::text, link_row.name::text;
    return;
  end if;

  select p.id, p.name
    into profile_row
    from public.profiles p
   where p.referral_code = normalized_code
     and p.role = 'captador'
     and p.status = 'active'
   limit 1;

  if profile_row.id is not null then
    return query select true, 'profile_referral_code'::text, profile_row.name::text;
    return;
  end if;

  return query select false, null::text, null::text;
end;
$$;

create or replace function public.bind_referral_code_once(submitted_code text)
returns table (
  status text,
  referrer_name text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  normalized_code text;
  current_profile public.profiles%rowtype;
  target_referrer_id uuid;
  target_referrer_name text;
  target_link_id uuid;
begin
  if actor_id is null then
    raise exception 'auth required';
  end if;

  normalized_code := upper(nullif(trim(coalesce(submitted_code, '')), ''));

  if normalized_code is null then
    return query select 'empty'::text, null::text;
    return;
  end if;

  if not public.get_boolean_setting('referral_bonus_enabled', true) then
    return query select 'disabled'::text, null::text;
    return;
  end if;

  select * into current_profile
  from public.profiles
  where id = actor_id
  for update;

  if current_profile.id is null then
    raise exception 'profile required';
  end if;

  if current_profile.referred_by is not null then
    select name into target_referrer_name
    from public.profiles
    where id = current_profile.referred_by;

    return query select 'already_bound'::text, target_referrer_name;
    return;
  end if;

  select rl.id, rl.captador_id, p.name
    into target_link_id, target_referrer_id, target_referrer_name
    from public.registration_links rl
    left join public.profiles p on p.id = rl.captador_id
   where rl.code = normalized_code
     and rl.role = 'captador'
     and rl.status = 'active'
     and (rl.expires_at is null or rl.expires_at > now())
     and (rl.max_uses is null or rl.uses_count < rl.max_uses)
   limit 1;

  if target_referrer_id is null then
    select p.id, p.name
      into target_referrer_id, target_referrer_name
      from public.profiles p
     where p.referral_code = normalized_code
       and p.role = 'captador'
       and p.status = 'active'
     limit 1;
  end if;

  if target_referrer_id is null then
    return query select 'invalid'::text, null::text;
    return;
  end if;

  if target_referrer_id = actor_id then
    return query select 'self_referral'::text, null::text;
    return;
  end if;

  perform set_config('leadpayx.allow_referral_bind', 'on', true);

  update public.profiles
     set referred_by = target_referrer_id,
         registration_link_id = coalesce(registration_link_id, target_link_id),
         updated_at = now()
   where id = actor_id
     and referred_by is null;

  if not found then
    return query select 'already_bound'::text, target_referrer_name;
    return;
  end if;

  if target_link_id is not null then
    update public.registration_links
       set uses_count = uses_count + 1,
           updated_at = now()
     where id = target_link_id
       and (max_uses is null or uses_count < max_uses);
  end if;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  values (
    actor_id,
    'referral.bound',
    'profile',
    actor_id,
    jsonb_build_object(
      'referrer_id', target_referrer_id,
      'registration_link_id', target_link_id,
      'source', 'manual_or_utm'
    )
  );

  return query select 'bound'::text, target_referrer_name;
end;
$$;

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

  bonus_amount := public.get_numeric_setting('referral_bonus_brl', 10);

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
      'earning_id', inserted_earning_id
    )
  );

  return inserted_earning_id;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  submitted_code text;
  referrer_id uuid;
  registration_link_id uuid;
  generated_code text;
  attempt int := 0;
  fallback_code text;
  fallback_attempt int := 0;
begin
  submitted_code := upper(nullif(trim(coalesce(
    meta->>'registration_code',
    meta->>'referral_code',
    meta->>'ref',
    ''
  )), ''));

  if submitted_code is not null and public.get_boolean_setting('referral_bonus_enabled', true) then
    begin
      select rl.id, rl.captador_id
        into registration_link_id, referrer_id
        from public.registration_links rl
       where rl.code = submitted_code
         and rl.role = 'captador'
         and rl.status = 'active'
         and (rl.expires_at is null or rl.expires_at > now())
         and (rl.max_uses is null or rl.uses_count < rl.max_uses)
       limit 1;

      if referrer_id is null then
        select p.id
          into referrer_id
          from public.profiles p
         where p.referral_code = submitted_code
           and p.role = 'captador'
           and p.status = 'active'
         limit 1;
      end if;
    exception
      when undefined_table or undefined_column then
        referrer_id := null;
        registration_link_id := null;
    end;
  end if;

  loop
    attempt := attempt + 1;
    generated_code := public.generate_referral_code();

    exit when generated_code is not null
      and not exists (
        select 1
          from public.profiles
         where referral_code = generated_code
      );

    if attempt >= 20 then
      generated_code := upper(substr(replace(new.id::text, '-', ''), 1, 10));
      exit;
    end if;
  end loop;

  insert into public.profiles(
    id,
    name,
    email,
    role,
    status,
    referral_code,
    referred_by,
    registration_link_id
  )
  values (
    new.id,
    nullif(trim(coalesce(meta->>'name', '')), ''),
    lower(nullif(trim(new.email), '')),
    'captador',
    'active',
    generated_code,
    referrer_id,
    registration_link_id
  )
  on conflict (id) do update
    set email = coalesce(excluded.email, profiles.email),
        name = coalesce(profiles.name, excluded.name),
        updated_at = now();

  if registration_link_id is not null then
    begin
      update public.registration_links
         set uses_count = uses_count + 1,
             updated_at = now()
       where id = registration_link_id
         and (max_uses is null or uses_count < max_uses);
    exception
      when others then
        null;
    end;
  end if;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  values (
    new.id,
    'auth.profile_created',
    'profile',
    new.id,
    jsonb_build_object(
      'registration_code', submitted_code,
      'registration_link_id', registration_link_id,
      'referrer_id', referrer_id
    )
  );

  return new;
exception
  when others then
    begin
      insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata)
      values (
        null,
        'auth.profile_trigger_recovered',
        'profile',
        new.id,
        jsonb_build_object('error', SQLERRM)
      );
    exception
      when others then
        null;
    end;

    loop
      fallback_attempt := fallback_attempt + 1;
      fallback_code := upper(substr(md5(new.id::text || clock_timestamp()::text || random()::text), 1, 10));

      begin
        insert into public.profiles(id, email, role, status, referral_code)
        values (
          new.id,
          lower(nullif(trim(new.email), '')),
          'captador',
          'active',
          fallback_code
        )
        on conflict (id) do nothing;

        exit;
      exception
        when unique_violation then
          if fallback_attempt >= 20 then
            exit;
          end if;
        when others then
          exit;
      end;
    end loop;

    return new;
end;
$$;

grant execute on function public.bind_referral_code_once(text) to authenticated;
grant execute on function public.validate_registration_code(text) to anon, authenticated;
grant execute on function public.check_and_generate_referral_bonus(uuid) to authenticated;

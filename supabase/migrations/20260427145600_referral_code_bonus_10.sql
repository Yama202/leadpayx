alter table public.earnings drop constraint if exists earnings_type_check;
alter table public.earnings add constraint earnings_type_check
  check (type in ('account_completed', 'operator_account_completed', 'referral_bonus'));

alter table public.earnings drop constraint if exists referral_earning_requires_user;
alter table public.earnings add constraint referral_earning_requires_user
  check (type <> 'referral_bonus' or referral_user_id is not null);

create unique index if not exists earnings_unique_referral_bonus
  on public.earnings(referral_user_id)
  where type = 'referral_bonus' and referral_user_id is not null;

insert into public.app_settings(key, value)
values
  ('referral_bonus_brl', '10'::jsonb),
  ('referral_completed_accounts_target', '2'::jsonb)
on conflict (key) do update
  set value = case
      when app_settings.key = 'referral_bonus_brl' then excluded.value
      else app_settings.value
    end,
    updated_at = case
      when app_settings.key = 'referral_bonus_brl' then now()
      else app_settings.updated_at
    end;

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

create or replace function public.trigger_check_referral_bonus_after_account_completed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'completed'
    and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform public.check_and_generate_referral_bonus(new.captador_id);
  end if;

  return new;
end;
$$;

drop trigger if exists accounts_referral_bonus_after_completed on public.accounts;
create trigger accounts_referral_bonus_after_completed
after insert or update of status on public.accounts
for each row
execute function public.trigger_check_referral_bonus_after_account_completed();

grant execute on function public.validate_registration_code(text) to anon, authenticated;
grant execute on function public.check_and_generate_referral_bonus(uuid) to authenticated;

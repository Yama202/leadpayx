create table if not exists public.registration_links (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  role text not null default 'captador' check (role in ('captador', 'operator')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  origin text,
  campaign text,
  captador_id uuid null references public.profiles(id) on delete set null,
  expires_at timestamptz,
  max_uses int check (max_uses is null or max_uses > 0),
  uses_count int not null default 0 check (uses_count >= 0),
  created_by uuid null references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registration_links_code_format check (code ~ '^[A-Z0-9_-]{4,32}$')
);

alter table public.profiles
  add column if not exists captador_commission_override numeric(12,2) check (captador_commission_override is null or captador_commission_override > 0),
  add column if not exists operator_commission_override numeric(12,2) check (operator_commission_override is null or operator_commission_override > 0),
  add column if not exists registration_link_id uuid null references public.registration_links(id) on delete set null;

alter table public.accounts
  add column if not exists account_print_path text,
  add column if not exists source_registration_link_id uuid null references public.registration_links(id) on delete set null;

create table if not exists public.payout_earnings (
  payout_id uuid not null references public.payouts(id) on delete cascade,
  earning_id uuid not null references public.earnings(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (payout_id, earning_id),
  unique (earning_id)
);

alter table public.earnings drop constraint if exists earnings_type_check;
alter table public.earnings add constraint earnings_type_check
  check (type in ('account_completed', 'operator_account_completed', 'referral_bonus'));

alter table public.earnings drop constraint if exists account_earning_requires_account;
alter table public.earnings add constraint account_earning_requires_account
  check (type not in ('account_completed', 'operator_account_completed') or account_id is not null);

drop index if exists public.earnings_unique_operator_account_completed;
create unique index earnings_unique_operator_account_completed
  on public.earnings(account_id)
  where type = 'operator_account_completed' and account_id is not null;

create index if not exists registration_links_status_idx on public.registration_links(status, expires_at);
create index if not exists registration_links_captador_idx on public.registration_links(captador_id);
create index if not exists accounts_print_path_idx on public.accounts(account_print_path) where account_print_path is not null;
create index if not exists payout_earnings_earning_idx on public.payout_earnings(earning_id);

insert into public.app_settings(key, value) values
  ('operator_commission_amount_brl', '10'::jsonb),
  ('require_new_account_print', 'false'::jsonb)
on conflict (key) do nothing;

drop trigger if exists registration_links_set_updated_at on public.registration_links;
create trigger registration_links_set_updated_at
before update on public.registration_links
for each row execute function public.set_updated_at();

create or replace function public.get_boolean_setting(setting_key text, fallback boolean)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select coalesce((select (value #>> '{}')::boolean from public.app_settings where key = setting_key), fallback);
$$;

create or replace function public.get_captador_commission(target_captador_id uuid)
returns numeric
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select coalesce(
    (select captador_commission_override from public.profiles where id = target_captador_id),
    public.get_numeric_setting('commission_amount_brl', 30)
  );
$$;

create or replace function public.get_operator_commission(target_operator_id uuid)
returns numeric
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select coalesce(
    (select operator_commission_override from public.profiles where id = target_operator_id),
    public.get_numeric_setting('operator_commission_amount_brl', 10)
  );
$$;

create or replace function public.enforce_account_print_requirement()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if current_user = 'postgres' then
    return new;
  end if;

  if public.get_boolean_setting('require_new_account_print', false)
    and length(coalesce(new.account_print_path, '')) = 0 then
    raise exception 'account print is required';
  end if;

  return new;
end;
$$;

drop trigger if exists accounts_enforce_print_requirement on public.accounts;
create trigger accounts_enforce_print_requirement
before insert on public.accounts
for each row execute function public.enforce_account_print_requirement();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  referrer_id uuid;
  generated_code text;
  submitted_code text;
  link_row public.registration_links%rowtype;
begin
  submitted_code := upper(nullif(coalesce(
    new.raw_user_meta_data->>'registration_code',
    new.raw_user_meta_data->>'referral_code'
  ), ''));

  if submitted_code is not null then
    select * into link_row
    from public.registration_links
    where code = submitted_code
      and status = 'active'
      and (expires_at is null or expires_at > now())
      and (max_uses is null or uses_count < max_uses)
    for update;

    if link_row.id is not null then
      referrer_id := link_row.captador_id;

      update public.registration_links
      set uses_count = uses_count + 1
      where id = link_row.id;
    else
      select id into referrer_id
      from public.profiles
      where referral_code = submitted_code
        and status = 'active'
      limit 1;
    end if;
  end if;

  loop
    generated_code := public.generate_referral_code();
    exit when not exists (
      select 1 from public.profiles where referral_code = generated_code
    );
  end loop;

  insert into public.profiles(id, name, email, role, referral_code, referred_by, registration_link_id)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'name', ''),
    new.email,
    coalesce(nullif(link_row.role, ''), 'captador'),
    generated_code,
    referrer_id,
    link_row.id
  )
  on conflict (id) do nothing;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  values (
    new.id,
    'auth.profile_created',
    'profile',
    new.id,
    jsonb_build_object('registration_code', submitted_code, 'registration_link_id', link_row.id)
  );

  return new;
end;
$$;

create or replace function public.protect_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if current_user = 'postgres' then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if new.id <> auth.uid()
    or new.role is distinct from old.role
    or new.status is distinct from old.status
    or new.referred_by is distinct from old.referred_by
    or new.referral_code is distinct from old.referral_code
    or new.referral_bonus_paid is distinct from old.referral_bonus_paid
    or new.registration_link_id is distinct from old.registration_link_id
    or new.captador_commission_override is distinct from old.captador_commission_override
    or new.operator_commission_override is distinct from old.operator_commission_override then
    raise exception 'profile update denied';
  end if;

  return new;
end;
$$;

create or replace function public.protect_account_updates()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_role text;
begin
  if current_user = 'postgres' then
    return new;
  end if;

  actor_role := public.current_user_role();

  if actor_role = 'admin' then
    return new;
  end if;

  if actor_role <> 'operator' or old.operador_id <> auth.uid() then
    raise exception 'account update denied';
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

  if new.status = 'rejected' and length(coalesce(new.rejection_reason, '')) < 8 then
    raise exception 'rejection reason is required';
  end if;

  return new;
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

  update public.accounts
  set status = 'in_progress',
      started_at = coalesce(started_at, now())
  where id = target_account_id;

  update public.operator_assignments
  set status = 'in_progress'
  where account_id = target_account_id;

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values ('account.started', 'account', target_account_id, jsonb_build_object('operator_id', account_row.operador_id));

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
    public.get_captador_commission(account_row.captador_id),
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

  update public.accounts
  set status = 'completed',
      started_at = coalesce(started_at, now()),
      completed_at = now()
  where id = target_account_id;

  update public.operator_assignments
  set status = 'completed'
  where account_id = target_account_id;

  perform public.generate_account_earning(target_account_id);
  perform public.check_and_generate_referral_bonus(account_row.captador_id);

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values ('account.completed', 'account', target_account_id, jsonb_build_object('operator_id', account_row.operador_id));

  return target_account_id;
end;
$$;

create or replace function public.ensure_pending_payout(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_role text;
  total_amount numeric(12,2);
  payout_id uuid;
begin
  actor_role := public.current_user_role();

  if actor_role <> 'admin' and target_user_id <> auth.uid() then
    raise exception 'payout creation denied';
  end if;

  select coalesce(sum(amount), 0) into total_amount
  from public.earnings
  where user_id = target_user_id
    and status = 'pending'
    and not exists (
      select 1 from public.payout_earnings pe where pe.earning_id = earnings.id
    );

  if total_amount <= 0 then
    raise exception 'no pending earnings';
  end if;

  insert into public.payouts(user_id, amount, status)
  values (target_user_id, total_amount, 'pending')
  on conflict do nothing
  returning id into payout_id;

  if payout_id is null then
    select id into payout_id
    from public.payouts
    where user_id = target_user_id and status = 'pending'
    order by created_at desc
    limit 1;
  end if;

  insert into public.payout_earnings(payout_id, earning_id)
  select payout_id, id
  from public.earnings
  where user_id = target_user_id
    and status = 'pending'
    and not exists (
      select 1 from public.payout_earnings pe where pe.earning_id = earnings.id
    )
  on conflict do nothing;

  update public.payouts
  set amount = (
    select coalesce(sum(e.amount), 0)
    from public.payout_earnings pe
    join public.earnings e on e.id = pe.earning_id
    where pe.payout_id = payout_id
  )
  where id = payout_id and status = 'pending';

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values ('payout.requested', 'payout', payout_id, jsonb_build_object('user_id', target_user_id));

  return payout_id;
end;
$$;

create or replace function public.mark_payout_as_processed(target_payout_id uuid, proof_path text default null, admin_notes text default null)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  payout_row public.payouts%rowtype;
begin
  if not public.is_admin() then
    raise exception 'admin required';
  end if;

  select * into payout_row
  from public.payouts
  where id = target_payout_id and status = 'pending'
  for update;

  if payout_row.id is null then
    return null;
  end if;

  if not exists (select 1 from public.payout_earnings where payout_id = target_payout_id) then
    raise exception 'payout has no linked earnings';
  end if;

  update public.payouts
  set status = 'processed',
      processed_at = now(),
      processed_by = auth.uid(),
      payment_proof_url = proof_path,
      notes = admin_notes
  where id = target_payout_id;

  update public.earnings e
  set status = 'paid',
      paid_at = now()
  where e.status = 'pending'
    and exists (
      select 1
      from public.payout_earnings pe
      where pe.payout_id = target_payout_id
        and pe.earning_id = e.id
    );

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values ('payout.processed', 'payout', target_payout_id, jsonb_build_object('user_id', payout_row.user_id, 'amount', payout_row.amount));

  return target_payout_id;
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
    'require_new_account_print'
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
  target_count numeric;
begin
  actor_role := public.current_user_role();

  if actor_role <> 'admin' and target_user_id <> auth.uid() then
    raise exception 'referral summary denied';
  end if;

  target_count := public.get_numeric_setting('referral_completed_accounts_target', 2);

  return query
  select
    p.id,
    p.name,
    p.created_at,
    count(a.id) filter (where a.status = 'completed') as completed_accounts,
    count(a.id) filter (where a.status = 'completed') >= target_count as qualified,
    p.referral_bonus_paid
  from public.profiles p
  left join public.accounts a on a.captador_id = p.id
  where p.referred_by = target_user_id
  group by p.id, p.name, p.created_at, p.referral_bonus_paid
  order by p.created_at desc;
end;
$$;

alter table public.registration_links enable row level security;
alter table public.payout_earnings enable row level security;

drop policy if exists "registration links admin full" on public.registration_links;
create policy "registration links admin full" on public.registration_links
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "registration links captador read own" on public.registration_links;
create policy "registration links captador read own" on public.registration_links
for select to authenticated
using (captador_id = auth.uid());

drop policy if exists "payout earnings admin full" on public.payout_earnings;
create policy "payout earnings admin full" on public.payout_earnings
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "payout earnings user read own" on public.payout_earnings;
create policy "payout earnings user read own" on public.payout_earnings
for select to authenticated
using (
  exists (
    select 1
    from public.payouts p
    where p.id = payout_earnings.payout_id
      and p.user_id = auth.uid()
  )
);

insert into storage.buckets(id, name, public)
values ('account-prints', 'account-prints', false)
on conflict (id) do nothing;

create policy "account prints captador upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'account-prints'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.current_user_role() = 'captador'
);

create policy "account prints captador read own"
on storage.objects for select to authenticated
using (
  bucket_id = 'account-prints'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "account prints admin read"
on storage.objects for select to authenticated
using (
  bucket_id = 'account-prints'
  and public.is_admin()
);

revoke execute on function public.get_boolean_setting(text, boolean) from public, anon;
revoke execute on function public.get_captador_commission(uuid) from public, anon;
revoke execute on function public.get_operator_commission(uuid) from public, anon;
grant execute on function public.start_account(uuid) to authenticated;
grant execute on function public.upsert_app_setting(text, jsonb) to authenticated;
grant execute on function public.get_referral_summary(uuid) to authenticated;

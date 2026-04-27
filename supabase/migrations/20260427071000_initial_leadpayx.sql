create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  role text not null default 'captador' check (role in ('admin', 'operator', 'captador')),
  instagram text,
  pix_key text,
  referral_code text not null unique,
  referred_by uuid null references public.profiles(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  referral_bonus_paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  captador_id uuid not null references public.profiles(id) on delete restrict,
  operador_id uuid null references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'assigned', 'in_progress', 'completed', 'rejected')),
  account_identifier text not null,
  account_notes text,
  rejection_reason text,
  created_at timestamptz not null default now(),
  assigned_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  rejected_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint rejected_requires_reason check (status <> 'rejected' or length(coalesce(rejection_reason, '')) >= 8),
  constraint completed_has_timestamp check (status <> 'completed' or completed_at is not null)
);

create table public.earnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  account_id uuid null references public.accounts(id) on delete set null,
  referral_user_id uuid null references public.profiles(id) on delete set null,
  type text not null check (type in ('account_completed', 'referral_bonus')),
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'canceled')),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  constraint account_earning_requires_account check (type <> 'account_completed' or account_id is not null),
  constraint referral_earning_requires_user check (type <> 'referral_bonus' or referral_user_id is not null)
);

create unique index earnings_unique_account_completed
  on public.earnings(account_id)
  where type = 'account_completed' and account_id is not null;

create unique index earnings_unique_referral_bonus
  on public.earnings(referral_user_id)
  where type = 'referral_bonus' and referral_user_id is not null;

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'processed')),
  payment_proof_url text,
  notes text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid null references public.profiles(id) on delete set null,
  constraint processed_requires_admin check (status <> 'processed' or processed_by is not null)
);

create table public.operator_assignments (
  id uuid primary key default gen_random_uuid(),
  operador_id uuid not null references public.profiles(id) on delete restrict,
  account_id uuid not null references public.accounts(id) on delete cascade,
  status text not null default 'assigned' check (status in ('assigned', 'in_progress', 'completed', 'rejected')),
  created_at timestamptz not null default now(),
  unique(account_id)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references public.profiles(id) on delete set null default auth.uid(),
  action text not null,
  entity_type text not null,
  entity_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.app_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings(key, value) values
  ('commission_amount_brl', '30'::jsonb),
  ('referral_bonus_brl', '60'::jsonb),
  ('referral_completed_accounts_target', '2'::jsonb)
on conflict (key) do nothing;

create index profiles_role_status_idx on public.profiles(role, status);
create index profiles_referred_by_idx on public.profiles(referred_by);
create index accounts_captador_status_idx on public.accounts(captador_id, status, created_at desc);
create index accounts_operador_status_idx on public.accounts(operador_id, status, created_at desc);
create index accounts_pending_idx on public.accounts(created_at) where status = 'pending';
create index earnings_user_status_idx on public.earnings(user_id, status, created_at desc);
create index payouts_user_status_idx on public.payouts(user_id, status, created_at desc);
create unique index payouts_one_pending_per_user
  on public.payouts(user_id)
  where status = 'pending';
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

create or replace function public.generate_referral_code()
returns text
language sql
as $$
  select upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10));
$$;

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select role from public.profiles where id = auth.uid() and status = 'active';
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

create or replace function public.get_numeric_setting(setting_key text, fallback numeric)
returns numeric
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select coalesce((select (value #>> '{}')::numeric from public.app_settings where key = setting_key), fallback);
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  referrer_id uuid;
  generated_code text;
begin
  if new.raw_user_meta_data ? 'referral_code' then
    select id into referrer_id
    from public.profiles
    where referral_code = upper(new.raw_user_meta_data->>'referral_code')
      and status = 'active'
    limit 1;
  end if;

  loop
    generated_code := public.generate_referral_code();
    exit when not exists (
      select 1 from public.profiles where referral_code = generated_code
    );
  end loop;

  insert into public.profiles(id, name, email, role, referral_code, referred_by)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'name', ''),
    new.email,
    'captador',
    generated_code,
    referrer_id
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

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
    or new.referral_bonus_paid is distinct from old.referral_bonus_paid then
    raise exception 'profile update denied';
  end if;

  return new;
end;
$$;

create trigger profiles_protect_sensitive_fields
before update on public.profiles
for each row execute function public.protect_profile_sensitive_fields();

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
    or coalesce(new.account_notes, '') is distinct from coalesce(old.account_notes, '') then
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

create trigger accounts_protect_updates
before update on public.accounts
for each row execute function public.protect_account_updates();

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

  select p.id into chosen_operator
  from public.profiles p
  left join public.accounts a
    on a.operador_id = p.id
    and a.status in ('assigned', 'in_progress', 'completed')
  where p.role = 'operator'
    and p.status = 'active'
  group by p.id, p.created_at
  order by
    count(a.id) asc,
    count(a.id) filter (where a.status = 'in_progress') asc,
    p.created_at asc,
    p.id asc
  limit 1;

  if chosen_operator is null then
    return null;
  end if;

  update public.accounts
  set operador_id = chosen_operator,
      status = 'assigned',
      assigned_at = coalesce(assigned_at, now())
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
  values ('account.assigned', 'account', updated_account, jsonb_build_object('operador_id', chosen_operator));

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
        assigned_at = now()
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

create or replace function public.generate_account_earning(target_account_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  account_row public.accounts%rowtype;
  earning_id uuid;
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
    public.get_numeric_setting('commission_amount_brl', 30),
    'pending'
  )
  on conflict do nothing
  returning id into earning_id;

  return earning_id;
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
  target_count numeric;
  earning_id uuid;
begin
  select * into indicated from public.profiles where id = target_captador_id;

  if indicated.id is null or indicated.referred_by is null or indicated.referral_bonus_paid then
    return null;
  end if;

  select count(*) into completed_count
  from public.accounts
  where captador_id = target_captador_id and status = 'completed';

  target_count := public.get_numeric_setting('referral_completed_accounts_target', 2);

  if completed_count < target_count then
    return null;
  end if;

  update public.profiles
  set referral_bonus_paid = true
  where id = target_captador_id and referral_bonus_paid = false;

  insert into public.earnings(user_id, referral_user_id, type, amount, status)
  values (
    indicated.referred_by,
    target_captador_id,
    'referral_bonus',
    public.get_numeric_setting('referral_bonus_brl', 60),
    'pending'
  )
  on conflict do nothing
  returning id into earning_id;

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values ('earning.referral_bonus_generated', 'profile', target_captador_id, jsonb_build_object('referrer_id', indicated.referred_by));

  return earning_id;
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

create or replace function public.reject_account(target_account_id uuid, reason text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  account_row public.accounts%rowtype;
  actor_role text;
begin
  if length(coalesce(reason, '')) < 8 then
    raise exception 'rejection reason is required';
  end if;

  actor_role := public.current_user_role();

  select * into account_row
  from public.accounts
  where id = target_account_id
  for update;

  if account_row.id is null then
    return null;
  end if;

  if actor_role <> 'admin' and (actor_role <> 'operator' or account_row.operador_id <> auth.uid()) then
    raise exception 'rejection denied';
  end if;

  if account_row.status not in ('assigned', 'in_progress') then
    raise exception 'invalid account status for rejection';
  end if;

  update public.accounts
  set status = 'rejected',
      rejection_reason = reason,
      rejected_at = now()
  where id = target_account_id;

  update public.operator_assignments
  set status = 'rejected'
  where account_id = target_account_id;

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values ('account.rejected', 'account', target_account_id, jsonb_build_object('reason', reason));

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
  where user_id = target_user_id and status = 'pending';

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

  update public.payouts
  set status = 'processed',
      processed_at = now(),
      processed_by = auth.uid(),
      payment_proof_url = proof_path,
      notes = admin_notes
  where id = target_payout_id;

  update public.earnings
  set status = 'paid',
      paid_at = now()
  where user_id = payout_row.user_id and status = 'pending';

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values ('payout.processed', 'payout', target_payout_id, jsonb_build_object('user_id', payout_row.user_id, 'amount', payout_row.amount));

  return target_payout_id;
end;
$$;

create or replace function public.get_referral_count(target_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  actor_role text;
  total int;
begin
  actor_role := public.current_user_role();

  if actor_role <> 'admin' and target_user_id <> auth.uid() then
    raise exception 'referral count denied';
  end if;

  select count(*) into total
  from public.profiles
  where referred_by = target_user_id;

  return total;
end;
$$;

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.earnings enable row level security;
alter table public.payouts enable row level security;
alter table public.operator_assignments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.app_settings enable row level security;

create policy "profiles admin full" on public.profiles
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "profiles own read" on public.profiles
for select to authenticated
using (id = auth.uid());

create policy "profiles own safe update" on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "accounts admin full" on public.accounts
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "accounts captador insert own" on public.accounts
for insert to authenticated
with check (
  public.current_user_role() = 'captador'
  and captador_id = auth.uid()
  and operador_id is null
  and status = 'pending'
);

create policy "accounts captador read own" on public.accounts
for select to authenticated
using (captador_id = auth.uid());

create policy "accounts operator read assigned" on public.accounts
for select to authenticated
using (operador_id = auth.uid() and public.current_user_role() = 'operator');

create policy "accounts operator update assigned" on public.accounts
for update to authenticated
using (operador_id = auth.uid() and public.current_user_role() = 'operator')
with check (operador_id = auth.uid() and public.current_user_role() = 'operator');

create policy "earnings admin full" on public.earnings
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "earnings user read own" on public.earnings
for select to authenticated
using (user_id = auth.uid());

create policy "payouts admin full" on public.payouts
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "payouts user read own" on public.payouts
for select to authenticated
using (user_id = auth.uid());

create policy "operator assignments admin full" on public.operator_assignments
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "operator assignments operator read own" on public.operator_assignments
for select to authenticated
using (operador_id = auth.uid());

create policy "audit logs admin read" on public.audit_logs
for select to authenticated
using (public.is_admin());

create policy "audit logs authenticated insert own" on public.audit_logs
for insert to authenticated
with check (user_id = auth.uid() or user_id is null);

create policy "app settings admin full" on public.app_settings
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets(id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

create policy "payment proofs admin upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'payment-proofs'
  and public.is_admin()
);

create policy "payment proofs admin read"
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-proofs'
  and public.is_admin()
);

create policy "payment proofs owner read processed payout"
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-proofs'
  and exists (
    select 1
    from public.payouts p
    where p.payment_proof_url = storage.objects.name
      and p.user_id = auth.uid()
      and p.status = 'processed'
  )
);

revoke execute on function public.current_user_role() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.get_numeric_setting(text, numeric) from public, anon;
grant execute on function public.assign_account_to_operator(uuid) to authenticated;
grant execute on function public.assign_next_batch_to_operator(uuid, int) to authenticated;
grant execute on function public.complete_account(uuid) to authenticated;
grant execute on function public.reject_account(uuid, text) to authenticated;
grant execute on function public.generate_account_earning(uuid) to authenticated;
grant execute on function public.check_and_generate_referral_bonus(uuid) to authenticated;
grant execute on function public.ensure_pending_payout(uuid) to authenticated;
grant execute on function public.mark_payout_as_processed(uuid, text, text) to authenticated;
grant execute on function public.get_referral_count(uuid) to authenticated;

-- 1) Chave Pix obrigatória para solicitar payout (fail-closed no servidor).
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
  pix_ok boolean;
begin
  actor_role := public.current_user_role();

  if actor_role <> 'admin' and target_user_id <> auth.uid() then
    raise exception 'payout creation denied';
  end if;

  select coalesce(length(trim(coalesce(p.pix_key, ''))) >= 3, false)
    into pix_ok
    from public.profiles p
   where p.id = target_user_id;

  if not coalesce(pix_ok, false) then
    raise exception 'pix_key_required' using errcode = 'P0001';
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

-- 2) Metas escalonadas de bônus por indicação qualificada:
--    Regra: cada linha referral_bonus = um indicado qualificado (cumpriu N contas).
--    Os primeiros (tier2_after) bônus usam referral_bonus_brl; a partir do (tier2_after+1)-ésimo,
--    usa referral_bonus_tier2_brl (configurável no admin / app_settings).
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
  tier2_after int;
  tier1_amt numeric;
  tier2_amt numeric;
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

  tier2_after := greatest(public.get_numeric_setting('referral_bonus_tier2_after_qualified_count', 999)::int, 0);
  tier1_amt := public.get_numeric_setting('referral_bonus_brl', 10);
  tier2_amt := public.get_numeric_setting('referral_bonus_tier2_brl', tier1_amt);

  select count(*)::int into prior_qualified
  from public.earnings
  where user_id = indicated.referred_by
    and type = 'referral_bonus'
    and referral_user_id is not null
    and referral_user_id <> target_captador_id;

  if prior_qualified >= tier2_after then
    bonus_amount := tier2_amt;
  else
    bonus_amount := tier1_amt;
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
      'tier2_threshold', tier2_after
    )
  );

  return inserted_earning_id;
end;
$$;

-- 3) Admin: solicitar envios com comprovante de depósito mínimo (BRL) por captador.
create table if not exists public.captador_submission_briefs (
  captador_id uuid primary key references public.profiles(id) on delete cascade,
  min_deposit_brl numeric(12,2) not null check (min_deposit_brl > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create index if not exists captador_submission_briefs_updated_idx
  on public.captador_submission_briefs(updated_at desc);

alter table public.captador_submission_briefs enable row level security;

drop policy if exists "captador submission briefs admin all" on public.captador_submission_briefs;
create policy "captador submission briefs admin all"
  on public.captador_submission_briefs
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "captador submission briefs captador read own" on public.captador_submission_briefs;
create policy "captador submission briefs captador read own"
  on public.captador_submission_briefs
  for select
  to authenticated
  using (captador_id = auth.uid());

grant select, insert, update, delete on public.captador_submission_briefs to authenticated;

-- 4) Novas chaves de settings (whitelist em upsert_app_setting).
insert into public.app_settings(key, value)
select 'referral_bonus_tier2_brl', value
from public.app_settings where key = 'referral_bonus_brl'
limit 1
on conflict (key) do nothing;

insert into public.app_settings(key, value) values
  ('referral_bonus_tier2_after_qualified_count', '999'::jsonb)
on conflict (key) do nothing;

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

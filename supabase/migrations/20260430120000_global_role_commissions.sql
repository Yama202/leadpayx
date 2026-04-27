-- Comissões globais por papel: chaves canônicas + remoção de override por perfil no cálculo.
-- Política: valores em `earnings.amount` são congelados na criação; mudanças de parâmetro
-- não alteram linhas já existentes (pendentes ou pagas). Apenas novos ganhos usam o valor vigente.

insert into public.app_settings(key, value)
select 'captador_commission_per_account', value
from public.app_settings where key = 'commission_amount_brl'
on conflict (key) do nothing;

insert into public.app_settings(key, value)
select 'operator_commission_per_account', value
from public.app_settings where key = 'operator_commission_amount_brl'
on conflict (key) do nothing;

-- Garantir defaults se originais não existirem
insert into public.app_settings(key, value) values
  ('captador_commission_per_account', '30'::jsonb),
  ('operator_commission_per_account', '10'::jsonb)
on conflict (key) do nothing;

-- Legado: remover overrides por usuário (comissão passa a ser só global + opcional por link de cadastro)
update public.profiles
set captador_commission_override = null,
    operator_commission_override = null
where captador_commission_override is not null
   or operator_commission_override is not null;

create or replace function public.get_captador_commission(target_captador_id uuid, target_account_id uuid)
returns numeric
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  /*
    Precedência:
    1. override do link de captação que originou a conta (campanha);
    2. comissão global captador (captador_commission_per_account), com fallback ao legado commission_amount_brl.
    Overrides em profiles foram descontinuados para cálculo.
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
    public.get_numeric_setting(
      'captador_commission_per_account',
      public.get_numeric_setting('commission_amount_brl', 30)
    )
  );
$$;

create or replace function public.get_operator_commission(target_operator_id uuid)
returns numeric
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select public.get_numeric_setting(
    'operator_commission_per_account',
    public.get_numeric_setting('operator_commission_amount_brl', 10)
  );
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

-- Impede novos overrides de comissão em perfil (fonte única: settings globais + link de cadastro).
create or replace function public.protect_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if session_user = 'postgres' then
    return new;
  end if;

  if public.is_admin() then
    if (
      new.role is distinct from old.role
      or (
        old.role = 'admin'
        and new.status is distinct from old.status
      )
    )
    and coalesce(current_setting('app.allow_admin_role_change', true), '') <> 'on' then
      raise exception 'admin role changes require audited function';
    end if;

    if new.captador_commission_override is not null
      or new.operator_commission_override is not null then
      raise exception 'profile commission overrides are disabled; use global commission settings';
    end if;

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

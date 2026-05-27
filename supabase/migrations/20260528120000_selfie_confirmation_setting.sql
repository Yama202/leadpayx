-- Adiciona require_selfie_confirmation e selfie_confirmation_message
-- à whitelist do upsert_app_setting.

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
    'require_selfie_confirmation',
    'selfie_confirmation_message'
  ) then
    raise exception 'setting key denied';
  end if;

  select value into previous
  from public.app_settings
  where key = setting_key;

  insert into public.app_settings(key, value, updated_by)
  values (setting_key, setting_value, auth.uid())
  on conflict (key) do update
    set value = excluded.value,
        updated_by = excluded.updated_by,
        updated_at = now();

  select auth.uid() into actor;

  insert into public.audit_logs(user_id, action, metadata)
  values (
    actor,
    'settings.updated',
    jsonb_build_object(
      'key', setting_key,
      'previous', previous,
      'next', setting_value
    )
  );
end;
$$;

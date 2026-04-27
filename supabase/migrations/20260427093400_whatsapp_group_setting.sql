insert into public.app_settings(key, value) values
  ('whatsapp_group_url', 'null'::jsonb)
on conflict (key) do nothing;

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
    'require_new_account_print',
    'operator_min_completed_accounts',
    'operational_min_batch_size',
    'whatsapp_group_url'
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

create or replace function public.get_public_app_setting(setting_key text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  setting_value text;
begin
  if setting_key not in ('whatsapp_group_url') then
    raise exception 'setting key denied';
  end if;

  select nullif(value #>> '{}', '')
    into setting_value
    from public.app_settings
   where key = setting_key;

  return setting_value;
end;
$$;

grant execute on function public.get_public_app_setting(text) to anon, authenticated;

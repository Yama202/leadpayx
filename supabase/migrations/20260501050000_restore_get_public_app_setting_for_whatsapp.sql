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

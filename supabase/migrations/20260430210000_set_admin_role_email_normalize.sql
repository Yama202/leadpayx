-- Normaliza comparação de e-mail na RPC set_admin_role (trim + lower em profiles.email).
-- Evita "target profile not found" quando há espaços à esquerda/direita gravados em profiles.

create or replace function public.set_admin_role(target_email text, make_admin boolean)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  normalized_email text := lower(trim(target_email));
  target_profile public.profiles%rowtype;
  remaining_admins integer;
  bootstrap_admin_email constant text := 'yamafonseca2003@gmail.com';
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'admin required';
  end if;

  if normalized_email = '' then
    raise exception 'target email required';
  end if;

  select *
  into target_profile
  from public.profiles
  where lower(trim(email)) = normalized_email
  limit 1;

  if target_profile.id is null then
    raise exception 'target profile not found';
  end if;

  perform set_config('app.allow_admin_role_change', 'on', true);

  if make_admin then
    update public.profiles
    set role = 'admin',
        status = 'active',
        updated_at = now()
    where id = target_profile.id;

    insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata)
    values (
      actor_id,
      'admin.promoted',
      'profile',
      target_profile.id,
      jsonb_build_object('target_email', normalized_email)
    );
  else
    if normalized_email = bootstrap_admin_email then
      raise exception 'bootstrap admin cannot be revoked';
    end if;

    if target_profile.id = actor_id then
      raise exception 'self admin revocation denied';
    end if;

    select count(*)
    into remaining_admins
    from public.profiles
    where role = 'admin'
      and status = 'active'
      and id <> target_profile.id;

    if remaining_admins < 1 then
      raise exception 'cannot revoke last active admin';
    end if;

    update public.profiles
    set role = 'captador',
        status = 'active',
        updated_at = now()
    where id = target_profile.id;

    insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata)
    values (
      actor_id,
      'admin.revoked',
      'profile',
      target_profile.id,
      jsonb_build_object('target_email', normalized_email)
    );
  end if;

  return target_profile.id;
end;
$$;

revoke execute on function public.set_admin_role(text, boolean) from public, anon;
grant execute on function public.set_admin_role(text, boolean) to authenticated;

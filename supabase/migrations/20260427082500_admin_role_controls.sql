update public.profiles
set role = 'admin',
    status = 'active',
    updated_at = now()
where lower(email) = 'yamafonseca2003@gmail.com';

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

create or replace function public.enforce_account_print_requirement()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if session_user = 'postgres' then
    return new;
  end if;

  if public.get_boolean_setting('require_new_account_print', false)
    and length(coalesce(new.account_print_path, '')) = 0 then
    raise exception 'account print is required';
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
  if session_user = 'postgres' then
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
  where lower(email) = normalized_email
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

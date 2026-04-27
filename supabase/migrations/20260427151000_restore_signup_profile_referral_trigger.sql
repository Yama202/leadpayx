create extension if not exists "pgcrypto";

create or replace function public.generate_referral_code()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  generated_code text;
begin
  begin
    generated_code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10));
  exception
    when undefined_function or insufficient_privilege then
      generated_code := null;
  end;

  if generated_code is null or length(generated_code) < 10 then
    generated_code := upper(substr(md5(clock_timestamp()::text || random()::text || txid_current()::text), 1, 10));
  end if;

  return generated_code;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  submitted_code text;
  referrer_id uuid;
  registration_link_id uuid;
  generated_code text;
  attempt int := 0;
  fallback_code text;
  fallback_attempt int := 0;
begin
  submitted_code := upper(nullif(trim(coalesce(
    meta->>'registration_code',
    meta->>'referral_code',
    ''
  )), ''));

  if submitted_code is not null then
    begin
      select rl.id, rl.captador_id
        into registration_link_id, referrer_id
        from public.registration_links rl
       where rl.code = submitted_code
         and rl.role = 'captador'
         and rl.status = 'active'
         and (rl.expires_at is null or rl.expires_at > now())
         and (rl.max_uses is null or rl.uses_count < rl.max_uses)
       limit 1;

      if referrer_id is null then
        select p.id
          into referrer_id
          from public.profiles p
         where p.referral_code = submitted_code
           and p.role = 'captador'
           and p.status = 'active'
         limit 1;
      end if;
    exception
      when undefined_table or undefined_column then
        referrer_id := null;
        registration_link_id := null;
    end;
  end if;

  loop
    attempt := attempt + 1;
    generated_code := public.generate_referral_code();

    exit when generated_code is not null
      and not exists (
        select 1
          from public.profiles
         where referral_code = generated_code
      );

    if attempt >= 20 then
      generated_code := upper(substr(replace(new.id::text, '-', ''), 1, 10));
      exit;
    end if;
  end loop;

  insert into public.profiles(
    id,
    name,
    email,
    role,
    status,
    referral_code,
    referred_by,
    registration_link_id
  )
  values (
    new.id,
    nullif(trim(coalesce(meta->>'name', '')), ''),
    lower(nullif(trim(new.email), '')),
    'captador',
    'active',
    generated_code,
    referrer_id,
    registration_link_id
  )
  on conflict (id) do update
    set email = coalesce(excluded.email, profiles.email),
        name = coalesce(profiles.name, excluded.name),
        referred_by = coalesce(profiles.referred_by, excluded.referred_by),
        registration_link_id = coalesce(profiles.registration_link_id, excluded.registration_link_id),
        updated_at = now();

  if registration_link_id is not null then
    begin
      update public.registration_links
         set uses_count = uses_count + 1,
             updated_at = now()
       where id = registration_link_id
         and (max_uses is null or uses_count < max_uses);
    exception
      when others then
        null;
    end;
  end if;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  values (
    new.id,
    'auth.profile_created',
    'profile',
    new.id,
    jsonb_build_object(
      'registration_code', submitted_code,
      'registration_link_id', registration_link_id,
      'referrer_id', referrer_id
    )
  );

  return new;
exception
  when others then
    begin
      insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata)
      values (
        null,
        'auth.profile_trigger_recovered',
        'profile',
        new.id,
        jsonb_build_object('error', SQLERRM)
      );
    exception
      when others then
        null;
    end;

    loop
      fallback_attempt := fallback_attempt + 1;
      fallback_code := upper(substr(md5(new.id::text || clock_timestamp()::text || random()::text), 1, 10));

      begin
        insert into public.profiles(id, email, role, status, referral_code)
        values (
          new.id,
          lower(nullif(trim(new.email), '')),
          'captador',
          'active',
          fallback_code
        )
        on conflict (id) do nothing;

        exit;
      exception
        when unique_violation then
          if fallback_attempt >= 20 then
            exit;
          end if;
        when others then
          exit;
      end;
    end loop;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

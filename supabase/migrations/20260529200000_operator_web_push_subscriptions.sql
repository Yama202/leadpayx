create table if not exists public.operator_web_push_subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  endpoint            text not null unique,
  p256dh              text not null,
  auth                text not null,
  user_agent          text,
  created_at          timestamptz not null default now(),
  last_registered_at  timestamptz not null default now()
);

create index if not exists operator_web_push_subscriptions_user_id_idx
  on public.operator_web_push_subscriptions(user_id);

alter table public.operator_web_push_subscriptions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'operator_web_push_subscriptions'
      and policyname = 'operator own push subscriptions'
  ) then
    execute $p$
      create policy "operator own push subscriptions"
        on public.operator_web_push_subscriptions
        for all to authenticated
        using (user_id = auth.uid() and public.current_user_role() in ('operator', 'admin'))
        with check (user_id = auth.uid() and public.current_user_role() in ('operator', 'admin'))
    $p$;
  end if;
end;
$$;

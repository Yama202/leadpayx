create table if not exists public.admin_web_push_subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  endpoint            text not null unique,
  p256dh              text not null,
  auth                text not null,
  user_agent          text,
  created_at          timestamptz not null default now(),
  last_registered_at  timestamptz not null default now()
);

create index if not exists admin_web_push_subscriptions_user_id_idx
  on public.admin_web_push_subscriptions(user_id);

alter table public.admin_web_push_subscriptions enable row level security;

create policy "admin own push subscriptions"
  on public.admin_web_push_subscriptions
  for all to authenticated
  using (user_id = auth.uid() and public.is_admin())
  with check (user_id = auth.uid() and public.is_admin());

-- Web Push: subscriptions dos captadores + idempotência de envio ao fechar conta (uma rajada por account_id).

create table public.captador_web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_registered_at timestamptz not null default now()
);

create unique index captador_web_push_subscriptions_endpoint_key
  on public.captador_web_push_subscriptions (endpoint);

create index captador_web_push_subscriptions_user_idx
  on public.captador_web_push_subscriptions (user_id);

comment on table public.captador_web_push_subscriptions is
  'Chaves Web Push (endpoint + subscription keys) por utilizador captador auth. Servidor usa service_role para enviar.';

alter table public.captador_web_push_subscriptions enable row level security;

-- Apenas captadores ligam/removem as suas subscrições
create policy "captador_web_push_subscriptions_select_own_captador"
on public.captador_web_push_subscriptions
for select
to authenticated
using (
  user_id = auth.uid()
  and public.current_user_role() = 'captador'
);

create policy "captador_web_push_subscriptions_insert_own_captador"
on public.captador_web_push_subscriptions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.current_user_role() = 'captador'
);

create policy "captador_web_push_subscriptions_delete_own_captador"
on public.captador_web_push_subscriptions
for delete
to authenticated
using (
  user_id = auth.uid()
  and public.current_user_role() = 'captador'
);

create policy "captador_web_push_subscriptions_update_own_captador"
on public.captador_web_push_subscriptions
for update
to authenticated
using (
  user_id = auth.uid()
  and public.current_user_role() = 'captador'
)
with check (
  user_id = auth.uid()
  and public.current_user_role() = 'captador'
);

-- Uma entrada por conta finalizada: evita reenviar push em retries do mesmo RPC/HTTP ou duplo envio técnico
create table public.captador_completion_push_delivery (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  captador_user_id uuid not null references public.profiles(id) on delete cascade,
  dispatched_at timestamptz not null default now(),
  subscriptions_targeted integer not null default 0
);

comment on table public.captador_completion_push_delivery is
  'Marca tentativa única de push web por conta concluída (idempotência). Escrito apenas via service_role.';

alter table public.captador_completion_push_delivery enable row level security;
-- Sem policies para authenticated → apenas bypass service_role/postgres maint

grant select, insert, update, delete on public.captador_web_push_subscriptions to authenticated;

revoke all on public.captador_completion_push_delivery from authenticated;
revoke all on public.captador_completion_push_delivery from anon;

select pg_notify('pgrst', 'reload schema');

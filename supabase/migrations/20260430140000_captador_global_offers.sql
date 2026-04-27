-- Ofertas globais de operação para captadores (URLs externas + UTM no app).
-- Operador: sem política de leitura (RLS negado). Admin: CRUD. Captador: leitura só ativas.

create table public.captador_global_offers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) >= 2),
  url_base text not null check (url_base ~ '^https://'),
  is_active boolean not null default true,
  sort_order int not null default 100 check (sort_order >= 0 and sort_order <= 999999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index captador_global_offers_active_order_idx
  on public.captador_global_offers(is_active, sort_order, created_at desc);

drop trigger if exists captador_global_offers_set_updated_at on public.captador_global_offers;
create trigger captador_global_offers_set_updated_at
before update on public.captador_global_offers
for each row execute function public.set_updated_at();

insert into public.captador_global_offers(name, url_base, is_active, sort_order) values
  (
    'Br Sporting Bet',
    'https://brsportingbet.net/registro14317',
    true,
    10
  ),
  (
    'Jonbet RF',
    'https://jonbet.cxclick.com/visit/?bta=77042&nci=5421&utm_campaign=RF1002',
    true,
    20
  );

alter table public.captador_global_offers enable row level security;

drop policy if exists "captador global offers admin full" on public.captador_global_offers;
create policy "captador global offers admin full"
on public.captador_global_offers
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "captador global offers captador read active" on public.captador_global_offers;
create policy "captador global offers captador read active"
on public.captador_global_offers
for select
to authenticated
using (
  public.current_user_role() = 'captador'
  and is_active = true
);

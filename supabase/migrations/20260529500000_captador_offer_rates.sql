-- Comissão personalizada por captador + oferta.
-- Precedência em get_captador_commission:
--   1. captador_offer_rates (captador + oferta específica)  ← NOVO
--   2. registration_links.captador_commission_override      (existente)
--   3. captador_commission_per_account global               (existente)

-- Garante a coluna de override do link de cadastro (pode faltar em produção).
alter table public.registration_links
  add column if not exists captador_commission_override numeric(12,2)
  check (captador_commission_override is null or captador_commission_override > 0);

-- ── Tabela ────────────────────────────────────────────────────────────────────
create table public.captador_offer_rates (
  id           uuid primary key default gen_random_uuid(),
  captador_id  uuid not null references public.profiles(id) on delete cascade,
  offer_id     uuid not null references public.promotion_offers(id) on delete cascade,
  commission_amount numeric(12,2) not null check (commission_amount >= 0),
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint captador_offer_rates_unique unique (captador_id, offer_id)
);

create index captador_offer_rates_captador_idx on public.captador_offer_rates(captador_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.captador_offer_rates enable row level security;

create policy "admin full access"
  on public.captador_offer_rates
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── RPC: upsert ──────────────────────────────────────────────────────────────
create or replace function public.set_captador_offer_rate(
  p_captador_id uuid,
  p_offer_id    uuid,
  p_amount      numeric
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'admin required';
  end if;

  if p_amount < 0 then
    raise exception 'commission amount cannot be negative';
  end if;

  insert into public.captador_offer_rates(captador_id, offer_id, commission_amount, created_by)
  values (p_captador_id, p_offer_id, p_amount, auth.uid())
  on conflict (captador_id, offer_id) do update
    set commission_amount = excluded.commission_amount,
        updated_at        = now()
  returning id into v_id;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'captador_offer_rate.set',
    'captador_offer_rate',
    v_id,
    jsonb_build_object(
      'captador_id', p_captador_id,
      'offer_id',    p_offer_id,
      'amount',      p_amount
    )
  );

  return v_id;
end;
$$;

-- ── RPC: delete ───────────────────────────────────────────────────────────────
create or replace function public.delete_captador_offer_rate(
  p_captador_id uuid,
  p_offer_id    uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'admin required';
  end if;

  delete from public.captador_offer_rates
  where captador_id = p_captador_id and offer_id = p_offer_id
  returning id into v_id;

  if v_id is not null then
    insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(),
      'captador_offer_rate.deleted',
      'captador_offer_rate',
      v_id,
      jsonb_build_object('captador_id', p_captador_id, 'offer_id', p_offer_id)
    );
  end if;

  return v_id is not null;
end;
$$;

grant execute on function public.set_captador_offer_rate(uuid, uuid, numeric) to authenticated;
grant execute on function public.delete_captador_offer_rate(uuid, uuid) to authenticated;

-- ── get_captador_commission: adiciona precedência 1 ───────────────────────────
create or replace function public.get_captador_commission(target_captador_id uuid, target_account_id uuid)
returns numeric
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  /*
    Precedência:
    1. captador_offer_rates — override admin por captador + oferta específica;
    2. registration_links.captador_commission_override — override por link de captação;
    3. captador_commission_per_account global.
  */
  select coalesce(
    -- 1. override por captador + oferta
    (
      select cor.commission_amount
      from public.captador_offer_rates cor
      join public.accounts a on a.id = target_account_id
      where cor.captador_id = target_captador_id
        and cor.offer_id    = a.promotion_offer_id
      limit 1
    ),
    -- 2. override por link de cadastro
    (
      select rl.captador_commission_override
      from public.accounts a
      join public.registration_links rl on rl.id = a.source_registration_link_id
      where a.id         = target_account_id
        and a.captador_id = target_captador_id
        and rl.captador_commission_override is not null
      limit 1
    ),
    -- 3. comissão global
    public.get_numeric_setting(
      'captador_commission_per_account',
      public.get_numeric_setting('commission_amount_brl', 30)
    )
  );
$$;

select pg_notify('pgrst', 'reload schema');

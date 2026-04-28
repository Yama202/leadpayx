-- Remoção definitiva de ordenação manual em links de operação.
-- Critério único: created_at desc.

drop index if exists public.captador_global_offers_active_order_idx;

alter table public.captador_global_offers
  drop column if exists sort_order;

create index if not exists captador_global_offers_active_created_idx
  on public.captador_global_offers(is_active, created_at desc);

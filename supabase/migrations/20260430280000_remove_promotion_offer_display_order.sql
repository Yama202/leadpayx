-- Remove ordenação manual de ofertas (display_order) para simplificar operação.
-- A listagem passa a depender exclusivamente de created_at desc.

drop index if exists public.promotion_offers_active_order_idx;
drop index if exists public.promotion_offers_status_order_idx;

alter table public.promotion_offers
  drop column if exists display_order;

create index if not exists promotion_offers_status_created_idx
  on public.promotion_offers(status, created_at desc);

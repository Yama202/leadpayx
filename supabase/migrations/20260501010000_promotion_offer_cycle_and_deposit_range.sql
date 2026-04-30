alter table public.promotion_offers
  add column if not exists min_deposit_brl numeric(12,2),
  add column if not exists max_deposit_brl numeric(12,2),
  add column if not exists cycle_deposit_brl numeric(12,2),
  add column if not exists only_new_accounts boolean not null default true;

alter table public.promotion_offers
  drop constraint if exists promotion_offers_min_deposit_non_negative,
  add constraint promotion_offers_min_deposit_non_negative
    check (min_deposit_brl is null or min_deposit_brl >= 0);

alter table public.promotion_offers
  drop constraint if exists promotion_offers_max_deposit_non_negative,
  add constraint promotion_offers_max_deposit_non_negative
    check (max_deposit_brl is null or max_deposit_brl >= 0);

alter table public.promotion_offers
  drop constraint if exists promotion_offers_deposit_range_valid,
  add constraint promotion_offers_deposit_range_valid
    check (
      min_deposit_brl is null
      or max_deposit_brl is null
      or max_deposit_brl >= min_deposit_brl
    );

alter table public.promotion_offers
  drop constraint if exists promotion_offers_cycle_deposit_positive,
  add constraint promotion_offers_cycle_deposit_positive
    check (cycle_deposit_brl is null or cycle_deposit_brl > 0);

-- Admin metric: captadores validados por indicação.
-- Critério de validação: indicado com 2 contas concluídas por operador.

drop index if exists public.promotion_offers_status_order_idx;
create index if not exists promotion_offers_status_created_idx
  on public.promotion_offers(status, created_at desc);

create index if not exists accounts_completed_validation_idx
  on public.accounts(captador_id, completed_at, id)
  where status = 'completed' and completed_by_operador_id is not null;

create or replace function public.get_validated_referral_ranking(
  period_start timestamptz default null,
  period_end timestamptz default null
)
returns table (
  captador_id uuid,
  name text,
  email text,
  total_validated bigint,
  last_validated_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  with completed_accounts as (
    select
      a.captador_id,
      a.completed_at,
      row_number() over (
        partition by a.captador_id
        order by a.completed_at asc, a.id asc
      ) as completion_rank
    from public.accounts a
    where a.status = 'completed'
      and a.completed_by_operador_id is not null
      and a.completed_at is not null
  ),
  validation_milestones as (
    select
      c.captador_id as indicated_captador_id,
      c.completed_at as validated_at
    from completed_accounts c
    where c.completion_rank = 2
  ),
  validated_referrals as (
    select
      referrer.id as captador_id,
      referrer.name,
      referrer.email,
      milestone.validated_at
    from public.profiles indicated
    join validation_milestones milestone
      on milestone.indicated_captador_id = indicated.id
    join public.profiles referrer
      on referrer.id = indicated.referred_by
    where indicated.role = 'captador'
      and referrer.role = 'captador'
      and (period_start is null or milestone.validated_at >= period_start)
      and (period_end is null or milestone.validated_at <= period_end)
  )
  select
    vr.captador_id,
    max(vr.name) as name,
    max(vr.email) as email,
    count(*) as total_validated,
    max(vr.validated_at) as last_validated_at
  from validated_referrals vr
  group by vr.captador_id
  order by total_validated desc, last_validated_at desc;
$$;

grant execute on function public.get_validated_referral_ranking(timestamptz, timestamptz) to authenticated;

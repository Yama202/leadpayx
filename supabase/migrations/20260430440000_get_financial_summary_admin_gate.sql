-- get_financial_summary: não usar "where public.is_admin()" como filtro de linhas —
-- isso devolve zero linhas sempre que a checagem falha (ex.: sessão/jwt ausente no
-- contexto da função), em vez de erro claro. Autorização no início (plpgsql) e
-- listagem de todos os perfis captador/operator com agregados.

create or replace function public.get_financial_summary(
  period_start timestamptz default null,
  period_end timestamptz default null
)
returns table (
  user_id uuid,
  name text,
  email text,
  role text,
  pending_amount numeric,
  paid_amount numeric,
  pending_payout_amount numeric,
  processed_payout_amount numeric,
  processed_payouts bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles adm
    where adm.id = auth.uid()
      and adm.role = 'admin'
      and adm.status = 'active'
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.name,
    p.email,
    p.role,
    coalesce(sum(e.amount) filter (
      where e.status = 'pending'
        and (period_start is null or e.created_at >= period_start)
        and (period_end is null or e.created_at < period_end)
    ), 0)::numeric as pending_amount,
    coalesce(sum(e.amount) filter (
      where e.status = 'paid'
        and (period_start is null or coalesce(e.paid_at, e.created_at) >= period_start)
        and (period_end is null or coalesce(e.paid_at, e.created_at) < period_end)
    ), 0)::numeric as paid_amount,
    coalesce((
      select sum(po.amount)
      from public.payouts po
      where po.user_id = p.id
        and po.status = 'pending'
        and (period_start is null or po.created_at >= period_start)
        and (period_end is null or po.created_at < period_end)
    ), 0)::numeric as pending_payout_amount,
    coalesce((
      select sum(po.amount)
      from public.payouts po
      where po.user_id = p.id
        and po.status = 'processed'
        and (period_start is null or coalesce(po.processed_at, po.created_at) >= period_start)
        and (period_end is null or coalesce(po.processed_at, po.created_at) < period_end)
    ), 0)::numeric as processed_payout_amount,
    coalesce((
      select count(*)
      from public.payouts po
      where po.user_id = p.id
        and po.status = 'processed'
        and (period_start is null or coalesce(po.processed_at, po.created_at) >= period_start)
        and (period_end is null or coalesce(po.processed_at, po.created_at) < period_end)
    ), 0)::bigint as processed_payouts
  from public.profiles p
  left join public.earnings e on e.user_id = p.id
  where p.role in ('captador', 'operator')
  group by p.id, p.name, p.email, p.role
  order by paid_amount desc, pending_amount desc, p.created_at desc;
end;
$$;

grant execute on function public.get_financial_summary(timestamptz, timestamptz) to authenticated;

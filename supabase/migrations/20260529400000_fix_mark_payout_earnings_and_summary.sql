-- Fix 1: mark_payout_as_processed — só marca como pagas as earnings
-- vinculadas ao payout via payout_earnings, não todas as pending do user.
-- Bug anterior: earnings criadas ENTRE a criação do payout e o processamento
-- eram marcadas como pagas sem serem incluídas no valor pago.
--
-- Fix 2: get_financial_summary — usa amount_paid (valor real transferido)
-- no campo processed_payout_amount e adiciona paid_earnings_amount para
-- distinguir comissões contabilizadas de dinheiro efetivamente enviado.

-- ── 1. mark_payout_as_processed ─────────────────────────────────────────────
create or replace function public.mark_payout_as_processed(
  target_payout_id uuid,
  proof_path       text    default null,
  admin_notes      text    default null,
  paid_amount      numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  payout_row public.payouts%rowtype;
  effective_paid numeric(12,2);
begin
  if not public.is_admin() then
    raise exception 'admin required';
  end if;

  select * into payout_row
  from public.payouts
  where id = target_payout_id and status = 'pending'
  for update;

  if payout_row.id is null then
    return null;
  end if;

  effective_paid := coalesce(paid_amount, payout_row.amount);

  update public.payouts
  set status            = 'processed',
      processed_at      = now(),
      processed_by      = auth.uid(),
      payment_proof_url = proof_path,
      notes             = admin_notes,
      amount_paid       = effective_paid
  where id = target_payout_id;

  -- Marca apenas as earnings vinculadas a este payout, não todas as pending do user.
  -- Isso evita marcar como pagas earnings que chegaram depois da criação do payout.
  update public.earnings
  set status  = 'paid',
      paid_at = now()
  where id in (
    select pe.earning_id
    from public.payout_earnings pe
    where pe.payout_id = target_payout_id
  )
  and status = 'pending';

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values (
    'payout.processed',
    'payout',
    target_payout_id,
    jsonb_build_object(
      'user_id',       payout_row.user_id,
      'amount',        payout_row.amount,
      'amount_paid',   effective_paid
    )
  );

  return target_payout_id;
end;
$$;

-- ── 2. get_financial_summary ─────────────────────────────────────────────────
-- Adiciona amount_paid_total: soma do valor real pago em payouts processados
-- (amount_paid, com fallback para amount quando amount_paid é null).
drop function if exists public.get_financial_summary(timestamptz, timestamptz);

create or replace function public.get_financial_summary(
  period_start timestamptz default null,
  period_end   timestamptz default null
)
returns table (
  user_id               uuid,
  name                  text,
  email                 text,
  role                  text,
  pending_amount        numeric,
  paid_amount           numeric,
  pending_payout_amount numeric,
  processed_payout_amount numeric,
  processed_payouts     bigint,
  amount_paid_total     numeric
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
        and (period_end   is null or e.created_at < period_end)
    ), 0)::numeric as pending_amount,
    coalesce(sum(e.amount) filter (
      where e.status = 'paid'
        and (period_start is null or coalesce(e.paid_at, e.created_at) >= period_start)
        and (period_end   is null or coalesce(e.paid_at, e.created_at) < period_end)
    ), 0)::numeric as paid_amount,
    coalesce((
      select sum(po.amount)
      from public.payouts po
      where po.user_id = p.id
        and po.status = 'pending'
        and (period_start is null or po.created_at >= period_start)
        and (period_end   is null or po.created_at < period_end)
    ), 0)::numeric as pending_payout_amount,
    coalesce((
      select sum(po.amount)
      from public.payouts po
      where po.user_id = p.id
        and po.status = 'processed'
        and (period_start is null or coalesce(po.processed_at, po.created_at) >= period_start)
        and (period_end   is null or coalesce(po.processed_at, po.created_at) < period_end)
    ), 0)::numeric as processed_payout_amount,
    coalesce((
      select count(*)
      from public.payouts po
      where po.user_id = p.id
        and po.status = 'processed'
        and (period_start is null or coalesce(po.processed_at, po.created_at) >= period_start)
        and (period_end   is null or coalesce(po.processed_at, po.created_at) < period_end)
    ), 0)::bigint as processed_payouts,
    -- Valor real transferido: usa amount_paid quando disponível, fallback para amount.
    coalesce((
      select sum(coalesce(po.amount_paid, po.amount))
      from public.payouts po
      where po.user_id = p.id
        and po.status = 'processed'
        and (period_start is null or coalesce(po.processed_at, po.created_at) >= period_start)
        and (period_end   is null or coalesce(po.processed_at, po.created_at) < period_end)
    ), 0)::numeric as amount_paid_total
  from public.profiles p
  left join public.earnings e on e.user_id = p.id
  where p.role in ('captador', 'operator')
  group by p.id, p.name, p.email, p.role
  order by paid_amount desc, pending_amount desc, p.created_at desc;
end;
$$;

grant execute on function public.get_financial_summary(timestamptz, timestamptz) to authenticated;

select pg_notify('pgrst', 'reload schema');

-- Garante solicitação de payout idempotente para captador e operador:
-- - Reaproveita payout pendente existente do usuário.
-- - Vincula ganhos pendentes ainda não ligados.
-- - Só falha quando não há saldo pendente E não existe payout pendente.

create or replace function public.ensure_pending_payout(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid;
  actor_role text;
  payout_id uuid;
  linked_amount numeric(12,2);
  unlinked_pending_amount numeric(12,2);
  pix_ok boolean;
begin
  actor_id := auth.uid();
  actor_role := public.current_user_role();

  if actor_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if actor_role is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if actor_role <> 'admin' and target_user_id <> actor_id then
    raise exception 'payout creation denied' using errcode = '42501';
  end if;

  select coalesce(length(trim(coalesce(p.pix_key, ''))) >= 3, false)
    into pix_ok
    from public.profiles p
   where p.id = target_user_id;

  if not coalesce(pix_ok, false) then
    raise exception 'pix_key_required' using errcode = 'P0001';
  end if;

  select id
    into payout_id
    from public.payouts
   where user_id = target_user_id
     and status = 'pending'
   order by created_at desc
   limit 1
   for update;

  if payout_id is null then
    insert into public.payouts(user_id, amount, status)
    values (target_user_id, 0, 'pending')
    returning id into payout_id;
  end if;

  insert into public.payout_earnings(payout_id, earning_id)
  select payout_id, e.id
  from public.earnings e
  where e.user_id = target_user_id
    and e.status = 'pending'
    and not exists (
      select 1 from public.payout_earnings pe where pe.earning_id = e.id
    )
  on conflict do nothing;

  select coalesce(sum(e.amount), 0)
    into linked_amount
    from public.payout_earnings pe
    join public.earnings e on e.id = pe.earning_id
   where pe.payout_id = payout_id;

  update public.payouts
     set amount = linked_amount
   where id = payout_id
     and status = 'pending';

  select coalesce(sum(e.amount), 0)
    into unlinked_pending_amount
    from public.earnings e
   where e.user_id = target_user_id
     and e.status = 'pending'
     and not exists (
       select 1 from public.payout_earnings pe where pe.earning_id = e.id
     );

  if coalesce(linked_amount, 0) <= 0 and coalesce(unlinked_pending_amount, 0) <= 0 then
    raise exception 'no pending earnings' using errcode = 'P0001';
  end if;

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values (
    'payout.requested',
    'payout',
    payout_id,
    jsonb_build_object(
      'user_id', target_user_id,
      'requested_by', actor_id
    )
  );

  return payout_id;
end;
$$;

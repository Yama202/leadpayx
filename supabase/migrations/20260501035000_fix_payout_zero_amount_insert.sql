create or replace function public.ensure_pending_payout(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid;
  v_payout_id uuid;
  linked_amount numeric(12,2);
  unlinked_pending_amount numeric(12,2);
  pix_ok boolean;
begin
  actor_id := auth.uid();

  if actor_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if target_user_id <> actor_id and not public.is_admin() then
    raise exception 'payout creation denied' using errcode = '42501';
  end if;

  select coalesce(length(trim(coalesce(p.pix_key, ''))) >= 3, false)
    into pix_ok
    from public.profiles p
   where p.id = target_user_id;

  if not coalesce(pix_ok, false) then
    raise exception 'pix_key_required' using errcode = 'P0001';
  end if;

  -- Soma ganhos pendentes ainda não vinculados a nenhum payout.
  select coalesce(sum(e.amount), 0)
    into unlinked_pending_amount
    from public.earnings e
   where e.user_id = target_user_id
     and e.status = 'pending'
     and not exists (
       select 1 from public.payout_earnings pe where pe.earning_id = e.id
     );

  select id
    into v_payout_id
    from public.payouts
   where user_id = target_user_id
     and status = 'pending'
   order by created_at desc
   limit 1
   for update;

  if v_payout_id is null then
    if coalesce(unlinked_pending_amount, 0) <= 0 then
      raise exception 'no pending earnings' using errcode = 'P0001';
    end if;

    insert into public.payouts(user_id, amount, status)
    values (target_user_id, unlinked_pending_amount, 'pending')
    returning id into v_payout_id;
  end if;

  insert into public.payout_earnings(payout_id, earning_id)
  select v_payout_id, e.id
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
   where pe.payout_id = v_payout_id;

  if coalesce(linked_amount, 0) <= 0 and coalesce(unlinked_pending_amount, 0) <= 0 then
    raise exception 'no pending earnings' using errcode = 'P0001';
  end if;

  if coalesce(linked_amount, 0) > 0 then
    update public.payouts
       set amount = linked_amount
     where id = v_payout_id
       and status = 'pending';
  end if;

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values (
    'payout.requested',
    'payout',
    v_payout_id,
    jsonb_build_object(
      'user_id', target_user_id,
      'requested_by', actor_id
    )
  );

  return v_payout_id;
end;
$$;

-- Liga requires_pair por oferta ao RPC de atribuição de lote.
-- Ciclo passa a ser agrupado por (captador, oferta) em vez de só captador.
-- Ofertas com requires_pair=false permitem atribuição com 1 conta.
-- Contas sem oferta vinculada (legado) assumem requires_pair=true.

-- ─── get_operator_cycle_queue_summary ───────────────────────────────────────
-- Retorna uma linha por captador (o ciclo mais antigo elegível desse captador),
-- mantendo a mesma assinatura para não quebrar o lado TypeScript/UI.

create or replace function public.get_operator_cycle_queue_summary()
returns table (
  captador_id uuid,
  captador_name text,
  pending_count bigint,
  first_created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_role text;
  minimum_batch int;
begin
  actor_role := public.current_user_role();
  if actor_role not in ('admin', 'operator') then
    raise exception 'queue summary denied';
  end if;

  minimum_batch := least(greatest(
    public.get_numeric_setting('operational_min_batch_size', 2)::int, 1
  ), 2);

  return query
  with eligible_cycles as (
    select
      a.captador_id,
      a.promotion_offer_id,
      coalesce(p.name, p.email, 'Captador')::text               as captador_name,
      count(*)::bigint                                            as pending_count,
      min(a.created_at)                                          as first_created_at
    from public.accounts a
    join public.profiles p on p.id = a.captador_id
    left join public.promotion_offers po on po.id = a.promotion_offer_id
    where a.status = 'pending'
    group by a.captador_id, a.promotion_offer_id, p.name, p.email, po.requires_pair
    having count(*) >= case
      when coalesce(po.requires_pair, true) then minimum_batch
      else 1
    end
  )
  select distinct on (ec.captador_id)
    ec.captador_id,
    ec.captador_name,
    ec.pending_count,
    ec.first_created_at
  from eligible_cycles ec
  order by ec.captador_id, ec.first_created_at asc;
end;
$$;

-- ─── assign_next_batch_to_operator ──────────────────────────────────────────
-- Seleciona o ciclo (captador, oferta) mais antigo elegível.
-- effective_batch = minimum_batch para requires_pair=true, 1 para requires_pair=false.

create or replace function public.assign_next_batch_to_operator(
  target_operator_id uuid,
  batch_size int default 2
)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_role     text;
  minimum_batch  int;
  effective_batch int;
  selected_captador uuid;
  selected_offer_id uuid;
  assigned_count int := 0;
  account_record record;
begin
  actor_role := public.current_user_role();

  if actor_role <> 'admin' and (
    actor_role <> 'operator' or target_operator_id <> auth.uid()
  ) then
    raise exception 'assignment denied';
  end if;

  -- Guard: operador não pode pegar novo ciclo se já tem contas ativas.
  if exists (
    select 1 from public.accounts a
    where a.operador_id = target_operator_id
      and a.status in ('assigned', 'in_progress')
  ) then
    raise exception 'operator unavailable';
  end if;

  perform public.reassign_expired_operator_accounts();

  if not public.is_operator_eligible(target_operator_id) then
    raise exception 'operator not eligible';
  end if;

  minimum_batch := least(greatest(
    public.get_numeric_setting('operational_min_batch_size', 2)::int, 1
  ), 2);

  -- Seleciona o ciclo mais antigo elegível: (captador, oferta).
  -- requires_pair=false → effective_batch=1; requires_pair=true → effective_batch=minimum_batch.
  -- Contas sem oferta vinculada (legado) → tratadas como requires_pair=true.
  select
    a.captador_id,
    a.promotion_offer_id,
    case when coalesce(po.requires_pair, true) then minimum_batch else 1 end
  into
    selected_captador,
    selected_offer_id,
    effective_batch
  from public.accounts a
  left join public.promotion_offers po on po.id = a.promotion_offer_id
  where a.status = 'pending'
  group by a.captador_id, a.promotion_offer_id, po.requires_pair
  having count(*) >= case
    when coalesce(po.requires_pair, true) then minimum_batch else 1
  end
  order by min(a.created_at) asc
  limit 1;

  if selected_captador is null then
    raise exception 'minimum operational batch not available';
  end if;

  for account_record in
    select id
    from public.accounts
    where status = 'pending'
      and captador_id = selected_captador
      and (
        (promotion_offer_id = selected_offer_id)
        or (promotion_offer_id is null and selected_offer_id is null)
      )
    order by created_at asc, id asc
    limit effective_batch
    for update skip locked
  loop
    update public.accounts
    set operador_id             = target_operator_id,
        status                  = 'assigned',
        assigned_at             = now(),
        operation_started_at    = null,
        operation_deadline_at   = now() + interval '1 hour',
        reassigned_at           = null,
        reassign_reason         = null
    where id = account_record.id;

    insert into public.operator_assignments(operador_id, account_id, status)
    values (target_operator_id, account_record.id, 'assigned')
    on conflict (account_id) do update
      set operador_id = excluded.operador_id,
          status      = 'assigned';

    assigned_count := assigned_count + 1;
  end loop;

  if assigned_count > 0 then
    insert into public.audit_logs(action, entity_type, entity_id, metadata)
    values (
      'operator.batch_assigned',
      'profile',
      target_operator_id,
      jsonb_build_object(
        'count',          assigned_count,
        'minimum_batch',  minimum_batch,
        'effective_batch', effective_batch,
        'captador_id',    selected_captador,
        'offer_id',       selected_offer_id
      )
    );
  end if;

  return assigned_count;
end;
$$;

grant execute on function public.get_operator_cycle_queue_summary() to authenticated;
grant execute on function public.assign_next_batch_to_operator(uuid, int) to authenticated;

select pg_notify('pgrst', 'reload schema');

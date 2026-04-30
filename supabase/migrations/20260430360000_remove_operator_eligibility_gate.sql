create or replace function public.pick_balanced_operator(excluded_operator_id uuid default null)
returns uuid
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select p.id
  from public.profiles p
  left join public.accounts a
    on a.operador_id = p.id
    and a.status in ('assigned', 'in_progress', 'completed')
  where p.role = 'operator'
    and p.status = 'active'
    and (excluded_operator_id is null or p.id <> excluded_operator_id)
  group by p.id, p.created_at
  order by
    count(a.id) asc,
    count(a.id) filter (where a.status = 'in_progress') asc,
    p.created_at asc,
    p.id asc
  limit 1;
$$;

create or replace function public.get_current_operator_rotation_slot()
returns uuid
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  with eligible as (
    select
      p.id,
      row_number() over (order by p.created_at asc, p.id asc) as rn
    from public.profiles p
    where p.role = 'operator'
      and p.status = 'active'
  ),
  totals as (
    select count(*)::bigint as total from eligible
  ),
  slot as (
    select
      case
        when totals.total = 0 then null::bigint
        else ((floor(extract(epoch from now()) / 300)::bigint % totals.total) + 1)
      end as rn
    from totals
  )
  select e.id
  from eligible e
  join slot s on s.rn = e.rn
  limit 1;
$$;

create or replace function public.assign_next_batch_to_operator(target_operator_id uuid, batch_size int default 2)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_role text;
  minimum_batch int;
  requested_batch int;
  selected_captador uuid;
  assigned_count int := 0;
  account_record record;
  slot_operator_id uuid;
begin
  perform set_config('app.skip_account_row_protect', 'on', true);

  actor_role := public.current_user_role();
  if actor_role <> 'admin' and (actor_role <> 'operator' or target_operator_id <> auth.uid()) then
    raise exception 'assignment denied';
  end if;

  perform public.reassign_expired_operator_accounts();

  if not exists (
    select 1
    from public.profiles p
    where p.id = target_operator_id
      and p.role = 'operator'
      and p.status = 'active'
  ) then
    raise exception 'operator unavailable';
  end if;

  slot_operator_id := public.get_current_operator_rotation_slot();
  if slot_operator_id is null then
    raise exception 'operator rotation unavailable';
  end if;

  if actor_role = 'operator' and slot_operator_id <> target_operator_id then
    raise exception 'operator not in current rotation slot';
  end if;

  minimum_batch := least(greatest(public.get_numeric_setting('operational_min_batch_size', 2)::int, 1), 2);
  requested_batch := greatest(least(batch_size, 2), minimum_batch);

  select candidate.captador_id
    into selected_captador
  from (
    select a.captador_id, min(a.created_at) as first_created_at, count(*) as pending_count
    from public.accounts a
    where a.status = 'pending'
    group by a.captador_id
    having count(*) >= minimum_batch
  ) as candidate
  order by candidate.first_created_at asc
  limit 1;

  if selected_captador is null then
    raise exception 'minimum operational batch not available';
  end if;

  for account_record in
    select id
    from public.accounts
    where status = 'pending'
      and captador_id = selected_captador
    order by created_at asc, id asc
    limit requested_batch
    for update skip locked
  loop
    update public.accounts
    set operador_id = target_operator_id,
        status = 'assigned',
        assigned_at = now(),
        operation_started_at = null,
        operation_deadline_at = now() + interval '1 hour',
        reassigned_at = null,
        reassign_reason = null
    where id = account_record.id;

    insert into public.operator_assignments(operador_id, account_id, status)
    values (target_operator_id, account_record.id, 'assigned')
    on conflict (account_id) do update
      set operador_id = excluded.operador_id,
          status = 'assigned';

    assigned_count := assigned_count + 1;
  end loop;

  if assigned_count > 0 then
    insert into public.audit_logs(action, entity_type, entity_id, metadata)
    values (
      'operator.batch_assigned',
      'profile',
      target_operator_id,
      jsonb_build_object(
        'count', assigned_count,
        'minimum_batch', minimum_batch,
        'captador_id', selected_captador,
        'rotation_slot_operator_id', slot_operator_id
      )
    );
  end if;

  return assigned_count;
end;
$$;

grant execute on function public.pick_balanced_operator(uuid) to authenticated;
grant execute on function public.get_current_operator_rotation_slot() to authenticated;
grant execute on function public.assign_next_batch_to_operator(uuid, int) to authenticated;

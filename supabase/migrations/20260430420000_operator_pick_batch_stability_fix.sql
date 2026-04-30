-- Estabilidade do "pegar lote":
-- 1) remove assinaturas legadas que podem causar ambiguidade no PostgREST (PGRST203)
-- 2) reforça atribuição sem rotação, com trava por ciclo
-- 3) retorna erro operacional esperado quando nenhum ciclo efetivo foi atribuído

drop function if exists public.assign_next_batch_to_operator(uuid);
drop function if exists public.assign_next_batch_to_operator(uuid, numeric);

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
  captador_candidate record;
begin
  perform set_config('app.skip_account_row_protect', 'on', true);

  actor_role := public.current_user_role();
  if actor_role <> 'admin' and (actor_role <> 'operator' or target_operator_id <> auth.uid()) then
    raise exception 'assignment denied';
  end if;

  begin
    perform public.reassign_expired_operator_accounts();
  exception when others then
    null;
  end;

  if not exists (
    select 1
    from public.profiles p
    where p.id = target_operator_id
      and p.role = 'operator'
      and p.status = 'active'
  ) then
    raise exception 'operator unavailable';
  end if;

  minimum_batch := least(greatest(public.get_numeric_setting('operational_min_batch_size', 2)::int, 1), 2);
  requested_batch := greatest(least(batch_size, 2), minimum_batch);

  for captador_candidate in
    select
      a.captador_id,
      min(a.created_at) as first_created_at,
      count(*) as pending_count
    from public.accounts a
    where a.status = 'pending'
    group by a.captador_id
    having count(*) >= minimum_batch
    order by min(a.created_at) asc
  loop
    if pg_try_advisory_xact_lock(hashtext(captador_candidate.captador_id::text)) then
      selected_captador := captador_candidate.captador_id;
      exit;
    end if;
  end loop;

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
    perform set_config('app.skip_account_row_protect', 'on', true);
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

  if assigned_count = 0 then
    raise exception 'minimum operational batch not available';
  end if;

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values (
    'operator.batch_assigned',
    'profile',
    target_operator_id,
    jsonb_build_object(
      'count', assigned_count,
      'minimum_batch', minimum_batch,
      'captador_id', selected_captador
    )
  );

  return assigned_count;
end;
$$;

grant execute on function public.assign_next_batch_to_operator(uuid, int) to authenticated;

select pg_notify('pgrst', 'reload schema');

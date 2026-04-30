-- Hotfix: mensagem "operator cannot change account ownership or source data" na atribuição
-- quando o trigger protect_account_updates não vê o bypass (GUC ausente/versão antiga do trigger)
-- ou quando o bypass precisa ser reafirmado antes de cada UPDATE no lote.

create or replace function public.protect_account_updates()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_role text;
  skip_raw text;
begin
  if session_user = 'postgres' then
    return new;
  end if;

  skip_raw := coalesce(current_setting('app.skip_account_row_protect', true), '');
  if lower(trim(skip_raw)) in ('on', 'true', '1', 'yes') then
    return new;
  end if;

  actor_role := public.current_user_role();

  if actor_role = 'admin' then
    return new;
  end if;

  if actor_role <> 'operator' or old.operador_id is distinct from auth.uid() then
    raise exception 'account update denied';
  end if;

  if old.status in ('completed', 'rejected') then
    raise exception 'terminal account cannot be updated';
  end if;

  if new.captador_id is distinct from old.captador_id
    or new.operador_id is distinct from old.operador_id
    or new.account_identifier is distinct from old.account_identifier
    or coalesce(new.account_notes, '') is distinct from coalesce(old.account_notes, '')
    or coalesce(new.account_print_path, '') is distinct from coalesce(old.account_print_path, '')
    or new.source_registration_link_id is distinct from old.source_registration_link_id then
    raise exception 'operator cannot change account ownership or source data';
  end if;

  if new.status not in ('in_progress', 'completed', 'rejected') then
    raise exception 'invalid operator status transition';
  end if;

  if old.status = 'completed' and new.status is distinct from old.status then
    raise exception 'cannot change status of completed account';
  end if;

  if old.status = 'rejected' and new.status is distinct from old.status then
    raise exception 'cannot change status of rejected account';
  end if;

  if new.status = 'rejected' and length(coalesce(new.rejection_reason, '')) < 8 then
    raise exception 'rejection reason is required';
  end if;

  return new;
end;
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

grant execute on function public.assign_next_batch_to_operator(uuid, int) to authenticated;

select pg_notify('pgrst', 'reload schema');

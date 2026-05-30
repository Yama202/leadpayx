-- Admin pode forçar conclusão de conta travada (ex: operador fechou o app
-- sem confirmar). Gera o earning normalmente via generate_account_earning.

create or replace function public.admin_force_complete_account(target_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_role    text;
  v_captador_id uuid;
  v_status      text;
begin
  actor_role := public.current_user_role();
  if actor_role <> 'admin' then
    raise exception 'admin only';
  end if;

  select captador_id, status
    into v_captador_id, v_status
  from public.accounts
  where id = target_account_id
  for update;

  if v_captador_id is null then
    raise exception 'account not found';
  end if;

  if v_status = 'completed' then
    -- Idempotente: apenas re-gera earning se ainda não existir.
    perform public.generate_account_earning(target_account_id);
    return;
  end if;

  update public.accounts
  set status       = 'completed',
      started_at   = coalesce(started_at, now()),
      completed_at = now()
  where id = target_account_id;

  -- Atualiza assignment se existir.
  update public.operator_assignments
  set status = 'completed'
  where account_id = target_account_id;

  perform public.generate_account_earning(target_account_id);
  perform public.check_and_generate_referral_bonus(v_captador_id);

  insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'account.admin_force_completed',
    'account',
    target_account_id,
    jsonb_build_object('previous_status', v_status)
  );
end;
$$;

grant execute on function public.admin_force_complete_account(uuid) to authenticated;

select pg_notify('pgrst', 'reload schema');

-- Área restrita: remover contas de teste criadas só para homologação.
-- Critério: parte local do e-mail operacional OU o identificador de conta quando não há e-mail deve
-- começar por `test`, exceto falsos‑positivos `testimonial*` e `testing*`.
--
-- Apaga apenas linhas relacionadas às `accounts`: earnings, vínculos a payouts, payouts vazios,
-- notificações com metadata.account_id correspondente e linhas em audit_logs com entity_type =
-- account. Perfis mantêm‑se intactos.

create or replace function public.admin_purge_prefix_test_accounts()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_account_ids uuid[];
  v_print_paths text[];
  v_earning_ids uuid[];
  v_payout_ids uuid[];
  n_accounts_sel int := 0;
  n_earn_del int := 0;
  n_pe_del int := 0;
  n_po_del int := 0;
  n_notif_del int := 0;
  n_audit_del int := 0;
  n_ac_del int := 0;
begin
  if v_actor is null or not public.is_admin() then
    raise exception 'admin required';
  end if;

  with keyed as (
    select
      a.id,
      nullif(trim(coalesce(a.account_print_path, '')), '') as print_path,
      lower(
        trim(
          case
            when a.lead_account_email is not null and trim(a.lead_account_email) <> '' then
              split_part(trim(a.lead_account_email), '@', 1)
            else trim(a.account_identifier)
          end
        )
      ) as probe
    from public.accounts a
  ),
  picked as (
    select keyed.id, keyed.print_path
    from keyed
    where keyed.probe ~ '^test'
      and keyed.probe not like 'testimonial%'
      and keyed.probe not like 'testing%'
  )
  select
    coalesce((select array_agg(p.id order by p.id) from picked p), '{}'::uuid[]),
    coalesce(
      (
        select array_agg(pp.print_path order by pp.id)
        from picked pp
        where pp.print_path is not null
          and trim(pp.print_path) <> ''
      ),
      '{}'::text[]
    )
  into v_account_ids, v_print_paths;

  n_accounts_sel := coalesce(array_length(v_account_ids, 1), 0);
  if n_accounts_sel = 0 then
    return jsonb_build_object(
      'removed_accounts', 0,
      'removed_earnings', 0,
      'removed_payout_earnings', 0,
      'removed_empty_payouts', 0,
      'removed_notifications', 0,
      'removed_audit_rows', 0,
      'account_print_paths', '[]'::jsonb
    );
  end if;

  select coalesce(array_agg(e.id order by e.id), '{}'::uuid[])
  into v_earning_ids
  from public.earnings e
  where e.account_id is not null
    and e.account_id = any (v_account_ids);

  select coalesce(array_agg(distinct pe.payout_id), '{}'::uuid[])
  into v_payout_ids
  from public.payout_earnings pe
  where pe.earning_id = any (coalesce(v_earning_ids, '{}'::uuid[]));

  delete from public.payout_earnings pe
  where exists (
    select 1
    from public.earnings e
    where e.id = pe.earning_id
      and e.account_id = any (v_account_ids)
  );
  get diagnostics n_pe_del = row_count;

  delete from public.earnings e
  where e.account_id = any (v_account_ids);
  get diagnostics n_earn_del = row_count;

  if coalesce(array_length(v_payout_ids, 1), 0) > 0 then
    delete from public.payouts p
    where p.id = any (v_payout_ids)
      and not exists (select 1 from public.payout_earnings pe2 where pe2.payout_id = p.id);
    get diagnostics n_po_del = row_count;
  end if;

  delete from public.user_notifications un
  where jsonb_extract_path_text(un.metadata, 'account_id') is not null
    and trim(jsonb_extract_path_text(un.metadata, 'account_id')) <> ''
    and (jsonb_extract_path_text(un.metadata, 'account_id'))::uuid = any (v_account_ids);
  get diagnostics n_notif_del = row_count;

  delete from public.audit_logs al
  where al.entity_type = 'account'
    and al.entity_id is not null
    and al.entity_id = any (v_account_ids);
  get diagnostics n_audit_del = row_count;

  delete from public.accounts a
  where a.id = any (v_account_ids);
  get diagnostics n_ac_del = row_count;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  values (
    v_actor,
    'admin.prefix_test_accounts_purged',
    'system',
    null,
    jsonb_build_object(
      'removed_accounts', n_ac_del,
      'removed_match_preview', left(array_to_string(v_account_ids::text[], ','), 4000),
      'removed_earnings', n_earn_del,
      'removed_payout_earnings_rows', n_pe_del,
      'removed_empty_payouts', n_po_del,
      'removed_notifications', n_notif_del,
      'removed_audit_rows', n_audit_del
    )
  );

  return jsonb_build_object(
    'removed_accounts', n_ac_del,
    'removed_earnings', n_earn_del,
    'removed_payout_earnings_rows', n_pe_del,
    'removed_empty_payouts', n_po_del,
    'removed_notifications', n_notif_del,
    'removed_audit_rows', n_audit_del,
    'account_print_paths', coalesce(to_jsonb(v_print_paths), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.admin_purge_prefix_test_accounts() from public, anon;
grant execute on function public.admin_purge_prefix_test_accounts() to authenticated;

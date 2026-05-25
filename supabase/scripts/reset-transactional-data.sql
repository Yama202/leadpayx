-- =============================================================================
-- LeadPayX — reset completo para início de operação real
--
-- O que faz:
--   1. Remove TODOS os dados transacionais (contas, ganhos, pagamentos, logs…)
--   2. Remove usuários de teste (email/nome contém "test" ou "tess")
--   3. Mantém admins, operadores reais e captadores reais intactos
--   4. Mantém configurações (app_settings, promotion_offers, captador_global_offers,
--      captador_submission_briefs, registration_links, captador_web_push_subscriptions)
--
-- Como executar:
--   Supabase Dashboard → SQL Editor → cole este arquivo → Execute
--   (O SQL Editor roda como postgres / service_role — permissão para auth.users.)
--
-- ⚠ IRREVERSÍVEL. Faça backup antes (Dashboard → Database → Backups).
-- =============================================================================

begin;

-- Segurança: precisa ter pelo menos um admin antes de prosseguir
do $$
begin
  if (select count(*) from public.profiles where role = 'admin') < 1 then
    raise exception 'reset-abort: nenhum admin encontrado. Define um admin antes.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- FASE 1 — limpar todos os dados transacionais
-- (order importa: FK restrict obriga earnings/payouts antes de accounts/profiles)
-- ---------------------------------------------------------------------------

delete from public.payout_earnings;
delete from public.payouts;
delete from public.earnings;
delete from public.operator_assignments;
delete from public.captador_completion_push_delivery;
delete from public.user_notifications;
delete from public.audit_logs;
delete from public.accounts;

-- Resetar flag financeiro nos perfis remanescentes
update public.profiles
   set referral_bonus_paid = false
 where referral_bonus_paid = true;

-- ---------------------------------------------------------------------------
-- FASE 2 — remover usuários de teste
-- Critério: email ou nome contendo "test" ou "tess" (case-insensitive),
-- exceto admins.
-- Agora que dados transacionais foram removidos, o ON DELETE RESTRICT não bloqueia.
-- Apagar auth.users cascateia para public.profiles automaticamente.
-- ---------------------------------------------------------------------------

create temporary table _ids_to_delete on commit drop as
  select p.id
  from public.profiles p
  where p.role != 'admin'
    and (
      p.email ilike '%test%'
      or p.email ilike '%tess%'
      or p.name  ilike '%test%'
      or p.name  ilike '%tess%'
    );

do $$
declare n int;
begin
  select count(*)::int into n from _ids_to_delete;
  raise notice 'Usuários de teste a remover: %', n;
end $$;

-- Limpar subscriptions e briefs dos perfis de teste antes de apagar o auth.user
delete from public.captador_web_push_subscriptions
  where user_id in (select id from _ids_to_delete);

delete from public.captador_submission_briefs
  where captador_id in (select id from _ids_to_delete);

-- Apagar de auth.users (cascateia para public.profiles)
delete from auth.users
  where id in (select id from _ids_to_delete);

-- ---------------------------------------------------------------------------
-- Invariantes finais
-- ---------------------------------------------------------------------------
do $$
declare
  n_accounts  int := (select count(*)::int from public.accounts);
  n_earnings  int := (select count(*)::int from public.earnings);
  n_payouts   int := (select count(*)::int from public.payouts);
  n_profiles  int := (select count(*)::int from public.profiles);
  n_admins    int := (select count(*)::int from public.profiles where role = 'admin');
  n_deleted   int := (select count(*)::int from _ids_to_delete);
begin
  if n_accounts <> 0 then raise exception 'invariant: ainda há % contas', n_accounts; end if;
  if n_earnings <> 0 then raise exception 'invariant: ainda há % earnings', n_earnings; end if;
  if n_payouts  <> 0 then raise exception 'invariant: ainda há % payouts',  n_payouts;  end if;
  if n_admins   < 1  then raise exception 'invariant: admin sumiu — rollback';           end if;

  raise notice 'Reset OK — % perfis mantidos (% admins), % usuários de teste removidos, todos os dados transacionais apagados.',
    n_profiles, n_admins, n_deleted;
end $$;

commit;

-- Verificação pós-commit (opcional):
-- select role, status, count(*) from public.profiles group by role, status order by role;
-- select count(*) as contas     from public.accounts;
-- select count(*) as earnings   from public.earnings;
-- select count(*) as payouts    from public.payouts;

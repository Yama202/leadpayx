-- As funções de empréstimo foram criadas com revoke all from public.
-- Devolve execute ao role authenticated para que o admin autenticado
-- possa chamar via createClient() (que carrega auth.uid()).
grant execute on function public.create_captador_loan(uuid, numeric, text) to authenticated;
grant execute on function public.approve_loan_repayment_claim(uuid) to authenticated;
grant execute on function public.reject_loan_repayment_claim(uuid) to authenticated;
grant execute on function public.get_captador_total_debt(uuid) to authenticated;
grant execute on function public.apply_payout_loan_deduction(uuid, numeric, numeric) to authenticated;

select pg_notify('pgrst', 'reload schema');

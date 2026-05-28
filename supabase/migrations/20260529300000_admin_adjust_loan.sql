-- Admin pode registrar ajuste direto no saldo devedor de um empréstimo.
-- Insere repayment com kind='admin_adjustment' e status='approved' imediatamente,
-- sem precisar passar pelo fluxo claim→approve do captador.

create or replace function public.admin_adjust_loan(
  p_loan_id uuid,
  p_amount  numeric,  -- valor a abater (positivo = reduz dívida)
  p_notes   text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  loan_row      public.captador_loans%rowtype;
  new_remaining numeric(12,2);
begin
  if not public.is_admin() then
    raise exception 'admin required';
  end if;

  if p_amount <= 0 then
    raise exception 'invalid adjustment amount';
  end if;

  select * into loan_row
  from public.captador_loans
  where id = p_loan_id for update;

  if loan_row.id is null then
    raise exception 'loan not found';
  end if;

  if loan_row.status = 'paid' then
    raise exception 'loan already paid';
  end if;

  new_remaining := greatest(0, loan_row.remaining_amount - p_amount);

  insert into public.captador_loan_repayments
    (loan_id, amount, kind, status, approved_by, notes, approved_at)
  values
    (p_loan_id, p_amount, 'admin_adjustment', 'approved', auth.uid(), p_notes, now());

  update public.captador_loans
  set remaining_amount = new_remaining,
      status           = case when new_remaining = 0 then 'paid' else 'active' end,
      paid_at          = case when new_remaining = 0 then now() else null end,
      updated_at       = now()
  where id = p_loan_id;
end;
$$;

revoke all on function public.admin_adjust_loan(uuid, numeric, text) from public;
grant execute on function public.admin_adjust_loan(uuid, numeric, text) to authenticated;

select pg_notify('pgrst', 'reload schema');

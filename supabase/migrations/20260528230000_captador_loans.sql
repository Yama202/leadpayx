-- Sistema de empréstimos do admin para captadores.
--
-- Fluxo:
--   1. Admin registra empréstimo (create_captador_loan).
--   2. Captador deve o valor — aparece no dashboard e no payout.
--   3. Ao processar payout, se há dívida, cria repayment de tipo
--      'payout_deduction' automaticamente e reduz remaining_amount.
--   4. Captador pode sinalizar pagamento manual ("Já paguei"):
--      create_loan_repayment_claim.
--   5. Admin aprova → approve_loan_repayment_claim.

-- ── Tabela de empréstimos ────────────────────────────────────────────────
create table public.captador_loans (
  id               uuid primary key default gen_random_uuid(),
  captador_id      uuid not null references public.profiles(id) on delete restrict,
  amount           numeric(12,2) not null check (amount > 0),
  remaining_amount numeric(12,2) not null check (remaining_amount >= 0),
  notes            text,
  status           text not null default 'active'
    check (status in ('active', 'paid')),
  created_by       uuid not null references public.profiles(id),
  created_at       timestamptz not null default now(),
  paid_at          timestamptz,
  updated_at       timestamptz not null default now()
);

create index captador_loans_captador_idx
  on public.captador_loans(captador_id)
  where status = 'active';

-- ── Tabela de repagamentos ────────────────────────────────────────────────
create table public.captador_loan_repayments (
  id          uuid primary key default gen_random_uuid(),
  loan_id     uuid not null references public.captador_loans(id) on delete cascade,
  amount      numeric(12,2) not null check (amount > 0),
  kind        text not null default 'captador_claim'
    check (kind in ('captador_claim', 'payout_deduction', 'admin_adjustment')),
  status      text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  claimed_by  uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  notes       text,
  created_at  timestamptz not null default now(),
  approved_at timestamptz
);

create index captador_loan_repayments_loan_idx
  on public.captador_loan_repayments(loan_id);

create index captador_loan_repayments_pending_idx
  on public.captador_loan_repayments(status)
  where status = 'pending' and kind = 'captador_claim';

-- ── RLS ─────────────────────────────────────────────────────────────────
alter table public.captador_loans enable row level security;
alter table public.captador_loan_repayments enable row level security;

create policy "captador_loans admin full access"
  on public.captador_loans for all to authenticated
  using (public.is_admin());

create policy "captador_loans captador read own"
  on public.captador_loans for select to authenticated
  using (captador_id = auth.uid());

create policy "captador_loan_repayments admin full access"
  on public.captador_loan_repayments for all to authenticated
  using (public.is_admin());

create policy "captador_loan_repayments captador read own"
  on public.captador_loan_repayments for select to authenticated
  using (
    exists (
      select 1 from public.captador_loans l
      where l.id = loan_id and l.captador_id = auth.uid()
    )
  );

-- ── create_captador_loan ─────────────────────────────────────────────────
create or replace function public.create_captador_loan(
  p_captador_id uuid,
  p_amount      numeric,
  p_notes       text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  loan_id uuid;
begin
  if not public.is_admin() then
    raise exception 'admin required';
  end if;

  if p_amount <= 0 then
    raise exception 'loan amount must be positive';
  end if;

  insert into public.captador_loans(captador_id, amount, remaining_amount, notes, created_by)
  values (p_captador_id, p_amount, p_amount, p_notes, auth.uid())
  returning id into loan_id;

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values (
    'loan.created',
    'captador_loan',
    loan_id,
    jsonb_build_object(
      'captador_id', p_captador_id,
      'amount',      p_amount,
      'notes',       p_notes
    )
  );

  return loan_id;
end;
$$;

-- ── create_loan_repayment_claim  (captador signals "Já paguei") ──────────
create or replace function public.create_loan_repayment_claim(
  p_loan_id uuid,
  p_amount  numeric,
  p_notes   text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  loan_row public.captador_loans%rowtype;
  rep_id   uuid;
begin
  select * into loan_row
  from public.captador_loans
  where id = p_loan_id;

  if loan_row.id is null then
    raise exception 'loan not found';
  end if;

  if loan_row.captador_id <> auth.uid() and not public.is_admin() then
    raise exception 'access denied';
  end if;

  if loan_row.status <> 'active' then
    raise exception 'loan is not active';
  end if;

  if p_amount <= 0 or p_amount > loan_row.remaining_amount then
    raise exception 'invalid repayment amount';
  end if;

  -- Only one pending claim per loan at a time
  if exists (
    select 1 from public.captador_loan_repayments
    where loan_id = p_loan_id and status = 'pending' and kind = 'captador_claim'
  ) then
    raise exception 'pending claim already exists';
  end if;

  insert into public.captador_loan_repayments(
    loan_id, amount, kind, status, claimed_by, notes
  )
  values (p_loan_id, p_amount, 'captador_claim', 'pending', auth.uid(), p_notes)
  returning id into rep_id;

  return rep_id;
end;
$$;

-- ── approve_loan_repayment_claim (admin approves) ────────────────────────
create or replace function public.approve_loan_repayment_claim(
  p_repayment_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rep_row  public.captador_loan_repayments%rowtype;
  loan_row public.captador_loans%rowtype;
  new_remaining numeric(12,2);
begin
  if not public.is_admin() then
    raise exception 'admin required';
  end if;

  select * into rep_row
  from public.captador_loan_repayments
  where id = p_repayment_id for update;

  if rep_row.id is null then
    raise exception 'repayment not found';
  end if;

  if rep_row.status <> 'pending' then
    raise exception 'repayment already processed';
  end if;

  select * into loan_row
  from public.captador_loans
  where id = rep_row.loan_id for update;

  new_remaining := greatest(0, loan_row.remaining_amount - rep_row.amount);

  update public.captador_loan_repayments
  set status      = 'approved',
      approved_by = auth.uid(),
      approved_at = now()
  where id = p_repayment_id;

  update public.captador_loans
  set remaining_amount = new_remaining,
      status           = case when new_remaining = 0 then 'paid' else 'active' end,
      paid_at          = case when new_remaining = 0 then now() else null end,
      updated_at       = now()
  where id = rep_row.loan_id;

  insert into public.audit_logs(action, entity_type, entity_id, metadata)
  values (
    'loan.repayment_approved',
    'captador_loan',
    rep_row.loan_id,
    jsonb_build_object(
      'repayment_id',  p_repayment_id,
      'amount',        rep_row.amount,
      'new_remaining', new_remaining
    )
  );
end;
$$;

-- ── reject_loan_repayment_claim (admin rejeita) ──────────────────────────
create or replace function public.reject_loan_repayment_claim(
  p_repayment_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rep_row public.captador_loan_repayments%rowtype;
begin
  if not public.is_admin() then
    raise exception 'admin required';
  end if;

  select * into rep_row
  from public.captador_loan_repayments
  where id = p_repayment_id for update;

  if rep_row.id is null then
    raise exception 'repayment not found';
  end if;

  if rep_row.status <> 'pending' then
    raise exception 'repayment already processed';
  end if;

  update public.captador_loan_repayments
  set status      = 'rejected',
      approved_by = auth.uid(),
      approved_at = now()
  where id = p_repayment_id;
end;
$$;

-- ── apply_payout_loan_deduction (chamado após mark_payout_as_processed) ──
-- Deduz automaticamente do empréstimo ativo o valor que NÃO foi pago ao captador.
create or replace function public.apply_payout_loan_deduction(
  p_captador_id  uuid,
  p_payout_amount numeric,
  p_amount_paid   numeric
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  deduction    numeric(12,2);
  remaining    numeric(12,2);
  loan_row     public.captador_loans%rowtype;
  rep_id       uuid;
begin
  deduction := p_payout_amount - p_amount_paid;

  if deduction <= 0 then
    return;
  end if;

  -- Apply deduction to oldest active loan first
  for loan_row in
    select * from public.captador_loans
    where captador_id = p_captador_id and status = 'active'
    order by created_at asc
    for update
  loop
    exit when deduction <= 0;

    declare
      apply numeric(12,2) := least(deduction, loan_row.remaining_amount);
      new_rem numeric(12,2) := loan_row.remaining_amount - apply;
    begin
      insert into public.captador_loan_repayments(
        loan_id, amount, kind, status, approved_by, approved_at
      )
      values (
        loan_row.id, apply, 'payout_deduction', 'approved', null, now()
      )
      returning id into rep_id;

      update public.captador_loans
      set remaining_amount = new_rem,
          status           = case when new_rem = 0 then 'paid' else 'active' end,
          paid_at          = case when new_rem = 0 then now() else null end,
          updated_at       = now()
      where id = loan_row.id;

      deduction := deduction - apply;
    end;
  end loop;
end;
$$;

-- ── get_captador_total_debt (helper) ─────────────────────────────────────
create or replace function public.get_captador_total_debt(p_captador_id uuid)
returns numeric
language sql
security definer
set search_path = public, pg_temp
as $$
  select coalesce(sum(remaining_amount), 0)
  from public.captador_loans
  where captador_id = p_captador_id and status = 'active';
$$;

revoke all on function public.create_captador_loan(uuid, numeric, text) from public;
revoke all on function public.approve_loan_repayment_claim(uuid) from public;
revoke all on function public.reject_loan_repayment_claim(uuid) from public;
revoke all on function public.apply_payout_loan_deduction(uuid, numeric, numeric) from public;
revoke all on function public.get_captador_total_debt(uuid) from public;

select pg_notify('pgrst', 'reload schema');

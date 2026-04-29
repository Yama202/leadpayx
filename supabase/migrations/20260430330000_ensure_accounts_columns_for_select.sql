-- Consolidação idempotente: colunas usadas em ACCOUNT_SELECT_* (lib/account-columns.ts).
-- Evita 42703 (undefined_column) em ambientes onde migrations parciais foram aplicadas.
-- Colunas já criadas em migrations anteriores; aqui apenas garantia com IF NOT EXISTS.

alter table public.accounts
  add column if not exists account_print_path text,
  add column if not exists source_registration_link_id uuid null references public.registration_links(id) on delete set null,
  add column if not exists operation_started_at timestamptz,
  add column if not exists operation_deadline_at timestamptz,
  add column if not exists reassigned_at timestamptz,
  add column if not exists reassign_reason text,
  add column if not exists last_operator_id uuid null references public.profiles(id) on delete set null,
  add column if not exists completed_by_operador_id uuid null references public.profiles(id) on delete set null,
  add column if not exists lead_account_email text,
  add column if not exists lead_account_secret_cipher text;

create index if not exists accounts_lead_email_idx
  on public.accounts(lead_account_email)
  where lead_account_email is not null;

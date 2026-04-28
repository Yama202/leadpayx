-- Credenciais operacionais do lead (e-mail em texto; senha cifrada no app com ACCOUNTS_CREDENTIALS_SECRET).
-- RLS inalterada: mesma linha; o app restringe colunas no SELECT por papel.

alter table public.accounts
  add column if not exists lead_account_email text,
  add column if not exists lead_account_secret_cipher text;

comment on column public.accounts.lead_account_email is 'E-mail de login do lead/conta (dado operacional).';
comment on column public.accounts.lead_account_secret_cipher is 'Senha cifrada AES-256-GCM (prefixo lpx1:), gerida apenas no servidor.';

create index if not exists accounts_lead_email_idx
  on public.accounts(lead_account_email)
  where lead_account_email is not null;

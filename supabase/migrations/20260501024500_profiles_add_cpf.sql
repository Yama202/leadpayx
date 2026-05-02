alter table public.profiles
  add column if not exists cpf text;

comment on column public.profiles.cpf is
  'CPF do usuário (apenas dígitos), usado para dados cadastrais e conferência de pagamento.';

create unique index if not exists profiles_cpf_unique
  on public.profiles (cpf)
  where cpf is not null and length(trim(cpf)) > 0;

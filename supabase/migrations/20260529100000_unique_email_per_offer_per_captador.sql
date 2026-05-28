-- Um captador não pode enviar o mesmo e-mail para a mesma oferta duas vezes.
-- Usa lower() para comparação case-insensitive.
-- Índice parcial: só aplica quando email e oferta não são nulos.

create unique index if not exists accounts_captador_email_offer_uniq
  on public.accounts(captador_id, lower(lead_account_email), promotion_offer_id)
  where lead_account_email is not null
    and promotion_offer_id is not null;

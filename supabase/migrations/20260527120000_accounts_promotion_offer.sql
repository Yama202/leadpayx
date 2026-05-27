-- Vincula cada conta enviada à oferta/casa selecionada pelo captador.
-- promotion_offer_name é desnormalizado para exibição rápida sem join.
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS promotion_offer_id   uuid REFERENCES promotion_offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promotion_offer_name text;

COMMENT ON COLUMN accounts.promotion_offer_id   IS 'Oferta ativa escolhida pelo captador no momento do envio.';
COMMENT ON COLUMN accounts.promotion_offer_name IS 'Nome da oferta no momento do envio (desnormalizado).';

-- Adiciona campo requires_pair a promotion_offers.
-- DEFAULT true garante que todas as ofertas existentes mantêm o comportamento atual (par obrigatório).
ALTER TABLE promotion_offers
  ADD COLUMN IF NOT EXISTS requires_pair boolean NOT NULL DEFAULT true;

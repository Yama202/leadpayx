/** Limites e helpers para comissão global BRL (sem PII). */

export const MAX_BRL_COMMISSION_PER_ACCOUNT = 999_999.99;

export function roundBrlHalfUp(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Lê valor canônico com fallback ao legado `app_settings`. */
export function resolveCaptadorCommissionPerAccount(
  values: Record<string, unknown>,
): number {
  const raw =
    values.captador_commission_per_account ?? values.commission_amount_brl ?? 30;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 30;
}

export function resolveOperatorCommissionPerAccount(
  values: Record<string, unknown>,
): number {
  const raw =
    values.operator_commission_per_account ?? values.operator_commission_amount_brl ?? 10;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 10;
}

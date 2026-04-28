import { normalizeReferralCode } from "./referrals.ts";

/** Parâmetros de query relevantes para preservar indicação e UTMs até `/register`. */
export type RegisterLinkSearchInput = Partial<{
  ref: string | string[];
  utm_content: string | string[];
  utm_source: string | string[];
  utm_medium: string | string[];
  utm_campaign: string | string[];
}>;

function firstString(value: string | string[] | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const s = Array.isArray(value) ? value[0] : value;
  return typeof s === "string" ? s : undefined;
}

/**
 * Monta o path de cadastro com código de indicação (`ref`, com fallback em `utm_content`)
 * e repassa UTMs quando presentes (analytics na URL de destino).
 */
export function buildRegisterHref(input: RegisterLinkSearchInput = {}): string {
  const refRaw = firstString(input.ref);
  const utmContentRaw = firstString(input.utm_content);
  const code =
    normalizeReferralCode(refRaw) || normalizeReferralCode(utmContentRaw);

  const sp = new URLSearchParams();

  if (code) {
    sp.set("ref", code);
  }

  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const) {
    const v = firstString(input[key]);
    if (v?.trim()) {
      sp.set(key, v.trim());
    }
  }

  const qs = sp.toString();
  return qs ? `/register?${qs}` : "/register";
}

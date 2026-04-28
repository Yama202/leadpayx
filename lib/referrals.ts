import type { AppSetting } from "@/lib/types";

const DEFAULT_REFERRAL_UTM = {
  source: "referral",
  medium: "captador",
  campaign: "invite",
};

function settingAsString(value: AppSetting["value"] | undefined, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function normalizeReferralCode(value?: string | null) {
  const normalized = value?.trim().toUpperCase();
  return normalized && /^[A-Z0-9_-]{4,32}$/.test(normalized) ? normalized : "";
}

export function getReferralSettings(settings: AppSetting[] | null | undefined) {
  const values = Object.fromEntries((settings ?? []).map((setting) => [setting.key, setting.value]));

  /** 1ª indicação qualificada (global, igual para todos os captadores). */
  const bonusBase = Number(values.referral_bonus_base_brl ?? values.referral_bonus_brl ?? 60);
  /** Cada indicação qualificada adicional (mesmo critério de meta). */
  const bonusIncrement = Number(
    values.referral_bonus_increment_brl ??
      values.referral_bonus_tier2_brl ??
      values.referral_bonus_brl ??
      bonusBase,
  );

  return {
    enabled: values.referral_bonus_enabled !== false,
    bonusBase,
    bonusIncrement,
    /** Congelado nos `earnings` na criação; alias legível = base. */
    bonusAmount: bonusBase,
    targetAccounts: Number(values.referral_completed_accounts_target ?? 2),
    utmSource: settingAsString(values.referral_utm_source, DEFAULT_REFERRAL_UTM.source),
    utmMedium: settingAsString(values.referral_utm_medium, DEFAULT_REFERRAL_UTM.medium),
    utmCampaign: settingAsString(values.referral_utm_campaign, DEFAULT_REFERRAL_UTM.campaign),
  };
}

/** Texto curto: base + incremento por “leva” de indicados que cumprem a meta (N contas concluídas). */
export function formatReferralBonusLevaHint(
  s: ReturnType<typeof getReferralSettings>,
  formatBrl: (amount: number) => string = (n) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
): string {
  if (s.bonusBase === s.bonusIncrement) {
    return `${formatBrl(s.bonusBase)} por qualificação · meta: ${s.targetAccounts} contas concluídas por indicado`;
  }
  return `1ª ${formatBrl(s.bonusBase)} · demais ${formatBrl(s.bonusIncrement)} · meta: ${s.targetAccounts} contas/indicado`;
}

export function buildReferralUrl({
  appUrl,
  code,
  utmSource = DEFAULT_REFERRAL_UTM.source,
  utmMedium = DEFAULT_REFERRAL_UTM.medium,
  utmCampaign = DEFAULT_REFERRAL_UTM.campaign,
}: {
  appUrl: string;
  code: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}) {
  const baseUrl = appUrl.replace(/\/$/, "") || "https://leadpayx.com.br";
  const url = new URL("/", baseUrl);

  url.searchParams.set("utm_source", utmSource);
  url.searchParams.set("utm_medium", utmMedium);
  url.searchParams.set("utm_campaign", utmCampaign);
  url.searchParams.set("utm_content", code);
  url.searchParams.set("ref", code);

  return url.toString();
}

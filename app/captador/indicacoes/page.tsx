import { ReferralBox } from "@/components/domain/referral-box";
import { CaptadorGlobalOffersPanel } from "@/components/domain/captador-global-offers-panel";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { DashboardCard } from "@/components/ui/cards";
import { requireRole } from "@/lib/auth";
import { fetchActiveCaptadorGlobalOffersResolved } from "@/lib/queries/captador-global-offers";
import { getReferralSettings } from "@/lib/referrals";
import { createClient } from "@/lib/supabase/server";
import type { AppSetting, ReferralSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function IndicacoesPage() {
  const profile = await requireRole(["captador"]);
  const supabase = await createClient();
  const [{ data: count }, { data: referrals }, { data: settings }, globalOffers] = await Promise.all([
    supabase.rpc("get_referral_count", {
      target_user_id: profile.id,
    }),
    supabase.rpc("get_referral_summary", {
      target_user_id: profile.id,
    }),
    supabase
      .from("app_settings")
      .select("key,value")
      .in("key", [
        "referral_bonus_enabled",
        "referral_bonus_brl",
        "referral_completed_accounts_target",
        "referral_utm_source",
        "referral_utm_medium",
        "referral_utm_campaign",
      ])
      .returns<AppSetting[]>(),
    fetchActiveCaptadorGlobalOffersResolved(supabase, profile),
  ]);
  const referralRows = (referrals ?? []) as ReferralSummary[];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const referralSettings = getReferralSettings(settings);

  return (
    <RoleBasedLayout
      description="Compartilhe seu código. O bônus é gerado uma única vez após a qualificação do indicado."
      profile={profile}
      title="Indicações"
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <DashboardCard
          hint="A listagem individual é restrita para evitar exposição de dados pessoais de outros captadores."
          label="Indicados vinculados"
          value={String(count ?? 0)}
        />
        <ReferralBox
          appUrl={appUrl}
          profile={profile}
          utmCampaign={referralSettings.utmCampaign}
          utmMedium={referralSettings.utmMedium}
          utmSource={referralSettings.utmSource}
        />
      </div>

      <div className="mt-6">
        <CaptadorGlobalOffersPanel
          description="Links globais autorizados pela administração. Cada URL inclui UTM para rastrear sua indicação (código ou ID)."
          items={globalOffers}
          title="Links oficiais de operação"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {referralRows.map((referral) => (
          <article
            className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80"
            key={referral.profile_id}
          >
            <p className="text-lg font-black text-slate-950 dark:text-white">
              {referral.name ?? "Indicado"}
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {referral.completed_accounts} contas concluídas ·{" "}
              {referral.qualified ? "qualificado" : "em progresso"} ·{" "}
              {referral.bonus_paid ? "bônus liberado" : "bônus pendente"}
            </p>
          </article>
        ))}
      </div>
    </RoleBasedLayout>
  );
}

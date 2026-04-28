import { AccountCard } from "@/components/domain/account-card";
import { CaptadorDepositBriefBanner } from "@/components/domain/captador-deposit-brief-banner";
import { ReferralBox } from "@/components/domain/referral-box";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { LinkButton } from "@/components/ui/button";
import { DashboardCard, EmptyState } from "@/components/ui/cards";
import { requireRole } from "@/lib/auth";
import { toCurrency } from "@/lib/payments";
import { formatReferralBonusLevaHint, getReferralSettings } from "@/lib/referrals";
import { getWhatsappGroupUrl } from "@/lib/settings";
import { ACCOUNT_SELECT_CAPTADOR } from "@/lib/account-columns";
import { createClient } from "@/lib/supabase/server";
import type { Account, AppSetting, CaptadorSubmissionBrief } from "@/lib/types";

type DashboardEarning = {
  amount: number | string;
  status: string;
  type: string;
};

export const dynamic = "force-dynamic";

export default async function CaptadorDashboardPage() {
  const profile = await requireRole(["captador"]);
  const supabase = await createClient();

  const [{ data: accounts }, { data: earnings }, { data: settings }, { data: depositBrief }, whatsappUrl] =
    await Promise.all([
    supabase
      .from("accounts")
      .select(ACCOUNT_SELECT_CAPTADOR)
      .eq("captador_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(3)
      .returns<Account[]>(),
    supabase
      .from("earnings")
      .select("amount,status,type")
      .eq("user_id", profile.id)
      .returns<DashboardEarning[]>(),
    supabase
      .from("app_settings")
      .select("key,value")
      .in("key", [
        "referral_bonus_base_brl",
        "referral_bonus_increment_brl",
        "referral_bonus_brl",
        "referral_bonus_tier2_brl",
        "referral_completed_accounts_target",
        "referral_utm_source",
        "referral_utm_medium",
        "referral_utm_campaign",
      ])
      .returns<AppSetting[]>(),
    supabase
      .from("captador_submission_briefs")
      .select("captador_id, min_deposit_brl, updated_at, updated_by")
      .eq("captador_id", profile.id)
      .maybeSingle<CaptadorSubmissionBrief>(),
    getWhatsappGroupUrl(),
  ]);
  const referralSettings = getReferralSettings(settings);

  const pendingAmount =
    earnings?.filter((earning) => earning.status === "pending").reduce(
      (sum, earning) => sum + Number(earning.amount),
      0,
    ) ?? 0;
  const normalPendingAmount =
    earnings
      ?.filter((earning) => earning.status === "pending" && earning.type === "account_completed")
      .reduce((sum, earning) => sum + Number(earning.amount), 0) ?? 0;
  const referralPendingAmount =
    earnings
      ?.filter((earning) => earning.status === "pending" && earning.type === "referral_bonus")
      .reduce((sum, earning) => sum + Number(earning.amount), 0) ?? 0;

  return (
    <RoleBasedLayout description="Contas, ganhos, links e Pix." profile={profile} title="Início">
      {depositBrief ? <CaptadorDepositBriefBanner minDepositBrl={Number(depositBrief.min_deposit_brl)} /> : null}
      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { t: "Enviar", s: "Nova conta" },
          { t: "Status", s: "Na lista Contas" },
          { t: "Ganhos", s: "Após conclusão" },
          { t: "Pix", s: "Em Perfil" },
        ].map(({ t, s }) => (
          <article
            className="flex min-h-[4.5rem] flex-col justify-center rounded-2xl border border-[#00E07A]/15 bg-[#00E07A]/5 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
            key={t}
          >
            <p className="font-black text-[#16F28A]">{t}</p>
            <p className="text-xs font-semibold text-[#A1A1AA]">{s}</p>
          </article>
        ))}
      </section>
      {whatsappUrl ? (
        <section className="mb-6 flex flex-col gap-3 rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-black text-white">WhatsApp oficial</p>
          <LinkButton
            className="min-h-12 w-full shrink-0 sm:w-auto"
            href={whatsappUrl}
            rel="noreferrer"
            target="_blank"
            variant="secondary"
          >
            Abrir grupo
          </LinkButton>
        </section>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <DashboardCard label="Contas enviadas" value={String(accounts?.length ?? 0)} />
        <DashboardCard label="Ganhos pendentes" value={toCurrency(pendingAmount)} />
        <DashboardCard
          hint="Contas concluídas aprovadas pela operação."
          label="Ganhos normais"
          value={toCurrency(normalPendingAmount)}
        />
        <DashboardCard
          hint={formatReferralBonusLevaHint(referralSettings, toCurrency)}
          label="Indicação"
          value={toCurrency(referralPendingAmount)}
        />
        <DashboardCard label="Código" value={profile.referral_code} />
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          {accounts?.length ? (
            accounts.map((account) => <AccountCard account={account} key={account.id} />)
          ) : (
            <EmptyState
              action={<LinkButton href="/captador/enviar-conta">Enviar conta</LinkButton>}
              description="Nenhum envio ainda."
              title="Sem contas"
            />
          )}
        </section>
        <ReferralBox
          appUrl={process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? ""}
          profile={profile}
          utmCampaign={referralSettings.utmCampaign}
          utmMedium={referralSettings.utmMedium}
          utmSource={referralSettings.utmSource}
        />
      </div>
    </RoleBasedLayout>
  );
}

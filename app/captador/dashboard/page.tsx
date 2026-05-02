import { AccountCard } from "@/components/domain/account-card";
import { CaptadorDepositBriefBanner } from "@/components/domain/captador-deposit-brief-banner";
import { ManualRouterRefreshButton } from "@/components/domain/manual-router-refresh-button";
import { CaptadorWhatsappGroupAlert } from "@/components/domain/captador-whatsapp-group-alert";
import { ReferralBox } from "@/components/domain/referral-box";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { LinkButton } from "@/components/ui/button";
import { DashboardCard, EmptyState } from "@/components/ui/cards";
import { claimWeeklyGoalBonusAction } from "@/lib/actions/domain";
import { requireRole } from "@/lib/auth";
import { getActiveOffersMinDepositBrl } from "@/lib/captador-submission-brief";
import { toCurrency } from "@/lib/payments";
import { formatReferralBonusLevaHint, getReferralSettings } from "@/lib/referrals";
import { getWhatsappGroupUrl } from "@/lib/settings";
import { ACCOUNT_SELECT_CAPTADOR, ACCOUNT_SELECT_CAPTADOR_FALLBACK } from "@/lib/account-columns";
import { createClient } from "@/lib/supabase/server";
import type { Account, AppSetting, WeeklyGoalProgress } from "@/lib/types";

type DashboardEarning = {
  amount: number | string;
  status: string;
  type: string;
};

export const dynamic = "force-dynamic";

export default async function CaptadorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ goal?: string }>;
}) {
  const params = await searchParams;
  const profile = await requireRole(["captador"]);
  const supabase = await createClient();
  const [accountsPrimary, accountsCountRes, earningsRes, settingsRes, minDepositBrl, whatsappUrl, weeklyGoalProgressRes] =
    await Promise.all([
    supabase
      .from("accounts")
      .select(ACCOUNT_SELECT_CAPTADOR)
      .eq("captador_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(3)
      .returns<Account[]>(),
    supabase
      .from("accounts")
      .select("id", { count: "exact", head: true })
      .eq("captador_id", profile.id),
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
    getActiveOffersMinDepositBrl(),
    getWhatsappGroupUrl(),
    supabase
      .rpc("get_weekly_goal_progress", { target_captador_id: profile.id })
      .single<WeeklyGoalProgress>(),
    ]);
  let accounts = accountsPrimary.data;

  if (
    accountsPrimary.error &&
    (accountsPrimary.error.code === "PGRST204" || accountsPrimary.error.code === "42703")
  ) {
    const fallback = await supabase
      .from("accounts")
      .select(ACCOUNT_SELECT_CAPTADOR_FALLBACK)
      .eq("captador_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(3)
      .returns<Account[]>();

    if (!fallback.error) {
      accounts = fallback.data;
      console.warn("[captador/dashboard] fallback select usado por schema parcial", {
        message: accountsPrimary.error.message,
        code: accountsPrimary.error.code,
      });
    } else {
      console.error("[captador/dashboard] falha no select de contas", {
        primary: { message: accountsPrimary.error.message, code: accountsPrimary.error.code },
        fallback: { message: fallback.error.message, code: fallback.error.code },
      });
    }
  } else if (accountsPrimary.error) {
    console.error("[captador/dashboard] falha no select de contas", {
      message: accountsPrimary.error.message,
      code: accountsPrimary.error.code,
    });
  }
  const earnings = earningsRes.data;
  const settings = settingsRes.data;
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

  const submittedAccountsCount = accountsCountRes.count ?? accounts?.length ?? 0;
  const weeklyGoalProgress = weeklyGoalProgressRes.data;
  const goalStatusText =
    params.goal === "claimed"
      ? "Prêmio semanal solicitado com sucesso."
      : params.goal === "already"
        ? "Você já solicitou o prêmio desta semana."
        : params.goal === "not_reached"
          ? "Meta da semana ainda não foi alcançada."
          : params.goal === "disabled"
            ? "Campanha semanal está desativada no momento."
            : params.goal === "error"
              ? "Não foi possível solicitar o prêmio agora."
              : null;

  return (
    <RoleBasedLayout description="Contas, ganhos, links e Pix." profile={profile} title="Início">
      <div className="mb-4 flex justify-end">
        <ManualRouterRefreshButton label="Atualizar início" variant="ghost" />
      </div>
      {minDepositBrl != null && minDepositBrl > 0 ? (
        <CaptadorDepositBriefBanner minDepositBrl={minDepositBrl} />
      ) : null}
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
      <CaptadorWhatsappGroupAlert whatsappUrl={whatsappUrl} />
      {weeklyGoalProgress ? (
        <section className="mb-4 rounded-3xl border border-emerald-400/20 bg-emerald-500/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-300">
                Meta semanal
              </p>
              <p className="mt-1 text-sm text-zinc-300">
                {weeklyGoalProgress.completed_accounts}/{weeklyGoalProgress.target_accounts} contas concluídas · prêmio{" "}
                {toCurrency(Number(weeklyGoalProgress.reward_brl))}
              </p>
            </div>
            {weeklyGoalProgress.enabled && weeklyGoalProgress.eligible && !weeklyGoalProgress.claimed ? (
              <form action={claimWeeklyGoalBonusAction}>
                <button className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-500 px-4 text-sm font-black text-emerald-950 hover:bg-emerald-400">
                  Meta alcançada: solicitar prêmio
                </button>
              </form>
            ) : (
              <p className="text-xs font-semibold text-zinc-400">
                {weeklyGoalProgress.claimed
                  ? "Prêmio desta semana já solicitado."
                  : weeklyGoalProgress.enabled
                    ? "Continue para bater a meta da semana."
                    : "Campanha semanal desativada no momento."}
              </p>
            )}
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{
                width: `${Math.min(
                  (weeklyGoalProgress.completed_accounts / Math.max(weeklyGoalProgress.target_accounts, 1)) * 100,
                  100,
                )}%`,
              }}
            />
          </div>
          {goalStatusText ? <p className="mt-2 text-xs text-zinc-300">{goalStatusText}</p> : null}
        </section>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <DashboardCard label="Contas enviadas" value={String(submittedAccountsCount)} />
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

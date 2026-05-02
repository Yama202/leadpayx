import { PayoutRequestForm } from "@/components/domain/payout-request-form";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { LinkButton } from "@/components/ui/button";
import { DashboardCard, EmptyState, StatusBadge } from "@/components/ui/cards";
import { requireRole } from "@/lib/auth";
import { maskPixKeyForAdmin } from "@/lib/pix-key";
import { toCurrency } from "@/lib/payments";
import { getPaymentProofUrls } from "@/lib/payments.server";
import { formatReferralBonusLevaHint, getReferralSettings } from "@/lib/referrals";
import { createClient } from "@/lib/supabase/server";
import type { AppSetting, Earning, Payout } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PagamentosCaptadorPage() {
  const profile = await requireRole(["captador"]);
  const supabase = await createClient();
  const [{ data: earnings }, { data: payouts }, { data: settings }] = await Promise.all([
    supabase
      .from("earnings")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .returns<Earning[]>(),
    supabase
      .from("payouts")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .returns<Payout[]>(),
    supabase
      .from("app_settings")
      .select("key,value")
      .in("key", [
        "referral_bonus_base_brl",
        "referral_bonus_increment_brl",
        "referral_bonus_brl",
        "referral_bonus_tier2_brl",
        "referral_completed_accounts_target",
      ])
      .returns<AppSetting[]>(),
  ]);
  const referralSettings = getReferralSettings(settings);
  const pixOk = Boolean(profile.pix_key?.trim() && profile.pix_key.trim().length >= 3);
  const tierHint = formatReferralBonusLevaHint(referralSettings, toCurrency);

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
  const paidAmount =
    earnings
      ?.filter((earning) => earning.status === "paid")
      .reduce((sum, earning) => sum + Number(earning.amount), 0) ?? 0;
  const proofUrls = await getPaymentProofUrls(payouts ?? [], supabase);
  const earningLabels: Record<Earning["type"], string> = {
    account_completed: "Conta concluída",
    operator_account_completed: "Operação concluída",
    referral_bonus: "Bônus de indicação",
  };

  return (
    <RoleBasedLayout description="Ganhos, Pix e solicitação de pagamento." profile={profile} title="Pagamentos">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="Disponível" value={toCurrency(pendingAmount)} />
        <DashboardCard label="Ganhos normais" value={toCurrency(normalPendingAmount)} />
        <DashboardCard label="Indicação" value={toCurrency(referralPendingAmount)} />
        <DashboardCard label="Já pago" value={toCurrency(paidAmount)} />
      </div>
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <article className="rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A1A1AA]">Ganhos normais</p>
          <p className="mt-4 text-3xl font-black text-white">{toCurrency(normalPendingAmount)}</p>
        </article>
        <article className="rounded-[2rem] border border-[#00E07A]/20 bg-[#00E07A]/10 p-5 shadow-[0_24px_80px_rgba(0,224,122,0.08)]">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#16F28A]">Indicação</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-emerald-100/85">{tierHint}</p>
          <p className="mt-4 text-3xl font-black text-emerald-50">{toCurrency(referralPendingAmount)}</p>
        </article>
      </section>
      <section className="mt-6 rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A1A1AA]">
              Lançamentos
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {earnings?.length ? (
            earnings.slice(0, 8).map((earning) => (
              <article
                className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-black/20 p-4"
                key={earning.id}
              >
                <div>
                  <p className="font-bold text-white">{earningLabels[earning.type]}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#A1A1AA]">
                    {earning.type === "referral_bonus" ? "Indicação qualificada" : "Conta aprovada"} · {earning.status}
                  </p>
                </div>
                <p className="text-right text-lg font-black text-[#16F28A]">
                  {toCurrency(Number(earning.amount))}
                </p>
              </article>
            ))
          ) : (
            <p className="rounded-2xl border border-white/[0.08] bg-black/20 p-4 text-sm text-[#A1A1AA]">Sem lançamentos.</p>
          )}
        </div>
      </section>
      <section className="mt-4 rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A1A1AA]">Chave Pix</p>
            <p className="mt-1 font-mono text-sm font-semibold text-white">
              {pixOk ? maskPixKeyForAdmin(profile.pix_key) : "—"}
            </p>
            {!pixOk ? (
              <LinkButton className="mt-3 min-h-12 w-full sm:w-auto" href="/captador/perfil" variant="secondary">
                Cadastrar Pix
              </LinkButton>
            ) : null}
          </div>
          <div className="w-full shrink-0 sm:max-w-[240px]">
            <PayoutRequestForm />
          </div>
        </div>
        <p className="mt-3 text-xs text-[#A1A1AA]">Pagamentos: até 1 solicitação/dia; fila administrativa.</p>
      </section>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {payouts?.length ? (
          payouts.map((payout) => (
            <article
              className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80"
              key={payout.id}
            >
              <div className="flex items-center justify-between">
                <p className="text-2xl font-black text-slate-950 dark:text-white">
                  {toCurrency(payout.amount)}
                </p>
                <StatusBadge status={payout.status === "processed" ? "paid" : "pending"} />
              </div>
              {proofUrls.get(payout.id) ? (
                <a
                  className="mt-3 inline-flex text-sm font-bold text-emerald-700 dark:text-emerald-300"
                  href={proofUrls.get(payout.id) as string}
                  target="_blank"
                >
                  Abrir comprovante
                </a>
              ) : null}
            </article>
          ))
        ) : (
          <EmptyState
            description="Quando houver ganhos pendentes, você poderá solicitar pagamento."
            title="Nenhum pagamento"
          />
        )}
      </div>
    </RoleBasedLayout>
  );
}

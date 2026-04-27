import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { Button } from "@/components/ui/button";
import { DashboardCard, EmptyState, StatusBadge } from "@/components/ui/cards";
import { ensurePayoutFormAction } from "@/lib/actions/domain";
import { requireRole } from "@/lib/auth";
import { getPaymentProofUrls, toCurrency } from "@/lib/payments";
import { createClient } from "@/lib/supabase/server";
import type { Earning, Payout } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PagamentosCaptadorPage() {
  const profile = await requireRole(["captador"]);
  const supabase = await createClient();
  const [{ data: earnings }, { data: payouts }] = await Promise.all([
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
  ]);

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
  const proofUrls = await getPaymentProofUrls(payouts ?? []);
  const earningLabels: Record<Earning["type"], string> = {
    account_completed: "Conta concluída",
    operator_account_completed: "Operação concluída",
    referral_bonus: "Bônus de indicação",
  };

  return (
    <RoleBasedLayout
      description="Acompanhe seus ganhos e pagamentos processados."
      profile={profile}
      title="Pagamentos"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="Disponível" value={toCurrency(pendingAmount)} />
        <DashboardCard label="Ganhos normais" value={toCurrency(normalPendingAmount)} />
        <DashboardCard label="Indicação" value={toCurrency(referralPendingAmount)} />
        <DashboardCard label="Já pago" value={toCurrency(paidAmount)} />
      </div>
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <article className="rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A1A1AA]">
            Ganhos normais
          </p>
          <p className="mt-2 text-sm leading-6 text-[#A1A1AA]">
            Valores gerados por contas próprias concluídas.
          </p>
          <p className="mt-4 text-3xl font-black text-white">
            {toCurrency(normalPendingAmount)}
          </p>
        </article>
        <article className="rounded-[2rem] border border-[#00E07A]/20 bg-[#00E07A]/10 p-5 shadow-[0_24px_80px_rgba(0,224,122,0.08)]">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#16F28A]">
            Ganhos por indicação
          </p>
          <p className="mt-2 text-sm leading-6 text-emerald-100/75">
            Bônus de R$10 liberado automaticamente quando um indicado completa 2 contas válidas.
          </p>
          <p className="mt-4 text-3xl font-black text-emerald-50">
            {toCurrency(referralPendingAmount)}
          </p>
        </article>
      </section>
      <section className="mt-6 rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A1A1AA]">
              Lançamentos
            </p>
            <p className="mt-2 text-sm leading-6 text-[#A1A1AA]">
              Ganhos normais e bônus aparecem separados para facilitar conferência.
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
            <p className="rounded-2xl border border-white/[0.08] bg-black/20 p-4 text-sm text-[#A1A1AA]">
              Nenhum lançamento de ganho registrado ainda.
            </p>
          )}
        </div>
      </section>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_240px]">
        <DashboardCard label="Pix diário" value="1x ao dia" hint="Solicitações entram na fila de pagamento do admin." />
        <form action={ensurePayoutFormAction}>
          <Button className="h-full w-full" type="submit" variant="secondary">
            Solicitar pagamento
          </Button>
        </form>
      </div>
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

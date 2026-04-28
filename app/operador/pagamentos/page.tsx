import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { DashboardCard, EmptyState, StatusBadge } from "@/components/ui/cards";
import { PayoutRequestForm } from "@/components/domain/payout-request-form";
import { requireRole } from "@/lib/auth";
import { toCurrency } from "@/lib/payments";
import { getPaymentProofUrls } from "@/lib/payments.server";
import { createClient } from "@/lib/supabase/server";
import type { Earning, Payout } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OperadorPagamentosPage() {
  const profile = await requireRole(["operator"]);
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
    earnings
      ?.filter((earning) => earning.status === "pending")
      .reduce((sum, earning) => sum + Number(earning.amount), 0) ?? 0;
  const paidAmount =
    earnings
      ?.filter((earning) => earning.status === "paid")
      .reduce((sum, earning) => sum + Number(earning.amount), 0) ?? 0;
  const proofUrls = await getPaymentProofUrls(payouts ?? []);

  return (
    <RoleBasedLayout
      description="Acompanhe seus ganhos operacionais e comprovantes dos seus Pix."
      profile={profile}
      title="Pagamentos"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <DashboardCard label="Disponível" value={toCurrency(pendingAmount)} />
        <DashboardCard label="Já pago" value={toCurrency(paidAmount)} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_240px]">
        <DashboardCard
          hint="O admin processa os pagamentos via Pix uma vez ao dia."
          label="Pix diário"
          value="1x ao dia"
        />
        <PayoutRequestForm className="h-full" />
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

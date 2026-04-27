import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { DashboardCard } from "@/components/ui/cards";
import { requireRole } from "@/lib/auth";
import { toCurrency } from "@/lib/payments";
import { createClient } from "@/lib/supabase/server";
import type { CaptadorRanking, FinancialSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const profile = await requireRole(["admin"]);
  const supabase = await createClient();
  const [accounts, payouts, captadores, operadores, financial, ranking] = await Promise.all([
    supabase.from("accounts").select("id", { count: "exact", head: true }),
    supabase.from("payouts").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "captador"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "operator"),
    supabase
      .rpc("get_financial_summary", { period_start: null, period_end: null })
      .returns<FinancialSummary[]>(),
    supabase
      .rpc("get_captador_ranking", { period_start: null, period_end: null })
      .returns<CaptadorRanking[]>(),
  ]);
  const financialRows = (financial.data ?? []) as FinancialSummary[];
  const rankingRows = (ranking.data ?? []) as CaptadorRanking[];
  const pendingTotal = financialRows.reduce(
    (sum, row) => sum + Number(row.pending_amount),
    0,
  );
  const paidTotal = financialRows.reduce((sum, row) => sum + Number(row.paid_amount), 0);

  return (
    <RoleBasedLayout
      description="Visão administrativa para acompanhar operação, pagamentos, ranking e auditoria."
      profile={profile}
      title="Admin"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="Contas" value={String(accounts.count ?? 0)} />
        <DashboardCard label="Pagamentos pendentes" value={String(payouts.count ?? 0)} />
        <DashboardCard label="Captadores" value={String(captadores.count ?? 0)} />
        <DashboardCard label="Operadores" value={String(operadores.count ?? 0)} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <DashboardCard label="Total pendente geral" value={toCurrency(pendingTotal)} />
        <DashboardCard label="Total pago geral" value={toCurrency(paidTotal)} />
      </div>

      <section className="mt-6 rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-900/80">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              Ranking inteligente
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              Captadores por score operacional
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Score ponderado: volume 25%, conclusão 25%, ganhos 20%,
            consistência 15% e baixa recusa 15%.
          </p>
        </div>
        <div className="mt-5 grid gap-3">
          {rankingRows.slice(0, 5).map((row, index) => (
            <div
              className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5 sm:grid-cols-[48px_1fr_120px]"
              key={row.captador_id}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white dark:bg-emerald-400 dark:text-emerald-950">
                #{index + 1}
              </div>
              <div>
                <p className="font-black text-slate-950 dark:text-white">
                  {row.name ?? row.email ?? "Captador"}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {row.completed_accounts}/{row.accounts_submitted} concluídas ·{" "}
                  {toCurrency(row.generated_amount)} gerados ·{" "}
                  {(Number(row.rejection_rate) * 100).toFixed(1)}% recusa
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3 text-center dark:bg-emerald-400/10">
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  Score
                </p>
                <p className="text-2xl font-black text-emerald-950 dark:text-emerald-100">
                  {Number(row.score).toFixed(1)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </RoleBasedLayout>
  );
}

import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { LinkButton } from "@/components/ui/button";
import { DashboardCard } from "@/components/ui/cards";
import { requireRole } from "@/lib/auth";
import { toCurrency } from "@/lib/payments";
import { createClient } from "@/lib/supabase/server";
import type { CaptadorRanking, FinancialSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

type ValidatedReferralMetric = {
  captador_id: string;
  name: string | null;
  email: string | null;
  total_validated: number;
  last_validated_at: string | null;
};

function getPeriodRange(period: string | undefined): {
  start: string | null;
  end: string | null;
  label: string;
  key: "today" | "7d" | "30d" | "all";
} {
  const now = new Date();
  const toIso = (value: Date) => value.toISOString();

  if (period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start: toIso(start), end: null, label: "Hoje", key: "today" };
  }
  if (period === "7d") {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return { start: toIso(start), end: null, label: "Últimos 7 dias", key: "7d" };
  }
  if (period === "30d") {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return { start: toIso(start), end: null, label: "Últimos 30 dias", key: "30d" };
  }

  return { start: null, end: null, label: "Todo período", key: "all" };
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const periodRange = getPeriodRange(params.period);
  const profile = await requireRole(["admin"]);
  const supabase = await createClient();
  const [accounts, payouts, captadores, operadores, financial, ranking, validatedReferrals] =
    await Promise.all([
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
      supabase
        .rpc("get_validated_referral_ranking", {
          period_start: periodRange.start,
          period_end: periodRange.end,
        })
        .returns<ValidatedReferralMetric[]>(),
    ]);
  const financialRows = (financial.data ?? []) as FinancialSummary[];
  const rankingRows = (ranking.data ?? []) as CaptadorRanking[];
  const validatedRows = (validatedReferrals.data ?? []) as ValidatedReferralMetric[];
  const validatedByCaptador = new Map(
    validatedRows.map((row) => [row.captador_id, Number(row.total_validated)]),
  );
  const intelligentRanking = rankingRows
    .map((row) => {
      const validatedCount = validatedByCaptador.get(row.captador_id) ?? 0;
      // Peso explícito de indicação validada para o score inteligente no painel admin.
      const intelligentScore = Number(row.score) + validatedCount * 2;
      return {
        ...row,
        validatedCount,
        intelligentScore,
      };
    })
    .sort((a, b) => b.intelligentScore - a.intelligentScore);
  const validatedTotal = validatedRows.reduce(
    (sum, row) => sum + Number(row.total_validated),
    0,
  );
  const pendingTotal = financialRows.reduce(
    (sum, row) => sum + Number(row.pending_amount),
    0,
  );
  const paidTotal = financialRows.reduce((sum, row) => sum + Number(row.paid_amount), 0);

  return (
    <RoleBasedLayout
      description="Operação, pagamentos e captação validada."
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              Captação validada
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              Indicadores por captador
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Regra: indicado com 2 contas concluídas por operador.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "today", label: "Hoje" },
              { key: "7d", label: "7 dias" },
              { key: "30d", label: "30 dias" },
              { key: "all", label: "Todos" },
            ].map((item) => (
              <LinkButton
                href={item.key === "all" ? "/admin/dashboard" : `/admin/dashboard?period=${item.key}`}
                key={item.key}
                variant={periodRange.key === item.key ? "primary" : "secondary"}
              >
                {item.label}
              </LinkButton>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <DashboardCard label="Total validados no período" value={String(validatedTotal)} />
          <DashboardCard label="Filtro ativo" value={periodRange.label} />
        </div>
        <div className="mt-5 grid gap-3">
          {validatedRows.length ? (
            validatedRows.map((row, index) => (
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
                    Última validação:{" "}
                    {row.last_validated_at
                      ? new Date(row.last_validated_at).toLocaleString("pt-BR")
                      : "sem validação"}
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-3 text-center dark:bg-emerald-400/10">
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    Validados
                  </p>
                  <p className="text-2xl font-black text-emerald-950 dark:text-emerald-100">
                    {row.total_validated}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              Nenhuma validação no período selecionado.
            </p>
          )}
        </div>
      </section>

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
            Score inteligente: base operacional (volume, conclusão, ganhos,
            consistência e baixa recusa) + bônus por indicações validadas.
          </p>
        </div>
        <div className="mt-5 grid gap-3">
          {intelligentRanking.slice(0, 5).map((row, index) => (
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
                  {(Number(row.rejection_rate) * 100).toFixed(1)}% recusa ·{" "}
                  {row.validatedCount} indicações validadas
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3 text-center dark:bg-emerald-400/10">
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  Score inteligente
                </p>
                <p className="text-2xl font-black text-emerald-950 dark:text-emerald-100">
                  {Number(row.intelligentScore).toFixed(1)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </RoleBasedLayout>
  );
}

import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { DashboardCard, StatusBadge } from "@/components/ui/cards";
import { Field, SubmitButton } from "@/components/ui/forms";
import { processPayoutFormAction } from "@/lib/actions/domain";
import { requireRole } from "@/lib/auth";
import { getPaymentProofUrls, parsePeriod, toCurrency } from "@/lib/payments";
import { createClient } from "@/lib/supabase/server";
import type { FinancialSummary, Payout } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPagamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const profile = await requireRole(["admin"]);
  const supabase = await createClient();
  const params = await searchParams;
  const period = parsePeriod(params);
  const [{ data: payouts }, { data: financial }] = await Promise.all([
    supabase.from("payouts").select("*").order("created_at", { ascending: false }).returns<Payout[]>(),
    supabase
      .rpc("get_financial_summary", {
        period_start: period.start,
        period_end: period.end,
      })
      .returns<FinancialSummary[]>(),
  ]);
  const payoutRows = payouts ?? [];
  const payoutUserIds = [...new Set(payoutRows.map((row) => row.user_id))];
  const { data: payoutProfiles } = payoutUserIds.length
    ? await supabase
        .from("profiles")
        .select("id,name,email,role")
        .in("id", payoutUserIds)
    : { data: [] };
  const payoutProfileMap = new Map(
    (payoutProfiles ?? []).map((item) => [item.id, item]),
  );
  const proofUrls = await getPaymentProofUrls(payoutRows);
  const financialRows = (financial ?? []) as FinancialSummary[];
  const pendingTotal = financialRows.reduce((sum, row) => sum + Number(row.pending_amount), 0);
  const paidTotal = financialRows.reduce((sum, row) => sum + Number(row.paid_amount), 0);

  return (
    <RoleBasedLayout
      description="Processe pagamentos e anexe comprovantes no bucket privado."
      profile={profile}
      title="Pagamentos"
    >
      <form className="mb-5 grid gap-3 rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80 sm:grid-cols-[1fr_1fr_160px]">
        <Field label="Início" name="start" type="date" defaultValue={period.startInput} />
        <Field label="Fim" name="end" type="date" defaultValue={period.endInput} />
        <button className="min-h-12 self-end rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white dark:bg-emerald-400 dark:text-emerald-950">
          Filtrar
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2">
        <DashboardCard label="Pendente geral" value={toCurrency(pendingTotal)} />
        <DashboardCard label="Pago geral" value={toCurrency(paidTotal)} />
      </div>

      <section className="mt-5 rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80">
        <h2 className="text-xl font-black text-slate-950 dark:text-white">
          Pendente/pago por pessoa
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3">Pessoa</th>
                <th>Perfil</th>
                <th>Pendente</th>
                <th>Pago</th>
                <th>Pix processados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {financialRows.map((row) => (
                <tr key={row.user_id}>
                  <td className="py-3 font-bold text-slate-950 dark:text-white">
                    {row.name ?? row.email ?? row.user_id}
                  </td>
                  <td className="text-slate-500 dark:text-slate-400">{row.role}</td>
                  <td className="font-bold text-amber-700 dark:text-amber-200">
                    {toCurrency(row.pending_amount)}
                  </td>
                  <td className="font-bold text-emerald-700 dark:text-emerald-200">
                    {toCurrency(row.paid_amount)}
                  </td>
                  <td className="text-slate-500 dark:text-slate-400">
                    {row.processed_payouts}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {payoutRows.map((payout) => (
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
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {(payoutProfileMap.get(payout.user_id)?.name ??
                payoutProfileMap.get(payout.user_id)?.email ??
                payout.user_id)}{" "}
              · {payoutProfileMap.get(payout.user_id)?.role ?? "perfil"} ·{" "}
              {new Date(payout.created_at).toLocaleString("pt-BR")}
            </p>
            {payout.status === "pending" ? (
              <div className="mt-5">
                <form action={processPayoutFormAction} className="space-y-5">
                  <input name="payoutId" type="hidden" value={payout.id} />
                  <Field
                    label="Notas"
                    name="notes"
                    placeholder="Referência interna do pagamento"
                  />
                  <label className="block">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      Comprovante
                    </span>
                    <input
                      className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
                      name="proof"
                      type="file"
                    />
                  </label>
                  <SubmitButton>Marcar processado</SubmitButton>
                </form>
              </div>
            ) : (
              <div className="mt-4 space-y-2 text-sm text-slate-500 dark:text-slate-400">
                <p>Processado em: {payout.processed_at ? new Date(payout.processed_at).toLocaleString("pt-BR") : "-"}</p>
                {proofUrls.get(payout.id) ? (
                  <a className="font-bold text-emerald-700 dark:text-emerald-300" href={proofUrls.get(payout.id) as string} target="_blank">
                    Abrir comprovante
                  </a>
                ) : (
                  <p>Comprovante não anexado.</p>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </RoleBasedLayout>
  );
}

import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { DashboardCard, StatusBadge } from "@/components/ui/cards";
import { Field, SubmitButton } from "@/components/ui/forms";
import { AdminPixKeyActions } from "./admin-pix-key-actions";
import { adminInitiatePayoutFormAction, processPayoutFormAction } from "@/lib/actions/domain";
import { requireRole } from "@/lib/auth";
import { parsePeriod, toCurrency } from "@/lib/payments";
import { getPaymentProofUrls } from "@/lib/payments.server";
import { buildPixQrCodeMap } from "@/lib/pix-qr.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { FinancialSummary, Payout } from "@/lib/types";

type PaymentRole = "captador" | "operator";

export async function PaymentsByRoleView({
  role,
  searchParams,
}: {
  role: PaymentRole;
  searchParams: { start?: string; end?: string; initiate_error?: string };
}) {
  const profile = await requireRole(["admin"]);
  const supabase = await createClient();
  const period = parsePeriod(searchParams);

  const [{ data: payouts }, financialRpc] = await Promise.all([
    supabase.from("payouts").select("*").order("created_at", { ascending: false }).returns<Payout[]>(),
    supabase
      .rpc("get_financial_summary", { period_start: period.start, period_end: period.end })
      .returns<FinancialSummary[]>(),
  ]);

  const payoutRows = payouts ?? [];
  const payoutUserIds = [...new Set(payoutRows.map((row) => row.user_id))];

  const { data: payoutProfiles } = payoutUserIds.length
    ? await supabase
        .from("profiles")
        .select("id,name,email,role,pix_key")
        .in("id", payoutUserIds)
    : { data: [] };

  const payoutProfileMap = new Map((payoutProfiles ?? []).map((item) => [item.id, item]));
  const proofUrls = await getPaymentProofUrls(payoutRows);
  const financialRowsAll = (financialRpc.data ?? []) as FinancialSummary[];
  const financialRows = financialRowsAll.filter((row) => row.role === role);
  const financialError = financialRpc.error?.message ?? null;
  const pendingTotal = financialRows.reduce((sum, row) => sum + Number(row.pending_amount), 0);
  const paidTotal = financialRows.reduce((sum, row) => sum + Number(row.amount_paid_total ?? row.paid_amount), 0);
  const payoutRowsByRole = payoutRows.filter(
    (payout) => payoutProfileMap.get(payout.user_id)?.role === role,
  );
  const roleLabel = role === "captador" ? "captadores" : "operadores";
  const baseQuery = new URLSearchParams();
  if (period.startInput) baseQuery.set("start", period.startInput);
  if (period.endInput) baseQuery.set("end", period.endInput);
  const captadorHref = new URLSearchParams(baseQuery);
  const operatorHref = new URLSearchParams(baseQuery);

  // ── Accounts + balance per payout (captador only) ─────────────────────
  const payoutBalanceMap = new Map<string, number>();
  type AccountSummary = {
    id: string;
    account_identifier: string | null;
    lead_account_email: string | null;
    status: string;
    promotion_offer_name: string | null;
    balance_initial_brl: number | null;
    balance_final_brl: number | null;
  };
  const payoutAccountsMap = new Map<string, AccountSummary[]>();

  if (role === "captador" && payoutRowsByRole.length > 0) {
    const allPayoutIds = payoutRowsByRole.map((p) => p.id);
    const pendingPayoutIds = payoutRowsByRole.filter((p) => p.status === "pending").map((p) => p.id);

    const { data: peRows } = await supabase
      .from("payout_earnings")
      .select("payout_id, earning_id")
      .in("payout_id", allPayoutIds);

    const earningIds = [...new Set((peRows ?? []).map((r) => r.earning_id))];

    if (earningIds.length > 0) {
      const { data: earningRows } = await supabase
        .from("earnings")
        .select("id, account_id, type")
        .in("id", earningIds)
        .eq("type", "account_completed");

      const accountIds = [...new Set(
        (earningRows ?? []).filter((e) => e.account_id).map((e) => e.account_id as string),
      )];

      if (accountIds.length > 0) {
        const { data: accountRows } = await supabase
          .from("accounts")
          .select("id, account_identifier, lead_account_email, status, promotion_offer_name, balance_initial_brl, balance_final_brl")
          .in("id", accountIds);

        const accountMap = new Map((accountRows ?? []).map((a) => [a.id, a as AccountSummary]));
        const earningAccountMap = new Map((earningRows ?? []).map((e) => [e.id, e.account_id as string]));

        for (const pe of peRows ?? []) {
          const accountId = earningAccountMap.get(pe.earning_id);
          if (!accountId) continue;

          // Balance adjustment — only for pending payouts
          if (pendingPayoutIds.includes(pe.payout_id)) {
            const acct = accountMap.get(accountId);
            if (acct?.balance_initial_brl != null && acct?.balance_final_brl != null) {
              const delta = Number(acct.balance_initial_brl) - Number(acct.balance_final_brl);
              payoutBalanceMap.set(pe.payout_id, (payoutBalanceMap.get(pe.payout_id) ?? 0) + delta);
            }
          }

          // Accounts list — for all payouts (deduplicated)
          const acct = accountMap.get(accountId);
          if (acct) {
            const list = payoutAccountsMap.get(pe.payout_id) ?? [];
            if (!list.some((a) => a.id === accountId)) list.push(acct);
            payoutAccountsMap.set(pe.payout_id, list);
          }
        }
      }
    }
  }

  // ── PIX QR codes (captador only) ───────────────────────────────────────
  const pixQrMap = new Map<string, string>();
  if (role === "captador") {
    const captadorPixEntries = [...payoutProfileMap.entries()]
      .filter(([, p]) => p.role === "captador" && p.pix_key)
      .map(([id, p]) => ({ id, pix_key: p.pix_key }));
    const generated = await buildPixQrCodeMap(captadorPixEntries);
    for (const [k, v] of generated) pixQrMap.set(k, v);
  }

  // ── Loan debt per captador (todos os payouts visíveis, não só pendentes) ──
  const debtByUserId = new Map<string, number>();
  if (role === "captador") {
    const allCaptadorUserIds = [...new Set(payoutRowsByRole.map((p) => p.user_id))];
    if (allCaptadorUserIds.length > 0) {
      const adminSupabase = await createAdminClient();
      const { data: loanRows } = await adminSupabase
        .from("captador_loans")
        .select("captador_id, remaining_amount")
        .in("captador_id", allCaptadorUserIds)
        .eq("status", "active");
      for (const loan of loanRows ?? []) {
        debtByUserId.set(loan.captador_id, (debtByUserId.get(loan.captador_id) ?? 0) + Number(loan.remaining_amount));
      }
    }
  }

  // ── Captadores with pending earnings but no pending payout (captador only) ──
  type PendingCaptador = { id: string; name: string | null; email: string | null; pending_amount: number };
  let captadoresSemPayout: PendingCaptador[] = [];

  if (role === "captador") {
    const usersWithPendingPayouts = new Set(
      payoutRows.filter((p) => p.status === "pending").map((p) => p.user_id),
    );

    const { data: pendingEarningRows } = await supabase
      .from("earnings")
      .select("user_id, amount")
      .eq("status", "pending")
      .in("type", ["account_completed", "referral_bonus"]);

    const earningsByUser = new Map<string, number>();
    for (const e of pendingEarningRows ?? []) {
      earningsByUser.set(e.user_id, (earningsByUser.get(e.user_id) ?? 0) + Number(e.amount));
    }

    const eligibleUserIds = [...earningsByUser.keys()].filter(
      (uid) => !usersWithPendingPayouts.has(uid),
    );

    if (eligibleUserIds.length > 0) {
      const { data: captadorProfiles } = await supabase
        .from("profiles")
        .select("id, name, email, role")
        .in("id", eligibleUserIds)
        .eq("role", "captador");

      captadoresSemPayout = (captadorProfiles ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        pending_amount: earningsByUser.get(p.id) ?? 0,
      }));
    }
  }

  return (
    <RoleBasedLayout
      description="Processe pagamentos e anexe comprovantes no bucket privado."
      profile={profile}
      title="Pagamentos"
    >
      {searchParams.initiate_error ? (
        <div className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300">
          {searchParams.initiate_error}
        </div>
      ) : null}

      <form
        className="mb-5 grid gap-3 rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80 sm:grid-cols-[1fr_1fr_160px]"
        method="get"
      >
        <Field label="Início" name="start" type="date" defaultValue={period.startInput} />
        <Field label="Fim" name="end" type="date" defaultValue={period.endInput} />
        <button className="min-h-12 self-end rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white dark:bg-emerald-400 dark:text-emerald-950">
          Filtrar
        </button>
      </form>

      <div className="mb-5 flex flex-wrap gap-3">
        <a
          className={`inline-flex min-h-11 items-center rounded-2xl border px-4 text-sm font-bold transition ${
            role === "captador"
              ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
              : "border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300"
          }`}
          href={`/admin/pagamentos/captadores?${captadorHref.toString()}`}
        >
          Pagamentos captadores
        </a>
        <a
          className={`inline-flex min-h-11 items-center rounded-2xl border px-4 text-sm font-bold transition ${
            role === "operator"
              ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
              : "border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300"
          }`}
          href={`/admin/pagamentos/operadores?${operatorHref.toString()}`}
        >
          Pagamentos operadores
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DashboardCard label={`Comissões pendentes (${roleLabel})`} value={toCurrency(pendingTotal)} />
        <DashboardCard label={`Pix enviados (${roleLabel})`} value={toCurrency(paidTotal)} />
      </div>

      <section className="mt-5 rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80">
        <h2 className="text-xl font-black text-slate-950 dark:text-white">
          Pendente/pago por pessoa ({roleLabel})
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3">Pessoa</th>
                <th>Perfil</th>
                <th>Pendente</th>
                <th>Pago (pix)</th>
                <th>Comissões pagas</th>
                <th>Pix processados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {financialRows.length > 0 ? (
                financialRows.map((row) => {
                  const amountPaidTotal = Number(row.amount_paid_total ?? row.paid_amount);
                  return (
                  <tr key={row.user_id}>
                    <td className="py-3 font-bold text-slate-950 dark:text-white">
                      {row.name ?? row.email ?? row.user_id}
                    </td>
                    <td className="text-slate-500 dark:text-slate-400">{row.role}</td>
                    <td className="font-bold text-amber-700 dark:text-amber-200">
                      {toCurrency(row.pending_amount)}
                    </td>
                    <td className="font-bold text-emerald-700 dark:text-emerald-200">
                      {toCurrency(amountPaidTotal)}
                    </td>
                    <td className="text-slate-500 dark:text-slate-400">
                      {toCurrency(row.paid_amount)}
                    </td>
                    <td className="text-slate-500 dark:text-slate-400">
                      {row.processed_payouts}
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="py-5 text-sm text-slate-500 dark:text-slate-400" colSpan={6}>
                    {financialError
                      ? "Não foi possível carregar os dados financeiros agora."
                      : "Nenhum operador/captador encontrado para o período selecionado."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Captadores com comissões pendentes — admin pode iniciar payout ── */}
      {captadoresSemPayout.length > 0 ? (
        <section className="mt-6 rounded-[2rem] border border-amber-400/30 bg-amber-500/5 p-5">
          <h2 className="text-base font-black text-slate-950 dark:text-white">
            Captadores com comissões pendentes
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Estes captadores têm comissões a receber mas ainda não solicitaram pagamento.
            Você pode iniciar o pagamento por eles.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {captadoresSemPayout.map((captador) => (
              <div
                className="rounded-2xl border border-white/70 bg-white p-4 dark:border-white/10 dark:bg-slate-900"
                key={captador.id}
              >
                <p className="font-bold text-slate-950 dark:text-white">
                  {captador.name ?? captador.email ?? captador.id.slice(0, 8)}
                </p>
                <p className="mt-1 text-sm font-semibold text-amber-700 dark:text-amber-200">
                  {toCurrency(captador.pending_amount)} pendente
                </p>
                <form action={adminInitiatePayoutFormAction} className="mt-3">
                  <input type="hidden" name="userId" value={captador.id} />
                  <button
                    className="min-h-10 w-full rounded-2xl bg-[#00E07A]/15 px-4 text-sm font-black text-[#16F28A] ring-1 ring-[#00E07A]/30 transition-colors hover:bg-[#00E07A]/25"
                    type="submit"
                  >
                    Iniciar pagamento
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Payouts pendentes / processados ── */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {payoutRowsByRole.map((payout) => {
          const balanceAdj = payoutBalanceMap.get(payout.id) ?? 0;
          const captadorDebt = role === "captador" ? (debtByUserId.get(payout.user_id) ?? 0) : 0;
          const suggestedAmount = Number(payout.amount) + balanceAdj;
          const displayAmount = payout.amount_paid != null ? Number(payout.amount_paid) : Number(payout.amount);

          return (
            <article
              className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80"
              key={payout.id}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-black text-slate-950 dark:text-white">
                    {toCurrency(displayAmount)}
                  </p>
                  {payout.amount_paid != null && Number(payout.amount_paid) !== Number(payout.amount) ? (
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Calculado: {toCurrency(payout.amount)}
                    </p>
                  ) : null}
                </div>
                <StatusBadge status={payout.status === "processed" ? "paid" : "pending"} />
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {(payoutProfileMap.get(payout.user_id)?.name ??
                  payoutProfileMap.get(payout.user_id)?.email ??
                  payout.user_id)}{" "}
                · {payoutProfileMap.get(payout.user_id)?.role ?? "perfil"} ·{" "}
                {new Date(payout.created_at).toLocaleString("pt-BR")}
              </p>
              <AdminPixKeyActions
                pixKey={payoutProfileMap.get(payout.user_id)?.pix_key ?? null}
                pixQrDataUrl={pixQrMap.get(payout.user_id) ?? null}
              />
              {(() => {
                const accts = payoutAccountsMap.get(payout.id) ?? [];
                if (!accts.length) return null;
                const STATUS_LABEL: Record<string, string> = {
                  completed: "Concluída",
                  pending: "Pendente",
                  assigned: "Atribuída",
                  in_progress: "Andamento",
                  rejected: "Recusada",
                  rejected_no_balance: "Sem saldo",
                  rejected_no_facial: "Selfie pend.",
                };
                return (
                  <details className="mt-3 rounded-2xl border border-white/[0.08] bg-black/20">
                    <summary className="cursor-pointer list-none px-4 py-2.5 text-xs font-bold text-zinc-400 hover:text-zinc-200">
                      {accts.length} conta{accts.length !== 1 ? "s" : ""} vinculada{accts.length !== 1 ? "s" : ""} ▾
                    </summary>
                    <div className="divide-y divide-white/[0.05] px-4 pb-3">
                      {accts.map((acc) => (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5" key={acc.id}>
                          <span className="font-mono text-sm font-bold text-white">
                            {acc.account_identifier ?? "—"}
                          </span>
                          {acc.promotion_offer_name ? (
                            <span className="inline-flex items-center rounded-full bg-[#00E07A]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#16F28A] ring-1 ring-[#00E07A]/20">
                              {acc.promotion_offer_name}
                            </span>
                          ) : null}
                          <span className="text-xs text-zinc-500">
                            {STATUS_LABEL[acc.status] ?? acc.status}
                          </span>
                          {acc.lead_account_email ? (
                            <span className="text-xs text-zinc-600">{acc.lead_account_email}</span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </details>
                );
              })()}

              {payout.status === "pending" ? (
                <div className="mt-5">
                  {role === "captador" && balanceAdj !== 0 ? (
                    <div className="mb-4 rounded-2xl border border-amber-400/25 bg-amber-500/8 px-4 py-3 text-sm">
                      <p className="font-black text-amber-200">Ajuste de saldo</p>
                      <p className="mt-1 text-xs text-amber-100/80">
                        Saldo inicial − final das contas vinculadas a este payout.
                      </p>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-zinc-500">Calculado</p>
                          <p className="font-bold text-white">{toCurrency(payout.amount)}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500">Ajuste</p>
                          <p className={`font-bold ${balanceAdj >= 0 ? "text-[#16F28A]" : "text-rose-300"}`}>
                            {balanceAdj >= 0 ? "+" : ""}{toCurrency(balanceAdj)}
                          </p>
                        </div>
                        <div>
                          <p className="text-zinc-500">Sugerido</p>
                          <p className="font-black text-white">{toCurrency(suggestedAmount)}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {captadorDebt > 0 ? (
                    <div className="mb-4 rounded-2xl border border-rose-400/25 bg-rose-500/8 px-4 py-3 text-sm">
                      <p className="font-black text-rose-300">Dívida do captador</p>
                      <p className="mt-0.5 text-xs text-rose-200/70">
                        Será descontada automaticamente ao processar o payout.
                      </p>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-zinc-500">Sugerido</p>
                          <p className="font-bold text-white">{toCurrency(suggestedAmount)}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500">Dívida</p>
                          <p className="font-bold text-rose-300">−{toCurrency(captadorDebt)}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500">{suggestedAmount - captadorDebt < 0 ? "Devedor restante" : "Líquido"}</p>
                          <p className={`font-black ${suggestedAmount - captadorDebt < 0 ? "text-rose-300" : "text-white"}`}>
                            {suggestedAmount - captadorDebt < 0
                              ? `−${toCurrency(captadorDebt - suggestedAmount)}`
                              : toCurrency(suggestedAmount - captadorDebt)}
                          </p>
                        </div>
                      </div>
                      {suggestedAmount - captadorDebt < 0 ? (
                        <p className="mt-2 text-xs text-rose-200/60">
                          Após este payout ele ainda deverá {toCurrency(captadorDebt - suggestedAmount)}.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <form action={processPayoutFormAction} className="space-y-4">
                    <input name="payoutId" type="hidden" value={payout.id} />
                    {/* effectiveAmount = calculado + ajuste; nunca negativo (schema min(0)) */}
                    <input name="effectiveAmount" type="hidden" value={Math.max(0, suggestedAmount).toFixed(2)} />
                    <label className="block">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        Valor pago (R$)
                      </span>
                      <input
                        className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
                        defaultValue={Math.max(0, suggestedAmount - captadorDebt).toFixed(2)}
                        min="0"
                        name="amountPaid"
                        step="0.01"
                        type="number"
                      />
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                        Valor calculado pelo sistema: {toCurrency(payout.amount)}.
                        {balanceAdj !== 0 && role === "captador"
                          ? ` Sugerido com ajuste: ${toCurrency(suggestedAmount)}.`
                          : ""}
                        {captadorDebt > 0 && role === "captador"
                          ? ` Após dedução da dívida (${toCurrency(captadorDebt)}): ${toCurrency(Math.max(0, suggestedAmount - captadorDebt))}.`
                          : ""}
                      </span>
                    </label>
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
                    <SubmitButton>Confirmar pagamento</SubmitButton>
                  </form>
                </div>
              ) : (
                <div className="mt-4 space-y-2 text-sm text-slate-500 dark:text-slate-400">
                  {captadorDebt > 0 ? (
                    <p className="inline-flex items-center gap-1.5 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs font-black text-rose-300">
                      Deve {toCurrency(captadorDebt)}
                    </p>
                  ) : null}
                  <p>
                    Processado em:{" "}
                    {payout.processed_at
                      ? new Date(payout.processed_at).toLocaleString("pt-BR")
                      : "-"}
                  </p>
                  {proofUrls.get(payout.id) ? (
                    <a
                      className="font-bold text-emerald-700 dark:text-emerald-300"
                      href={proofUrls.get(payout.id) as string}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Abrir comprovante
                    </a>
                  ) : (
                    <p>Comprovante não anexado.</p>
                  )}
                </div>
              )}
            </article>
          );
        })}
        {!payoutRowsByRole.length ? (
          <p className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-400">
            Nenhum pagamento pendente/processado para {roleLabel} no período selecionado.
          </p>
        ) : null}
      </div>
    </RoleBasedLayout>
  );
}

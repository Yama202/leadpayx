"use client";

import { useActionState } from "react";
import {
  approveLoanRepaymentClaimAction,
  createCaptadorLoanAction,
  rejectLoanRepaymentClaimAction,
} from "@/lib/actions/domain";
import { initialActionState, type ActionState } from "@/lib/validation";
import type { CaptadorLoan, CaptadorLoanRepayment } from "@/lib/types";

function fmtBrl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function LoanRepaymentRow({
  rep,
  loanId,
}: {
  rep: CaptadorLoanRepayment;
  loanId: string;
}) {
  const [approveState, approveAction] = useActionState(
    approveLoanRepaymentClaimAction,
    initialActionState as ActionState,
  );
  const [rejectState, rejectAction] = useActionState(
    rejectLoanRepaymentClaimAction,
    initialActionState as ActionState,
  );

  const kindLabel =
    rep.kind === "captador_claim"
      ? "Pedido do captador"
      : rep.kind === "payout_deduction"
        ? "Desconto no payout"
        : "Ajuste admin";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5 text-sm">
      <span className="min-w-[7rem] font-bold text-white">{fmtBrl(rep.amount)}</span>
      <span className="text-xs text-zinc-500">{kindLabel}</span>
      <span className="text-xs text-zinc-600">{fmtDate(rep.created_at)}</span>
      {rep.status === "pending" && rep.kind === "captador_claim" ? (
        <span className="ml-auto flex items-center gap-2">
          <form action={approveAction}>
            <input name="repaymentId" type="hidden" value={rep.id} />
            <button
              className="rounded-lg bg-[#00E07A]/15 px-3 py-1 text-xs font-bold text-[#16F28A] hover:bg-[#00E07A]/25 transition-colors"
              type="submit"
            >
              Aprovar
            </button>
          </form>
          <form action={rejectAction}>
            <input name="repaymentId" type="hidden" value={rep.id} />
            <button
              className="rounded-lg bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-300 hover:bg-rose-500/25 transition-colors"
              type="submit"
            >
              Rejeitar
            </button>
          </form>
          {approveState.message || rejectState.message ? (
            <span
              className={`text-xs font-semibold ${(approveState.ok || rejectState.ok) ? "text-emerald-300" : "text-rose-300"}`}
            >
              {approveState.message || rejectState.message}
            </span>
          ) : null}
        </span>
      ) : (
        <span
          className={`ml-auto text-xs font-bold uppercase tracking-wide ${
            rep.status === "approved"
              ? "text-[#16F28A]"
              : rep.status === "rejected"
                ? "text-rose-400"
                : "text-amber-300"
          }`}
        >
          {rep.status === "approved" ? "Aprovado" : rep.status === "rejected" ? "Rejeitado" : "Pendente"}
        </span>
      )}
    </div>
  );
}

function LoanRow({
  loan,
  repayments,
}: {
  loan: CaptadorLoan;
  repayments: CaptadorLoanRepayment[];
}) {
  const loanReps = repayments.filter((r) => r.loan_id === loan.id);
  const isPaid = loan.status === "paid";

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/20">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-black text-white">{fmtBrl(loan.amount)}</span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                isPaid
                  ? "bg-[#00E07A]/15 text-[#16F28A] ring-1 ring-[#00E07A]/25"
                  : "bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/25"
              }`}
            >
              {isPaid ? "Quitado" : "Em aberto"}
            </span>
          </div>
          {!isPaid && (
            <p className="text-xs text-zinc-500 mt-0.5">
              Restante: <span className="font-bold text-amber-300">{fmtBrl(loan.remaining_amount)}</span>
            </p>
          )}
          {loan.notes && <p className="text-xs text-zinc-500 mt-0.5 truncate">{loan.notes}</p>}
        </div>
        <span className="text-xs text-zinc-600">{fmtDate(loan.created_at)}</span>
      </div>
      {loanReps.length > 0 && (
        <div className="border-t border-white/[0.06] px-4 divide-y divide-white/[0.04]">
          {loanReps.map((r) => (
            <LoanRepaymentRow key={r.id} loanId={loan.id} rep={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function NewLoanForm({ captadorId }: { captadorId: string }) {
  const [state, formAction] = useActionState(
    createCaptadorLoanAction,
    initialActionState as ActionState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input name="captadorId" type="hidden" value={captadorId} />
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-semibold text-zinc-400">Valor (R$)</span>
          <input
            className="mt-1 min-h-9 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white outline-none focus:border-[#00E07A] focus:ring-2 focus:ring-[#00E07A]/10"
            min="0.01"
            name="amount"
            placeholder="ex: 60.00"
            required
            step="0.01"
            type="number"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-zinc-400">Nota (opcional)</span>
          <input
            className="mt-1 min-h-9 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white outline-none focus:border-[#00E07A] focus:ring-2 focus:ring-[#00E07A]/10"
            name="notes"
            placeholder="ex: depósito inicial"
            type="text"
          />
        </label>
      </div>
      {state.message ? (
        <p className={`text-xs font-semibold ${state.ok ? "text-emerald-300" : "text-rose-300"}`} role="status">
          {state.message}
        </p>
      ) : null}
      <button
        className="w-full rounded-xl bg-[#00E07A]/15 px-4 py-2 text-sm font-bold text-[#16F28A] hover:bg-[#00E07A]/25 transition-colors"
        type="submit"
      >
        Registrar empréstimo
      </button>
    </form>
  );
}

export function CaptadorLoanPanel({
  captadorId,
  loans,
  repayments,
}: {
  captadorId: string;
  loans: CaptadorLoan[];
  repayments: CaptadorLoanRepayment[];
}) {
  const activeLoans = loans.filter((l) => l.status === "active");
  const paidLoans = loans.filter((l) => l.status === "paid");
  const totalDebt = activeLoans.reduce((s, l) => s + l.remaining_amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">
          Empréstimos
        </p>
        {totalDebt > 0 && (
          <span className="text-xs font-bold text-amber-300">
            Dívida total: {fmtBrl(totalDebt)}
          </span>
        )}
      </div>

      {activeLoans.length > 0 && (
        <div className="space-y-2">
          {activeLoans.map((l) => (
            <LoanRow key={l.id} loan={l} repayments={repayments} />
          ))}
        </div>
      )}

      {paidLoans.length > 0 && (
        <details className="rounded-2xl border border-white/[0.05]">
          <summary className="cursor-pointer px-4 py-2.5 text-xs font-semibold text-zinc-600 list-none hover:text-zinc-400">
            {paidLoans.length} empréstimo{paidLoans.length > 1 ? "s" : ""} quitado{paidLoans.length > 1 ? "s" : ""} ▾
          </summary>
          <div className="border-t border-white/[0.05] px-4 pb-4 pt-3 space-y-2">
            {paidLoans.map((l) => (
              <LoanRow key={l.id} loan={l} repayments={repayments} />
            ))}
          </div>
        </details>
      )}

      {loans.length === 0 && (
        <p className="text-xs text-zinc-600">Nenhum empréstimo registrado.</p>
      )}

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
        <p className="mb-3 text-xs font-bold text-zinc-400">Novo empréstimo</p>
        <NewLoanForm captadorId={captadorId} />
      </div>
    </div>
  );
}

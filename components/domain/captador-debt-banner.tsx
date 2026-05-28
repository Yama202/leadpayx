"use client";

import { useActionState, useState } from "react";
import { claimLoanRepaymentAction } from "@/lib/actions/domain";
import { initialActionState, type ActionState } from "@/lib/validation";
import type { CaptadorLoan } from "@/lib/types";

function fmtBrl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function LoanClaimForm({ loan }: { loan: CaptadorLoan }) {
  const [state, formAction] = useActionState(
    claimLoanRepaymentAction,
    initialActionState as ActionState,
  );
  const [expanded, setExpanded] = useState(false);

  if (state.ok) {
    return (
      <p className="text-xs font-semibold text-emerald-300" role="status">
        Pedido enviado. O admin irá confirmar em breve.
      </p>
    );
  }

  if (!expanded) {
    return (
      <button
        className="rounded-xl bg-amber-400/20 px-4 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-400/30 transition-colors"
        onClick={() => setExpanded(true)}
        type="button"
      >
        Já paguei
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-2 space-y-2">
      <input name="loanId" type="hidden" value={loan.id} />
      <label className="block">
        <span className="text-xs font-semibold text-zinc-400">Valor que pagou (R$)</span>
        <input
          className="mt-1 min-h-9 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10"
          defaultValue={loan.remaining_amount}
          max={loan.remaining_amount}
          min="0.01"
          name="amount"
          required
          step="0.01"
          type="number"
        />
      </label>
      {state.message ? (
        <p className="text-xs font-semibold text-rose-300" role="status">
          {state.message}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button
          className="flex-1 rounded-xl bg-amber-400/20 px-4 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-400/30 transition-colors"
          type="submit"
        >
          Confirmar pagamento
        </button>
        <button
          className="rounded-xl bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-white/[0.1] transition-colors"
          onClick={() => setExpanded(false)}
          type="button"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function CaptadorDebtBanner({ loans }: { loans: CaptadorLoan[] }) {
  const activeLoans = loans.filter((l) => l.status === "active");
  if (activeLoans.length === 0) return null;

  const totalDebt = activeLoans.reduce((s, l) => s + l.remaining_amount, 0);

  return (
    <div className="rounded-[2rem] border border-amber-400/25 bg-amber-400/[0.06] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-amber-200">
            Você tem um saldo em aberto com o admin
          </p>
          <p className="mt-1 text-2xl font-black tabular-nums text-amber-300">
            {fmtBrl(totalDebt)}
          </p>
          <p className="mt-0.5 text-xs text-amber-100/60">
            Este valor será descontado automaticamente do seu próximo pagamento.
          </p>
        </div>
      </div>

      {activeLoans.length === 1 ? (
        <div className="mt-4">
          <LoanClaimForm loan={activeLoans[0]!} />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {activeLoans.map((loan) => (
            <div
              className="rounded-2xl border border-amber-400/15 bg-black/20 px-4 py-3"
              key={loan.id}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">
                    Empréstimo de {fmtBrl(loan.amount)}
                  </p>
                  <p className="text-xs text-amber-300">
                    Restante: {fmtBrl(loan.remaining_amount)}
                  </p>
                  {loan.notes && (
                    <p className="text-xs text-zinc-500">{loan.notes}</p>
                  )}
                </div>
              </div>
              <LoanClaimForm loan={loan} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

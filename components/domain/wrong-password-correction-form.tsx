"use client";

import { useActionState } from "react";
import { resubmitCorrectedAccountAction } from "@/lib/actions/domain";
import { initialActionState } from "@/lib/validation";
import { SubmitButton } from "@/components/ui/forms";

export function WrongPasswordCorrectionForm({ accountId }: { accountId: string }) {
  const [state, formAction] = useActionState(resubmitCorrectedAccountAction, initialActionState);

  if (state.ok) {
    return (
      <div className="mt-4 rounded-2xl border border-[#00E07A]/30 bg-[#00E07A]/[0.07] px-4 py-3 text-sm font-semibold text-[#bdf8d9]">
        {state.message}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] p-4">
      <p className="mb-1 text-xs font-black uppercase tracking-[0.14em] text-amber-300">
        Senha incorreta — corrija para reenviar
      </p>
      <p className="mb-3 text-xs text-amber-100/70">
        O operador identificou que a senha está errada. Insira a senha correta abaixo — a conta voltará para a fila automaticamente.
      </p>
      <form action={formAction} className="space-y-3">
        <input name="accountId" type="hidden" value={accountId} />
        <label className="block">
          <span className="text-xs font-bold text-zinc-300">Nova senha da conta</span>
          <input
            autoComplete="off"
            className="mt-1.5 min-h-10 w-full rounded-xl border border-white/[0.1] bg-black/30 px-3 text-sm font-mono text-white outline-none focus:border-amber-400/60"
            name="newPassword"
            placeholder="Senha correta da conta"
            required
            type="text"
          />
        </label>
        {state.ok === false && state.message ? (
          <p className="text-xs font-semibold text-rose-400">{state.message}</p>
        ) : null}
        <SubmitButton>Corrigir e reenviar para fila</SubmitButton>
      </form>
    </div>
  );
}

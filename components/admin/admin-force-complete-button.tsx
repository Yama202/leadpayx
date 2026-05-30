"use client";

import { useActionState, useState } from "react";
import { adminForceCompleteAccountAction } from "@/lib/actions/domain";
import { initialActionState, type ActionState } from "@/lib/validation";

export function AdminForceCompleteButton({
  accountId,
  accountIdentifier,
}: {
  accountId: string;
  accountIdentifier: string;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [state, formAction] = useActionState(
    adminForceCompleteAccountAction,
    initialActionState as ActionState,
  );

  if (state.ok) {
    return (
      <span className="text-[11px] font-bold text-emerald-400">Concluída ✓</span>
    );
  }

  if (!confirmed) {
    return (
      <button
        className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-400 transition-colors hover:bg-emerald-500/20"
        onClick={() => setConfirmed(true)}
        type="button"
      >
        Concluir
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input name="accountId" type="hidden" value={accountId} />
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-amber-300">Confirmar {accountIdentifier}?</span>
        <button
          className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25"
          type="submit"
        >
          Sim
        </button>
        <button
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-zinc-400 hover:bg-white/10"
          onClick={() => setConfirmed(false)}
          type="button"
        >
          Não
        </button>
      </div>
      {state.message ? (
        <p className="text-[10px] text-rose-400">{state.message}</p>
      ) : null}
    </form>
  );
}

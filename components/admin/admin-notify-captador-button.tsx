"use client";

import { useActionState } from "react";
import { adminNotifyCaptadorPendingAccountsAction } from "@/lib/actions/domain";
import { initialActionState, type ActionState } from "@/lib/validation";

export function AdminNotifyCaptadorButton({ captadorId }: { captadorId: string }) {
  const [state, formAction] = useActionState(
    adminNotifyCaptadorPendingAccountsAction,
    initialActionState as ActionState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <input name="captadorId" type="hidden" value={captadorId} />
      {state.message ? (
        <p className={`text-xs font-semibold ${state.ok ? "text-emerald-300" : "text-rose-300"}`} role="status">
          {state.message}
        </p>
      ) : null}
      <button
        className="self-start rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-400/20 disabled:opacity-50"
        type="submit"
      >
        Enviar lembrete
      </button>
    </form>
  );
}

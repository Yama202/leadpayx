"use client";

import { useActionState, useState } from "react";

import { adminResetUserDataAction } from "@/lib/actions/domain";
import { initialActionState } from "@/lib/validation";
import { Button } from "@/components/ui/button";

export function ResetUserDataButton({
  profileId,
  role,
}: {
  profileId: string;
  role: "captador" | "operator";
}) {
  const [state, action, pending] = useActionState(adminResetUserDataAction, initialActionState);
  const [confirmed, setConfirmed] = useState(false);
  const label = role === "captador" ? "captador" : "operador";

  if (state.ok) {
    return (
      <p className="text-xs font-semibold text-emerald-300">{state.message}</p>
    );
  }

  if (!confirmed) {
    return (
      <Button
        className="w-full"
        onClick={() => setConfirmed(true)}
        type="button"
        variant="danger"
      >
        Zerar dados do {label}
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input name="profileId" type="hidden" value={profileId} />
      <input name="role" type="hidden" value={role} />
      <p className="text-xs font-semibold text-amber-200">
        Isso apaga contas, ganhos e notificações deste {label}. Confirma?
      </p>
      {state.message && !state.ok ? (
        <p className="text-xs text-rose-300">{state.message}</p>
      ) : null}
      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={pending}
          type="submit"
          variant="danger"
        >
          {pending ? "A zerar…" : "Confirmar"}
        </Button>
        <Button
          className="flex-1"
          disabled={pending}
          onClick={() => setConfirmed(false)}
          type="button"
          variant="secondary"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

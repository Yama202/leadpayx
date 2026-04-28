"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { pickNextBatchStateAction } from "@/lib/actions/domain";
import { initialActionState } from "@/lib/validation";

export function OperatorPickBatchForm({
  disabled,
  minimumBatch,
}: {
  disabled: boolean;
  minimumBatch: number;
}) {
  const [state, formAction] = useActionState(pickNextBatchStateAction, initialActionState);

  return (
    <form action={formAction} className="space-y-2">
      <Button className="h-full w-full" disabled={disabled} type="submit">
        Pegar lote de {minimumBatch}
      </Button>
      {state.message ? (
        <p className={`text-xs font-semibold ${state.ok ? "text-emerald-300" : "text-rose-300"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

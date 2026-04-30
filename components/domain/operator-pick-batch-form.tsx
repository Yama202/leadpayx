"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  useEffect(() => {
    if (!state.message) {
      return;
    }
    router.refresh();
  }, [router, state.message]);

  return (
    <form action={formAction} className="space-y-2">
      <SubmitPickBatchButton disabled={disabled} minimumBatch={minimumBatch} />
      {state.message ? (
        <p className={`text-xs font-semibold ${state.ok ? "text-emerald-300" : "text-rose-300"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function SubmitPickBatchButton({
  disabled,
  minimumBatch,
}: {
  disabled: boolean;
  minimumBatch: number;
}) {
  const { pending } = useFormStatus();
  return (
    <Button className="h-full w-full" disabled={disabled || pending} type="submit">
      {pending ? "Carregando lote..." : `Pegar lote de ${minimumBatch}`}
    </Button>
  );
}

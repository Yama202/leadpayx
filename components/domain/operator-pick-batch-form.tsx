"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { pickNextBatchStateAction } from "@/lib/actions/domain";
import { initialActionState } from "@/lib/validation";

export function OperatorPickBatchForm({
  disabled,
  minimumBatch,
  helperText,
}: {
  disabled: boolean;
  minimumBatch: number;
  helperText?: string | null;
}) {
  const [state, formAction] = useActionState(pickNextBatchStateAction, initialActionState);
  const router = useRouter();

  useEffect(() => {
    if (!state.ok) return;
    router.refresh();
  }, [router, state.ok]);

  return (
    <form action={formAction} className="space-y-2">
      <SubmitPickBatchButton disabled={disabled} minimumBatch={minimumBatch} />
      {state.message ? (
        <p className={`text-xs font-semibold ${state.ok ? "text-emerald-300" : "text-rose-300"}`}>
          {state.message}
        </p>
      ) : helperText ? (
        <p className="text-xs leading-snug text-zinc-500">{helperText}</p>
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
    <Button className="inline-flex h-full w-full items-center justify-center gap-2" disabled={disabled || pending} type="submit">
      {pending ? (
        <>
          <Spinner className="shrink-0" />
          <span>A reservar ciclo…</span>
        </>
      ) : (
        `Pegar ciclo novo (${minimumBatch})`
      )}
    </Button>
  );
}

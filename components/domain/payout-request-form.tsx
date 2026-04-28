"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { ensurePayoutAction } from "@/lib/actions/domain";
import { initialActionState } from "@/lib/validation";

function PayoutSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button className="h-full min-h-12 w-full" disabled={pending} type="submit" variant="secondary">
      {pending ? "Enviando…" : "Solicitar pagamento"}
    </Button>
  );
}

export function PayoutRequestForm({ className = "" }: { className?: string }) {
  const [state, formAction] = useActionState(ensurePayoutAction, initialActionState);

  return (
    <form action={formAction} className={className}>
      <PayoutSubmitButton />
      {state.message ? (
        <p
          className={`mt-2 text-center text-xs font-semibold ${state.ok ? "text-emerald-300" : "text-rose-300"}`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { requeueAccountAction } from "@/lib/actions/domain";
import { initialActionState, type ActionState } from "@/lib/validation";
import { Spinner } from "@/components/ui/spinner";

function RequeueSubmitButton({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400/20 py-3 text-sm font-black text-amber-200 ring-1 ring-amber-400/30 transition-colors hover:bg-amber-400/30 disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? <Spinner className="shrink-0" /> : null}
      {pending ? "A reenviar…" : children}
    </button>
  );
}

export function RequeueAccountForm({
  accountId,
  status,
}: {
  accountId: string;
  status: "rejected_no_balance" | "rejected_no_facial";
}) {
  const [state, formAction] = useActionState(
    requeueAccountAction,
    initialActionState as ActionState,
  );

  if (state.ok) {
    return (
      <p className="mt-3 rounded-2xl bg-[#00E07A]/10 px-4 py-3 text-sm font-semibold text-[#16F28A] ring-1 ring-[#00E07A]/20">
        Conta reenviada para a fila com sucesso.
      </p>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border-2 border-amber-400/30 bg-amber-500/8 p-4">
      {status === "rejected_no_balance" ? (
        <>
          <p className="text-sm font-black text-amber-200">Ação necessária — saldo</p>
          <p className="mt-1 text-xs leading-5 text-amber-100/80">
            Esta conta foi recusada por estar sem saldo. Deposite o valor mínimo na plataforma da casa de apostas e depois clique no botão abaixo.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-black text-amber-200">Ação necessária — verificação facial</p>
          <p className="mt-1 text-xs leading-5 text-amber-100/80">
            Esta conta foi recusada por falta de reconhecimento facial. Abra a plataforma da casa de apostas, conclua a selfie e depois clique no botão abaixo.
          </p>
        </>
      )}
      <form action={formAction}>
        <input name="accountId" type="hidden" value={accountId} />
        <RequeueSubmitButton>
          {status === "rejected_no_balance" ? "Já coloquei o saldo" : "Já fiz a selfie"}
        </RequeueSubmitButton>
      </form>
      {state.message && !state.ok ? (
        <p className="mt-2 text-xs font-semibold text-rose-300" role="status">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

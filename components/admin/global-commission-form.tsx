"use client";

import { ActionForm, Field, SubmitButton } from "@/components/ui/forms";
import { updateGlobalCommissionsAction } from "@/lib/actions/domain";
import type { ActionState } from "@/lib/validation";
import { initialActionState } from "@/lib/validation";

export function GlobalCommissionForm({
  defaultCaptador,
  defaultOperador,
}: {
  defaultCaptador: string;
  defaultOperador: string;
}) {
  return (
    <ActionForm action={updateGlobalCommissionsAction} initialState={initialActionState}>
      {(state: ActionState) => (
        <>
          <Field
            defaultValue={defaultCaptador}
            error={state.fieldErrors?.captadorCommissionPerAccount}
            label="Comissão por conta — Captador (BRL)"
            name="captadorCommissionPerAccount"
            required
            step="0.01"
            type="number"
          />
          <Field
            defaultValue={defaultOperador}
            error={state.fieldErrors?.operatorCommissionPerAccount}
            label="Comissão por conta — Operador (BRL)"
            name="operatorCommissionPerAccount"
            required
            step="0.01"
            type="number"
          />
          <SubmitButton>Salvar comissões globais</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

"use client";

import { ActionForm, Field, SubmitButton } from "@/components/ui/forms";
import { Button } from "@/components/ui/button";
import { setAdminRoleAction } from "@/lib/actions/domain";
import { initialActionState } from "@/lib/validation";

export function PromoteAdminForm() {
  return (
    <ActionForm action={setAdminRoleAction} initialState={initialActionState}>
      {(state) => (
        <>
          <input name="action" type="hidden" value="promote" />
          <Field
            error={state.fieldErrors?.email}
            label="E-mail do usuário"
            name="email"
            placeholder="pessoa@empresa.com"
            required
            type="email"
          />
          <SubmitButton>Promover para admin</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function RevokeAdminForm({
  email,
  disabled,
}: {
  email: string;
  disabled?: boolean;
}) {
  return (
    <ActionForm action={setAdminRoleAction} initialState={initialActionState}>
      {(state) => (
        <>
          <input name="action" type="hidden" value="revoke" />
          <input name="email" type="hidden" value={email} />
          <Field
            error={state.fieldErrors?.confirmation}
            label="Confirmação"
            name="confirmation"
            placeholder="Digite REVOGAR ADMIN"
          />
          <Button className="w-full" disabled={disabled} type="submit" variant="danger">
            Revogar admin
          </Button>
        </>
      )}
    </ActionForm>
  );
}

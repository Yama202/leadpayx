"use client";

import { ActionForm, Field, SubmitButton } from "@/components/ui/forms";
import { completeProfileAction } from "@/lib/actions/auth";
import { initialActionState } from "@/lib/validation";

export function CompleteProfileForm() {
  return (
    <ActionForm action={completeProfileAction} initialState={initialActionState}>
      {(state) => (
        <>
          <Field
            error={state.fieldErrors?.name}
            label="Nome"
            name="name"
            placeholder="Seu nome completo"
            required
          />
          <Field
            error={state.fieldErrors?.instagram}
            label="Instagram"
            name="instagram"
            placeholder="@seuperfil"
          />
          <Field
            error={state.fieldErrors?.whatsapp}
            label="WhatsApp"
            name="whatsapp"
            placeholder="(11) 99999-9999"
            required
          />
          <Field
            error={state.fieldErrors?.pixKey}
            label="Chave Pix"
            name="pixKey"
            placeholder="CPF, e-mail, celular ou chave aleatória"
            required
          />
          <SubmitButton>Concluir perfil</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

"use client";

import { ActionForm, Field, SubmitButton } from "@/components/ui/forms";
import { completeProfileAction } from "@/lib/actions/auth";
import { initialActionState } from "@/lib/validation";

export function CompleteProfileForm({ registrationCode }: { registrationCode?: string }) {
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
          <Field
            defaultValue={registrationCode ?? ""}
            error={state.fieldErrors?.registrationCode}
            label="Código de convite"
            name="registrationCode"
            placeholder="Opcional, apenas se ainda não foi aplicado"
            readOnly={Boolean(registrationCode)}
          />
          <p className="rounded-2xl border border-[#00E07A]/15 bg-[#00E07A]/5 p-3 text-sm leading-6 text-zinc-300">
            Se você entrou por um link de indicação, não precisa preencher novamente.
            Depois de vinculado, o código não pode ser alterado.
          </p>
          <SubmitButton>Concluir perfil</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

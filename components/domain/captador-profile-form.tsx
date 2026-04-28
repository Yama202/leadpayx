"use client";

import { ActionForm, Field, SubmitButton } from "@/components/ui/forms";
import { updateProfileAction } from "@/lib/actions/domain";
import type { Profile } from "@/lib/types";
import { initialActionState } from "@/lib/validation";

export function CaptadorProfileForm({ profile }: { profile: Profile }) {
  return (
    <ActionForm action={updateProfileAction} initialState={initialActionState}>
      {(state) => (
        <>
          <Field defaultValue={profile.name ?? ""} error={state.fieldErrors?.name} label="Nome" name="name" required />
          <Field
            defaultValue={profile.instagram ?? ""}
            error={state.fieldErrors?.instagram}
            label="Instagram"
            name="instagram"
            placeholder="@seuperfil"
          />
          <Field
            defaultValue={profile.whatsapp ?? ""}
            error={state.fieldErrors?.whatsapp}
            label="WhatsApp"
            name="whatsapp"
            placeholder="(11) 99999-9999"
            required
          />
          <Field
            defaultValue={profile.pix_key ?? ""}
            error={state.fieldErrors?.pixKey}
            label="Chave Pix (recebimento)"
            name="pixKey"
            placeholder="E-mail, CPF, telefone, chave aleatória ou EVP"
            required
          />
          <p className="rounded-2xl border border-[#00E07A]/15 bg-[#00E07A]/5 p-3 text-xs leading-5 text-zinc-400">
            A chave Pix é usada apenas para pagamentos oficiais. Validação é básica (não substitui
            confirmação no app do banco). Não compartilhe fora do fluxo autorizado.
          </p>
          <SubmitButton>Salvar perfil</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

"use client";

import { ActionForm, Field, SubmitButton } from "@/components/ui/forms";
import {
  toggleCaptadorGlobalOfferActiveAction,
  upsertCaptadorGlobalOfferAction,
} from "@/lib/actions/domain";
import { Button } from "@/components/ui/button";
import type { CaptadorGlobalOffer } from "@/lib/types";
import type { ActionState } from "@/lib/validation";
import { initialActionState } from "@/lib/validation";

function CheckboxAtiva({ defaultChecked }: { defaultChecked: boolean }) {
  return (
    <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 px-4 dark:border-white/10">
      <input
        className="size-4 accent-emerald-600"
        defaultChecked={defaultChecked}
        name="isActive"
        type="checkbox"
      />
      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Oferta ativa</span>
    </label>
  );
}

export function NewCaptadorGlobalOfferForm() {
  return (
    <ActionForm action={upsertCaptadorGlobalOfferAction} initialState={initialActionState}>
      {(state: ActionState) => (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field
              error={state.fieldErrors?.name}
              label="Nome"
              name="name"
              placeholder="Ex.: Br Sporting Bet"
              required
            />
            <Field
              error={state.fieldErrors?.urlBase}
              label="URL base (HTTPS)"
              name="urlBase"
              placeholder="https://..."
              required
              type="url"
            />
            <div className="lg:col-span-2">
              <CheckboxAtiva defaultChecked />
            </div>
          </div>
          <SubmitButton>Criar link global</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function EditCaptadorGlobalOfferForm({ offer }: { offer: CaptadorGlobalOffer }) {
  return (
    <ActionForm action={upsertCaptadorGlobalOfferAction} initialState={initialActionState}>
      {(state: ActionState) => (
        <>
          <input name="offerId" type="hidden" value={offer.id} />
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Field
              defaultValue={offer.name}
              error={state.fieldErrors?.name}
              label="Nome"
              name="name"
              required
            />
            <Field
              defaultValue={offer.url_base}
              error={state.fieldErrors?.urlBase}
              label="URL base (HTTPS)"
              name="urlBase"
              required
              type="url"
            />
            <div className="lg:col-span-2">
              <CheckboxAtiva defaultChecked={offer.is_active} />
            </div>
          </div>
          <SubmitButton>Salvar alterações</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function ToggleCaptadorGlobalOfferForm({
  offerId,
  isActive,
}: {
  offerId: string;
  isActive: boolean;
}) {
  return (
    <form action={toggleCaptadorGlobalOfferActiveAction}>
      <input name="offerId" type="hidden" value={offerId} />
      <input name="nextActive" type="hidden" value={isActive ? "false" : "true"} />
      <Button type="submit" variant="secondary">
        {isActive ? "Desativar" : "Ativar"}
      </Button>
    </form>
  );
}

"use client";

import { useId, useState } from "react";

import { CaptadorDepositBriefBanner } from "@/components/domain/captador-deposit-brief-banner";
import { ActionForm, Field, SubmitButton, TextArea } from "@/components/ui/forms";
import { submitAccountAction } from "@/lib/actions/domain";
import { initialActionState } from "@/lib/validation";

const fieldClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-base text-white outline-none transition-colors duration-200 placeholder:text-zinc-500 focus:border-[#00E07A] focus:ring-4 focus:ring-[#00E07A]/10";

export function SubmitAccountForm({ depositBriefMinBrl }: { depositBriefMinBrl?: number | null }) {
  const id = useId();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <ActionForm
      action={submitAccountAction}
      encType="multipart/form-data"
      initialState={initialActionState}
    >
      {(state) => (
        <>
          {depositBriefMinBrl != null && depositBriefMinBrl > 0 ? (
            <CaptadorDepositBriefBanner minDepositBrl={depositBriefMinBrl} />
          ) : null}
          <Field
            error={state.fieldErrors?.accountIdentifier}
            label="Identificador da conta/lead"
            name="accountIdentifier"
            placeholder="Ex.: @perfil ou código operacional"
            required
          />
          <Field
            error={state.fieldErrors?.leadAccountEmail}
            label="E-mail da conta (login do lead)"
            name="leadAccountEmail"
            placeholder="lead@exemplo.com"
            required
            type="email"
          />
          <div>
            <label className="block" htmlFor={`${id}-lead-pw`}>
              <span className="text-sm font-bold text-zinc-200">Senha da conta</span>
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <input
                required
                autoComplete="new-password"
                className={`${fieldClass} min-w-0 flex-1 font-mono text-sm`}
                id={`${id}-lead-pw`}
                name="leadAccountPassword"
                placeholder="Mínimo 8 caracteres"
                type={showPassword ? "text" : "password"}
              />
              <button
                className="min-h-12 shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-zinc-200 hover:bg-white/10"
                type="button"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            {state.fieldErrors?.leadAccountPassword?.[0] ? (
              <span className="mt-2 block text-sm text-rose-300">
                {state.fieldErrors.leadAccountPassword[0]}
              </span>
            ) : null}
          </div>
          <TextArea
            error={state.fieldErrors?.accountNotes}
            label="Observações (opcional)"
            name="accountNotes"
            placeholder="Contexto extra: campanha, restrições, observações que não são login/senha"
          />
          <label className="block">
            <span className="text-sm font-bold text-slate-200">Print da conta nova</span>
            <input
              accept="image/*,application/pdf"
              className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white focus:border-[#00E07A] focus:outline-none focus:ring-4 focus:ring-[#00E07A]/10"
              name="accountPrint"
              type="file"
            />
            <span className="mt-2 block text-xs leading-5 text-[#A1A1AA]">
              Obrigatório quando a regra global estiver ativa. Imagens ou PDF até 5MB.
            </span>
          </label>
          <SubmitButton>Enviar para fila</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

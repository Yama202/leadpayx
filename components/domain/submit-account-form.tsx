"use client";

import { useId, useState } from "react";

import { ActionForm, Field, SubmitButton, TextArea } from "@/components/ui/forms";
import { submitAccountAction } from "@/lib/actions/domain";
import { initialActionState } from "@/lib/validation";
import type { PromotionOffer } from "@/lib/types";

const fieldClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-base text-white outline-none transition-colors duration-200 placeholder:text-zinc-500 focus:border-[#00E07A] focus:ring-4 focus:ring-[#00E07A]/10";

export function SubmitAccountForm({ offers = [] }: { offers?: PromotionOffer[] }) {
  const id = useId();
  const [showPassword, setShowPassword] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string>(() => offers[0]?.id ?? "");

  const selectedOffer = offers.find((o) => o.id === selectedOfferId) ?? null;
  const minDeposit = Number(selectedOffer?.min_deposit_brl ?? 0);
  const requiresDeposit = minDeposit > 0;

  return (
    <ActionForm action={submitAccountAction} initialState={initialActionState}>
      {(state) => (
        <>
          {/* Seletor de oferta/casa — obrigatório */}
          <div className="mb-2">
            <span className="text-sm font-bold text-zinc-200">
              Casa / Oferta <span className="text-rose-400">*</span>
            </span>
            <p className="mt-0.5 text-xs text-zinc-500">
              Selecione em qual casa você criou esta conta.
            </p>
            {offers.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                Nenhuma oferta ativa no momento. Aguarde o admin publicar uma oferta para enviar contas.
              </p>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {offers.map((offer) => {
                  const checked = selectedOfferId === offer.id;
                  const offerMinDeposit = Number(offer.min_deposit_brl ?? 0);
                  return (
                    <label
                      className={`flex cursor-pointer flex-col gap-1 rounded-2xl border px-4 py-3 transition-colors ${
                        checked
                          ? "border-[#00E07A]/60 bg-[#00E07A]/8 ring-1 ring-[#00E07A]/30"
                          : "border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                      }`}
                      key={offer.id}
                    >
                      <input
                        checked={checked}
                        className="sr-only"
                        name="promotionOfferId"
                        onChange={() => setSelectedOfferId(offer.id)}
                        required
                        type="radio"
                        value={offer.id}
                      />
                      <span className={`text-sm font-black ${checked ? "text-[#16F28A]" : "text-white"}`}>
                        {offer.name}
                      </span>
                      {offerMinDeposit > 0 ? (
                        <span className="text-xs text-zinc-400">
                          Depósito mínimo: R$ {offerMinDeposit.toFixed(2)}
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            )}
            {state.fieldErrors?.promotionOfferId?.[0] ? (
              <span className="mt-2 block text-sm text-rose-300">
                {state.fieldErrors.promotionOfferId[0]}
              </span>
            ) : null}
          </div>

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
          {requiresDeposit ? (
            <Field
              error={state.fieldErrors?.declaredDepositBrl}
              label={`Valor já depositado na ${selectedOffer?.name} (BRL)`}
              name="declaredDepositBrl"
              placeholder={`Mín. R$ ${minDeposit.toFixed(2)}`}
              required
              step="0.01"
              type="number"
            />
          ) : null}
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
          {offers.length > 0 ? (
            <SubmitButton pendingLabel="A enviar…">Enviar para fila</SubmitButton>
          ) : null}
        </>
      )}
    </ActionForm>
  );
}

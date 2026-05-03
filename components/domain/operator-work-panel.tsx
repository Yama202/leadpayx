"use client";

import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  completeAccountAction,
  rejectAccountAction,
  startAccountAction,
} from "@/lib/actions/domain";
import { operatorCanProgressAccount } from "@/lib/account-operation";
import {
  OPERATOR_BALANCE_DESTINATION_ALTERNATE,
  OPERATOR_BALANCE_DESTINATION_PRIMARY,
} from "@/lib/operator-balance-destinations";
import type { Account } from "@/lib/types";
import { SubmitButton, TextArea } from "@/components/ui/forms";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { initialActionState, type ActionState } from "@/lib/validation";

type OperatorWorkPanelProps = {
  accounts: Account[];
};

function DangerSubmitButton({ children }: { children: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      className="inline-flex w-full items-center justify-center gap-2"
      disabled={pending}
      type="submit"
      variant="danger"
    >
      {pending ? (
        <>
          <Spinner className="shrink-0" />
          <span>A recusar…</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export function OperatorWorkPanel({ accounts }: OperatorWorkPanelProps) {
  const firstId = accounts[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState(firstId);
  const [rejectPreset, setRejectPreset] = useState<"not_new_account" | "no_balance" | "other">(
    "not_new_account",
  );
  const [rejectState, rejectFormAction] = useActionState(
    rejectAccountAction,
    initialActionState as ActionState,
  );
  const baseId = useId();
  const resolvedId = accounts.some((a) => a.id === selectedId) ? selectedId : firstId;
  const selected = accounts.find((a) => a.id === resolvedId);
  const canAct = selected ? operatorCanProgressAccount(selected.status) : false;
  const showStart = selected?.status === "assigned";
  const showFinalize = selected?.status === "in_progress";
  const reasonLegendId = `${baseId}-reject-legend`;

  if (!accounts.length || !selected) {
    return null;
  }

  return (
    <section
      aria-label="Operação na conta selecionada"
      className="mt-6 rounded-[2rem] border border-[#00E07A]/25 bg-[#00E07A]/[0.06] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl"
      role="region"
    >
      <h2 className="text-base font-black tracking-tight text-white">Ciclo de operação</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Inicie, finalize com o destino do saldo ou recuse — sempre para a conta ativa abaixo (uma
        ação primária de cada vez).
      </p>

      {accounts.length > 1 ? (
        <fieldset className="mt-5">
          <legend className="text-sm font-bold text-zinc-200">Qual conta você está operando agora?</legend>
          <div className="mt-3 space-y-2" role="radiogroup" aria-label="Conta em operação">
            {accounts.map((acc) => {
              const inputId = `${baseId}-acc-${acc.id}`;
              return (
                <label
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 has-[:checked]:border-[#00E07A]/50 has-[:checked]:bg-[#00E07A]/10"
                  key={acc.id}
                >
                  <input
                    checked={resolvedId === acc.id}
                    className="h-4 w-4 accent-[#00E07A]"
                    id={inputId}
                    name="operatorWorkAccountPick"
                    onChange={() => {
                      setSelectedId(acc.id);
                    }}
                    type="radio"
                  />
                  <span className="flex flex-col">
                    <span className="font-mono text-sm font-bold text-white">{acc.account_identifier}</span>
                    <span className="text-xs text-zinc-500">
                      {acc.status === "assigned"
                        ? "Aguardando início"
                        : acc.status === "in_progress"
                          ? "Em andamento"
                          : acc.status}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div className="mt-6 space-y-6">
        {showStart ? (
          <form action={startAccountAction} className="max-w-md">
            <input name="accountId" type="hidden" value={resolvedId} />
            <SubmitButton pendingLabel="A iniciar…" variant="secondary">
              Começar com conta
            </SubmitButton>
          </form>
        ) : null}

        {showFinalize ? (
          <form action={completeAccountAction} className="space-y-4">
            <input name="accountId" type="hidden" value={resolvedId} />
            <fieldset>
              <legend className="text-sm font-bold text-zinc-200">
                Informar ao captador: destino do saldo
              </legend>
              <p className="mt-1 text-xs text-zinc-500">
                Um clique define o destino. O captador verá o texto correspondente na conta finalizada.
              </p>
              <div
                className="mt-3 grid gap-3 sm:grid-cols-2"
                role="radiogroup"
                aria-label="Destino do saldo informado ao captador"
              >
                <label className="cursor-pointer rounded-2xl border border-white/10 bg-black/25 p-4 transition-colors has-[:checked]:border-[#00E07A] has-[:checked]:bg-[#00E07A]/10">
                  <input
                    aria-label="Destino principal — primeira conta ou fluxo padrão"
                    className="sr-only"
                    name="balanceDestination"
                    required
                    type="radio"
                    value={OPERATOR_BALANCE_DESTINATION_PRIMARY}
                  />
                  <span className="block text-sm font-black text-white">Destino principal</span>
                  <span className="mt-1 block text-xs leading-snug text-zinc-400">
                    Primeira conta / fluxo padrão
                  </span>
                </label>
                <label className="cursor-pointer rounded-2xl border border-white/10 bg-black/25 p-4 transition-colors has-[:checked]:border-[#00E07A] has-[:checked]:bg-[#00E07A]/10">
                  <input
                    aria-label="Destino alternativo — segunda conta ou fluxo secundário"
                    className="sr-only"
                    name="balanceDestination"
                    type="radio"
                    value={OPERATOR_BALANCE_DESTINATION_ALTERNATE}
                  />
                  <span className="block text-sm font-black text-white">Destino alternativo</span>
                  <span className="mt-1 block text-xs leading-snug text-zinc-400">
                    Segunda conta / fluxo secundário
                  </span>
                </label>
              </div>
            </fieldset>
            <SubmitButton pendingLabel="A finalizar…">Finalizar operação</SubmitButton>
          </form>
        ) : null}

        {!showFinalize && selected.status === "assigned" ? (
          <p className="text-sm text-zinc-500">
            Depois de iniciar, você informará o destino do saldo e finalizará neste mesmo painel.
          </p>
        ) : null}

        {canAct ? (
          <form action={rejectFormAction} className="space-y-4 rounded-2xl border border-white/[0.08] bg-black/20 p-4">
            <input name="accountId" type="hidden" value={resolvedId} />
            <div className="text-sm font-bold text-zinc-200">Recusar conta</div>
            <fieldset>
              <legend className="sr-only" id={reasonLegendId}>
                Motivo da recusa
              </legend>
              <div className="space-y-2" role="radiogroup" aria-labelledby={reasonLegendId}>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2 has-[:checked]:border-rose-400/40">
                  <input
                    checked={rejectPreset === "not_new_account"}
                    className="accent-rose-400"
                    name="reasonPreset"
                    onChange={() => {
                      setRejectPreset("not_new_account");
                    }}
                    type="radio"
                    value="not_new_account"
                  />
                  <span className="text-sm text-zinc-200">Não é conta nova</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2 has-[:checked]:border-rose-400/40">
                  <input
                    checked={rejectPreset === "no_balance"}
                    className="accent-rose-400"
                    name="reasonPreset"
                    onChange={() => {
                      setRejectPreset("no_balance");
                    }}
                    type="radio"
                    value="no_balance"
                  />
                  <span className="text-sm text-zinc-200">Conta sem saldo</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2 has-[:checked]:border-rose-400/40">
                  <input
                    checked={rejectPreset === "other"}
                    className="accent-rose-400"
                    name="reasonPreset"
                    onChange={() => {
                      setRejectPreset("other");
                    }}
                    type="radio"
                    value="other"
                  />
                  <span className="text-sm text-zinc-200">Outro motivo</span>
                </label>
              </div>
            </fieldset>
            {rejectPreset === "other" ? (
              <TextArea
                error={rejectState.fieldErrors?.otherReason}
                label="Detalhe do motivo (obrigatório)"
                name="otherReason"
                placeholder="Breve contexto para o captador (mínimo 8 caracteres)."
              />
            ) : (
              <input name="otherReason" type="hidden" value="" />
            )}
            {rejectState.message ? (
              <p
                className={`text-sm font-semibold ${rejectState.ok ? "text-emerald-300" : "text-rose-300"}`}
                role="status"
              >
                {rejectState.message}
              </p>
            ) : null}
            <DangerSubmitButton>Confirmar recusa</DangerSubmitButton>
          </form>
        ) : null}
      </div>
    </section>
  );
}

"use client";

import { useActionState, useId, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  completeOperatorCycleAction,
  rejectAccountAction,
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
  const ordered = useMemo(() => {
    return [...accounts].sort((a, b) => {
      const ta = a.assigned_at ? new Date(a.assigned_at).getTime() : 0;
      const tb = b.assigned_at ? new Date(b.assigned_at).getTime() : 0;
      if (ta !== tb) {
        return ta - tb;
      }
      return a.id.localeCompare(b.id);
    });
  }, [accounts]);

  const [rejectPreset, setRejectPreset] = useState<"not_new_account" | "no_balance" | "other">(
    "not_new_account",
  );
  const [rejectState, rejectFormAction] = useActionState(
    rejectAccountAction,
    initialActionState as ActionState,
  );
  const baseId = useId();
  const canReject = ordered.some((a) => operatorCanProgressAccount(a.status));
  const reasonLegendId = `${baseId}-reject-legend`;

  const orderedIdsCsv = useMemo(() => ordered.map((a) => a.id).join(","), [ordered]);

  const canFinalizeCycle = ordered.every((a) => operatorCanProgressAccount(a.status));
  const [showWhereBalance, setShowWhereBalance] = useState(false);
  const whereBalanceId = `${baseId}-where-balance`;

  if (!ordered.length) {
    return null;
  }

  return (
    <section
      aria-label="Ciclo operacional atual"
      className="mt-6 rounded-[2rem] border border-[#00E07A]/25 bg-[#00E07A]/[0.06] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl"
      role="region"
    >
      <h2 className="text-base font-black tracking-tight text-white">Ciclo de operação</h2>
      <p className="mt-1 text-sm text-zinc-400">
        {ordered.length > 1
          ? "Finalize o ciclo completo (duas contas) com um único envio: a primeira na ordem de atribuição usa o destino principal e a segunda o alternativo. Recusas continuam por conta."
          : "Finalize com o destino do saldo ou recuse — uma ação primária de cada vez."}

      </p>

      {ordered.length > 1 ? (
        <ul className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
          <li className="font-semibold text-zinc-300">Ordem do ciclo (atribuição)</li>
          {ordered.map((acc, idx) => (
            <li className="flex flex-wrap items-baseline gap-2 text-zinc-400" key={acc.id}>
              <span className="font-mono font-bold text-white">{acc.account_identifier}</span>
              <span className="text-xs">
                {idx === 0 ? "→ destino principal ao finalizar ciclo" : "→ destino alternativo ao finalizar ciclo"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4">
        <Button
          aria-controls={whereBalanceId}
          aria-expanded={showWhereBalance}
          className="w-full sm:w-auto"
          onClick={() => {
            setShowWhereBalance((open) => !open);
          }}
          type="button"
          variant="secondary"
        >
          Para onde foi o saldo
        </Button>
        {showWhereBalance ? (
          <div
            className="mt-3 space-y-4 rounded-2xl border border-[#00E07A]/20 bg-black/30 p-4 text-sm"
            id={whereBalanceId}
            role="region"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Texto que o captador verá após finalizar
            </p>
            {ordered.length > 1
              ? ordered.map((acc, idx) => (
                  <div className="space-y-1.5 border-b border-white/[0.06] pb-3 last:border-b-0 last:pb-0" key={acc.id}>
                    <p className="font-mono text-sm font-bold text-white">{acc.account_identifier}</p>
                    <p className="leading-relaxed text-zinc-300">
                      {idx === 0
                        ? OPERATOR_BALANCE_DESTINATION_PRIMARY
                        : OPERATOR_BALANCE_DESTINATION_ALTERNATE}
                    </p>
                  </div>
                ))
              : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-zinc-500">Se marcar destino principal</p>
                      <p className="mt-1 leading-relaxed text-zinc-300">{OPERATOR_BALANCE_DESTINATION_PRIMARY}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-500">Se marcar destino alternativo</p>
                      <p className="mt-1 leading-relaxed text-zinc-300">
                        {OPERATOR_BALANCE_DESTINATION_ALTERNATE}
                      </p>
                    </div>
                  </div>
                )}
          </div>
        ) : null}
      </div>

      <div className="mt-6 space-y-6">
        {canFinalizeCycle ? (
          <form action={completeOperatorCycleAction} className="space-y-4">
            <input name="orderedAccountIds" type="hidden" value={orderedIdsCsv} />
            {ordered.length === 1 ? (
              <fieldset>
                <legend className="text-sm font-bold text-zinc-200">
                  Informar ao captador: destino do saldo
                </legend>
                <p className="mt-1 text-xs text-zinc-500">
                  Um clique define o texto que o captador verá na conta finalizada.
                </p>
                <div
                  className="mt-3 grid gap-3 sm:grid-cols-2"
                  role="radiogroup"
                  aria-label="Destino do saldo informado ao captador"
                >
                  <label className="cursor-pointer rounded-2xl border border-white/10 bg-black/25 p-4 transition-colors has-[:checked]:border-[#00E07A] has-[:checked]:bg-[#00E07A]/10">
                    <input
                      aria-label="Destino principal"
                      className="sr-only"
                      name="balanceDestination"
                      required
                      type="radio"
                      value={OPERATOR_BALANCE_DESTINATION_PRIMARY}
                    />
                    <span className="block text-sm font-black text-white">Destino principal</span>
                    <span className="mt-1 block text-xs leading-snug text-zinc-400">
                      Fluxo padrão / primeira linha
                    </span>
                  </label>
                  <label className="cursor-pointer rounded-2xl border border-white/10 bg-black/25 p-4 transition-colors has-[:checked]:border-[#00E07A] has-[:checked]:bg-[#00E07A]/10">
                    <input
                      aria-label="Destino alternativo"
                      className="sr-only"
                      name="balanceDestination"
                      type="radio"
                      value={OPERATOR_BALANCE_DESTINATION_ALTERNATE}
                    />
                    <span className="block text-sm font-black text-white">Destino alternativo</span>
                    <span className="mt-1 block text-xs leading-snug text-zinc-400">
                      Fluxo secundário
                    </span>
                  </label>
                </div>
              </fieldset>
            ) : (
              <p className="text-sm text-zinc-400">
                Ao confirmar, as duas contas acima serão concluídas:{" "}
                <span className="text-zinc-300">principal</span> na primeira e{" "}
                <span className="text-zinc-300">alternativo</span> na segunda.
              </p>
            )}
            <SubmitButton pendingLabel="A finalizar ciclo…">Finalizar ciclo</SubmitButton>
          </form>
        ) : null}

        {canReject ? (
          <form
            action={rejectFormAction}
            className="space-y-4 rounded-2xl border border-white/[0.08] bg-black/20 p-4"
            key={orderedIdsCsv}
          >
            {ordered.length === 1 ? <input name="accountId" type="hidden" value={ordered[0]!.id} /> : null}
            <div className="text-sm font-bold text-zinc-200">Recusar conta</div>
            {ordered.length > 1 ? (
              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-zinc-400">Qual conta recusar?</legend>
                <div className="space-y-2" role="radiogroup" aria-label="Conta a recusar">
                  {ordered.map((acc, idx) => {
                    const inputId = `${baseId}-rej-${acc.id}`;
                    return (
                      <label
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2 has-[:checked]:border-rose-400/40"
                        key={acc.id}
                      >
                        <input
                          className="accent-rose-400"
                          defaultChecked={idx === 0}
                          id={inputId}
                          name="accountId"
                          required
                          type="radio"
                          value={acc.id}
                        />
                        <span className="font-mono text-sm text-zinc-200">{acc.account_identifier}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}
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

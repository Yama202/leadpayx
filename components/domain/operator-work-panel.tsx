"use client";

import { useActionState, useEffect, useId, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  completeOperatorCycleAction,
  rejectAccountAction,
  markAccountWrongPasswordAction,
} from "@/lib/actions/domain";
import { operatorCanProgressAccount } from "@/lib/account-operation";
import type { Account } from "@/lib/types";
import { SubmitButton, TextArea } from "@/components/ui/forms";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { twoAccountCycleBalanceDestination } from "@/lib/operator-cycle-balance-message";
import { initialActionState, type ActionState } from "@/lib/validation";

type OperatorWorkPanelProps = {
  accounts: Account[];
  captadorName: string | null;
  captadorWhatsapp: string | null;
};

function whatsappLink(whatsapp: string | null, text: string): string | null {
  if (!whatsapp) return null;
  const digits = whatsapp.replace(/\D/g, "");
  if (!digits) return null;
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

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

const BALANCE_PLACEHOLDER =
  "Descreva objetivamente para onde foi o saldo (ex.: conta destino, Pix, titular, instituição ou o que combinaram). Mínimo 8 caracteres.";

export function OperatorWorkPanel({ accounts, captadorName, captadorWhatsapp }: OperatorWorkPanelProps) {
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

  const [rejectPreset, setRejectPreset] = useState<"not_new_account" | "no_balance" | "no_facial" | "other">(
    "not_new_account",
  );
  const [rejectState, rejectFormAction] = useActionState(
    rejectAccountAction,
    initialActionState as ActionState,
  );
  const [wrongPwState, wrongPwFormAction] = useActionState(
    markAccountWrongPasswordAction,
    initialActionState as ActionState,
  );
  const [wrongPwAccountId, setWrongPwAccountId] = useState<string>(() => ordered[0]?.id ?? "");
  const [rejectedAccountId, setRejectedAccountId] = useState<string>(() => ordered[0]?.id ?? "");
  const baseId = useId();
  const canReject = ordered.some((a) => operatorCanProgressAccount(a.status));
  const reasonLegendId = `${baseId}-reject-legend`;

  const orderedIdsCsv = useMemo(() => ordered.map((a) => a.id).join(","), [ordered]);

  const [balanceTargetAccountId, setBalanceTargetAccountId] = useState(
    () => (ordered.length === 2 ? ordered[0]!.id : ""),
  );
  useEffect(() => {
    if (ordered.length === 2) {
      setBalanceTargetAccountId(ordered[0]!.id);
    }
  }, [orderedIdsCsv]);

  const twoAccountPreview = useMemo(() => {
    if (ordered.length !== 2 || !balanceTargetAccountId) {
      return "";
    }
    const acc = ordered.find((a) => a.id === balanceTargetAccountId);
    return acc ? twoAccountCycleBalanceDestination(acc.account_identifier) : "";
  }, [ordered, balanceTargetAccountId]);

  const canFinalizeCycle = ordered.every((a) => operatorCanProgressAccount(a.status));

  // Preserva o identificador da conta recusada mesmo após o componente receber accounts=[].
  // O ref é atualizado a cada render enquanto ordered tem dados, então ao revalidar o
  // dashboard (que esvazia assignedList), o identificador correto ainda está disponível.
  const lastKnownIdentifierRef = useRef<string>("");
  const currentIdentifier =
    ordered.find((a) => a.id === rejectedAccountId)?.account_identifier ??
    ordered[0]?.account_identifier ??
    "";
  // Só atualiza enquanto rejectState.ok é false: após recusa bem-sucedida, congela o identificador.
  if (currentIdentifier && !rejectState.ok) lastKnownIdentifierRef.current = currentIdentifier;

  // Mantém montado enquanto há notificação WhatsApp pendente de exibir ao operador.
  const hasPostRejectWhatsapp =
    rejectState.ok &&
    !!captadorWhatsapp &&
    (rejectPreset === "no_facial" || rejectPreset === "no_balance" || rejectPreset === "other");

  if (!ordered.length && !hasPostRejectWhatsapp) {
    return null;
  }

  // Após recusa de ciclo com 1 conta: ordered fica vazio mas o botão WhatsApp precisa aparecer.
  if (!ordered.length && hasPostRejectWhatsapp) {
    const identifier = lastKnownIdentifierRef.current;
    const firstName = captadorName ? ` ${captadorName.split(" ")[0]}` : "";
    const msg =
      rejectPreset === "no_facial"
        ? `Oi${firstName}! Sua conta *${identifier}* foi recusada por falta de verificação facial (selfie). Por favor, acesse a plataforma da casa de apostas, conclua a selfie e depois reenvie no LeadPay.`
        : rejectPreset === "no_balance"
          ? `Oi${firstName}! Sua conta *${identifier}* foi recusada por falta de saldo. Por favor, deposite o valor mínimo na plataforma e depois reenvie no LeadPay.`
          : `Oi${firstName}! Sua conta *${identifier}* precisou ser recusada. Entre em contato para mais detalhes.`;
    const link = whatsappLink(captadorWhatsapp, msg);
    if (!link) return null;
    return (
      <section
        aria-label="Ciclo operacional atual"
        className="mt-6 rounded-[2rem] border border-[#00E07A]/25 bg-[#00E07A]/[0.06] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl"
        role="region"
      >
        <p className="mb-3 text-sm font-semibold text-emerald-300">Conta recusada com motivo registrado.</p>
        <a
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366]/20 py-3 text-sm font-black text-[#25D366] ring-1 ring-[#25D366]/30 hover:bg-[#25D366]/30 transition-colors"
          href={link}
          rel="noopener noreferrer"
          target="_blank"
        >
          WhatsApp — avisar captador
        </a>
      </section>
    );
  }

  return (
    <section
      aria-label="Ciclo operacional atual"
      className="mt-6 rounded-[2rem] border border-[#00E07A]/25 bg-[#00E07A]/[0.06] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl"
      role="region"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-black tracking-tight text-white">Ciclo de operação</h2>
        {captadorName ? (
          <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-300">
            Captador: {captadorName}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-zinc-400">
        {ordered.length > 1
          ? "Com as contas do ciclo, escolhe só em qual delas ficou o saldo — a mensagem ao captador é gerada automaticamente. Recusas continuam por conta."
          : "Informa em texto para onde foi o saldo; o captador lê essa mensagem na conta finalizada. Ou recusa a conta."}
      </p>

      {/* Casa/oferta de cada conta — visível antes de qualquer ação */}
      <ul className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
        {ordered.length > 1 ? (
          <li className="font-semibold text-zinc-300">Ordem do ciclo (atribuição)</li>
        ) : null}
        {ordered.map((acc, idx) => (
          <li className="flex flex-wrap items-center gap-x-3 gap-y-1 text-zinc-400" key={acc.id}>
            {ordered.length > 1 ? (
              <span className="tabular-nums font-bold text-zinc-500">{idx + 1}.</span>
            ) : null}
            <span className="font-mono font-bold text-white">{acc.account_identifier}</span>
            {acc.promotion_offer_name ? (
              <span className="inline-flex items-center rounded-full bg-[#00E07A]/10 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-[#16F28A] ring-1 ring-[#00E07A]/25">
                {acc.promotion_offer_name}
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mt-6 space-y-6">
        {canFinalizeCycle ? (
          <form
            action={completeOperatorCycleAction}
            className="space-y-5"
            key={`finalize-${orderedIdsCsv}`}
          >
            <input name="orderedAccountIds" type="hidden" value={orderedIdsCsv} />
            {ordered.length === 2 ? (
              <fieldset className="space-y-4">
                <legend className="text-sm font-bold text-zinc-200" id={`${baseId}-bal-legend`}>
                  O saldo das duas contas foi para qual linha?
                </legend>
                <p className="text-xs text-zinc-500">
                  Clica na conta certa. O captador vê a mesma frase em cada conta ao carregares em{" "}
                  <span className="font-semibold text-zinc-400">Finalizar ciclo</span>.
                </p>
                <div
                  className="space-y-2"
                  role="radiogroup"
                  aria-labelledby={`${baseId}-bal-legend`}
                >
                  {ordered.map((acc, idx) => {
                    const inputId = `${baseId}-bal-${acc.id}`;
                    return (
                      <label
                        className="flex cursor-pointer flex-col gap-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 has-[:checked]:border-[#00E07A]/60 has-[:checked]:ring-1 has-[:checked]:ring-[#00E07A]/30"
                        key={acc.id}
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <input
                            checked={balanceTargetAccountId === acc.id}
                            className="accent-[#00E07A]"
                            id={inputId}
                            name="balanceTargetAccountId"
                            onChange={() => {
                              setBalanceTargetAccountId(acc.id);
                            }}
                            required
                            type="radio"
                            value={acc.id}
                          />
                          <span className="font-mono text-sm font-bold text-white">
                            {acc.account_identifier}
                          </span>
                          {acc.promotion_offer_name ? (
                            <span className="inline-flex items-center rounded-full bg-[#00E07A]/10 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-[#16F28A] ring-1 ring-[#00E07A]/20">
                              {acc.promotion_offer_name}
                            </span>
                          ) : null}
                          <span className="text-xs text-zinc-500">({idx + 1}.ª no ciclo)</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {twoAccountPreview ? (
                  <p
                    className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs leading-relaxed text-zinc-300"
                    role="status"
                  >
                    <span className="font-semibold text-zinc-400">Mensagem ao captador:</span>{" "}
                    {twoAccountPreview}
                  </p>
                ) : null}
              </fieldset>
            ) : (
              <fieldset className="space-y-4">
                <legend className="text-sm font-bold text-zinc-200">
                  Para onde foi o saldo desta conta?
                </legend>
                <p className="text-xs text-zinc-500">
                  O captador lê o texto abaixo na conta quando clicas em{" "}
                  <span className="font-semibold text-zinc-400">Finalizar ciclo</span>.
                </p>
                <TextArea
                  label={ordered[0]!.account_identifier}
                  maxLength={800}
                  name="balanceDestination"
                  placeholder={BALANCE_PLACEHOLDER}
                  required
                  rows={4}
                />
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 space-y-3">
                  <p className="text-xs font-bold text-zinc-400">Saldo da conta (opcional)</p>
                  <p className="text-xs text-zinc-600 leading-5">
                    Preenche se houve diferença entre o depósito inicial e o saldo final. O admin usa para calcular o valor justo a pagar.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-semibold text-zinc-300">Saldo inicial (R$)</span>
                      <input
                        className="mt-1.5 min-h-10 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white outline-none focus:border-[#00E07A] focus:ring-2 focus:ring-[#00E07A]/10"
                        min="0"
                        name="balanceInitialBrl"
                        placeholder="ex: 60.00"
                        step="0.01"
                        type="number"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-zinc-300">Saldo após operação (R$)</span>
                      <input
                        className="mt-1.5 min-h-10 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white outline-none focus:border-[#00E07A] focus:ring-2 focus:ring-[#00E07A]/10"
                        min="0"
                        name="balanceFinalBrl"
                        placeholder="ex: 70.00"
                        step="0.01"
                        type="number"
                      />
                    </label>
                  </div>
                </div>
              </fieldset>
            )}
            <SubmitButton pendingLabel="A finalizar ciclo…">Finalizar ciclo</SubmitButton>
          </form>
        ) : null}

        {hasPostRejectWhatsapp ? (() => {
          const identifier = lastKnownIdentifierRef.current;
          const firstName = captadorName ? ` ${captadorName.split(" ")[0]}` : "";
          const msg =
            rejectPreset === "no_facial"
              ? `Oi${firstName}! Sua conta *${identifier}* foi recusada por falta de verificação facial (selfie). Por favor, acesse a plataforma da casa de apostas, conclua a selfie e depois reenvie no LeadPay.`
              : rejectPreset === "no_balance"
                ? `Oi${firstName}! Sua conta *${identifier}* foi recusada por falta de saldo. Por favor, deposite o valor mínimo na plataforma e depois reenvie no LeadPay.`
                : `Oi${firstName}! Sua conta *${identifier}* precisou ser recusada. Entre em contato para mais detalhes.`;
          const link = whatsappLink(captadorWhatsapp, msg);
          return link ? (
            <a
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366]/20 py-3 text-sm font-black text-[#25D366] ring-1 ring-[#25D366]/30 hover:bg-[#25D366]/30 transition-colors"
              href={link}
              rel="noopener noreferrer"
              target="_blank"
            >
              WhatsApp — avisar captador
            </a>
          ) : null;
        })() : null}

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
                          onChange={() => setRejectedAccountId(acc.id)}
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
                    checked={rejectPreset === "no_facial"}
                    className="accent-rose-400"
                    name="reasonPreset"
                    onChange={() => {
                      setRejectPreset("no_facial");
                    }}
                    type="radio"
                    value="no_facial"
                  />
                  <span className="text-sm text-zinc-200">Falta de reconhecimento facial</span>
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
              <>
                <TextArea
                  error={rejectState.fieldErrors?.otherReason}
                  label="Detalhe do motivo (obrigatório)"
                  name="otherReason"
                  placeholder="Breve contexto para o captador (mínimo 8 caracteres)."
                />
                {captadorWhatsapp ? (() => {
                  const identifier = ordered.find((a) => a.id === rejectedAccountId)?.account_identifier ?? ordered[0]?.account_identifier ?? "—";
                  const firstName = captadorName ? ` ${captadorName.split(" ")[0]}` : "";
                  const link = whatsappLink(captadorWhatsapp, `Oi${firstName}! Preciso falar sobre a conta *${identifier}*. Pode me atender?`);
                  return link ? (
                    <a
                      className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366]/15 py-2.5 text-sm font-bold text-[#25D366] ring-1 ring-[#25D366]/25 hover:bg-[#25D366]/25 transition-colors"
                      href={link}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      WhatsApp — consultar captador antes de recusar
                    </a>
                  ) : null;
                })() : null}
              </>
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

        {/* ── Senha incorreta ── */}
        {canReject ? (
          <form
            action={wrongPwFormAction}
            className="space-y-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-4"
          >
            <div className="text-sm font-bold text-amber-200">Senha incorreta</div>
            <p className="text-xs text-amber-100/60">
              A senha da conta está errada. O captador será notificado para corrigir e a conta volta para a fila.
            </p>
            {ordered.length > 1 ? (
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-zinc-400">Qual conta tem senha incorreta?</legend>
                <div className="space-y-2">
                  {ordered.map((acc, idx) => (
                    <label
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2 has-[:checked]:border-amber-400/40"
                      key={acc.id}
                    >
                      <input
                        className="accent-amber-400"
                        defaultChecked={idx === 0}
                        name="accountId"
                        onChange={() => setWrongPwAccountId(acc.id)}
                        type="radio"
                        value={acc.id}
                      />
                      <span className="font-mono text-sm text-zinc-200">{acc.account_identifier}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : (
              <input name="accountId" type="hidden" value={ordered[0]?.id ?? ""} />
            )}
            {wrongPwState.message ? (
              <p className={`text-xs font-semibold ${wrongPwState.ok ? "text-emerald-300" : "text-rose-300"}`}>
                {wrongPwState.message}
              </p>
            ) : null}
            <Button className="w-full" type="submit" variant="secondary">
              Notificar captador — senha incorreta
            </Button>
          </form>
        ) : null}
      </div>
    </section>
  );
}

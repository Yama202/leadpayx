import type { ReactNode } from "react";
import Image from "next/image";

import type { OperationalCredentials } from "@/lib/account-operational";
import { completeAccountAction, startAccountAction } from "@/lib/actions/domain";
import { OperationalCredentialsPanel } from "@/components/domain/operational-credentials-panel";
import { StatusBadge } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/forms";
import type { Account } from "@/lib/types";
import { operatorCanProgressAccount } from "@/lib/account-operation";
import { SlaIndicator } from "@/components/domain/sla-indicator";

export function AccountCard({
  account,
  operatorActions = false,
  /** Quando definido (operador/admin no servidor), exibe e-mail e senha decifrados. */
  operationalCredentials,
  /** URL assinada (curta duração) para o print — só preencha em contextos admin/operador no servidor. */
  accountPrintSignedUrl,
  /** Chave Pix do captador para conferência/admin. */
  captadorPixKey,
  /** QR Code (data URL) gerado no servidor com a chave Pix do captador. */
  captadorPixQrDataUrl,
  children,
}: {
  account: Account;
  operatorActions?: boolean;
  operationalCredentials?: OperationalCredentials | null;
  accountPrintSignedUrl?: string | null;
  captadorPixKey?: string | null;
  captadorPixQrDataUrl?: string | null;
  children?: ReactNode;
}) {
  return (
    <article className="rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A1A1AA]">
            Conta autorizada
          </p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-white">
            {account.account_identifier}
          </h3>
        </div>
        <StatusBadge status={account.status} />
      </div>
      {account.lead_account_email && !operationalCredentials ? (
        <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
            E-mail da conta enviado
          </p>
          <p className="mt-1 break-all font-mono text-sm text-zinc-200">
            {account.lead_account_email}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            A senha foi armazenada de forma protegida e não é exibida aqui.
          </p>
        </div>
      ) : null}
      {operationalCredentials ? (
        <OperationalCredentialsPanel credentials={operationalCredentials} />
      ) : null}
      {account.account_notes ? (
        <p className="mt-4 text-sm leading-6 text-[#A1A1AA]">{account.account_notes}</p>
      ) : null}
      {account.account_print_path ? (
        <div className="mt-3 rounded-2xl bg-white/10 p-3 text-xs font-semibold text-slate-300">
          <p className="break-all">Print (caminho interno): {account.account_print_path}</p>
          {accountPrintSignedUrl ? (
            <a
              className="mt-2 inline-flex min-h-10 items-center justify-center rounded-xl border border-[#00E07A]/40 bg-[#00E07A]/10 px-3 text-sm font-black text-[#16F28A] hover:bg-[#00E07A]/20"
              href={accountPrintSignedUrl}
              rel="noreferrer"
              target="_blank"
            >
              Abrir print (link temporário)
            </a>
          ) : null}
        </div>
      ) : null}
      {captadorPixKey ? (
        <div className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-200">
            Pix do captador
          </p>
          <p className="mt-2 break-all font-mono text-xs font-semibold text-emerald-50">
            {captadorPixKey}
          </p>
          {captadorPixQrDataUrl ? (
            <div className="mt-3 inline-flex rounded-xl bg-white p-2">
              <Image
                alt="QR Code do Pix do captador"
                className="h-28 w-28 rounded-lg"
                height={112}
                src={captadorPixQrDataUrl}
                unoptimized
                width={112}
              />
            </div>
          ) : null}
        </div>
      ) : null}
      {account.reassigned_at ? (
        <p className="mt-3 rounded-2xl bg-amber-400/10 p-3 text-xs font-bold text-amber-200">
          Reatribuída por SLA: {account.reassign_reason ?? "prazo expirado"}
        </p>
      ) : null}
      <SlaIndicator deadline={account.operation_deadline_at} status={account.status} />
      {account.rejection_reason ? (
        <p className="mt-4 rounded-2xl bg-rose-400/10 p-3 text-sm font-semibold text-rose-200">
          {account.rejection_reason}
        </p>
      ) : null}
      {account.status === "completed" && account.operator_balance_destination ? (
        <div className="mt-4 rounded-2xl border border-sky-400/25 bg-sky-500/10 p-4 text-sm text-sky-50">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-200">
            Saldo — informado pelo operador
          </p>
          <p className="mt-2 whitespace-pre-wrap font-semibold leading-relaxed text-white">
            {account.operator_balance_destination}
          </p>
        </div>
      ) : null}
      {account.status === "completed" ? (
        <p className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-100">
          Esta conta já foi operada e finalizada. Não aparecerá novamente na fila ativa.
        </p>
      ) : null}
      {operatorActions && operatorCanProgressAccount(account.status) ? (
        <div className="mt-5 space-y-4">
          <form action={startAccountAction} className="max-w-md">
            <input name="accountId" type="hidden" value={account.id} />
            <Button className="w-full" type="submit" variant="secondary">
              Começar com conta
            </Button>
          </form>
          <form
            action={completeAccountAction}
            className="space-y-3 rounded-2xl border border-white/[0.08] bg-black/25 p-4"
          >
            <input name="accountId" type="hidden" value={account.id} />
            <TextArea
              label="Informar ao captador: conta/destino do saldo"
              name="balanceDestination"
              placeholder="Ex.: banco, agência/conta ou Pix, titular, documento — o que o captador precisa saber."
            />
            <Button className="w-full sm:w-auto" type="submit">
              Finalizar operação
            </Button>
          </form>
        </div>
      ) : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </article>
  );
}

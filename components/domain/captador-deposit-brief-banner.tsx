import { toCurrency } from "@/lib/payments";

/** Aviso curto quando o admin exige comprovante de depósito mínimo nos envios. */
export function CaptadorDepositBriefBanner({
  minDepositBrl,
  rewardPerAccountBrl,
}: {
  minDepositBrl: number;
  rewardPerAccountBrl?: number | null;
}) {
  return (
    <div
      className="mb-4 flex min-h-12 items-center gap-3 rounded-2xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-50"
      role="status"
    >
      <span
        aria-hidden
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20"
      >
        <svg
          aria-hidden
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-black text-white">Envio com depósito</p>
        <p className="mt-0.5 text-xs text-amber-100/95">
          Valor mínimo já depositado por conta exigido: <strong>{toCurrency(minDepositBrl)}</strong>.
        </p>
        <p className="mt-1 text-xs text-amber-100/90">
          Esse valor permanecerá em uma das contas e poderá ser sacado somente pelo titular da conta.
        </p>
        <p className="mt-1 text-xs text-amber-100/90">
          Importante: as 2 contas do envio devem ter o mesmo valor depositado.
        </p>
        {rewardPerAccountBrl != null && rewardPerAccountBrl > 0 ? (
          <p className="mt-1 text-xs text-amber-100/90">
            Ganho por conta adicionada: <strong>{toCurrency(rewardPerAccountBrl)}</strong>.
          </p>
        ) : null}
      </div>
    </div>
  );
}

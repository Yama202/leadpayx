import { toCurrency } from "@/lib/payments";

export type DepositOffer = { name: string; minDepositBrl: number };

/** Aviso de depósito mínimo exigido por oferta ativa. */
export function CaptadorDepositBriefBanner({ offers }: { offers: DepositOffer[] }) {
  if (!offers.length) return null;

  return (
    <div
      className="mb-4 flex gap-3 rounded-2xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-50"
      role="status"
    >
      <span
        aria-hidden
        className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20"
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
        <p className="font-black text-white">Depósito mínimo por oferta</p>
        <ul className="mt-1.5 space-y-0.5">
          {offers.map((o) => (
            <li className="flex items-center justify-between gap-2 text-xs" key={o.name}>
              <span className="text-amber-100/90">{o.name}</span>
              <span className="font-black text-white">{toCurrency(o.minDepositBrl)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-amber-100/70">
          Valor permanece na conta e só pode ser sacado pelo titular.
        </p>
      </div>
    </div>
  );
}

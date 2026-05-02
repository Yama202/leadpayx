import { CopyLinkButton } from "@/components/admin/copy-link-button";
import { LinkButton } from "@/components/ui/button";
import type { PromotionOffer } from "@/lib/types";

type Variant = "captador" | "operator";

export function PromotionOfferGrid({
  offers,
  variant = "captador",
}: {
  offers: PromotionOffer[];
  variant?: Variant;
}) {
  const isOperator = variant === "operator";

  if (!offers.length) {
    return (
      <p
        className={
          isOperator
            ? "rounded-[2rem] border border-dashed border-white/15 bg-zinc-900/40 p-6 text-sm leading-6 text-zinc-400"
            : "rounded-[2rem] border border-dashed border-slate-200 bg-white/80 p-5 text-sm leading-6 text-slate-500 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-400"
        }
      >
        Nenhuma oferta ativa no momento. Quando o admin publicar campanhas, elas aparecerão aqui
        automaticamente.
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {offers.map((offer) => (
        <article
          className={
            isOperator
              ? "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
              : "rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80"
          }
          key={offer.id}
        >
          {isOperator ? (
            <div
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#EAB308]/15 blur-2xl"
            />
          ) : null}
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              {isOperator ? (
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#EAB308]/35 bg-[#EAB308]/10 text-[#EAB308]">
                  <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <path
                      d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="1.5"
                    />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </span>
              ) : null}
              <div className="min-w-0">
                <p
                  className={
                    isOperator
                      ? "text-lg font-black tracking-tight text-white"
                      : "text-lg font-black text-slate-950 dark:text-white"
                  }
                >
                  {offer.name}
                </p>
                <p
                  className={
                    isOperator
                      ? "mt-2 text-sm leading-6 text-zinc-400"
                      : "mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400"
                  }
                >
                  {offer.description}
                </p>
              </div>
            </div>
            <span
              className={
                isOperator
                  ? "shrink-0 rounded-full bg-[#EAB308] px-3 py-1 text-xs font-black text-zinc-950"
                  : "shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200"
              }
            >
              {isOperator ? "ATIVA" : "Ativa"}
            </span>
          </div>
          <p
            className={
              isOperator
                ? "relative mt-4 rounded-xl border border-[#EAB308]/20 bg-black/30 px-4 py-3 text-sm font-bold text-[#FDE047]"
                : "relative mt-4 text-sm font-black text-slate-950 dark:text-white"
            }
          >
            {isOperator ? "Valor por conta · " : "Ganho por conta adicionada: "}
            {Number(offer.reward_amount).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>
          {offer.min_deposit_brl != null || offer.max_deposit_brl != null ? (
            <p
              className={
                isOperator
                  ? "relative mt-3 rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-100"
                  : "relative mt-3 rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-100"
              }
            >
              Depósito por conta: entre{" "}
              {Number(offer.min_deposit_brl ?? 0).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}{" "}
              e{" "}
              {Number(offer.max_deposit_brl ?? offer.min_deposit_brl ?? 0).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
          ) : null}
          {offer.only_new_accounts ? (
            <p
              className={
                isOperator
                  ? "relative mt-3 rounded-xl border border-emerald-300/35 bg-emerald-400/20 px-4 py-2 text-xs font-black uppercase tracking-[0.1em] text-emerald-100"
                  : "relative mt-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-emerald-700 dark:border-emerald-300/30 dark:bg-emerald-400/10 dark:text-emerald-100"
              }
            >
              Sempre contas novas
            </p>
          ) : null}
          {offer.valid_until ? (
            <p
              className={
                isOperator
                  ? "relative mt-3 flex items-center gap-2 text-xs font-semibold text-zinc-500"
                  : "relative mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400"
              }
            >
              {isOperator ? (
                <svg aria-hidden className="h-4 w-4 shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                </svg>
              ) : null}
              Válida até {new Date(offer.valid_until).toLocaleString("pt-BR")}
            </p>
          ) : isOperator ? (
            <p className="relative mt-3 flex items-center gap-2 text-xs font-semibold text-zinc-500">
              <svg aria-hidden className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
                <path
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </svg>
              Sem prazo definido
            </p>
          ) : null}
          <p
            className={
              isOperator
                ? "relative mt-3 break-all rounded-xl border border-white/10 bg-black/25 p-3 text-xs font-medium text-zinc-400"
                : "relative mt-3 break-all rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-300"
            }
          >
            {offer.promotion_url}
          </p>
          <div className="relative mt-5 flex flex-wrap gap-3">
            <LinkButton
              className={isOperator ? "min-h-11 gap-2 font-bold shadow-lg shadow-emerald-500/10" : undefined}
              href={offer.promotion_url}
              rel="noreferrer"
              target="_blank"
              variant="primary"
            >
              {isOperator ? (
                <>
                  Abrir link
                  <span aria-hidden>→</span>
                </>
              ) : (
                "Abrir link"
              )}
            </LinkButton>
            <CopyLinkButton
              className={
                isOperator ? "border-white/12 bg-zinc-950/50 text-white hover:bg-zinc-900/80" : undefined
              }
              url={offer.promotion_url}
            />
            {!isOperator ? (
              <LinkButton
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Confira esta oferta: ${offer.name}\n${offer.promotion_url}`,
                )}`}
                rel="noreferrer"
                target="_blank"
                variant="secondary"
              >
                Enviar para outras pessoas
              </LinkButton>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

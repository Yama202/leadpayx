"use client";

import { useActionState } from "react";
import { deleteCaptadorOfferRateAction, setCaptadorOfferRateAction } from "@/lib/actions/domain";
import type { CaptadorOfferRate, PromotionOfferBasic } from "@/lib/types";

export function CaptadorOfferRatesPanel({
  captadorId,
  rates,
  offers,
}: {
  captadorId: string;
  rates: CaptadorOfferRate[];
  offers: PromotionOfferBasic[];
}) {
  const [setRateState, setRateAction] = useActionState(setCaptadorOfferRateAction, {
    ok: false,
    message: "",
  });
  const [deleteState, deleteAction] = useActionState(deleteCaptadorOfferRateAction, {
    ok: false,
    message: "",
  });

  const activeOffers = offers.filter((o) => o.status === "active");
  const rateMap = new Map(rates.map((r) => [r.offer_id, r]));
  const offersWithoutRate = activeOffers.filter((o) => !rateMap.has(o.id));

  return (
    <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-400/[0.04] p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-sky-300">
        Comissões por oferta
      </p>
      <p className="mt-0.5 text-xs text-zinc-500">
        Overrides individuais para este captador. Sem override = valor global.
      </p>

      {/* ── Taxas existentes ── */}
      {rates.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {rates.map((rate) => {
            const offer = offers.find((o) => o.id === rate.offer_id);
            return (
              <li
                className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2"
                key={rate.id}
              >
                <div>
                  <p className="text-sm font-bold text-white">{offer?.name ?? rate.offer_id.slice(0, 8)}</p>
                  <p className="text-xs text-sky-300 font-semibold">
                    R$ {Number(rate.commission_amount).toFixed(2).replace(".", ",")}
                  </p>
                </div>
                <form action={deleteAction}>
                  <input name="captadorId" type="hidden" value={captadorId} />
                  <input name="offerId" type="hidden" value={rate.offer_id} />
                  <button
                    className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-1 text-xs font-bold text-rose-300 transition hover:bg-rose-400/20"
                    type="submit"
                  >
                    Remover
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-zinc-600">Nenhum override definido.</p>
      )}

      {deleteState.message ? (
        <p className={`mt-2 text-xs font-semibold ${deleteState.ok ? "text-emerald-400" : "text-rose-400"}`}>
          {deleteState.message}
        </p>
      ) : null}

      {/* ── Adicionar/editar override ── */}
      {activeOffers.length > 0 ? (
        <form action={setRateAction} className="mt-4 space-y-2 border-t border-white/[0.06] pt-4">
          <input name="captadorId" type="hidden" value={captadorId} />
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
            {offersWithoutRate.length > 0 ? "Adicionar override" : "Editar override"}
          </p>
          <div className="flex flex-wrap gap-2">
            <select
              className="min-h-9 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm font-semibold text-white outline-none focus:border-sky-400"
              defaultValue=""
              name="offerId"
              required
            >
              <option disabled value="">Selecionar oferta…</option>
              {activeOffers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}{rateMap.has(o.id) ? " (editar)" : ""}
                </option>
              ))}
            </select>
            <input
              className="w-28 min-h-9 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm font-semibold text-white outline-none focus:border-sky-400"
              min="0"
              name="amount"
              placeholder="R$ 0,00"
              step="0.01"
              type="number"
              required
            />
          </div>
          <button
            className="min-h-9 w-full rounded-xl border border-sky-400/30 bg-sky-400/10 px-3 text-xs font-bold text-sky-200 transition hover:bg-sky-400/20"
            type="submit"
          >
            Salvar taxa
          </button>
          {setRateState.message ? (
            <p className={`text-xs font-semibold ${setRateState.ok ? "text-emerald-400" : "text-rose-400"}`}>
              {setRateState.message}
            </p>
          ) : null}
        </form>
      ) : (
        <p className="mt-3 text-xs text-zinc-600">Nenhuma oferta ativa para configurar.</p>
      )}
    </div>
  );
}

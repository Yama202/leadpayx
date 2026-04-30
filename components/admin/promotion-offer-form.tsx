"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { upsertPromotionOfferAction } from "@/lib/actions/domain";
import type { PromotionOffer } from "@/lib/types";
import { initialActionState } from "@/lib/validation";

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 16);
}

function OfferFields({ offer }: { offer?: PromotionOffer }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {offer ? <input name="offerId" type="hidden" value={offer.id} /> : null}
      <label className="block sm:col-span-2">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Nome</span>
        <input
          className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
          defaultValue={offer?.name ?? ""}
          name="name"
          placeholder="Ex.: Casa X"
          required
        />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">URL (HTTPS)</span>
        <input
          className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
          defaultValue={offer?.promotion_url ?? ""}
          name="promotionUrl"
          placeholder="https://..."
          required
          type="url"
        />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Valor por conta (BRL)</span>
        <input
          className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
          defaultValue={offer?.reward_amount ?? ""}
          name="rewardAmount"
          required
          step="0.01"
          type="number"
        />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Valor por ciclo (BRL)</span>
        <input
          className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
          defaultValue={offer?.cycle_deposit_brl ?? ""}
          name="cycleDepositBrl"
          placeholder="Ex.: 30.00"
          step="0.01"
          type="number"
        />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
          Depósito mínimo (BRL)
        </span>
        <input
          className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
          defaultValue={offer?.min_deposit_brl ?? ""}
          name="minDepositBrl"
          placeholder="Ex.: 20.00"
          step="0.01"
          type="number"
        />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
          Depósito máximo (BRL)
        </span>
        <input
          className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
          defaultValue={offer?.max_deposit_brl ?? ""}
          name="maxDepositBrl"
          placeholder="Ex.: 50.00"
          step="0.01"
          type="number"
        />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Status</span>
        <select
          className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
          defaultValue={offer?.status ?? "active"}
          name="status"
        >
          <option value="active">Ativa</option>
          <option value="inactive">Inativa</option>
        </select>
      </label>
      <label className="block sm:col-span-2">
        <input name="onlyNewAccounts" type="hidden" value="off" />
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Regras operacionais</span>
        <span className="mt-2 flex min-h-12 items-center gap-3 rounded-2xl border border-emerald-300/40 bg-emerald-50/60 px-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
          <input
            className="size-4 accent-emerald-600"
            defaultChecked={offer?.only_new_accounts ?? true}
            name="onlyNewAccounts"
            type="checkbox"
            value="on"
          />
          <span className="text-sm font-black uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-200">
            Sempre contas novas (grifado no card)
          </span>
        </span>
      </label>
      <label className="block sm:col-span-2">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Válida até (opcional)</span>
        <input
          className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
          defaultValue={toDateTimeLocal(offer?.valid_until ?? null)}
          name="validUntil"
          type="datetime-local"
        />
        <input
          className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
          defaultValue={
            offer?.valid_until
              ? new Date(offer.valid_until).toISOString().slice(0, 16).replace("T", " ")
              : ""
          }
          name="validUntilManual"
          placeholder="Opcional: AAAA-MM-DD HH:mm"
        />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Notas (opcional)</span>
        <textarea
          className="mt-2 min-h-24 rounded-2xl border border-slate-200 px-4 py-3 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
          defaultValue={offer?.description ?? ""}
          name="description"
          placeholder="Regras internas — uma linha basta"
        />
      </label>
    </div>
  );
}

export function PromotionOfferForm({
  offer,
  submitLabel,
  className = "",
}: {
  offer?: PromotionOffer;
  submitLabel: string;
  className?: string;
}) {
  const [state, formAction] = useActionState(upsertPromotionOfferAction, initialActionState);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const isCreate = !offer;

  useEffect(() => {
    if (!state.ok) {
      return;
    }
    if (isCreate) {
      formRef.current?.reset();
    }
    router.refresh();
  }, [isCreate, router, state.ok]);

  return (
    <form action={formAction} className={className} ref={formRef}>
      <OfferFields offer={offer} />
      <Button className="mt-6 min-h-12 w-full cursor-pointer sm:w-auto" type="submit">
        {submitLabel}
      </Button>
      {state.message ? (
        <p
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
            state.ok
              ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-100"
              : "border-rose-300/40 bg-rose-500/10 text-rose-100"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

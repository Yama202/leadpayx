import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import {
  deletePromotionOfferAction,
  updatePromotionOfferStatusAction,
  upsertPromotionOfferFormAction,
} from "@/lib/actions/domain";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { PromotionOffer } from "@/lib/types";

export const dynamic = "force-dynamic";

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
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Válida até (opcional)</span>
        <input
          className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
          defaultValue={toDateTimeLocal(offer?.valid_until ?? null)}
          name="validUntil"
          type="datetime-local"
        />
        <input
          className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
          defaultValue={offer?.valid_until ? new Date(offer.valid_until).toISOString().slice(0, 16).replace("T", " ") : ""}
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

export default async function AdminOfertasPage({
  searchParams,
}: {
  searchParams: Promise<{ offer_success?: string; offer_error?: string }>;
}) {
  const params = await searchParams;
  const profile = await requireRole(["admin"]);
  const supabase = await createClient();
  const { data: offers } = await supabase
    .from("promotion_offers")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<PromotionOffer[]>();

  return (
    <RoleBasedLayout
      description="Ofertas globais ativas para todos os captadores."
      profile={profile}
      title="Ofertas"
    >
      {params.offer_error ? (
        <p className="mb-4 rounded-2xl border border-rose-300/40 bg-rose-500/10 p-3 text-sm font-semibold text-rose-100">
          {params.offer_error}
        </p>
      ) : null}
      {params.offer_success ? (
        <p className="mb-4 rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-100">
          {params.offer_success}
        </p>
      ) : null}
      <form
        action={upsertPromotionOfferFormAction}
        className="mb-6 rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80"
      >
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#16F28A]">Nova oferta</p>
        <div className="mt-4">
          <OfferFields />
        </div>
        <Button className="mt-6 min-h-12 w-full cursor-pointer sm:w-auto" type="submit">
          Criar
        </Button>
      </form>

      <div className="grid gap-4">
        {offers?.map((offer) => (
          <article
            className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80"
            key={offer.id}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-lg font-black text-slate-950 dark:text-white">{offer.name}</p>
                {offer.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{offer.description}</p>
                ) : null}
              </div>
              <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                {offer.status === "active" ? "Ativa" : "Inativa"}
              </span>
            </div>
            <details className="mt-4">
              <summary className="min-h-11 cursor-pointer text-sm font-black text-emerald-700 dark:text-emerald-300">
                Editar
              </summary>
              <form action={upsertPromotionOfferFormAction} className="mt-4">
                <OfferFields offer={offer} />
                <Button className="mt-6 min-h-12 w-full cursor-pointer sm:w-auto" type="submit">
                  Salvar
                </Button>
              </form>
            </details>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {Number(offer.reward_amount).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Criada em {new Date(offer.created_at).toLocaleString("pt-BR")}
              </p>
              <form action={updatePromotionOfferStatusAction}>
                <input name="offerId" type="hidden" value={offer.id} />
                <input
                  name="status"
                  type="hidden"
                  value={offer.status === "active" ? "inactive" : "active"}
                />
                <Button className="min-h-11 cursor-pointer" type="submit" variant="secondary">
                  {offer.status === "active" ? "Desativar" : "Ativar"}
                </Button>
              </form>
              <form action={deletePromotionOfferAction}>
                <input name="offerId" type="hidden" value={offer.id} />
                <ConfirmSubmitButton message="Excluir esta oferta? Esta ação não pode ser desfeita.">
                  Excluir
                </ConfirmSubmitButton>
              </form>
            </div>
          </article>
        ))}
      </div>
    </RoleBasedLayout>
  );
}

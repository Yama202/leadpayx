import { Button } from "@/components/ui/button";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import {
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
    <>
      {offer ? <input name="offerId" type="hidden" value={offer.id} /> : null}
      <input
        className="min-h-12 rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
        defaultValue={offer?.name ?? ""}
        name="name"
        placeholder="Nome da oferta/casa"
        required
      />
      <input
        className="min-h-12 rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
        defaultValue={offer?.reward_amount ?? ""}
        name="rewardAmount"
        placeholder="Valor por conta"
        required
        step="0.01"
        type="number"
      />
      <input
        className="min-h-12 rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
        defaultValue={offer?.display_order ?? 100}
        name="displayOrder"
        placeholder="Ordem"
        required
        type="number"
      />
      <select
        className="min-h-12 rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
        defaultValue={offer?.status ?? "active"}
        name="status"
      >
        <option value="active">Ativa</option>
        <option value="inactive">Inativa</option>
      </select>
      <input
        className="min-h-12 rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white lg:col-span-2"
        defaultValue={offer?.promotion_url ?? ""}
        name="promotionUrl"
        placeholder="https://..."
        required
        type="url"
      />
      <input
        className="min-h-12 rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
        defaultValue={toDateTimeLocal(offer?.valid_until ?? null)}
        name="validUntil"
        type="datetime-local"
      />
      <textarea
        className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3 dark:border-white/10 dark:bg-slate-950/70 dark:text-white lg:col-span-3"
        defaultValue={offer?.description ?? ""}
        name="description"
        placeholder="Descrição, regras e observações para o captador"
        required
      />
    </>
  );
}

export default async function AdminOfertasPage() {
  const profile = await requireRole(["admin"]);
  const supabase = await createClient();
  const { data: offers } = await supabase
    .from("promotion_offers")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })
    .returns<PromotionOffer[]>();

  return (
    <RoleBasedLayout
      description="Catálogo global: captadores e operadores veem as mesmas ofertas ativas (RLS por papel). Edição apenas para admin."
      profile={profile}
      title="Ofertas de promoção"
    >
      <form
        action={upsertPromotionOfferFormAction}
        className="mb-6 grid gap-4 rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80 lg:grid-cols-3"
      >
        <div className="lg:col-span-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#16F28A]">
            Nova oferta
          </p>
          <p className="mt-2 text-sm leading-6 text-[#A1A1AA]">
            Use links HTTPS oficiais. Operadores e captadores visualizam somente ofertas ativas e dentro da
            validade.
          </p>
        </div>
        <OfferFields />
        <Button className="lg:col-span-3" type="submit">
          Criar oferta
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
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {offer.description}
                </p>
              </div>
              <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                {offer.status === "active" ? "ativa" : "inativa"}
              </span>
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-black text-emerald-700 dark:text-emerald-300">
                Editar configuração
              </summary>
              <form action={upsertPromotionOfferFormAction} className="mt-4 grid gap-4 lg:grid-cols-3">
                <OfferFields offer={offer} />
                <Button className="lg:col-span-3" type="submit">
                  Salvar alterações
                </Button>
              </form>
            </details>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Valor por conta:{" "}
                {Number(offer.reward_amount).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
              <form action={updatePromotionOfferStatusAction}>
                <input name="offerId" type="hidden" value={offer.id} />
                <input
                  name="status"
                  type="hidden"
                  value={offer.status === "active" ? "inactive" : "active"}
                />
                <Button type="submit" variant="secondary">
                  {offer.status === "active" ? "Desativar" : "Ativar"}
                </Button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </RoleBasedLayout>
  );
}

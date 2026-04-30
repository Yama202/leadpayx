import { CopyLinkButton } from "@/components/admin/copy-link-button";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { LinkButton } from "@/components/ui/button";
import { PromotionOfferGrid } from "@/components/domain/promotion-offer-grid";
import { requireRole } from "@/lib/auth";
import { fetchActivePromotionOffers } from "@/lib/queries/promotion-offers";
import { fetchActiveCaptadorGlobalOffersResolved } from "@/lib/queries/captador-global-offers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CaptadorOfertasPage() {
  const profile = await requireRole(["captador"]);
  const supabase = await createClient();
  const [promotionOffers, globalLinks] = await Promise.all([
    fetchActivePromotionOffers(),
    fetchActiveCaptadorGlobalOffersResolved(supabase, profile),
  ]);

  return (
    <RoleBasedLayout
      description="Campanhas e links oficiais publicados pelo admin."
      profile={profile}
      title="Ofertas"
    >
      <section className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#16F28A]">
          Campanhas ativas
        </p>
        <div className="mt-4">
          <PromotionOfferGrid offers={promotionOffers} variant="captador" />
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#16F28A]">
          Links oficiais do admin
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Use estes links para divulgação. Cada URL já sai com seus parâmetros de indicação.
        </p>
        {globalLinks.length ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {globalLinks.map((offer) => (
              <article
                className="rounded-[2rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/50"
                key={offer.id}
              >
                <p className="text-base font-black text-slate-950 dark:text-white">{offer.name}</p>
                <p className="mt-3 break-all rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300">
                  {offer.finalUrl}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <LinkButton href={offer.finalUrl} rel="noreferrer" target="_blank" variant="primary">
                    Abrir link
                  </LinkButton>
                  <CopyLinkButton url={offer.finalUrl} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-500 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-400">
            Nenhum link oficial ativo no momento.
          </p>
        )}
      </section>
    </RoleBasedLayout>
  );
}

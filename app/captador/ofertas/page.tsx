import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { PromotionOfferGrid } from "@/components/domain/promotion-offer-grid";
import { requireRole } from "@/lib/auth";
import { fetchActivePromotionOffers } from "@/lib/queries/promotion-offers";

export const dynamic = "force-dynamic";

export default async function CaptadorOfertasPage() {
  const profile = await requireRole(["captador"]);
  const promotionOffers = await fetchActivePromotionOffers();

  return (
    <RoleBasedLayout
      description="Campanhas publicadas pelo admin."
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
    </RoleBasedLayout>
  );
}

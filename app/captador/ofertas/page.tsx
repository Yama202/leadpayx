import { PromotionOfferGrid } from "@/components/domain/promotion-offer-grid";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { requireRole } from "@/lib/auth";
import { fetchActivePromotionOffers } from "@/lib/queries/promotion-offers";

export const dynamic = "force-dynamic";

export default async function CaptadorOfertasPage() {
  const profile = await requireRole(["captador"]);
  const activeOffers = await fetchActivePromotionOffers();

  return (
    <RoleBasedLayout
      description="Ofertas ativas aprovadas pelo admin."
      profile={profile}
      title="Ofertas"
    >
      <PromotionOfferGrid offers={activeOffers} variant="captador" />
    </RoleBasedLayout>
  );
}

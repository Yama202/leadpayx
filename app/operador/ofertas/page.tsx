import { PromotionOfferGrid } from "@/components/domain/promotion-offer-grid";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { requireRole } from "@/lib/auth";
import { fetchActivePromotionOffers } from "@/lib/queries/promotion-offers";

export const dynamic = "force-dynamic";

export default async function OperadorOfertasPage() {
  const profile = await requireRole(["operator"]);
  const activeOffers = await fetchActivePromotionOffers();

  return (
    <RoleBasedLayout
      description="Ofertas globais ativas."
      profile={profile}
      title="Ofertas"
    >
      <PromotionOfferGrid offers={activeOffers} variant="operator" />
    </RoleBasedLayout>
  );
}

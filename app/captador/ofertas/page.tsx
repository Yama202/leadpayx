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
      description="Links autorizados pela administração, com valor por conta e regras de uso."
      profile={profile}
      title="Ofertas"
    >
      <div className="mb-5 rounded-[2rem] border border-[#00E07A]/20 bg-[#00E07A]/8 p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
        <p className="text-sm font-bold text-[#16F28A]">Uso comercial rastreável</p>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          Abra ou copie somente os links ativos abaixo. As regras e valores são definidos pelo
          admin e podem mudar sem novo deploy.
        </p>
      </div>

      <PromotionOfferGrid offers={activeOffers} variant="captador" />
    </RoleBasedLayout>
  );
}

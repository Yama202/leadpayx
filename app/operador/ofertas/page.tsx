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
      description="Campanhas globais liberadas pela administração. Use apenas links ativos abaixo."
      profile={profile}
      title="Promoções"
    >
      <div className="mb-6 rounded-[2rem] border border-[#EAB308]/25 bg-[#EAB308]/[0.07] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
        <p className="text-sm font-black text-[#FDE047]">Deals operacionais</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
          Valores e regras vêm direto do banco — sem conteúdo fixo no front. Ofertas inativas ou fora da
          validade não aparecem aqui.
        </p>
      </div>
      <PromotionOfferGrid offers={activeOffers} variant="operator" />
    </RoleBasedLayout>
  );
}

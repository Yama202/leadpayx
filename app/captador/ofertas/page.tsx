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
      {/* ── Aviso principal — impossível de ignorar ── */}
      <div className="mb-4 rounded-[1.6rem] border-2 border-[#00E07A]/40 bg-[#00E07A]/10 p-5 shadow-[0_0_40px_rgba(0,224,122,0.12)]">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00E07A] text-base font-black text-[#031008]">1</span>
          <p className="text-base font-black text-[#16F28A]">Crie a conta pelo link abaixo — obrigatório</p>
        </div>
        <p className="mt-3 text-sm font-semibold leading-6 text-white">
          Antes de enviar qualquer conta, você <span className="font-black text-[#16F28A] underline decoration-[#16F28A]/40 underline-offset-2">precisa</span> criar a conta na casa de apostas usando o link desta página.
        </p>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          Conta criada fora do link <span className="font-black text-rose-400">não é aceita</span> e não gera comissão. Clique em <strong className="text-white">"Abrir link"</strong> na oferta abaixo, crie a conta, faça o depósito — só depois vá em <strong className="text-white">Enviar</strong>.
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00E07A]/20 text-xs font-black text-[#16F28A]">1</span>
          <span className="text-xs font-semibold text-zinc-300">Abrir link da oferta abaixo</span>
          <span className="mx-1 text-zinc-500">→</span>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black text-zinc-300">2</span>
          <span className="text-xs font-semibold text-zinc-300">Criar conta + depositar</span>
          <span className="mx-1 text-zinc-500">→</span>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black text-zinc-300">3</span>
          <span className="text-xs font-semibold text-zinc-300">Enviar no app</span>
        </div>
      </div>

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

import { SubmitAccountForm } from "@/components/domain/submit-account-form";
import { CaptadorWhatsappGroupAlert } from "@/components/domain/captador-whatsapp-group-alert";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { LinkButton } from "@/components/ui/button";
import { isEncryptionConfigured } from "@/lib/account-credentials-crypto";
import { requireRole } from "@/lib/auth";
import { fetchActivePromotionOffers } from "@/lib/queries/promotion-offers";
import { getWhatsappGroupUrl } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function EnviarContaPage() {
  const profile = await requireRole(["captador"]);
  const [promotionOffers, whatsappUrl] = await Promise.all([
    fetchActivePromotionOffers(),
    getWhatsappGroupUrl(),
  ]);


  const credentialsConfigured = isEncryptionConfigured();

  return (
    <RoleBasedLayout description="Envio seguro de credenciais." profile={profile} title="Enviar conta">
      <CaptadorWhatsappGroupAlert whatsappUrl={whatsappUrl} />
      <div className="max-w-2xl rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        {!credentialsConfigured ? (
          <div className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            <p className="font-black">Envio indisponível</p>
            <p className="mt-1 text-xs">
              O servidor precisa de `ACCOUNTS_CREDENTIALS_SECRET` (mínimo 16 caracteres) para
              proteger credenciais com criptografia.
            </p>
            <p className="mt-2 text-xs text-rose-100/90">
              Enquanto essa configuração não existir, o formulário fica bloqueado por segurança.
            </p>
            <LinkButton className="mt-3 min-h-11" href="/admin/configuracoes" variant="secondary">
              Ir para configurações
            </LinkButton>
          </div>
        ) : null}
        <div className="mb-4 rounded-2xl border border-[#00E07A]/15 bg-[#00E07A]/5 px-4 py-3">
          <p className="font-black text-[#16F28A]">Credenciais</p>
          <p className="mt-1 text-xs text-[#A1A1AA]">Senha cifrada no servidor. Apenas neste formulário.</p>
        </div>
        {credentialsConfigured ? (
          <SubmitAccountForm offers={promotionOffers} />
        ) : null}
      </div>
    </RoleBasedLayout>
  );
}

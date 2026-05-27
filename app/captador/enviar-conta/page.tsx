import { SubmitAccountForm } from "@/components/domain/submit-account-form";
import { CaptadorWhatsappGroupAlert } from "@/components/domain/captador-whatsapp-group-alert";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { LinkButton } from "@/components/ui/button";
import { isEncryptionConfigured } from "@/lib/account-credentials-crypto";
import { requireRole } from "@/lib/auth";
import { fetchActivePromotionOffers } from "@/lib/queries/promotion-offers";
import { getSelfieConfirmationSettings, getWhatsappGroupUrl } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function EnviarContaPage() {
  const profile = await requireRole(["captador"]);
  const [promotionOffers, whatsappUrl, selfieSettings] = await Promise.all([
    fetchActivePromotionOffers(),
    getWhatsappGroupUrl(),
    getSelfieConfirmationSettings(),
  ]);


  const credentialsConfigured = isEncryptionConfigured();

  return (
    <RoleBasedLayout description="Envio seguro de credenciais." profile={profile} title="Enviar conta">
      <CaptadorWhatsappGroupAlert whatsappUrl={whatsappUrl} />

      {/* ── Checklist obrigatório — impossível de ignorar ── */}
      <div className="mb-4 rounded-[1.6rem] border-2 border-rose-500/40 bg-rose-500/10 p-5">
        <div className="flex items-center gap-3">
          <svg className="h-6 w-6 shrink-0 text-rose-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-base font-black text-rose-300">Antes de enviar — leia isso</p>
        </div>
        <p className="mt-3 text-sm font-bold leading-6 text-white">
          Você criou a conta na casa de apostas usando o link da página <strong className="text-[#16F28A]">Ofertas</strong>?
        </p>
        <p className="mt-1 text-sm leading-6 text-zinc-300">
          Se não usou o link do app, a conta <span className="font-black text-rose-400">não será aceita</span> e você não recebe comissão. Não tem como reverter depois de enviar.
        </p>
        <a
          href="/captador/ofertas"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#00E07A]/30 bg-[#00E07A]/10 py-3 text-sm font-black text-[#16F28A] transition-colors hover:bg-[#00E07A]/15"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Ir para Ofertas e pegar o link primeiro
        </a>
        <p className="mt-3 text-center text-xs text-zinc-500">Se já criou pelo link, pode continuar abaixo.</p>
      </div>

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
          <SubmitAccountForm
            offers={promotionOffers}
            selfieRequired={selfieSettings.required}
            selfieMessage={selfieSettings.message}
          />
        ) : null}
      </div>
    </RoleBasedLayout>
  );
}

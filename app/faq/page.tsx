import {
  PublicPageShell,
  SectionGrid,
  TrustPaymentBlock,
} from "@/components/public/institutional-page";
import type { RegisterLinkSearchInput } from "@/lib/register-href";
import { buildRegisterHref } from "@/lib/register-href";
import { getWhatsappGroupUrl } from "@/lib/settings";

export default async function FaqPage({
  searchParams,
}: {
  searchParams: Promise<RegisterLinkSearchInput>;
}) {
  const params = await searchParams;
  const registerHref = buildRegisterHref(params);
  const whatsappUrl = await getWhatsappGroupUrl();

  return (
    <PublicPageShell
      description="Respostas diretas sobre operação, pagamento, indicação e segurança do fluxo LeadPayX."
      eyebrow="FAQ"
      registerHref={registerHref}
      title="Perguntas frequentes"
      whatsappUrl={whatsappUrl}
    >
      <SectionGrid
        sections={[
          {
            title: "O que é o LeadPayX?",
            body: "É um sistema para organizar captação, operação, status, ganhos e pagamentos com rastreabilidade.",
          },
          {
            title: "Como o pagamento é feito?",
            body: "O pagamento é processado de forma organizada pelo admin, com histórico e comprovante quando registrado.",
          },
          {
            title: "Operador fala com captador?",
            body: "Não. Operadores recebem contas atribuídas pelo sistema, atualizam status e não têm contato direto com captadores.",
          },
          {
            title: "Existe histórico?",
            body: "Sim. O sistema registra status, pagamentos, links e ações críticas para conferência administrativa.",
          },
          {
            title: "O modelo é rastreável?",
            body: "Sim. Links, contas, ganhos, pagamentos e alterações administrativas seguem registros próprios.",
          },
          {
            title: "Há referências?",
            body: "Sim. Temos referências e uma operação com mais de 2 milhões transacionados.",
          },
        ]}
      />
      <TrustPaymentBlock />
    </PublicPageShell>
  );
}

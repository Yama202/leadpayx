import {
  PublicPageShell,
  SectionGrid,
  TrustPaymentBlock,
} from "@/components/public/institutional-page";
import { getWhatsappGroupUrl } from "@/lib/settings";

export default async function ComoFuncionaPage() {
  const whatsappUrl = await getWhatsappGroupUrl();

  return (
    <PublicPageShell
      description="O LeadPayX organiza captação, distribuição operacional, status e pagamento em um fluxo rastreável para quem precisa trabalhar com volume sem perder controle."
      eyebrow="Processo"
      title="Como funciona o LeadPayX"
      whatsappUrl={whatsappUrl}
    >
      <SectionGrid
        sections={[
          {
            eyebrow: "1",
            title: "Captação registrada",
            body: "O captador envia contas pelo painel, acompanha o status e mantém o histórico em um único lugar.",
          },
          {
            eyebrow: "2",
            title: "Operação distribuída",
            body: "O sistema direciona contas para operadores aptos, com controle de lote, prazo e atualização de status.",
          },
          {
            eyebrow: "3",
            title: "Pagamento conferido",
            body: "Ganhos e pagamentos ficam separados por perfil, com organização por pendência, processamento e comprovante.",
          },
        ]}
      />
      <TrustPaymentBlock />
    </PublicPageShell>
  );
}

import {
  PublicPageShell,
  SectionGrid,
  TrustPaymentBlock,
} from "@/components/public/institutional-page";
import { getWhatsappGroupUrl } from "@/lib/settings";

export default async function GanhosPage() {
  const whatsappUrl = await getWhatsappGroupUrl();

  return (
    <PublicPageShell
      description="Ganhos no LeadPayX são calculados por regras administrativas, vinculados a contas concluídas e separados de bônus por indicação para leitura simples."
      eyebrow="Ganhos"
      title="Remuneração clara, sem confusão operacional"
      whatsappUrl={whatsappUrl}
    >
      <SectionGrid
        sections={[
          {
            title: "Por conta concluída",
            body: "Cada conta válida concluída gera ganho conforme a configuração vigente. O valor pode seguir padrão global, ajuste individual ou regra do link.",
          },
          {
            title: "Status financeiro",
            body: "O painel separa valores pendentes e pagos para reduzir dúvidas e facilitar conferência no mobile.",
          },
          {
            title: "Comprovante",
            body: "Pagamentos processados podem receber comprovante e observação administrativa, preservando histórico da operação.",
          },
        ]}
      />
      <TrustPaymentBlock />
    </PublicPageShell>
  );
}

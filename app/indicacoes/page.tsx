import {
  PublicPageShell,
  SectionGrid,
  TrustPaymentBlock,
} from "@/components/public/institutional-page";
import type { RegisterLinkSearchInput } from "@/lib/register-href";
import { buildRegisterHref } from "@/lib/register-href";
import { getWhatsappGroupUrl } from "@/lib/settings";

export default async function IndicacoesPage({
  searchParams,
}: {
  searchParams: Promise<RegisterLinkSearchInput>;
}) {
  const params = await searchParams;
  const registerHref = buildRegisterHref(params);
  const whatsappUrl = await getWhatsappGroupUrl();

  return (
    <PublicPageShell
      description="Indicações são tratadas como fluxo operacional rastreável: link identificado, cadastro associado, meta de conclusão e bônus separado dos ganhos normais."
      eyebrow="Indicações"
      registerHref={registerHref}
      title="Indicação com regra clara e registro completo"
      whatsappUrl={whatsappUrl}
    >
      <SectionGrid
        sections={[
          {
            title: "Link identificado",
            body: "Cada link pode ter origem, campanha, status e validade. Isso ajuda a entender de onde vem cada cadastro.",
          },
          {
            title: "Critério objetivo",
            body: "O bônus é liberado uma única vez quando a pessoa indicada atinge o critério de contas concluídas configurado pelo admin.",
          },
          {
            title: "Separação visual",
            body: "Ganhos por indicação aparecem separados dos ganhos por conta para evitar leitura financeira ambígua.",
          },
        ]}
      />
      <TrustPaymentBlock />
    </PublicPageShell>
  );
}

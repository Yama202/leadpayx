import { CopyLinkButton } from "@/components/admin/copy-link-button";
import { LinkButton } from "@/components/ui/button";
import type { CaptadorGlobalOfferResolved } from "@/lib/queries/captador-global-offers";

export function CaptadorGlobalOffersPanel({
  title = "Ofertas ativas",
  description = "URLs prontas para compartilhar no fluxo comercial.",
  items,
}: {
  title?: string;
  description?: string;
  items: CaptadorGlobalOfferResolved[];
}) {
  if (!items.length) {
    return (
      <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl">
        <p className="text-sm font-bold text-[#16F28A]">{title}</p>
        <p className="mt-2 text-sm text-[#A1A1AA]">Nenhum link ativo.</p>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-[#16F28A]">{title}</p>
          <p className="mt-2 max-w-2xl text-xs font-semibold text-[#A1A1AA]">{description}</p>
        </div>
        <span className="rounded-full bg-[#00E07A]/15 px-3 py-1 text-xs font-bold text-[#16F28A]">
          {items.length} ativo{items.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <article
            className="rounded-2xl border border-white/[0.08] bg-black/20 p-4"
            key={item.id}
          >
            <p className="font-black text-white">{item.name}</p>
            <p className="mt-2 break-all text-xs font-semibold text-zinc-300">{item.finalUrl}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <LinkButton className="min-h-10" href={item.finalUrl} rel="noreferrer" target="_blank" variant="secondary">
                Abrir link
              </LinkButton>
              <CopyLinkButton className="min-h-10" url={item.finalUrl} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

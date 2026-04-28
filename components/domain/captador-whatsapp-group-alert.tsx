import { LinkButton } from "@/components/ui/button";

export function CaptadorWhatsappGroupAlert({
  whatsappUrl,
  className = "",
}: {
  whatsappUrl: string | null;
  className?: string;
}) {
  return (
    <section
      className={`mb-6 rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl ${className}`.trim()}
      role="status"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#16F28A]/25 bg-[#16F28A]/10 text-[#16F28A]"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path
              d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 11-6 0m6 0H9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">Canal oficial no WhatsApp</p>
          <p className="mt-1 text-xs leading-5 text-[#A1A1AA]">
            Use este canal para avisos operacionais oficiais e atualizações importantes.
          </p>
        </div>
      </div>

      {whatsappUrl ? (
        <LinkButton
          className="mt-4 min-h-12 w-full sm:w-auto"
          href={whatsappUrl}
          rel="noreferrer"
          target="_blank"
          variant="secondary"
        >
          Entrar no grupo do WhatsApp
        </LinkButton>
      ) : (
        <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-zinc-300">
          Grupo ainda não configurado pelo admin.
        </p>
      )}
    </section>
  );
}

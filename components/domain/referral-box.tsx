"use client";

import { buildReferralUrl } from "@/lib/referrals";
import type { Profile } from "@/lib/types";
import { useState } from "react";

export function ReferralBox({
  appUrl,
  profile,
  utmCampaign,
  utmMedium,
  utmSource,
  whatsappGroupUrl,
}: {
  appUrl: string;
  profile: Profile;
  utmCampaign: string;
  utmMedium: string;
  utmSource: string;
  whatsappGroupUrl?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const href = buildReferralUrl({
    appUrl,
    code: profile.referral_code,
    utmCampaign,
    utmMedium,
    utmSource,
  });

  const shareText = whatsappGroupUrl
    ? `Ei! Estou ganhando dinheiro com o LeadPayX — cadastra pelo meu link e você também pode 👇\n\n${href}\n\nEntra no grupo do WhatsApp também:\n${whatsappGroupUrl}`
    : `Ei! Estou ganhando dinheiro com o LeadPayX — cadastra pelo meu link e você também pode 👇\n\n${href}`;

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch {
        // usuário cancelou ou sem suporte — cai para WhatsApp
      }
    }
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <p className="text-sm font-bold text-[#16F28A]">Link de indicação</p>
      <p className="mt-2 text-xs font-semibold text-zinc-400">
        Compartilhe com amigos. Quando eles se cadastrarem e completarem contas, você recebe bônus.
      </p>
      <p className="mt-3 break-all rounded-2xl border border-white/[0.08] bg-black/25 p-4 text-sm font-semibold">
        {href}
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#00E07A] px-4 text-sm font-black text-[#031008] transition hover:bg-[#16F28A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16F28A]"
          onClick={() => void handleShare()}
          type="button"
        >
          <svg aria-hidden className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Indicar agora
        </button>
        <button
          className="min-h-12 rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16F28A]"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(href);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              setCopied(false);
            }
          }}
          type="button"
        >
          {copied ? "Copiado!" : "Copiar link"}
        </button>
      </div>
      {whatsappGroupUrl ? (
        <a
          className="mt-3 flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#25D366]/30 bg-[#25D366]/10 px-4 text-sm font-bold text-[#25D366] transition hover:bg-[#25D366]/20"
          href={whatsappGroupUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          <svg aria-hidden className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Grupo do WhatsApp
        </a>
      ) : null}
    </div>
  );
}

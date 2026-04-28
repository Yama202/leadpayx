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
}: {
  appUrl: string;
  profile: Profile;
  utmCampaign: string;
  utmMedium: string;
  utmSource: string;
}) {
  const [copied, setCopied] = useState(false);
  const href = buildReferralUrl({
    appUrl,
    code: profile.referral_code,
    utmCampaign,
    utmMedium,
    utmSource,
  });

  return (
    <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <p className="text-sm font-bold text-[#16F28A]">Link fixo do site</p>
      <p className="mt-2 text-xs font-semibold text-zinc-400">
        Convite genérico (código + UTM). Para campanhas, use as ofertas ativas.
      </p>
      <p className="mt-3 break-all rounded-2xl border border-white/[0.08] bg-black/25 p-4 text-sm font-semibold">
        {href}
      </p>
      <button
        className="mt-5 min-h-12 w-full rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16F28A]"
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
        {copied ? "Link copiado!" : "Copiar link"}
      </button>
    </div>
  );
}

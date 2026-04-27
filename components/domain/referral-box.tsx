import { LinkButton } from "@/components/ui/button";
import { buildReferralUrl } from "@/lib/referrals";
import type { Profile } from "@/lib/types";

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
  const href = buildReferralUrl({
    appUrl,
    code: profile.referral_code,
    utmCampaign,
    utmMedium,
    utmSource,
  });

  return (
    <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <p className="text-sm font-bold text-[#16F28A]">Seu link de indicação</p>
      <p className="mt-3 break-all rounded-2xl border border-white/[0.08] bg-black/25 p-4 text-sm font-semibold">
        {href}
      </p>
      <p className="mt-3 text-sm leading-6 text-[#A1A1AA]">
        O código é único e o vínculo do indicado é imutável após aplicado. O bônus
        único é gerado automaticamente quando a regra configurada for atingida.
      </p>
      <LinkButton className="mt-5 w-full" href={href} variant="secondary">
        Abrir link
      </LinkButton>
    </div>
  );
}

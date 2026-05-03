import Image from "next/image";
import { BRAND_NAME } from "@/lib/constants";

type BrandLogoVariant = "icon" | "compact" | "horizontal";

export function BrandLogo({
  variant = "horizontal",
  showTagline = false,
  className = "",
}: {
  variant?: BrandLogoVariant;
  showTagline?: boolean;
  className?: string;
}) {
  if (variant === "icon") {
    return (
      <div
        aria-label={BRAND_NAME}
        className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#16F28A]/25 bg-black/40 p-1 shadow-[0_0_24px_rgba(0,224,122,0.2)] ${className}`.trim()}
      >
        <Image
          alt={BRAND_NAME}
          className="h-full w-full object-contain"
          height={64}
          priority
          sizes="44px"
          src="/brand/logo-mark.png"
          width={64}
        />
      </div>
    );
  }

  const showName = variant === "horizontal";
  const iconSize = showName ? 44 : 36;

  return (
    <div className={`inline-flex items-center gap-3 ${className}`.trim()}>
      <Image
        alt={`${BRAND_NAME} símbolo`}
        className="rounded-lg object-contain"
        height={iconSize}
        priority
        sizes={`${iconSize}px`}
        src="/brand/logo-mark.png"
        width={iconSize}
      />
      {showName ? (
        <div className="min-w-0">
          <Image
            alt={BRAND_NAME}
            className="h-auto w-[170px] max-w-full object-contain"
            height={48}
            priority
            sizes="(max-width:640px) 140px, 240px"
            src="/brand/logo-wordmark.png"
            width={240}
          />
          {showTagline ? (
            <p className="mt-1 pl-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/90">
              Ops Finance
            </p>
          ) : null}
        </div>
      ) : (
        <span className="text-sm font-bold tracking-tight text-white">{BRAND_NAME}</span>
      )}
    </div>
  );
}

export function BrandMark() {
  return <BrandLogo showTagline variant="horizontal" />;
}

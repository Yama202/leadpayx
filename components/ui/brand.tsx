import Image from "next/image";
import { BRAND_NAME } from "@/lib/constants";

type BrandLogoVariant = "icon" | "compact" | "horizontal";

/** Intrinsic size do ficheiro em `WORDMARK_SRC` (deve coincidir com os pixels do PNG). */
const WORDMARK_W = 1024;
const WORDMARK_H = 388;

/**
 * Asset URLs under `/brand/*` are sent with `immutable` + 1y cache in `next.config.ts`.
 * When the logo file changes, bump these filenames (or version query) or clients keep the old image.
 */
/** Bump filename (+ below `unoptimized`) when the arte changes — avoids CDN, `/brand/*` immutable, e cache do optimizer. */
const WORDMARK_SRC = "/brand/leadpayx-wordmark-202605.png";
const MARK_SRC = "/brand/leadpayx-mark-202605.png";

export function BrandLogo({
  variant = "horizontal",
  showTagline = false,
  /** Header row (e.g. next to Voltar): tall enough for white “LeadPay” at lg; avoid `h-8` crushing text. */
  compactDensity = false,
  className = "",
}: {
  variant?: BrandLogoVariant;
  showTagline?: boolean;
  compactDensity?: boolean;
  className?: string;
}) {
  if (variant === "icon") {
    return (
      <div
        aria-label={BRAND_NAME}
        className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] p-1 shadow-[0_0_20px_rgba(22,242,138,0.12)] transition-colors duration-200 ${className}`.trim()}
      >
        <Image
          alt={BRAND_NAME}
          className="h-full w-full object-contain"
          height={64}
          priority
          sizes="44px"
          src={MARK_SRC}
          unoptimized
          width={64}
        />
      </div>
    );
  }

  const isCompact = variant === "compact";
  const isHeaderTight = variant === "horizontal" && compactDensity;

  return (
    <div
      className={`inline-flex flex-col ${isCompact || isHeaderTight ? "items-start" : "items-stretch"} ${className}`.trim()}
    >
      <div className="min-w-0 bg-transparent [&_span]:bg-transparent">
        <Image
          alt={BRAND_NAME}
          className={
            isHeaderTight
              ? "h-auto max-h-11 w-auto max-w-[min(100%,220px)] object-contain object-left [background:transparent]"
              : isCompact
                ? "h-auto max-h-10 w-auto max-w-[min(100%,200px)] object-contain object-left [background:transparent]"
                : "w-[min(100%,260px)] max-w-full object-contain object-left [background:transparent]"
          }
          height={WORDMARK_H}
          priority
          sizes={
            isHeaderTight ? "220px" : isCompact ? "200px" : "(max-width:640px) 220px, 260px"
          }
          src={WORDMARK_SRC}
          unoptimized
          width={WORDMARK_W}
        />
        {showTagline ? (
          <p className="mt-1.5 pl-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/90">
            Ops Finance
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function BrandMark() {
  return <BrandLogo showTagline variant="horizontal" />;
}

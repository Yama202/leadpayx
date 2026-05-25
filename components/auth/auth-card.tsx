import type { ReactNode } from "react";

import { BackButton } from "@/components/ui/back-button";
import { BrandLogo } from "@/components/ui/brand";

export function AuthCard({
  title,
  description,
  children,
  backHref = "/",
}: {
  title: string;
  description: string;
  children: ReactNode;
  backHref?: string;
}) {
  return (
    <main className="dark relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#050706] px-4 py-8 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(0,224,122,0.18),transparent_30%),linear-gradient(180deg,#050706_0%,#070909_56%,#030504_100%)]" />
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="pointer-events-none absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-[#00E07A]/20 blur-[110px] sm:h-[32rem] sm:w-[32rem]" />
      <section className="relative z-10 w-full max-w-md rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-6 shadow-2xl shadow-black/35 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <BrandLogo showTagline variant="horizontal" />
        </div>
        <BackButton
          className="mt-6 min-h-10 px-3 py-2 text-xs uppercase tracking-[0.14em]"
          fallbackHref={backHref}
        />
        <div className="my-8">
          <p className="mb-3 inline-flex rounded-full border border-[#00E07A]/25 bg-[#00E07A]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#16F28A]">
            Acesso seguro
          </p>
          <h1 className="text-3xl font-black tracking-tight text-white">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-[#A1A1AA]">{description}</p>
        </div>
        {children}
      </section>
    </main>
  );
}

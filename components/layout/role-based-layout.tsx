import type { ReactNode } from "react";

import { DesktopSidebar, MobileBottomNav } from "@/components/layout/nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BackButton } from "@/components/ui/back-button";
import { BrandLogo } from "@/components/ui/brand";
import { LinkButton } from "@/components/ui/button";
import { roleHome } from "@/lib/constants";
import type { Profile } from "@/lib/types";

export function RoleBasedLayout({
  profile,
  title,
  description,
  children,
}: {
  profile: Profile;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="dark relative min-h-dvh overflow-hidden bg-[#050706] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_14%,rgba(0,224,122,0.14),transparent_28%),radial-gradient(circle_at_90%_8%,rgba(22,242,138,0.08),transparent_22%),linear-gradient(180deg,#050706_0%,#070909_54%,#030504_100%)]" />
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-45" />
      <div className="pointer-events-none absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-[#00E07A]/15 blur-[110px] sm:h-[34rem] sm:w-[34rem]" />
      <div className="relative z-10 flex">
        <DesktopSidebar role={profile.role} />
        <main className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-10">
          <header className="mb-7 rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-bold text-[#16F28A]">{profile.name ?? profile.email}</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  {title}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#A1A1AA]">{description}</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <BrandLogo className="hidden lg:inline-flex" variant="compact" />
                <BackButton fallbackHref={roleHome[profile.role]} />
                <LinkButton href="/logout" variant="secondary">
                  Sair
                </LinkButton>
                <ThemeToggle />
              </div>
            </div>
          </header>
          {children}
        </main>
      </div>
      <MobileBottomNav role={profile.role} />
    </div>
  );
}

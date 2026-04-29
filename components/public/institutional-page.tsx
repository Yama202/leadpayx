import Link from "next/link";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/ui/brand";
import { LinkButton } from "@/components/ui/button";

const navItems = [
  { href: "/como-funciona", label: "Como funciona" },
  { href: "/ganhos", label: "Ganhos" },
  { href: "/indicacoes", label: "Indicações" },
  { href: "/faq", label: "FAQ" },
];

export type InstitutionalSection = {
  eyebrow?: string;
  title: string;
  body: string;
};

export function PublicHeader({ registerHref = "/register" }: { registerHref?: string }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
      <nav className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-2 rounded-[1.5rem] border border-white/10 bg-[#070909]/75 px-3 shadow-2xl shadow-black/30 backdrop-blur-xl sm:gap-3 sm:px-5">
        <Link aria-label="LeadPayX início" className="flex min-h-11 items-center gap-3" href="/">
          <BrandLogo variant="compact" />
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {navItems.map((item) => (
            <Link
              className="text-sm font-semibold text-zinc-400 transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00E07A]"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <Link
            className="inline-flex min-h-11 min-w-[4.5rem] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16F28A] sm:min-w-0 sm:px-4"
            href="/login"
          >
            Entrar
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#00E07A] px-3 text-sm font-black uppercase tracking-[0.08em] text-[#031008] shadow-[0_0_34px_rgba(0,224,122,0.28)] transition-colors duration-200 hover:bg-[#16F28A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16F28A] sm:px-5"
            href={registerHref}
          >
            Começar
          </Link>
        </div>
      </nav>
    </header>
  );
}

export function PublicPageShell({
  eyebrow,
  title,
  description,
  children,
  whatsappUrl,
  registerHref = "/register",
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  whatsappUrl?: string | null;
  registerHref?: string;
}) {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#050706] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(0,224,122,0.16),transparent_30%),radial-gradient(circle_at_86%_10%,rgba(22,242,138,0.08),transparent_24%),linear-gradient(180deg,#050706_0%,#070909_54%,#030504_100%)]" />
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-45" />
      <div className="pointer-events-none absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-[#00E07A]/18 blur-[110px] sm:h-[32rem] sm:w-[32rem]" />
      <PublicHeader registerHref={registerHref} />

      <section className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-20 pt-32 sm:px-6 lg:pt-36">
        <div className="max-w-3xl">
          <p className="inline-flex rounded-full border border-[#00E07A]/25 bg-[#00E07A]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#16F28A]">
            {eyebrow}
          </p>
          <h1 className="mt-6 text-4xl font-black leading-[0.96] tracking-[-0.06em] text-white sm:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[#A1A1AA] sm:text-lg">
            {description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkButton href={registerHref}>Criar acesso</LinkButton>
            {whatsappUrl ? (
              <LinkButton href={whatsappUrl} target="_blank" rel="noreferrer" variant="secondary">
                Entrar no grupo WhatsApp
              </LinkButton>
            ) : null}
          </div>
        </div>

        {children}
      </section>
    </main>
  );
}

export function SectionGrid({ sections }: { sections: InstitutionalSection[] }) {
  return (
    <div className="mt-12 grid gap-4 md:grid-cols-3">
      {sections.map((section) => (
        <article
          className="rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl"
          key={section.title}
        >
          {section.eyebrow ? (
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#16F28A]">
              {section.eyebrow}
            </p>
          ) : null}
          <h2 className="mt-3 text-xl font-black tracking-tight text-white">{section.title}</h2>
          <p className="mt-3 text-sm leading-6 text-[#A1A1AA]">{section.body}</p>
        </article>
      ))}
    </div>
  );
}

export function TrustPaymentBlock() {
  return (
    <section className="mt-12 rounded-[2.2rem] border border-[#00E07A]/15 bg-[linear-gradient(135deg,rgba(0,224,122,0.12),rgba(255,255,255,0.035))] p-6 shadow-[0_32px_100px_rgba(0,0,0,0.34)] backdrop-blur-xl">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#16F28A]">
        Confiança e pagamento
      </p>
      <h2 className="mt-3 text-2xl font-black tracking-tight text-white">
        Organização, histórico e comprovante em cada pagamento.
      </h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <p className="rounded-3xl border border-white/[0.08] bg-black/20 p-4 text-sm font-semibold leading-6 text-zinc-200">
          Já transacionamos mais de 2 milhões.
        </p>
        <p className="rounded-3xl border border-white/[0.08] bg-black/20 p-4 text-sm font-semibold leading-6 text-zinc-200">
          Temos referências e operação acompanhada por histórico.
        </p>
        <p className="rounded-3xl border border-white/[0.08] bg-black/20 p-4 text-sm font-semibold leading-6 text-zinc-200">
          Pagamentos são processados com organização, registro e comprovante.
        </p>
      </div>
    </section>
  );
}

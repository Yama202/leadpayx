"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function ScrollRevealInit() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08 },
    );
    document.querySelectorAll(".scroll-reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return null;
}

export function GlowCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    ref.current.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  }

  return (
    <div className={`glow-card ${className}`} onMouseMove={handleMouseMove} ref={ref}>
      {children}
    </div>
  );
}

/* ── Nav Mega Menu (desktop) ───────────────────────────────── */

type MegaItem = { title: string; desc: string };
type MegaMenu = {
  href: string;
  label: string;
  panel: {
    links: MegaItem[];
    feature: { label: string; title: string; desc: string };
  };
};

const MEGA_MENUS: MegaMenu[] = [
  {
    href: "/como-funciona",
    label: "Como funciona",
    panel: {
      links: [
        { title: "Envias a conta", desc: "Submetes os dados pelo painel em segundos" },
        { title: "Aguardas validação", desc: "Acompanhas o estado no teu painel" },
        { title: "Recebes o pagamento", desc: "Comissão creditada com comprovante" },
      ],
      feature: { label: "Processo", title: "Simples e direto", desc: "Do envio ao pagamento sem complicação" },
    },
  },
  {
    href: "/ganhos",
    label: "Ganhos",
    panel: {
      links: [
        { title: "Ganho por conta", desc: "Cada conta processada gera comissão" },
        { title: "Bónus de indicação", desc: "Acumulas bónus pelas contas dos teus indicados" },
        { title: "Comprovante sempre disponível", desc: "Cada pagamento fica registado" },
      ],
      feature: { label: "Ganhos", title: "Transparente", desc: "Sabes sempre o que recebeste e porquê" },
    },
  },
  {
    href: "/indicacoes",
    label: "Indicações",
    panel: {
      links: [
        { title: "Link pessoal", desc: "Partilhas o teu link e convidas outros" },
        { title: "Bónus por indicado", desc: "Cada conta do teu indicado gera bónus para ti" },
        { title: "Painel em tempo real", desc: "Acompanhas os teus indicados e os seus resultados" },
      ],
      feature: { label: "Rede", title: "Indica e ganha", desc: "Sem limite de indicados ou teto de bónus" },
    },
  },
  {
    href: "/faq",
    label: "FAQ",
    panel: {
      links: [
        { title: "Como começo?", desc: "Cadastras, aguardas aprovação e envias" },
        { title: "Quando recebo?", desc: "Assim que a conta for processada" },
        { title: "É seguro?", desc: "Os teus dados ficam sempre protegidos" },
      ],
      feature: { label: "Suporte", title: "Sem dúvidas", desc: "Respondemos tudo antes de começares" },
    },
  },
];

export function NavMegaMenu() {
  const [open, setOpen] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function enter(label: string) {
    if (timer.current) clearTimeout(timer.current);
    setOpen(label);
  }
  function leave() {
    timer.current = setTimeout(() => setOpen(null), 130);
  }

  return (
    <div className="hidden items-center gap-7 lg:flex">
      {MEGA_MENUS.map((item) => {
        const isOpen = open === item.label;
        return (
          <div
            className="relative"
            key={item.href}
            onMouseEnter={() => enter(item.label)}
            onMouseLeave={leave}
          >
            <a
              className="flex items-center gap-1 text-sm font-semibold text-zinc-400 transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00E07A]"
              href={item.href}
            >
              {item.label}
              <svg
                className={`h-3.5 w-3.5 transition-transform duration-300 ${isOpen ? "rotate-180 text-[#16F28A]" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                viewBox="0 0 24 24"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </a>

            <div
              className="absolute left-1/2 top-full z-50 mt-4 w-[400px] -translate-x-1/2 overflow-hidden rounded-[1.4rem] border border-[rgba(233,235,223,0.09)] bg-[#0e0f0f]/96 shadow-[0_32px_80px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-2xl"
              style={{
                opacity: isOpen ? 1 : 0,
                transform: isOpen ? "translateY(0) scale(1)" : "translateY(8px) scale(0.97)",
                pointerEvents: isOpen ? "auto" : "none",
                transition: "opacity 0.22s cubic-bezier(0.16,1,0.3,1), transform 0.22s cubic-bezier(0.16,1,0.3,1)",
                transformOrigin: "top center",
              }}
              onMouseEnter={() => enter(item.label)}
              onMouseLeave={leave}
            >
              <div className="relative h-px overflow-hidden bg-[rgba(233,235,223,0.06)]">
                <div
                  className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-[#00E07A]/70 to-transparent"
                  style={{ animation: isOpen ? "mega-scan 1.8s cubic-bezier(0.16,1,0.3,1) forwards" : "none" }}
                />
              </div>

              <div className="grid grid-cols-[1fr_148px]">
                <div className="space-y-0.5 p-3">
                  {item.panel.links.map((link) => (
                    <a
                      className="group flex flex-col rounded-xl px-3 py-2.5 transition-colors duration-150 hover:bg-[rgba(255,255,255,0.05)]"
                      href={item.href}
                      key={link.title}
                    >
                      <span className="flex items-center gap-2 text-sm font-bold text-[#cbccc4] transition-colors group-hover:text-[#e9ebdf]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#00E07A]/40 transition-colors group-hover:bg-[#00E07A]" />
                        {link.title}
                      </span>
                      <span className="ml-3.5 mt-0.5 text-[11px] leading-4 text-[#3f403d] transition-colors group-hover:text-[#5f6059]">
                        {link.desc}
                      </span>
                    </a>
                  ))}
                </div>

                <div className="relative flex flex-col justify-between overflow-hidden border-l border-[rgba(233,235,223,0.07)] bg-[rgba(0,224,122,0.04)] p-4">
                  <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-[#00E07A]/[0.07] blur-2xl" />
                  <div>
                    <span className="section-label text-[#00E07A]/50">{item.panel.feature.label}</span>
                    <p className="mt-2 text-sm font-black leading-tight text-[#e9ebdf]">
                      {item.panel.feature.title}
                    </p>
                    <p className="mt-1.5 text-[11px] leading-4 text-[#5f6059]">
                      {item.panel.feature.desc}
                    </p>
                  </div>
                  <div className="mt-4 h-0.5 overflow-hidden rounded-full bg-[rgba(233,235,223,0.06)]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#00E07A]/70 to-[#16F28A]/40"
                      style={{
                        width: isOpen ? "80%" : "0%",
                        transition: "width 0.8s cubic-bezier(0.16,1,0.3,1) 0.15s",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Mobile Nav (hamburger + panel) ───────────────────────── */

const MOBILE_NAV_ITEMS = [
  { href: "/como-funciona", label: "Como funciona", sub: "Do envio ao pagamento, passo a passo" },
  { href: "/ganhos",        label: "Ganhos",         sub: "O que ganhas e como recebes" },
  { href: "/indicacoes",    label: "Indicações",     sub: "Indica amigos e ganha bónus" },
  { href: "/faq",           label: "FAQ",            sub: "Perguntas frequentes" },
];

export function MobileNav({ registerHref = "/register" }: { registerHref?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Hamburger */}
      <button
        aria-expanded={open}
        aria-label={open ? "Fechar menu" : "Menu de navegação"}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00E07A] lg:hidden"
        onClick={() => setOpen((v) => !v)}
      >
        <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          {open ? (
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <>
              <line x1="3" y1="8"  x2="21" y2="8"  strokeLinecap="round" />
              <line x1="3" y1="16" x2="21" y2="16" strokeLinecap="round" />
            </>
          )}
        </svg>
      </button>

      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
        style={{
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.22s",
        }}
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div
        className="fixed inset-x-3 z-50 overflow-hidden rounded-[1.6rem] border border-[rgba(233,235,223,0.09)] bg-[#0e0f0f]/98 shadow-[0_32px_80px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-2xl lg:hidden"
        style={{
          top: "5.5rem",
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0) scale(1)" : "translateY(-10px) scale(0.97)",
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s cubic-bezier(0.16,1,0.3,1), transform 0.25s cubic-bezier(0.16,1,0.3,1)",
          transformOrigin: "top center",
        }}
      >
        {/* Accent scan line */}
        <div className="relative h-px overflow-hidden bg-[rgba(233,235,223,0.06)]">
          <div
            className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-[#00E07A]/60 to-transparent"
            style={{ animation: open ? "mega-scan 1.6s cubic-bezier(0.16,1,0.3,1) forwards" : "none" }}
          />
        </div>

        {/* Nav links */}
        <div className="p-2">
          {MOBILE_NAV_ITEMS.map((item) => (
            <a
              className="group flex items-center justify-between rounded-xl px-4 py-3.5 transition-colors hover:bg-white/[0.04]"
              href={item.href}
              key={item.href}
              onClick={() => setOpen(false)}
            >
              <div>
                <p className="text-sm font-bold text-[#cbccc4] transition-colors group-hover:text-[#e9ebdf]">
                  {item.label}
                </p>
                <p className="mt-0.5 text-xs text-[#3f403d] transition-colors group-hover:text-[#5f6059]">
                  {item.sub}
                </p>
              </div>
              <svg className="h-4 w-4 flex-shrink-0 text-[#3f403d] transition-colors group-hover:text-[#5f6059]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </a>
          ))}
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-[rgba(233,235,223,0.07)]" />

        {/* CTAs */}
        <div className="flex gap-2 p-3">
          <a
            className="flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-bold text-white transition-colors hover:bg-white/[0.08]"
            href="/login"
            onClick={() => setOpen(false)}
          >
            Entrar
          </a>
          <a
            className="flex flex-1 items-center justify-center rounded-xl bg-[#00E07A] py-3 text-sm font-black text-[#031008] shadow-[0_0_34px_rgba(0,224,122,0.28)] transition-colors hover:bg-[#16F28A]"
            href={registerHref}
            onClick={() => setOpen(false)}
          >
            Começar
          </a>
        </div>
      </div>
    </>
  );
}

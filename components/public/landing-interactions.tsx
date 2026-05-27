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

/* ── Nav Mega Menu ─────────────────────────────────────────── */

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
        { title: "Envio de conta", desc: "Submetes credenciais pelo painel em segundos" },
        { title: "Fila operacional", desc: "Sistema distribui ao operador por ciclo" },
        { title: "Pagamento rastreável", desc: "Comissão creditada com comprovante automático" },
      ],
      feature: { label: "Processo", title: "4 etapas claras", desc: "Do envio ao Pix sem burocracia" },
    },
  },
  {
    href: "/ganhos",
    label: "Ganhos",
    panel: {
      links: [
        { title: "Comissão por conta", desc: "Ganho a cada conta operada com sucesso" },
        { title: "Bónus de indicação", desc: "Percentual dos ganhos do teu indicado" },
        { title: "Histórico completo", desc: "Cada pagamento registado e conferível" },
      ],
      feature: { label: "Ganhos", title: "100% rastreável", desc: "Histórico e comprovante em cada pagamento" },
    },
  },
  {
    href: "/indicacoes",
    label: "Indicações",
    panel: {
      links: [
        { title: "Link único", desc: "O teu link pessoal para convidar captadores" },
        { title: "Ganhos passivos", desc: "Percentual de cada operação do indicado" },
        { title: "Painel em tempo real", desc: "Acompanhas o crescimento da rede" },
      ],
      feature: { label: "Rede", title: "Indica e ganha", desc: "Sem limite de rede ou teto de bónus" },
    },
  },
  {
    href: "/faq",
    label: "FAQ",
    panel: {
      links: [
        { title: "Como começo?", desc: "Crias conta, confirmas e já podes enviar" },
        { title: "Quando recebo?", desc: "Assim que a conta for validada pelo operador" },
        { title: "É seguro?", desc: "Credenciais cifradas, nunca expostas ao operador" },
      ],
      feature: { label: "Suporte", title: "Transparência total", desc: "Resposta para cada dúvida do processo" },
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
            {/* Trigger */}
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

            {/* Panel */}
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
              {/* Top accent line animated */}
              <div className="relative h-px overflow-hidden bg-[rgba(233,235,223,0.06)]">
                <div
                  className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-[#00E07A]/70 to-transparent"
                  style={{
                    animation: isOpen ? "mega-scan 1.8s cubic-bezier(0.16,1,0.3,1) forwards" : "none",
                  }}
                />
              </div>

              <div className="grid grid-cols-[1fr_148px]">
                {/* Links */}
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

                {/* Feature card */}
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
                  {/* Mini progress bar */}
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

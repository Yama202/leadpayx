import Link from "next/link";

import { PublicHeader } from "@/components/public/institutional-page";
import {
  GlowCard,
  ScrollRevealInit,
} from "@/components/public/landing-interactions";
import { BrandLogo } from "@/components/ui/brand";
import type { RegisterLinkSearchInput } from "@/lib/register-href";
import { buildRegisterHref } from "@/lib/register-href";
import { getWhatsappGroupUrl } from "@/lib/settings";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<RegisterLinkSearchInput>;
}) {
  const params = await searchParams;
  const registerHref = buildRegisterHref(params);
  const whatsappUrl = await getWhatsappGroupUrl();

  return (
    <main className="relative min-h-dvh overflow-hidden text-white" style={{ background: "#151515" }}>
      <ScrollRevealInit />

      {/* ── Camadas de fundo ── */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(0,224,122,0.18),transparent_30%),radial-gradient(circle_at_88%_12%,rgba(22,242,138,0.09),transparent_22%)]" />
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute left-1/2 top-20 h-80 w-80 -translate-x-1/2 rounded-full bg-[#00E07A]/18 blur-[120px] hero-glow sm:h-[38rem] sm:w-[38rem]" />

      <PublicHeader registerHref={registerHref} />

      {/* ══════════════════════════════════════════════
          01 — HERO
      ══════════════════════════════════════════════ */}
      <section className="loki-frame relative z-10 mx-auto grid min-h-dvh w-full max-w-7xl items-center gap-12 px-6 pb-20 pt-28 sm:pt-32 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pt-28">
        {/* Crosshairs Loki */}
        <span className="section-label pointer-events-none absolute left-6 top-[7.5rem] text-[#00E07A]/60">
          01 │ Hero
        </span>

        <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:text-left">
          {/* Badge animado */}
          <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#00E07A]/25 bg-[#00E07A]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#16F28A] shadow-[0_0_28px_rgba(0,224,122,0.12)] lg:mx-0">
            <span className="dot-pulse inline-block h-1.5 w-1.5 rounded-full bg-[#00E07A]" />
            Plataforma operacional para captadores
          </p>

          <h1
            className="mt-6 font-black text-[#e9ebdf]"
            style={{
              fontSize: "clamp(2.6rem, 7vw, 5.5rem)",
              lineHeight: 1.0,
              letterSpacing: "-0.055em",
            }}
          >
            Captação que{" "}
            <span className="text-shimmer">escala</span>
            {" "}com você.
          </h1>

          <p
            className="mx-auto mt-6 max-w-xl leading-[1.65] text-[#94958e] lg:mx-0"
            style={{ fontSize: "clamp(0.95rem, 1.8vw, 1.1rem)", letterSpacing: "-0.01em" }}
          >
            Painel em tempo real, ganhos por validação, sistema de indicação e
            pagamentos organizados — tudo num só lugar, optimizado para celular.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link
              className="inline-flex min-h-[3.25rem] items-center justify-center rounded-2xl bg-[#00E07A] px-7 text-sm font-black uppercase tracking-[0.12em] text-[#0a1a0f] shadow-[0_0_46px_rgba(0,224,122,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#16F28A] hover:shadow-[0_0_60px_rgba(0,224,122,0.38)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16F28A]"
              style={{ transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)" }}
              href={registerHref}
            >
              Começar agora
            </Link>
            <Link
              className="inline-flex min-h-[3.25rem] items-center justify-center rounded-2xl border border-[rgba(233,235,223,0.12)] bg-[rgba(255,255,255,0.04)] px-7 text-sm font-black uppercase tracking-[0.12em] text-[#cbccc4] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(233,235,223,0.2)] hover:bg-[rgba(255,255,255,0.07)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              style={{ transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)" }}
              href="/como-funciona"
            >
              Ver como funciona
            </Link>
            {whatsappUrl ? (
              <a
                className="inline-flex min-h-[3.25rem] items-center justify-center rounded-2xl border border-[#00E07A]/18 bg-[#00E07A]/8 px-7 text-sm font-black uppercase tracking-[0.12em] text-[#16F28A] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#00E07A]/14 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00E07A]"
                style={{ transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)" }}
                href={whatsappUrl}
                rel="noreferrer"
                target="_blank"
              >
                <IconWhatsApp className="mr-2 h-4 w-4" />
                WhatsApp
              </a>
            ) : null}
          </div>

          {/* Trust chips */}
          <div className="mx-auto mt-8 flex max-w-xl flex-wrap justify-center gap-2 lg:mx-0 lg:justify-start">
            {["Painel real-time", "Ganhos por validação", "Indicação", "Pagamentos", "Mobile-first"].map(
              (chip, i) => (
                <span
                  className="hero-chip rounded-full border border-[rgba(233,235,223,0.10)] bg-[rgba(255,255,255,0.03)] px-3.5 py-1.5 text-xs font-bold tracking-wide text-[#94958e]"
                  key={chip}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {chip}
                </span>
              ),
            )}
          </div>
        </div>

        {/* Card mockup — glassmorphism Raycast */}
        <div className="relative mx-auto w-full max-w-[24rem] sm:max-w-[28rem] lg:mr-0">
          <div className="pointer-events-none absolute inset-6 rounded-full bg-[#00E07A]/22 blur-[90px]" />
          <div className="hero-float relative rounded-[2.4rem] border border-[rgba(233,235,223,0.10)] bg-[rgba(255,255,255,0.04)] p-3 shadow-[0_40px_120px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
            {/* Crosshair corners */}
            <span className="pointer-events-none absolute left-[-1px] top-[-1px] font-mono text-xs text-[#00E07A]/30">+</span>
            <span className="pointer-events-none absolute right-[-1px] top-[-1px] font-mono text-xs text-[#00E07A]/30">+</span>
            <span className="pointer-events-none absolute bottom-[-1px] left-[-1px] font-mono text-xs text-[#00E07A]/30">+</span>
            <span className="pointer-events-none absolute bottom-[-1px] right-[-1px] font-mono text-xs text-[#00E07A]/30">+</span>

            <div className="rounded-[2rem] border border-[rgba(233,235,223,0.08)] bg-[#0f1a12] p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="section-label text-[#3f403d]">Painel captador</p>
                  <BrandLogo className="mt-2" variant="compact" />
                </div>
                <span className="flex items-center gap-1.5 rounded-full border border-[#00E07A]/25 bg-[#00E07A]/10 px-3 py-1 text-xs font-bold text-[#16F28A]">
                  <span className="dot-pulse inline-block h-1.5 w-1.5 rounded-full bg-[#00E07A]" />
                  Online
                </span>
              </div>

              <div className="rounded-[1.7rem] border border-[#00E07A]/18 bg-[linear-gradient(135deg,rgba(0,224,122,0.14),rgba(255,255,255,0.03))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <p className="section-label text-[#3f403d]">Saldo acumulado</p>
                <p className="mt-2 font-black text-[#e9ebdf]" style={{ fontSize: "2.8rem", lineHeight: 1, letterSpacing: "-0.05em" }}>
                  R$ 480
                </p>
                <p className="mt-3 text-xs font-semibold text-[#16F28A]">
                  Pagamento organizado e conferível
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <MockMetric label="Contas validadas" value="16" />
                <MockMetric label="Indicação bônus" value="R$ 120" />
              </div>

              <div className="mt-4 rounded-[1.5rem] border border-[rgba(233,235,223,0.08)] bg-[rgba(255,255,255,0.03)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#5f6059]">Pagamento</span>
                  <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300">
                    Pendente
                  </span>
                </div>
              </div>

              <div className="mt-3 rounded-[1.5rem] border border-[rgba(233,235,223,0.07)] bg-[rgba(0,0,0,0.3)] p-4">
                <p className="section-label text-[#3f403d]">Link de indicação</p>
                <p className="mt-2 break-all text-sm font-bold text-[#cbccc4]">
                  leadpayx.com.br/invite/<span className="text-[#16F28A]">seucodigo</span>
                </p>
              </div>
            </div>
          </div>

          {/* Floating notification cards */}
          {[
            { label: "+ R$30 gerado", cls: "left-0 top-20 -translate-x-3 sm:-translate-x-10", delay: "0ms" },
            { label: "2 contas validadas", cls: "right-0 top-36 translate-x-3 sm:translate-x-10", delay: "180ms" },
            { label: "Bônus de indicação liberado", cls: "bottom-28 left-2 sm:-translate-x-8", delay: "360ms" },
            { label: "Pagamento processado", cls: "bottom-10 right-2 sm:translate-x-8", delay: "540ms" },
          ].map((c) => (
            <div
              className={`hero-float-card absolute hidden rounded-2xl border border-[rgba(233,235,223,0.10)] bg-[#151515]/90 px-4 py-2.5 text-sm font-black text-[#e9ebdf] shadow-[0_18px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:block ${c.cls}`}
              key={c.label}
              style={{ animationDelay: c.delay }}
            >
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#00E07A] shadow-[0_0_12px_rgba(0,224,122,0.8)]" />
              {c.label}
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          02 — COMO FUNCIONA
      ══════════════════════════════════════════════ */}
      <section className="loki-frame relative z-10 mx-auto w-full max-w-7xl px-6 py-24">
        <div className="scroll-reveal">
          <p className="section-label text-[#00E07A]/60">02 │ Como funciona</p>
          <h2
            className="mt-4 font-black text-[#e9ebdf]"
            style={{ fontSize: "clamp(1.9rem,4.5vw,3.2rem)", lineHeight: 1.05, letterSpacing: "-0.04em" }}
          >
            Simples do envio ao pagamento.
          </h2>
          <p className="mt-3 max-w-xl text-base leading-7 text-[#5f6059]">
            Quatro etapas claras. Nenhuma burocracia no meio.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: "01",
              icon: <IconSend />,
              title: "Enviás a conta",
              body: "Submetes o identificador e credenciais protegidas. O sistema regista e coloca na fila.",
              delay: "reveal-delay-1",
            },
            {
              step: "02",
              icon: <IconQueue />,
              title: "Entra na fila",
              body: "A conta fica pendente e disponível para o operador designado por ordem de chegada.",
              delay: "reveal-delay-2",
            },
            {
              step: "03",
              icon: <IconOperator />,
              title: "Operador trabalha",
              body: "O operador opera no prazo de SLA. Informa o destino do saldo ao terminar.",
              delay: "reveal-delay-3",
            },
            {
              step: "04",
              icon: <IconPix />,
              title: "Recebès o ganho",
              body: "Comissão creditada automaticamente, com histórico e comprovante sempre disponíveis.",
              delay: "reveal-delay-4",
            },
          ].map((item) => (
            <GlowCard
              className={`card-glass card-hover scroll-reveal ${item.delay} relative flex flex-col gap-4 overflow-hidden rounded-[1.8rem] p-5`}
              key={item.step}
            >
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#00E07A]/20 bg-[#00E07A]/10 text-[#16F28A]">
                  {item.icon}
                </span>
                <span className="section-label text-[#2e2f2d]">{item.step}</span>
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight text-[#e9ebdf]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5f6059]">{item.body}</p>
              </div>
              {/* Glow line bottom */}
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00E07A]/20 to-transparent" />
            </GlowCard>
          ))}
        </div>

        {/* Feature Canvas — fluxo animado */}
        <div className="scroll-reveal reveal-delay-5 mt-8 overflow-hidden rounded-[2rem] border border-[rgba(233,235,223,0.07)] bg-[rgba(0,0,0,0.35)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <p className="section-label mb-5 text-[#3f403d]">Fluxo em tempo real</p>
          <div className="flex items-center justify-between gap-2">
            {[
              { label: "Captador", sub: "envia conta" },
              { label: "Fila", sub: "pendente" },
              { label: "Operador", sub: "em operação" },
              { label: "Pix", sub: "pago" },
            ].map((node, i) => (
              <div className="flex flex-1 flex-col items-center gap-2" key={node.label}>
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#00E07A]/25 bg-[#00E07A]/10 text-[#16F28A]">
                  <span className="section-label text-[0.6rem] text-[#16F28A]">0{i + 1}</span>
                </div>
                <p className="text-center text-xs font-black text-[#cbccc4]">{node.label}</p>
                <p className="text-center text-[10px] text-[#3f403d]">{node.sub}</p>
              </div>
            ))}
          </div>
          {/* SVG data stream connector */}
          <div className="mt-4 overflow-hidden">
            <svg className="h-8 w-full" viewBox="0 0 800 32" preserveAspectRatio="none" fill="none">
              <path d="M 0 16 H 800" stroke="rgba(233,235,223,0.06)" strokeWidth="1" />
              <path
                className="data-stream-line"
                d="M 0 16 H 800"
                stroke="#00E07A"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                className="data-stream-line data-stream-line-2"
                d="M 0 16 H 800"
                stroke="#16F28A"
                strokeWidth="1"
                strokeLinecap="round"
                opacity="0.6"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          03 — NÚMEROS
      ══════════════════════════════════════════════ */}
      <section className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20">
        <div className="dotgrid-bg scroll-reveal overflow-hidden rounded-[2.2rem] border border-[rgba(233,235,223,0.07)] bg-[rgba(0,0,0,0.4)] p-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_32px_100px_rgba(0,0,0,0.4)]">
          <p className="section-label mb-6 text-[#00E07A]/60">03 │ Números</p>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { value: "R$2M+", label: "Já processado na plataforma", delay: "reveal-delay-1" },
              { value: "100%", label: "Histórico e comprovante em cada pagamento", delay: "reveal-delay-2" },
              { value: "24h", label: "SLA máximo por operação garantido", delay: "reveal-delay-3" },
            ].map((stat) => (
              <div className={`scroll-reveal ${stat.delay}`} key={stat.value}>
                <p
                  className="text-shimmer font-black"
                  style={{ fontSize: "clamp(2.4rem,5vw,3.8rem)", lineHeight: 1, letterSpacing: "-0.05em" }}
                >
                  {stat.value}
                </p>
                <p className="mt-3 text-sm leading-6 text-[#5f6059]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          04 — FEATURES BENTO
      ══════════════════════════════════════════════ */}
      <section className="loki-frame relative z-10 mx-auto w-full max-w-7xl px-6 py-20">
        <div className="scroll-reveal">
          <p className="section-label text-[#00E07A]/60">04 │ Funcionalidades</p>
          <h2
            className="mt-4 font-black text-[#e9ebdf]"
            style={{ fontSize: "clamp(1.9rem,4.5vw,3.2rem)", lineHeight: 1.05, letterSpacing: "-0.04em" }}
          >
            Tudo o que precisas. Nada do que não.
          </h2>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: <IconChart />,
              title: "Painel em tempo real",
              body: "Acompanhas contas enviadas, status, ganhos acumulados e indicações numa única vista.",
              delay: "reveal-delay-1",
            },
            {
              icon: <IconMoney />,
              title: "Ganhos por validação",
              body: "Cada conta operada com sucesso gera comissão automática, registada com histórico completo.",
              delay: "reveal-delay-2",
            },
            {
              icon: <IconUsers />,
              title: "Sistema de indicação",
              body: "Indica outros captadores e acumula bónus progressivos por cada validação do teu indicado.",
              delay: "reveal-delay-3",
            },
            {
              icon: <IconShield />,
              title: "Credenciais protegidas",
              body: "Palavras-passe e dados sensíveis cifrados no servidor. Nunca expostos ao cliente.",
              delay: "reveal-delay-4",
            },
            {
              icon: <IconClock />,
              title: "SLA garantido",
              body: "Contas têm prazo máximo de operação. Se o SLA expirar, a conta é redistribuída automaticamente.",
              delay: "reveal-delay-5",
            },
            {
              icon: <IconMobile />,
              title: "Mobile-first",
              body: "Interface desenhada para celular do zero. Rápida, responsiva, sem fricção.",
              delay: "reveal-delay-6",
            },
          ].map((feat) => (
            <GlowCard
              className={`card-glass card-hover scroll-reveal ${feat.delay} relative flex flex-col gap-4 overflow-hidden rounded-[1.8rem] p-6`}
              key={feat.title}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(233,235,223,0.10)] bg-[rgba(255,255,255,0.04)] text-[#16F28A]">
                {feat.icon}
              </span>
              <div>
                <h3 className="text-base font-black tracking-tight text-[#e9ebdf]">{feat.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5f6059]">{feat.body}</p>
              </div>
              <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-[#00E07A]/[0.04] blur-2xl" />
            </GlowCard>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          05 — CTA FINAL
      ══════════════════════════════════════════════ */}
      <section className="relative z-10 mx-auto w-full max-w-7xl px-6 py-24">
        <div className="scroll-reveal overflow-hidden rounded-[2.4rem] border border-[#00E07A]/15 bg-[linear-gradient(135deg,rgba(0,224,122,0.10),rgba(255,255,255,0.025))] p-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_40px_120px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-16">
          {/* Dotgrid overlay */}
          <div className="dotgrid-bg pointer-events-none absolute inset-0 opacity-50" />
          {/* Crosshairs */}
          <span className="pointer-events-none absolute left-4 top-4 font-mono text-sm text-[#00E07A]/20">+</span>
          <span className="pointer-events-none absolute right-4 top-4 font-mono text-sm text-[#00E07A]/20">+</span>
          <span className="pointer-events-none absolute bottom-4 left-4 font-mono text-sm text-[#00E07A]/20">+</span>
          <span className="pointer-events-none absolute bottom-4 right-4 font-mono text-sm text-[#00E07A]/20">+</span>

          <p className="section-label relative mb-5 text-[#00E07A]/60">05 │ Começa hoje</p>

          <h2
            className="relative font-black text-[#e9ebdf]"
            style={{ fontSize: "clamp(2.2rem,5.5vw,4rem)", lineHeight: 1.0, letterSpacing: "-0.05em" }}
          >
            Pronto para{" "}
            <span className="text-shimmer">escalar</span>
            {" "}as tuas captações?
          </h2>
          <p className="relative mx-auto mt-5 max-w-lg text-base leading-7 text-[#5f6059]">
            Cria a tua conta gratuitamente e começa a registar contas, acompanhar ganhos e receber pagamentos organizados.
          </p>

          <div className="relative mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              className="inline-flex min-h-[3.25rem] items-center justify-center rounded-2xl bg-[#00E07A] px-9 text-sm font-black uppercase tracking-[0.12em] text-[#0a1a0f] shadow-[0_0_50px_rgba(0,224,122,0.32)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#16F28A] hover:shadow-[0_0_70px_rgba(0,224,122,0.45)]"
              style={{ transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)" }}
              href={registerHref}
            >
              Criar conta grátis
            </Link>
            <Link
              className="inline-flex min-h-[3.25rem] items-center justify-center rounded-2xl border border-[rgba(233,235,223,0.12)] bg-[rgba(255,255,255,0.04)] px-9 text-sm font-black uppercase tracking-[0.12em] text-[#cbccc4] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[rgba(255,255,255,0.08)]"
              style={{ transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)" }}
              href="/login"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════ */}
      <footer className="relative z-10 border-t border-[rgba(233,235,223,0.07)] px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
          <BrandLogo variant="compact" />
          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs font-semibold text-[#3f403d]">
            {[
              { href: "/como-funciona", label: "Como funciona" },
              { href: "/ganhos", label: "Ganhos" },
              { href: "/indicacoes", label: "Indicações" },
              { href: "/faq", label: "FAQ" },
              { href: "/login", label: "Entrar" },
            ].map((item) => (
              <Link
                className="transition-colors hover:text-[#cbccc4]"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <p className="text-xs text-[#2e2f2d]">
            © {new Date().getFullYear()} LeadPayX
          </p>
        </div>
      </footer>
    </main>
  );
}

/* ── Componentes utilitários internos ── */

function MockMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-[rgba(233,235,223,0.07)] bg-[rgba(255,255,255,0.04)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <p className="section-label text-[#3f403d]">{label}</p>
      <p className="mt-2 font-black text-[#e9ebdf]" style={{ fontSize: "1.5rem", letterSpacing: "-0.04em" }}>
        {value}
      </p>
    </div>
  );
}

/* ── SVG Icons (Lucide-style, outline stroke-width 1.5) ── */

function IconSend({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}
function IconQueue({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}
function IconOperator({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function IconPix({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
    </svg>
  );
}
function IconChart({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
function IconMoney({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}
function IconUsers({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
function IconShield({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconClock({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function IconMobile({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}
function IconWhatsApp({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

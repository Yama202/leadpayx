import Link from "next/link";

import { PublicHeader, TrustPaymentBlock } from "@/components/public/institutional-page";
import type { RegisterLinkSearchInput } from "@/lib/register-href";
import { buildRegisterHref } from "@/lib/register-href";
import { getWhatsappGroupUrl } from "@/lib/settings";

const trustChips = [
  "Painel em tempo real",
  "Ganhos por validação",
  "Sistema de indicação",
  "Pagamentos organizados",
  "Mobile-first",
];

const floatingCards = [
  { label: "+ R$30 gerado", className: "left-0 top-20 -translate-x-3 sm:-translate-x-10" },
  { label: "2 contas validadas", className: "right-0 top-32 translate-x-3 sm:translate-x-8" },
  {
    label: "Bônus de indicação liberado",
    className: "bottom-24 left-2 sm:-translate-x-8",
  },
  { label: "Pagamento processado", className: "bottom-8 right-2 sm:translate-x-8" },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<RegisterLinkSearchInput>;
}) {
  const params = await searchParams;
  const registerHref = buildRegisterHref(params);
  const whatsappUrl = await getWhatsappGroupUrl();

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#050706] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(0,224,122,0.20),transparent_28%),radial-gradient(circle_at_85%_18%,rgba(22,242,138,0.10),transparent_24%),linear-gradient(180deg,#050706_0%,#070909_52%,#030504_100%)]" />
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-55" />
      <div className="pointer-events-none absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-[#00E07A]/20 blur-[110px] hero-glow sm:h-[32rem] sm:w-[32rem]" />
      <div className="pointer-events-none absolute -left-24 top-1/3 h-px w-[34rem] rotate-12 bg-gradient-to-r from-transparent via-[#00E07A]/40 to-transparent blur-[0.5px]" />
      <div className="pointer-events-none absolute -right-28 top-44 h-px w-[32rem] -rotate-12 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <PublicHeader registerHref={registerHref} />

      <section className="relative z-10 mx-auto grid min-h-dvh w-full max-w-7xl items-center gap-12 px-4 pb-16 pt-28 sm:px-6 sm:pt-32 lg:grid-cols-[1.02fr_0.98fr] lg:gap-8 lg:pt-28">
        <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:text-left">
          <p className="mx-auto inline-flex max-w-full rounded-full border border-[#00E07A]/25 bg-[#00E07A]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#16F28A] shadow-[0_0_28px_rgba(0,224,122,0.14)] lg:mx-0">
            Para captadores que querem transformar indicação em operação escalável.
          </p>

          <h1 className="mt-6 text-5xl font-black leading-[0.92] tracking-[-0.07em] text-white sm:text-7xl lg:text-[5.7rem]">
            Captação inteligente para quem quer escalar.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-zinc-400 sm:text-lg lg:mx-0">
            No LeadPayX, você acompanha contas enviadas, ganhos acumulados,
            indicações e pagamentos em um painel simples, rápido e otimizado para
            celular.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link
              className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#00E07A] px-7 text-sm font-black uppercase tracking-[0.14em] text-[#031008] shadow-[0_0_46px_rgba(0,224,122,0.30)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#16F28A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16F28A]"
              href={registerHref}
            >
              Começar agora
            </Link>
            <a
              className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-7 text-sm font-black uppercase tracking-[0.14em] text-white shadow-xl shadow-black/20 transition-colors duration-200 hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              href="/como-funciona"
            >
              Ver como funciona
            </a>
            {whatsappUrl ? (
              <a
                className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-[#00E07A]/20 bg-[#00E07A]/10 px-7 text-sm font-black uppercase tracking-[0.14em] text-[#16F28A] shadow-xl shadow-black/20 transition-colors duration-200 hover:bg-[#00E07A]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00E07A]"
                href={whatsappUrl}
                rel="noreferrer"
                target="_blank"
              >
                Grupo WhatsApp
              </a>
            ) : null}
          </div>

          <div className="mx-auto mt-7 flex max-w-2xl flex-wrap justify-center gap-2 lg:mx-0 lg:justify-start">
            {trustChips.map((chip, index) => (
              <span
                className="hero-chip rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-bold text-zinc-300 backdrop-blur"
                key={chip}
                style={{ animationDelay: `${index * 90}ms` }}
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[25rem] sm:max-w-[30rem] lg:mr-0">
          <div className="pointer-events-none absolute inset-10 rounded-full bg-[#00E07A]/20 blur-[80px]" />
          <div className="hero-float relative rounded-[2.4rem] border border-white/10 bg-white/[0.045] p-3 shadow-[0_32px_110px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
            <div className="rounded-[2rem] border border-white/10 bg-[#07100C]/92 p-5">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                    Painel captador
                  </p>
                  <p className="mt-1 text-lg font-black text-white">LeadPayX</p>
                </div>
                <span className="rounded-full border border-[#00E07A]/25 bg-[#00E07A]/10 px-3 py-1 text-xs font-bold text-[#16F28A]">
                  Online
                </span>
              </div>

              <div className="rounded-[1.7rem] border border-[#00E07A]/20 bg-[linear-gradient(135deg,rgba(0,224,122,0.16),rgba(255,255,255,0.035))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
                <p className="text-sm font-semibold text-zinc-400">Saldo acumulado</p>
                <p className="mt-2 text-5xl font-black tracking-[-0.06em] text-white">
                  R$ 480
                </p>
                <p className="mt-3 text-xs font-semibold text-[#16F28A]">
                  Pagamento organizado para conferência
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <MetricCard label="Contas validadas" value="16" />
                <MetricCard label="Indicação" value="R$ 120" />
              </div>

              <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-zinc-400">Pagamento</span>
                  <span className="rounded-full bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200 ring-1 ring-amber-200/20">
                    Pendente
                  </span>
                </div>
              </div>

              <div className="mt-3 rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                  Link de indicação
                </p>
                <p className="mt-2 break-all text-sm font-bold text-zinc-200">
                  leadpayx.com.br/invite/seucodigo
                </p>
              </div>
            </div>
          </div>

          {floatingCards.map((card, index) => (
            <div
              className={`hero-float-card absolute hidden rounded-2xl border border-white/10 bg-[#08100C]/85 px-4 py-3 text-sm font-black text-white shadow-[0_18px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:block ${card.className}`}
              key={card.label}
              style={{ animationDelay: `${index * 180}ms` }}
            >
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#00E07A] shadow-[0_0_16px_rgba(0,224,122,0.8)]" />
              {card.label}
            </div>
          ))}
        </div>
      </section>
      <section className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6">
        <TrustPaymentBlock />
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.13em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">{value}</p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const SESSION_KEY = "lpx_ofertas_reminder_dismissed";

export function OfertasReminderPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem(SESSION_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={dismiss}
      />

      {/* Bottom sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Lembrete importante"
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-[2rem] border-t border-white/[0.1] bg-[#0e0f0f] px-5 pb-10 pt-6 shadow-[0_-32px_80px_rgba(0,0,0,0.7)]"
      >
        {/* Drag handle */}
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />

        {/* Icon + título */}
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00E07A]/15 text-2xl">
            🔗
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#00E07A]/70">Obrigatório</p>
            <p className="text-lg font-black leading-tight text-white">Crie a conta pelo link do app</p>
          </div>
        </div>

        {/* Corpo */}
        <p className="mt-4 text-sm leading-7 text-zinc-300">
          Para receber sua comissão, a conta na casa de apostas{" "}
          <span className="font-black text-white">precisa</span> ser criada usando o link da página{" "}
          <span className="font-black text-[#16F28A]">Ofertas</span>.
        </p>

        {/* Passo a passo */}
        <div className="mt-4 space-y-2">
          {[
            { n: "1", text: "Vá em Ofertas e abra o link da campanha" },
            { n: "2", text: "Crie a conta na casa de apostas pelo link" },
            { n: "3", text: "Volte aqui e envie a conta" },
          ].map((step) => (
            <div key={step.n} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-4 py-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00E07A] text-xs font-black text-[#031008]">
                {step.n}
              </span>
              <span className="text-sm font-semibold text-zinc-200">{step.text}</span>
            </div>
          ))}
        </div>

        <p className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-xs font-semibold leading-5 text-rose-300">
          Conta criada fora do link <span className="font-black">não é aceita</span> e não gera comissão — sem exceção.
        </p>

        {/* Botões */}
        <div className="mt-5 flex flex-col gap-3">
          <Link
            href="/captador/ofertas"
            onClick={dismiss}
            className="flex min-h-12 items-center justify-center rounded-2xl bg-[#00E07A] text-sm font-black text-[#031008] shadow-[0_0_28px_rgba(0,224,122,0.25)] transition-colors hover:bg-[#16F28A]"
          >
            Ir para Ofertas agora
          </Link>
          <button
            onClick={dismiss}
            className="min-h-11 rounded-2xl border border-white/[0.08] bg-white/[0.04] text-sm font-bold text-zinc-400 transition-colors hover:text-white"
          >
            Já sei, fechar
          </button>
        </div>
      </div>
    </>
  );
}

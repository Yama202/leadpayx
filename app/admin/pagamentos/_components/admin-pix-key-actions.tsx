"use client";

import { useCallback, useState } from "react";

import { maskPixKeyForAdmin } from "@/lib/pix-key";

export function AdminPixKeyActions({
  pixKey,
  pixQrDataUrl,
}: {
  pixKey: string | null | undefined;
  pixQrDataUrl?: string | null;
}) {
  const trimmed = pixKey?.trim() ?? "";
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    if (!trimmed) {
      return;
    }
    try {
      await navigator.clipboard.writeText(trimmed);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [trimmed]);

  if (!trimmed) {
    return (
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        Pix: —
      </p>
    );
  }

  return (
    <div className="mt-1 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        Pix:{" "}
        <span
          className={`select-all font-mono text-sm font-bold normal-case tracking-normal text-slate-800 dark:text-slate-100 ${
            revealed ? "break-all" : ""
          }`}
        >
          {revealed ? trimmed : maskPixKeyForAdmin(trimmed)}
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          aria-expanded={revealed}
          aria-label={revealed ? "Ocultar chave PIX" : "Mostrar chave PIX completa"}
          className="min-h-9 rounded-2xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 transition hover:bg-slate-50 dark:border-white/15 dark:bg-slate-800 dark:text-emerald-200 dark:hover:bg-slate-800/90"
          onClick={() => setRevealed((v) => !v)}
          type="button"
        >
          {revealed ? "Ocultar chave" : "Mostrar chave PIX"}
        </button>
        <button
          className="min-h-9 rounded-2xl border border-emerald-500/50 bg-emerald-500/15 px-3 text-xs font-bold text-emerald-800 transition hover:bg-emerald-500/25 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-100 dark:hover:bg-emerald-500/20"
          onClick={() => void copy()}
          type="button"
        >
          {copied ? "Copiado" : "Copiar PIX"}
        </button>
      </div>
      {copied ? (
        <p aria-live="polite" className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">
          Chave PIX copiada para a área de transferência.
        </p>
      ) : null}
      {pixQrDataUrl ? (
        <img
          alt="QR Code PIX"
          className="mt-2 rounded-xl border border-white/10 bg-white p-1"
          height={110}
          src={pixQrDataUrl}
          width={110}
        />
      ) : null}
    </div>
  );
}

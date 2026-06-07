"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function CaptadorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[captador/error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-center">
      <p className="text-2xl font-black text-white">Algo deu errado</p>
      <p className="max-w-xs text-sm text-white/50">
        Ocorreu um erro inesperado. Tente novamente ou volte ao início.
      </p>
      <div className="flex gap-3">
        <button
          className="rounded-2xl bg-white/10 px-5 py-2.5 text-sm font-bold text-white ring-1 ring-white/10 transition-colors hover:bg-white/15"
          onClick={reset}
          type="button"
        >
          Tentar novamente
        </button>
        <Link
          className="rounded-2xl bg-[#00E07A]/20 px-5 py-2.5 text-sm font-bold text-[#16F28A] ring-1 ring-[#00E07A]/30 transition-colors hover:bg-[#00E07A]/30"
          href="/captador/dashboard"
        >
          Ir ao início
        </Link>
      </div>
    </div>
  );
}

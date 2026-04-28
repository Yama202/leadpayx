"use client";

import { useId, useState } from "react";

import type { OperationalCredentials } from "@/lib/account-operational";

const inputClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.06] px-4 font-mono text-sm text-white outline-none";

export function OperationalCredentialsPanel({
  credentials,
}: {
  credentials: OperationalCredentials;
}) {
  const id = useId();
  const [showPassword, setShowPassword] = useState(false);

  if (!credentials.email && !credentials.password) {
    return (
      <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-3 text-xs font-semibold text-amber-100">
        Sem credenciais registradas nesta conta (registro antigo ou dado ausente).
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-[#00E07A]/20 bg-black/20 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#16F28A]">
        Acesso operacional
      </p>
      <p className="text-xs leading-5 text-zinc-400">
        Uso exclusivo no fluxo autorizado. Não copie para canais externos.
      </p>
      {credentials.email ? (
        <label className="block">
          <span className="text-xs font-bold text-zinc-300">E-mail da conta</span>
          <input className={inputClass} readOnly type="text" value={credentials.email} />
        </label>
      ) : null}
      {credentials.password ? (
        <div>
          <span className="text-xs font-bold text-zinc-300" id={`${id}-pw-label`}>
            Senha da conta
          </span>
          <div className="mt-2 flex gap-2">
            <input
              aria-labelledby={`${id}-pw-label`}
              className={`${inputClass} flex-1`}
              readOnly
              type={showPassword ? "text" : "password"}
              value={credentials.password}
            />
            <button
              className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 text-xs font-bold text-zinc-200 hover:bg-white/10"
              type="button"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </div>
      ) : credentials.email ? (
        <p className="text-xs font-semibold text-rose-200">
          Senha não pôde ser lida (verifique ACCOUNTS_CREDENTIALS_SECRET no servidor ou registro
          legado).
        </p>
      ) : null}
    </div>
  );
}

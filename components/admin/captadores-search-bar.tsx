"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";

const DEBOUNCE_MS = 320;

/**
 * Busca com debounce atualiza `?q=` no servidor (SSR).
 */
export function CaptadoresSearchBar({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const pendingHintId = useId();
  const [value, setValue] = useState(() => initialQuery);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushSearch = useCallback(
    (next: string) => {
      const trimmed = next.trim();
      const href = trimmed
        ? `/admin/captadores?q=${encodeURIComponent(trimmed)}`
        : "/admin/captadores";
      startTransition(() => {
        router.push(href);
      });
    },
    [router],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const schedulePush = useCallback(
    (next: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => pushSearch(next), DEBOUNCE_MS);
    },
    [pushSearch],
  );

  return (
    <form
      className="flex min-w-0 w-full flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (debounceRef.current) clearTimeout(debounceRef.current);
        pushSearch(value);
      }}
      role="search"
    >
      <span className="sr-only" id={pendingHintId}>
        {isPending
          ? "Atualizando resultados no servidor."
          : "Os resultados filtram por nome ou e-mail, sem diferenciar maiúsculas."}
      </span>
      <div className="min-w-0 flex-1">
        <label
          className="sr-only"
          htmlFor="captadores-busca"
        >
          Buscar captador por nome ou e-mail
        </label>
        <input
          aria-busy={isPending}
          aria-describedby={pendingHintId}
          autoComplete="off"
          className="min-h-11 w-full rounded-2xl border border-white/[0.12] bg-black/30 px-4 text-base text-white outline-none ring-[#00E07A]/0 transition-[border-color,box-shadow] duration-200 placeholder:text-zinc-500 focus:border-[#00E07A]/45 focus:ring-4 focus:ring-[#00E07A]/12"
          enterKeyHint="search"
          id="captadores-busca"
          name="q"
          onChange={(e) => {
            const v = e.target.value;
            setValue(v);
            schedulePush(v);
          }}
          placeholder="Buscar captador por nome ou e-mail"
          spellCheck={false}
          type="search"
          value={value}
        />
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          aria-describedby={isPending ? pendingHintId : undefined}
          className="inline-flex min-h-11 min-w-[5.5rem] cursor-pointer items-center justify-center rounded-2xl border border-[#00E07A]/35 bg-[#00E07A]/15 px-4 text-sm font-black text-[#16F28A] transition-colors duration-200 hover:bg-[#00E07A]/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00E07A] disabled:cursor-wait disabled:opacity-70"
          disabled={isPending}
          title={
            isPending
              ? "Aguardando a lista atualizar no servidor após a busca."
              : "Aplicar busca agora (Enter também funciona)"
          }
          type="submit"
        >
          Buscar
        </button>
        {initialQuery || value.trim() ? (
          <Link
            className="inline-flex min-h-11 min-w-[5.5rem] cursor-pointer items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] px-4 text-sm font-bold text-zinc-200 transition-colors duration-200 hover:bg-white/[0.1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00E07A]"
            href="/admin/captadores"
          >
            Limpar
          </Link>
        ) : null}
      </div>
    </form>
  );
}

"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";

import { markAllCaptadorNotificationsReadAction } from "@/lib/actions/domain";
import type { UserNotification } from "@/lib/types";
import { Button } from "@/components/ui/button";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function CaptadorNotificationsSection({
  notifications,
  compact = false,
}: {
  notifications: UserNotification[];
  compact?: boolean;
}) {
  const [optimisticNotifs, setAllRead] = useOptimistic(
    notifications,
    (state) => state.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
  );
  const [isPending, startTransition] = useTransition();
  const unread = optimisticNotifs.filter((n) => !n.read_at).length;

  if (!notifications.length) {
    return (
      <section
        className={`rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl ${compact ? "" : "mb-6"}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black text-white">Avisos</h2>
          <Link className="text-sm font-semibold text-[#16F28A] hover:underline" href="/captador/avisos">
            Ver tudo
          </Link>
        </div>
        <p className="mt-3 text-sm text-zinc-400">
          Quando o operador aprovar uma conta, você verá aqui a comissão creditada (mesmo valor do
          extrato; regra global no admin ou override do link).
        </p>
      </section>
    );
  }

  return (
    <section
      className={`rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl ${compact ? "" : "mb-6"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-black text-white">Avisos</h2>
          {unread > 0 ? (
            <span className="rounded-full bg-[#00E07A]/20 px-2.5 py-0.5 text-xs font-bold text-[#16F28A]">
              {unread} novo(s)
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {unread > 0 ? (
            <Button
              className="min-h-9 text-xs"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  setAllRead(undefined);
                  await markAllCaptadorNotificationsReadAction();
                })
              }
              type="button"
              variant="secondary"
            >
              Marcar lidos
            </Button>
          ) : null}
          <Link className="text-sm font-semibold text-[#16F28A] hover:underline" href="/captador/avisos">
            Ver tudo
          </Link>
        </div>
      </div>
      <ul className="mt-4 space-y-3">
        {(compact ? optimisticNotifs.slice(0, 4) : optimisticNotifs).map((n) => (
          <li
            className={`rounded-2xl border px-4 py-3 text-sm ${
              n.read_at
                ? "border-white/[0.06] bg-black/10 text-zinc-400"
                : "border-[#00E07A]/25 bg-[#00E07A]/[0.07] text-zinc-100"
            }`}
            key={n.id}
          >
            <p className="font-bold text-white">{n.title}</p>
            <p className="mt-1 leading-relaxed">{n.body}</p>
            {n.metadata?.balance_destination ? (
              <p className="mt-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs leading-relaxed text-zinc-200">
                <span className="font-semibold text-zinc-400">Destino do saldo:</span>{" "}
                {n.metadata.balance_destination}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-zinc-500">{formatWhen(n.created_at)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

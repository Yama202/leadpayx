"use client";

import { useEffect, useMemo, useState } from "react";

import type { AccountStatus } from "@/lib/types";

export function SlaIndicator({
  deadline,
  status,
}: {
  deadline: string | null;
  status: AccountStatus;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = useMemo(() => {
    if (!deadline || !["assigned", "in_progress"].includes(status)) {
      return null;
    }

    return new Date(deadline).getTime() - now;
  }, [deadline, now, status]);

  if (remaining === null) {
    return null;
  }

  if (remaining <= 0) {
    return (
      <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm font-bold text-rose-700 dark:bg-rose-400/10 dark:text-rose-200">
        SLA expirado. O ciclo deste grupo será redistribuído para outro operador ao atualizar esta
        página ou pelo agendamento do servidor.
      </p>
    );
  }

  const totalMinutes = Math.ceil(remaining / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const label = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;

  return (
    <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">
      SLA restante: {label}
    </p>
  );
}

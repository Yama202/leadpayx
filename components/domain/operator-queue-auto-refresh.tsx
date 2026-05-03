"use client";

import { startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";

/** Tab visível: fila atualiza com cadência estável sem picos quando o utilizador está fora da página. */
const REFRESH_INTERVAL_MS = 20 * 1000;

export function OperatorQueueAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    let timerId: number | null = null;

    const clear = () => {
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
    };

    const tick = () => {
      startTransition(() => {
        router.refresh();
      });
    };

    const startIfVisible = () => {
      clear();
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      timerId = window.setInterval(tick, REFRESH_INTERVAL_MS);
    };

    const onVisibility = () => {
      startIfVisible();
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        tick();
      }
    };

    startIfVisible();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clear();
    };
  }, [router]);

  return null;
}

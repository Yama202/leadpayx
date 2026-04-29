"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export function OperatorQueueAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setInterval(() => {
      router.refresh();
    }, FIVE_MINUTES_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [router]);

  return null;
}

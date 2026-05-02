"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type Props = {
  label?: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
};

export function ManualRouterRefreshButton({
  label = "Atualizar fila",
  pendingLabel = "Atualizando…",
  variant = "secondary",
  className = "",
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      className={className}
      disabled={isPending}
      type="button"
      variant={variant}
      onClick={() => {
        startTransition(() => {
          router.refresh();
        });
      }}
    >
      {isPending ? pendingLabel : label}
    </Button>
  );
}

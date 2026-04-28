"use client";

import type { ReactNode } from "react";

import { clearCaptadorDepositBriefAction } from "@/lib/actions/domain";
import { Button } from "@/components/ui/button";

export function ClearDepositBriefButton({
  captadorId,
  children,
}: {
  captadorId: string;
  children: ReactNode;
}) {
  return (
    <form action={clearCaptadorDepositBriefAction}>
      <input name="captadorId" type="hidden" value={captadorId} />
      <Button
        className="min-h-11 w-full"
        type="submit"
        variant="ghost"
        onClick={(e) => {
          if (!window.confirm("Remover a exigência de depósito para este captador?")) {
            e.preventDefault();
          }
        }}
      >
        {children}
      </Button>
    </form>
  );
}

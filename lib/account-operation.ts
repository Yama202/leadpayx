import type { AccountStatus } from "@/lib/types";

export function isTerminalAccountStatus(status: AccountStatus): boolean {
  return (
    status === "completed" ||
    status === "rejected" ||
    status === "rejected_no_balance" ||
    status === "rejected_no_facial"
  );
}

/** Contas que o operador ainda pode iniciar ou concluir no fluxo normal. */
export function operatorCanProgressAccount(status: AccountStatus): boolean {
  return status === "assigned" || status === "in_progress";
}

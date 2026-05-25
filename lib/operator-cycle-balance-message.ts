/** Mensagem gravada em `operator_balance_destination` quando o ciclo tem 2 contas (escolha por botão no painel). */
export function twoAccountCycleBalanceDestination(targetAccountIdentifier: string): string {
  const label = targetAccountIdentifier.trim() || "—";
  return `Saldo das duas contas deste ciclo foi para ${label}.`;
}

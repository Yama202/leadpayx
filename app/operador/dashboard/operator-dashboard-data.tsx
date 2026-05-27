import { AccountCard } from "@/components/domain/account-card";
import { OperatorWorkPanel } from "@/components/domain/operator-work-panel";
import { OperatorQueueAutoRefresh } from "@/components/domain/operator-queue-auto-refresh";
import { OperatorPickBatchForm } from "@/components/domain/operator-pick-batch-form";
import { DashboardCard, EmptyState } from "@/components/ui/cards";
import { operationalCredentialsFromAccount } from "@/lib/account-operational";
import { ACCOUNT_SELECT_WITH_SECRET } from "@/lib/account-columns";
import { accountPrintSignedUrlMap } from "@/lib/account-print-signed-url";
import { createClient } from "@/lib/supabase/server";
import type { Account, AppSetting, Profile } from "@/lib/types";

type DashboardEarning = {
  amount: number | string;
  status: string;
  type: string;
};

type CycleQueueRow = {
  captador_id: string;
  captador_name: string | null;
  pending_count: number | string;
  first_created_at: string;
};

export async function OperadorDashboardData({
  profile,
  opError,
}: {
  profile: Profile;
  opError: string | undefined;
}) {
  const supabase = await createClient();
  // Redistribui SLA expirado (ciclo completo vai para outro operador quando aplicável).
  await supabase.rpc("reassign_expired_operator_accounts");

  const [{ data: accounts }, { data: earnings }, { data: settings }, { data: cycleQueue }] =
    await Promise.all([
      supabase
        .from("accounts")
        .select(ACCOUNT_SELECT_WITH_SECRET)
        .eq("operador_id", profile.id)
        .in("status", ["assigned", "in_progress"])
        .order("assigned_at", { ascending: true })
        .returns<Account[]>(),
      supabase
        .from("earnings")
        .select("amount,status,type,created_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .returns<DashboardEarning[]>(),
      supabase
        .from("app_settings")
        .select("key,value")
        .in("key", ["operational_min_batch_size"])
        .returns<AppSetting[]>(),
      supabase.rpc("get_operator_cycle_queue_summary").returns<CycleQueueRow[]>(),
    ]);
  const opErrorMessage =
    opError === "complete"
      ? "Não foi possível finalizar a conta (prazo, permissão ou estado inválido). Atualize a página e tente novamente."
      : opError === "complete_balance"
        ? "Ao finalizar: com 2 contas escolhe a linha onde ficou o saldo; com 1 conta escreve o destino — mínimo 8 caracteres."
        : opError === "start"
          ? "Não foi possível iniciar a operação (SLA ou estado da conta). Atualize a página."
          : opError === "invalid"
            ? "Requisição inválida. Atualize a página e tente novamente."
            : null;
  const settingValues = Object.fromEntries((settings ?? []).map((setting) => [setting.key, setting.value]));
  const operatorPending =
    earnings?.filter((earning) => earning.status === "pending").reduce(
      (sum, earning) => sum + Number(earning.amount),
      0,
    ) ?? 0;
  const operatorCompleted =
    earnings?.filter((earning) => earning.type === "operator_account_completed").length ?? 0;
  const minimumBatch = Number(settingValues.operational_min_batch_size ?? 2);
  const queueRows: CycleQueueRow[] = Array.isArray(cycleQueue) ? cycleQueue : [];
  const assignedList = (accounts ?? []).slice(0, Math.max(1, minimumBatch));
  const printUrls = await accountPrintSignedUrlMap(supabase, assignedList);
  const availableCycles = queueRows.map((cycle) => ({
    captadorId: cycle.captador_id,
    count: Number(cycle.pending_count ?? 0),
    name: cycle.captador_name ?? "Captador",
  }));
  const hasCycleReady = availableCycles.some((cycle) => cycle.count >= minimumBatch);
  const canPickNext = assignedList.length === 0 && hasCycleReady;

  return (
    <>
      <OperatorQueueAutoRefresh />
      {opErrorMessage ? (
        <div
          className="mb-6 rounded-[2rem] border border-rose-400/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-100"
          role="alert"
        >
          {opErrorMessage}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-4">
        <DashboardCard label="Contas em mãos" value={String(assignedList.length)} />
        <DashboardCard label="Finalizadas" value={String(operatorCompleted)} />
        <DashboardCard label="Ganhos pendentes" value={`R$${operatorPending.toFixed(2)}`} />
        <DashboardCard hint="Atribuição com trava por ciclo para evitar sobreposição." label="Concorrência" value="Protegida" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_220px]">
        <DashboardCard
          hint="Mais de um operador pode ver os mesmos ciclos. Ao pegar lote, o ciclo é travado para evitar duplicidade."
          label="Lote operacional"
          value={`${minimumBatch} contas`}
        />
        <div className="flex flex-col gap-2">
          <OperatorPickBatchForm
            disabled={!canPickNext}
            minimumBatch={minimumBatch}
            helperText={
              !hasCycleReady
                ? "Nenhum ciclo completo disponível agora."
                : assignedList.length > 0
                  ? "Conclua ou recuse o ciclo atual antes de reservar um novo lote."
                  : null
            }
          />
        </div>
      </div>
      <section className="mt-4 rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-black text-white">Ciclos prontos para operar</p>
          <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-300">
            {availableCycles.length} ciclo(s)
          </span>
        </div>
        {availableCycles.length ? (
          <ul className="mt-3 space-y-2 text-sm text-zinc-300">
            {availableCycles.slice(0, 5).map((cycle) => (
              <li className="rounded-xl border border-white/10 bg-black/20 px-3 py-2" key={cycle.captadorId}>
                {cycle.name}: {cycle.count} conta(s) pendente(s)
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-400">
            Nenhum ciclo completo disponível agora. Se já existem 2+ contas pendentes do mesmo captador e ainda não aparece, aplique as migrations mais recentes do operador (fluxo sem rotação).
          </p>
        )}
      </section>
      <div className="mt-6 space-y-6">
        {assignedList.length ? (
          <>
            <OperatorWorkPanel accounts={assignedList} />
            <div className="grid gap-4 lg:grid-cols-2">
              {assignedList.map((account) => (
                <AccountCard
                  account={account}
                  accountPrintSignedUrl={printUrls.get(account.id) ?? null}
                  key={account.id}
                  operationalCredentials={operationalCredentialsFromAccount(account)}
                />
              ))}
            </div>
          </>
        ) : (
          <EmptyState description={`Use o botão para pegar ${minimumBatch > 1 ? `até ${minimumBatch} contas pendentes` : "uma conta pendente"}.`} title="Nenhuma conta atribuída" />
        )}
      </div>
    </>
  );
}

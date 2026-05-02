import type { PostgrestError } from "@supabase/supabase-js";

import { AccountCard } from "@/components/domain/account-card";
import { FormSubmitRefresh } from "@/components/domain/form-submit-refresh";
import { ManualRouterRefreshButton } from "@/components/domain/manual-router-refresh-button";
import { OperatorPickBatchForm } from "@/components/domain/operator-pick-batch-form";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { DashboardCard, EmptyState } from "@/components/ui/cards";
import {
  completeCycleAction,
  rejectCycleAction,
} from "@/lib/actions/domain";
import { operationalCredentialsFromAccount } from "@/lib/account-operational";
import { ACCOUNT_SELECT_CAPTADOR, ACCOUNT_SELECT_WITH_SECRET } from "@/lib/account-columns";
import { accountPrintSignedUrlMap } from "@/lib/account-print-signed-url";
import { requireRole } from "@/lib/auth";
import { publicPostgrestSelectHint } from "@/lib/postgrest-select-error";
import { createClient } from "@/lib/supabase/server";
import type { Account, AppSetting } from "@/lib/types";
import { SubmitButton } from "@/components/ui/forms";

export const dynamic = "force-dynamic";

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

export default async function OperadorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ op_error?: string }>;
}) {
  const params = await searchParams;
  const profile = await requireRole(["operator"]);
  const supabase = await createClient();
  let accounts: Account[] | null = null;
  let accountsError: PostgrestError | null = null;
  let credentialsColumnUnavailable = false;
  let cycleQueue: unknown = null;
  let cycleQueueError: PostgrestError | null = null;

  const [accountsPrimary, earningsRes, settingsRes, cycleQueueRes] = await Promise.all([
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

  if (accountsPrimary.error && (accountsPrimary.error.code === "PGRST204" || accountsPrimary.error.code === "42703")) {
    const fallback = await supabase
      .from("accounts")
      .select(ACCOUNT_SELECT_CAPTADOR)
      .eq("operador_id", profile.id)
      .in("status", ["assigned", "in_progress"])
      .order("assigned_at", { ascending: true })
      .returns<Account[]>();

    if (!fallback.error) {
      accounts = fallback.data;
      credentialsColumnUnavailable = true;
      console.warn("[operador/dashboard] fallback select usado por schema parcial", {
        message: accountsPrimary.error.message,
        code: accountsPrimary.error.code,
      });
    } else {
      accountsError = fallback.error;
      console.warn("[operador/dashboard] falha no fallback de select de contas", {
        primary: { message: accountsPrimary.error.message, code: accountsPrimary.error.code },
        fallback: { message: fallback.error.message, code: fallback.error.code },
      });
    }
  } else {
    accounts = accountsPrimary.data;
    accountsError = accountsPrimary.error;
  }

  const { data: earnings } = earningsRes;
  const { data: settings } = settingsRes;
  cycleQueue = cycleQueueRes.data;
  cycleQueueError = cycleQueueRes.error;
  const opErrorMessage =
    params.op_error === "complete"
      ? "Não foi possível finalizar a conta (prazo, permissão ou estado inválido). Atualize a página e tente novamente."
      : params.op_error === "complete_balance"
        ? "Ao finalizar, selecione para qual e-mail (conta) o saldo foi direcionado."
        : params.op_error === "reject_reason"
          ? "Para recusar o ciclo, selecione um motivo rápido ou escolha 'Outros' e descreva o motivo."
          : params.op_error === "reject"
            ? "Não foi possível recusar o ciclo. Atualize a página e tente novamente."
        : params.op_error === "start"
          ? "Não foi possível iniciar a operação (SLA ou estado da conta). Atualize a página."
          : params.op_error === "invalid"
            ? "Requisição inválida. Atualize a página e tente novamente."
            : null;
  const settingValues = Object.fromEntries(
    (settings ?? []).map((setting) => [setting.key, setting.value]),
  );
  const operatorPending =
    earnings
      ?.filter((earning) => earning.status === "pending")
      .reduce((sum, earning) => sum + Number(earning.amount), 0) ?? 0;
  const operatorCompleted =
    earnings?.filter((earning) => earning.type === "operator_account_completed").length ?? 0;
  const minimumBatch = Number(settingValues.operational_min_batch_size ?? 2);
  const queueRows: CycleQueueRow[] = Array.isArray(cycleQueue) ? (cycleQueue as CycleQueueRow[]) : [];
  const assignedList = accounts ?? [];
  const operationalBatchAccounts = assignedList.slice(0, minimumBatch);
  const overflowAssignedCount = Math.max(assignedList.length - operationalBatchAccounts.length, 0);
  const destinationOptions = Array.from(
    new Set(
      operationalBatchAccounts
        .map((account) => account.lead_account_email?.trim().toLowerCase())
        .filter((email): email is string => Boolean(email)),
    ),
  );
  const printUrls = await accountPrintSignedUrlMap(supabase, assignedList);
  const availableCycles = queueRows.map((cycle) => ({
    captadorId: cycle.captador_id,
    count: Number(cycle.pending_count ?? 0),
    name: cycle.captador_name ?? "Captador",
  }));

  return (
    <RoleBasedLayout
      description="Pegue lote, processe e finalize contas."
      profile={profile}
      title="Fila do operador"
    >
      {accountsError ? (
        <div
          className="mb-6 rounded-[2rem] border border-rose-400/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-100"
          role="alert"
        >
          Não foi possível carregar contas atribuídas ({accountsError.code ?? "erro"}).{" "}
          {publicPostgrestSelectHint(accountsError) ?? "Verifique migrations no banco."}
        </div>
      ) : null}
      {credentialsColumnUnavailable ? (
        <div className="mb-6 rounded-[2rem] border border-amber-400/25 bg-amber-500/10 p-4 text-sm font-semibold text-amber-100">
          Contas carregadas sem coluna cifrada de senha (schema parcial). Aplique as migrations
          pendentes para leitura completa operacional.
        </div>
      ) : null}
      {cycleQueueError ? (
        <div className="mb-6 rounded-[2rem] border border-amber-400/25 bg-amber-500/10 p-4 text-sm font-semibold text-amber-100">
          Fila de ciclos indisponível ({cycleQueueError.code ?? "erro"}). Isso indica função RPC
          desatualizada no banco.
        </div>
      ) : null}
      {opErrorMessage ? (
        <div
          className="mb-6 rounded-[2rem] border border-rose-400/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-100"
          role="alert"
        >
          {opErrorMessage}
        </div>
      ) : null}
      {overflowAssignedCount > 0 ? (
        <div className="mb-6 rounded-[2rem] border border-amber-400/25 bg-amber-500/10 p-4 text-sm font-semibold text-amber-100">
          Há {overflowAssignedCount} conta(s) extra atribuída(s) fora do lote operacional. A interface
          está mostrando somente o lote de {minimumBatch} conta(s) para manter o fluxo correto.
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-4">
        <DashboardCard label="Contas em mãos" value={String(operationalBatchAccounts.length)} />
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
        <OperatorPickBatchForm disabled={operationalBatchAccounts.length > 0} minimumBatch={minimumBatch} />
      </div>
      <section className="mt-4 rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-black text-white">Ciclos prontos para operar</p>
          <div className="flex flex-wrap items-center gap-2">
            <ManualRouterRefreshButton
              className="min-h-9 px-3 py-2 text-xs font-bold sm:min-h-10 sm:px-4 sm:text-sm"
              label="Atualizar fila"
              variant="secondary"
            />
            <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-300">
              {availableCycles.length} ciclo(s)
            </span>
          </div>
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
            Nenhum ciclo completo disponível agora. Se já existem 2+ contas pendentes do mesmo
            captador e ainda não aparece, aplique as migrations mais recentes do operador (fluxo
            sem rotação).
          </p>
        )}
      </section>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {operationalBatchAccounts.length ? (
          operationalBatchAccounts.map((account) => (
            <AccountCard
              account={account}
              accountPrintSignedUrl={printUrls.get(account.id) ?? null}
              key={account.id}
              operationalCredentials={operationalCredentialsFromAccount(account)}
              operatorStartEnabled={false}
              operatorCompletionEnabled={false}
              operatorDestinationOptions={destinationOptions}
              operatorActions
            />
          ))
        ) : (
          <EmptyState
            description="Use o botão para pegar um lote de até duas contas pendentes."
            title="Nenhuma conta atribuída"
          />
        )}
      </div>
      {operationalBatchAccounts.length ? (
        <section className="mt-6 rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <p className="text-sm font-black text-white">Finalização do ciclo</p>
          <p className="mt-1 text-sm text-zinc-400">
            Finalize o lote inteiro de {operationalBatchAccounts.length} conta(s) com um único destino de saldo.
          </p>
          <form action={completeCycleAction} className="mt-4 space-y-3">
            <FormSubmitRefresh />
            <input
              name="accountIdsCsv"
              type="hidden"
              value={operationalBatchAccounts.map((account) => account.id).join(",")}
            />
            <label className="block">
              <span className="text-sm font-bold text-zinc-200">Para onde foi o saldo?</span>
              <select
                className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-base text-white outline-none transition-colors duration-200 focus:border-[#00E07A] focus:ring-4 focus:ring-[#00E07A]/10"
                defaultValue=""
                name="balanceDestination"
                required
              >
                <option className="bg-slate-900 text-zinc-200" disabled value="">
                  Selecione a conta (e-mail)
                </option>
                {destinationOptions.map((email) => (
                  <option className="bg-slate-900 text-zinc-100" key={email} value={email}>
                    {email}
                  </option>
                ))}
              </select>
            </label>
            <SubmitButton>Finalizar ciclo completo</SubmitButton>
          </form>
          <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-500/5 p-4">
            <p className="text-sm font-black text-rose-100">Recusar ciclo completo</p>
            <p className="mt-1 text-sm text-zinc-400">
              Você pode escolher um motivo rápido. Se for outro cenário, selecione &quot;Outros&quot; e descreva.
            </p>
            <form action={rejectCycleAction} className="mt-4 space-y-3">
              <FormSubmitRefresh />
              <input
                name="accountIdsCsv"
                type="hidden"
                value={operationalBatchAccounts.map((account) => account.id).join(",")}
              />
              <label className="block">
                <span className="text-sm font-bold text-zinc-200">Motivo da recusa</span>
                <select
                  className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-base text-white outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-400/20"
                  defaultValue="conta_sem_saldo"
                  name="reasonOption"
                  required
                >
                  <option className="bg-slate-900 text-zinc-100" value="conta_sem_saldo">
                    Conta sem saldo
                  </option>
                  <option className="bg-slate-900 text-zinc-100" value="conta_nao_e_nova">
                    Conta não é nova
                  </option>
                  <option className="bg-slate-900 text-zinc-100" value="outros">
                    Outros (descrever)
                  </option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-bold text-zinc-200">
                  Outros — descreva o motivo (somente se escolher &quot;Outros&quot;)
                </span>
                <textarea
                  className="mt-2 min-h-24 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-base text-white outline-none placeholder:text-zinc-500 focus:border-rose-400 focus:ring-4 focus:ring-rose-400/20"
                  name="reasonOther"
                  placeholder="Ex.: conta bloqueada, CPF divergente, etc."
                />
              </label>
              <SubmitButton>Recusar ciclo completo</SubmitButton>
            </form>
          </div>
        </section>
      ) : null}
    </RoleBasedLayout>
  );
}

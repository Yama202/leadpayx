import { ProfileAdminCard } from "@/components/admin/profile-admin-card";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { DashboardCard, EmptyState, StatusBadge } from "@/components/ui/cards";
import { requireRole } from "@/lib/auth";
import { ACCOUNT_SELECT_CAPTADOR } from "@/lib/account-columns";
import { accountStatusLabel } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Account, AccountStatus, AppSetting, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

const statusOptions: AccountStatus[] = [
  "pending",
  "assigned",
  "completed",
  "rejected",
];

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("pt-BR") : "-";
}

export default async function AdminOperadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ operator?: string; status?: string }>;
}) {
  const profile = await requireRole(["admin"]);
  const supabase = await createClient();
  const params = await searchParams;
  const selectedOperator = params.operator ?? "";
  const selectedStatus = statusOptions.includes(params.status as AccountStatus)
    ? (params.status as AccountStatus)
    : "";
  const [{ data: operadores }, { data: accounts }, { data: settings }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "operator")
      .order("created_at", { ascending: false })
      .returns<Profile[]>(),
    supabase
      .from("accounts")
      .select(ACCOUNT_SELECT_CAPTADOR)
      .order("updated_at", { ascending: false })
      .limit(250)
      .returns<Account[]>(),
    supabase
      .from("app_settings")
      .select("key,value")
      .eq("key", "operator_min_completed_accounts")
      .returns<AppSetting[]>(),
  ]);
  const minimumCompleted = Number(settings?.[0]?.value ?? 0);
  const operatorRows = operadores ?? [];
  const accountRows = accounts ?? [];
  const filteredAccounts = accountRows.filter((account) => {
    const belongsToOperator =
      !selectedOperator ||
      account.operador_id === selectedOperator ||
      account.last_operator_id === selectedOperator;
    const matchesStatus = !selectedStatus || account.status === selectedStatus;

    return belongsToOperator && matchesStatus && (account.operador_id || account.last_operator_id);
  });

  return (
    <RoleBasedLayout
      description="Filas, elegibilidade e contas por operador. Comissão por conta é global para todos os operadores."
      profile={profile}
      title="Operadores"
    >
      <div className="mb-5 rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        Para criar operador sem service role no app, cadastre o usuário em
        `/register` e promova o perfil para operador aqui. Isso evita secrets no
        runtime do frontend.
      </div>
      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        {operatorRows.map((operator) => {
          const operatorAccounts = accountRows.filter(
            (account) =>
              account.operador_id === operator.id || account.last_operator_id === operator.id,
          );
          const countByStatus = (status: AccountStatus) =>
            operatorAccounts.filter((account) => account.status === status).length;
          const isEligible = countByStatus("completed") >= minimumCompleted;

          return (
            <article
              className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80"
              key={operator.id}
            >
              <p className="text-lg font-black text-slate-950 dark:text-white">
                {operator.name ?? operator.email}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {operator.email}
              </p>
              <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                isEligible
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200"
              }`}>
                {isEligible ? "Apto para distribuição" : `Pendente: mínimo ${minimumCompleted} concluídas`}
              </span>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <DashboardCard label="Atribuídas" value={String(countByStatus("assigned"))} />
                <DashboardCard label="Concluídas" value={String(countByStatus("completed"))} />
                <DashboardCard label="Recusadas" value={String(countByStatus("rejected"))} />
                <DashboardCard label="Pendentes" value={String(countByStatus("pending"))} />
              </div>
            </article>
          );
        })}
      </div>

      <form className="mb-5 grid gap-3 rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80 sm:grid-cols-[1fr_1fr_140px]">
        <select
          className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
          defaultValue={selectedOperator}
          name="operator"
        >
          <option value="">Todos os operadores</option>
          {operatorRows.map((operator) => (
            <option key={operator.id} value={operator.id}>
              {operator.name ?? operator.email}
            </option>
          ))}
        </select>
        <select
          className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
          defaultValue={selectedStatus}
          name="status"
        >
          <option value="">Todos os status</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {accountStatusLabel[status]}
            </option>
          ))}
        </select>
        <button className="min-h-12 rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white dark:bg-emerald-400 dark:text-emerald-950">
          Filtrar
        </button>
      </form>

      <section className="mb-6 rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80">
        <h2 className="text-xl font-black text-slate-950 dark:text-white">
          Contas atuais dos operadores
        </h2>
        {filteredAccounts.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-3">Conta</th>
                  <th>Operador</th>
                  <th>Status</th>
                  <th>Atribuída</th>
                  <th>Iniciada</th>
                  <th>Concluída</th>
                  <th>Recusada</th>
                  <th>SLA/Reatribuição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {filteredAccounts.map((account) => {
                  const operator = operatorRows.find(
                    (item) => item.id === account.operador_id,
                  );

                  return (
                    <tr key={account.id}>
                      <td className="py-3 font-bold text-slate-950 dark:text-white">
                        {account.account_identifier}
                      </td>
                      <td className="text-slate-500 dark:text-slate-400">
                        {operator?.name ?? operator?.email ?? "-"}
                      </td>
                      <td>
                        <StatusBadge status={account.status} />
                      </td>
                      <td className="text-slate-500 dark:text-slate-400">
                        {formatDate(account.assigned_at)}
                      </td>
                      <td className="text-slate-500 dark:text-slate-400">
                        {formatDate(account.started_at ?? account.operation_started_at)}
                      </td>
                      <td className="text-slate-500 dark:text-slate-400">
                        {formatDate(account.completed_at)}
                      </td>
                      <td className="text-slate-500 dark:text-slate-400">
                        {formatDate(account.rejected_at)}
                      </td>
                      <td className="text-slate-500 dark:text-slate-400">
                        {account.reassigned_at
                          ? `${account.reassign_reason ?? "SLA"} em ${formatDate(account.reassigned_at)}`
                          : formatDate(account.operation_deadline_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            description="Ajuste os filtros ou aguarde novas atribuições operacionais."
            title="Nenhuma conta de operador"
          />
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {operatorRows.map((item) => <ProfileAdminCard key={item.id} profile={item} />)}
      </div>
    </RoleBasedLayout>
  );
}

import { AccountCard } from "@/components/domain/account-card";
import { OperatorPickBatchForm } from "@/components/domain/operator-pick-batch-form";
import { PromotionOfferGrid } from "@/components/domain/promotion-offer-grid";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { LinkButton } from "@/components/ui/button";
import { DashboardCard, EmptyState } from "@/components/ui/cards";
import {
  rejectAccountFormAction,
} from "@/lib/actions/domain";
import { operationalCredentialsFromAccount } from "@/lib/account-operational";
import { ACCOUNT_SELECT_WITH_SECRET } from "@/lib/account-columns";
import { requireRole } from "@/lib/auth";
import { fetchActivePromotionOffers } from "@/lib/queries/promotion-offers";
import { getWhatsappGroupUrl } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import type { Account, AppSetting } from "@/lib/types";
import { Field, SubmitButton } from "@/components/ui/forms";

export const dynamic = "force-dynamic";

type DashboardEarning = {
  amount: number | string;
  status: string;
  type: string;
};

export default async function OperadorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ op_error?: string }>;
}) {
  const params = await searchParams;
  const profile = await requireRole(["operator"]);
  const supabase = await createClient();
  const [
    { data: accounts },
    { data: earnings },
    { data: settings },
    { data: eligible },
    whatsappUrl,
    promotionOffers,
  ] = await Promise.all([
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
      .in("key", ["operator_min_completed_accounts", "operational_min_batch_size"])
      .returns<AppSetting[]>(),
    supabase.rpc("is_operator_eligible", { target_operator_id: profile.id }),
    getWhatsappGroupUrl(),
    fetchActivePromotionOffers(),
  ]);
  const promotionPreview = promotionOffers.slice(0, 2);
  const opErrorMessage =
    params.op_error === "complete"
      ? "Não foi possível finalizar a conta (prazo, permissão ou estado inválido). Atualize a página e tente novamente."
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
  const minimumCompleted = Number(settingValues.operator_min_completed_accounts ?? 0);
  const minimumBatch = Number(settingValues.operational_min_batch_size ?? 2);
  const isEligible = Boolean(eligible);

  return (
    <RoleBasedLayout
      description="Pegue lote, processe e finalize contas."
      profile={profile}
      title="Fila do operador"
    >
      {opErrorMessage ? (
        <div
          className="mb-6 rounded-[2rem] border border-rose-400/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-100"
          role="alert"
        >
          {opErrorMessage}
        </div>
      ) : null}
      {promotionPreview.length ? (
        <section className="mb-6 rounded-[2rem] border border-[#EAB308]/20 bg-zinc-900/40 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.2)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-[#FDE047]">Promoções ativas</p>
              <p className="mt-1 text-xs text-zinc-400">
                Mesmas ofertas globais visíveis no app.
              </p>
            </div>
            <LinkButton className="w-full shrink-0 sm:w-auto" href="/operador/ofertas" variant="secondary">
              Ver todas
            </LinkButton>
          </div>
          <div className="mt-4">
            <PromotionOfferGrid offers={promotionPreview} variant="operator" />
          </div>
        </section>
      ) : null}
      {whatsappUrl ? (
        <section className="mb-6 rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <p className="text-sm font-black text-white">Canal oficial</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#A1A1AA]">
            Use o grupo para comunicados gerais. Contas atribuídas, status e recusas continuam exclusivamente no painel.
          </p>
          <LinkButton className="mt-4 w-full sm:w-auto" href={whatsappUrl} target="_blank" rel="noreferrer" variant="secondary">
            Entrar no grupo WhatsApp
          </LinkButton>
        </section>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-4">
        <DashboardCard label="Contas em mãos" value={String(accounts?.length ?? 0)} />
        <DashboardCard label="Finalizadas" value={String(operatorCompleted)} />
        <DashboardCard label="Ganhos pendentes" value={`R$${operatorPending.toFixed(2)}`} />
        <DashboardCard
          hint={`Critério atual: ${minimumCompleted} conta(s) concluída(s).`}
          label="Aptidão operacional"
          value={isEligible ? "Apto" : "Pendente"}
        />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_220px]">
        <DashboardCard
          hint="Ações críticas respeitam o mínimo configurado pela administração."
          label="Lote operacional"
          value={`${minimumBatch} contas`}
        />
        <OperatorPickBatchForm disabled={!isEligible} minimumBatch={minimumBatch} />
      </div>
      {!isEligible ? (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
          Seu operador ainda não está apto para receber novos lotes. A aptidão é liberada automaticamente quando os critérios administrativos forem cumpridos.
        </p>
      ) : null}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {accounts?.length ? (
          accounts.map((account) => (
            <AccountCard
              account={account}
              key={account.id}
              operationalCredentials={operationalCredentialsFromAccount(account)}
              operatorActions
            >
              <form action={rejectAccountFormAction} className="space-y-5">
                <input name="accountId" type="hidden" value={account.id} />
                <Field
                  label="Motivo da recusa"
                  name="reason"
                  placeholder="Descreva o motivo obrigatório"
                />
                <SubmitButton>Recusar conta</SubmitButton>
              </form>
            </AccountCard>
          ))
        ) : (
          <EmptyState
            description="Use o botão para pegar até duas contas pendentes."
            title="Nenhuma conta atribuída"
          />
        )}
      </div>
    </RoleBasedLayout>
  );
}

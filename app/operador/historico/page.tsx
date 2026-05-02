import type { PostgrestError } from "@supabase/supabase-js";

import { AccountCard } from "@/components/domain/account-card";
import { ManualRouterRefreshButton } from "@/components/domain/manual-router-refresh-button";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { EmptyState } from "@/components/ui/cards";
import { operationalCredentialsFromAccount } from "@/lib/account-operational";
import { ACCOUNT_SELECT_CAPTADOR, ACCOUNT_SELECT_WITH_SECRET } from "@/lib/account-columns";
import { accountPrintSignedUrlMap } from "@/lib/account-print-signed-url";
import { requireRole } from "@/lib/auth";
import { publicPostgrestSelectHint } from "@/lib/postgrest-select-error";
import { createClient } from "@/lib/supabase/server";
import type { Account } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OperadorHistoricoPage() {
  const profile = await requireRole(["operator"]);
  const supabase = await createClient();
  let accounts: Account[] | null = null;
  let accountsError: PostgrestError | null = null;
  let credentialsColumnUnavailable = false;

  const primary = await supabase
    .from("accounts")
    .select(ACCOUNT_SELECT_WITH_SECRET)
    .eq("operador_id", profile.id)
    .in("status", ["completed", "rejected"])
    .order("updated_at", { ascending: false })
    .returns<Account[]>();

  if (primary.error && (primary.error.code === "PGRST204" || primary.error.code === "42703")) {
    const fallback = await supabase
      .from("accounts")
      .select(ACCOUNT_SELECT_CAPTADOR)
      .eq("operador_id", profile.id)
      .in("status", ["completed", "rejected"])
      .order("updated_at", { ascending: false })
      .returns<Account[]>();

    if (!fallback.error) {
      accounts = fallback.data;
      credentialsColumnUnavailable = true;
    } else {
      accountsError = fallback.error;
    }
  } else {
    accounts = primary.data;
    accountsError = primary.error;
  }

  const list = accounts ?? [];
  const printUrls = await accountPrintSignedUrlMap(supabase, list);

  return (
    <RoleBasedLayout
      description="Histórico operacional sem acesso a Pix ou ganhos do captador."
      profile={profile}
      title="Histórico"
    >
      <div className="mb-4 flex justify-end">
        <ManualRouterRefreshButton label="Atualizar histórico" variant="ghost" />
      </div>
      {accountsError ? (
        <p className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100">
          Não foi possível carregar o histórico ({accountsError.code ?? "erro"}).{" "}
          {publicPostgrestSelectHint(accountsError) ?? "Verifique migrations no banco."}
        </p>
      ) : null}
      {credentialsColumnUnavailable ? (
        <p className="mb-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100">
          Histórico carregado com fallback de schema parcial. Credenciais podem não estar
          disponíveis até aplicar migrations pendentes.
        </p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {list.length ? (
          list.map((account) => (
            <AccountCard
              account={account}
              accountPrintSignedUrl={printUrls.get(account.id) ?? null}
              key={account.id}
              operationalCredentials={operationalCredentialsFromAccount(account)}
            />
          ))
        ) : (
          <EmptyState description="Finalizações e recusas aparecerão aqui." title="Sem histórico" />
        )}
      </div>
    </RoleBasedLayout>
  );
}

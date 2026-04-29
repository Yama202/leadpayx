import { AccountCard } from "@/components/domain/account-card";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { EmptyState } from "@/components/ui/cards";
import { operationalCredentialsFromAccount } from "@/lib/account-operational";
import { ACCOUNT_SELECT_WITH_SECRET } from "@/lib/account-columns";
import { accountPrintSignedUrlMap } from "@/lib/account-print-signed-url";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Account } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminContasPage() {
  const profile = await requireRole(["admin"]);
  const supabase = await createClient();
  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select(ACCOUNT_SELECT_WITH_SECRET)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<Account[]>();

  if (accountsError) {
    console.error("[admin/contas] accounts select", {
      message: accountsError.message,
      code: accountsError.code,
      details: accountsError.details,
    });
  }

  const list = accounts ?? [];
  const printUrls = await accountPrintSignedUrlMap(supabase, list);

  return (
    <RoleBasedLayout
      description="Auditoria das contas operacionais autorizadas."
      profile={profile}
      title="Contas"
    >
      {accountsError ? (
        <p className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100">
          Não foi possível carregar a lista de contas ({accountsError.code ?? "erro"}). Verifique o log do servidor.
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
          <EmptyState description="As contas enviadas aparecerão aqui." title="Sem contas" />
        )}
      </div>
    </RoleBasedLayout>
  );
}

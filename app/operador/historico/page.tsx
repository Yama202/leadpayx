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

export default async function OperadorHistoricoPage() {
  const profile = await requireRole(["operator"]);
  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("accounts")
    .select(ACCOUNT_SELECT_WITH_SECRET)
    .eq("operador_id", profile.id)
    .in("status", ["completed", "rejected", "rejected_no_balance", "rejected_no_facial"])
    .order("updated_at", { ascending: false })
    .returns<Account[]>();

  const list = accounts ?? [];
  const printUrls = await accountPrintSignedUrlMap(supabase, list);

  return (
    <RoleBasedLayout
      description="Histórico operacional sem acesso a Pix ou ganhos do captador."
      profile={profile}
      title="Histórico"
    >
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

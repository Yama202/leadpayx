import { AccountCard } from "@/components/domain/account-card";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { EmptyState } from "@/components/ui/cards";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Account } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminContasPage() {
  const profile = await requireRole(["admin"]);
  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<Account[]>();

  return (
    <RoleBasedLayout
      description="Auditoria das contas operacionais autorizadas."
      profile={profile}
      title="Contas"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {accounts?.length ? (
          accounts.map((account) => <AccountCard account={account} key={account.id} />)
        ) : (
          <EmptyState description="As contas enviadas aparecerão aqui." title="Sem contas" />
        )}
      </div>
    </RoleBasedLayout>
  );
}

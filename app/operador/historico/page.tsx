import { AccountCard } from "@/components/domain/account-card";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { EmptyState } from "@/components/ui/cards";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Account } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OperadorHistoricoPage() {
  const profile = await requireRole(["operator"]);
  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("operador_id", profile.id)
    .in("status", ["completed", "rejected"])
    .order("updated_at", { ascending: false })
    .returns<Account[]>();

  return (
    <RoleBasedLayout
      description="Histórico operacional sem acesso a Pix ou ganhos do captador."
      profile={profile}
      title="Histórico"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {accounts?.length ? (
          accounts.map((account) => <AccountCard account={account} key={account.id} />)
        ) : (
          <EmptyState description="Finalizações e recusas aparecerão aqui." title="Sem histórico" />
        )}
      </div>
    </RoleBasedLayout>
  );
}

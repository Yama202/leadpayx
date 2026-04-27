import { AccountCard } from "@/components/domain/account-card";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { EmptyState } from "@/components/ui/cards";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Account } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MinhasContasPage() {
  const profile = await requireRole(["captador"]);
  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("captador_id", profile.id)
    .order("created_at", { ascending: false })
    .returns<Account[]>();

  return (
    <RoleBasedLayout
      description="Histórico das contas enviadas por você, sem exposição de dados de outros captadores."
      profile={profile}
      title="Minhas contas"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {accounts?.length ? (
          accounts.map((account) => <AccountCard account={account} key={account.id} />)
        ) : (
          <EmptyState
            description="Quando você enviar contas autorizadas, elas aparecerão aqui."
            title="Sem contas ainda"
          />
        )}
      </div>
    </RoleBasedLayout>
  );
}

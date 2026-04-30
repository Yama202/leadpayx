import { AccountCard } from "@/components/domain/account-card";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { EmptyState } from "@/components/ui/cards";
import { requireRole } from "@/lib/auth";
import { ACCOUNT_SELECT_CAPTADOR, ACCOUNT_SELECT_CAPTADOR_FALLBACK } from "@/lib/account-columns";
import { createClient } from "@/lib/supabase/server";
import type { Account } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MinhasContasPage() {
  const profile = await requireRole(["captador"]);
  const supabase = await createClient();
  const primary = await supabase
    .from("accounts")
    .select(ACCOUNT_SELECT_CAPTADOR)
    .eq("captador_id", profile.id)
    .order("created_at", { ascending: false })
    .returns<Account[]>();
  let accounts = primary.data;

  if (primary.error && (primary.error.code === "PGRST204" || primary.error.code === "42703")) {
    const fallback = await supabase
      .from("accounts")
      .select(ACCOUNT_SELECT_CAPTADOR_FALLBACK)
      .eq("captador_id", profile.id)
      .order("created_at", { ascending: false })
      .returns<Account[]>();

    if (!fallback.error) {
      accounts = fallback.data;
      console.warn("[captador/minhas-contas] fallback select usado por schema parcial", {
        message: primary.error.message,
        code: primary.error.code,
      });
    } else {
      console.error("[captador/minhas-contas] falha no select de contas", {
        primary: { message: primary.error.message, code: primary.error.code },
        fallback: { message: fallback.error.message, code: fallback.error.code },
      });
    }
  } else if (primary.error) {
    console.error("[captador/minhas-contas] falha no select de contas", {
      message: primary.error.message,
      code: primary.error.code,
    });
  }

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

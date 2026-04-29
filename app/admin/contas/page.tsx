import type { PostgrestError } from "@supabase/supabase-js";

import { AccountCard } from "@/components/domain/account-card";
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

export default async function AdminContasPage() {
  const profile = await requireRole(["admin"]);
  const supabase = await createClient();

  let accounts: Account[] | null = null;
  let accountsError: PostgrestError | null = null;
  /** Schema sem coluna cifrada: lista carrega; credenciais só após migration. */
  let credentialsColumnUnavailable = false;

  const primary = await supabase
    .from("accounts")
    .select(ACCOUNT_SELECT_WITH_SECRET)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<Account[]>();

  if (primary.error?.code === "42703") {
    const fallback = await supabase
      .from("accounts")
      .select(ACCOUNT_SELECT_CAPTADOR)
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<Account[]>();

    if (fallback.error) {
      accountsError = fallback.error;
      console.error("[admin/contas] accounts select (fallback after 42703)", {
        primary: {
          message: primary.error.message,
          code: primary.error.code,
          details: primary.error.details,
          hint: primary.error.hint,
        },
        fallback: {
          message: fallback.error.message,
          code: fallback.error.code,
          details: fallback.error.details,
          hint: fallback.error.hint,
        },
        selectHintPrimary: publicPostgrestSelectHint(primary.error),
        selectHintFallback: publicPostgrestSelectHint(fallback.error),
      });
    } else {
      accounts = fallback.data;
      credentialsColumnUnavailable = true;
      console.warn("[admin/contas] accounts select: used CAPTADOR-only fallback after 42703", {
        message: primary.error.message,
        details: primary.error.details,
        hint: primary.error.hint,
      });
    }
  } else {
    accounts = primary.data;
    accountsError = primary.error;
    if (primary.error) {
      console.error("[admin/contas] accounts select", {
        message: primary.error.message,
        code: primary.error.code,
        details: primary.error.details,
        hint: primary.error.hint,
      });
    }
  }

  const list = accounts ?? [];
  const printUrls = await accountPrintSignedUrlMap(supabase, list);

  const errorBannerHint =
    accountsError != null
      ? publicPostgrestSelectHint(accountsError) ??
        (primary.error ? publicPostgrestSelectHint(primary.error) : null)
      : null;

  return (
    <RoleBasedLayout
      description="Auditoria das contas operacionais autorizadas."
      profile={profile}
      title="Contas"
    >
      {accountsError ? (
        <p className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100">
          Não foi possível carregar a lista de contas ({accountsError.code ?? "erro"}).
          {errorBannerHint ? ` ${errorBannerHint}` : null} Verifique o log do servidor.
        </p>
      ) : null}
      {credentialsColumnUnavailable ? (
        <p className="mb-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100">
          Lista carregada sem a coluna cifrada de senha no banco. Aplique a migration de credenciais do lead
          (ex.: <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">20260430230000_account_lead_credentials</code> ou{" "}
          <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">20260430330000_ensure_accounts_columns_for_select</code>
          ) para auditoria completa das credenciais.
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

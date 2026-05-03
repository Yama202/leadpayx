import type { PostgrestError } from "@supabase/supabase-js";
import QRCode from "qrcode";

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

function normalizeSearchTerm(raw?: string) {
  return raw?.trim().slice(0, 80) ?? "";
}

async function buildPixQrCodeMap(captadorPixEntries: Array<{ id: string; pix_key: string | null }>) {
  const map = new Map<string, string>();
  await Promise.all(
    captadorPixEntries.map(async (entry) => {
      const pix = entry.pix_key?.trim();
      if (!pix) {
        return;
      }
      try {
        const dataUrl = await QRCode.toDataURL(pix, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 220,
        });
        map.set(entry.id, dataUrl);
      } catch (error) {
        console.error("[admin/contas] falha ao gerar QR Pix", { captadorId: entry.id, error });
      }
    }),
  );
  return map;
}

export default async function AdminContasPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const profile = await requireRole(["admin"]);
  const supabase = await createClient();
  const params = searchParams ? await searchParams : undefined;
  const searchTerm = normalizeSearchTerm(params?.q);

  let accounts: Account[] | null = null;
  let accountsError: PostgrestError | null = null;
  /** Schema sem coluna cifrada: lista carrega; credenciais só após migration. */
  let credentialsColumnUnavailable = false;

  let primaryQuery = supabase
    .from("accounts")
    .select(ACCOUNT_SELECT_WITH_SECRET)
    .order("created_at", { ascending: false })
    .limit(100);

  if (searchTerm) {
    const like = `%${searchTerm}%`;
    primaryQuery = primaryQuery.or(
      `account_identifier.ilike.${like},lead_account_email.ilike.${like},account_notes.ilike.${like}`,
    );
  }

  const primary = await primaryQuery.returns<Account[]>();

  if (primary.error?.code === "42703") {
    let fallbackQuery = supabase
      .from("accounts")
      .select(ACCOUNT_SELECT_CAPTADOR)
      .order("created_at", { ascending: false })
      .limit(100);

    if (searchTerm) {
      const like = `%${searchTerm}%`;
      fallbackQuery = fallbackQuery.or(
        `account_identifier.ilike.${like},lead_account_email.ilike.${like},account_notes.ilike.${like}`,
      );
    }

    const fallback = await fallbackQuery.returns<Account[]>();

    if (fallback.error) {
      accountsError = fallback.error;
      const logLevel =
        fallback.error.code === "42703" || fallback.error.code === "PGRST204" ? "warn" : "error";
      console[logLevel]("[admin/contas] accounts select (fallback after 42703)", {
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
  const captadorIds = [...new Set(list.map((account) => account.captador_id).filter(Boolean))] as string[];

  const [printUrls, profilesRes] = await Promise.all([
    accountPrintSignedUrlMap(supabase, list),
    captadorIds.length
      ? supabase.from("profiles").select("id,pix_key").in("id", captadorIds)
      : Promise.resolve({ data: [] as { id: string; pix_key: string | null }[], error: null }),
  ]);

  const captadorProfiles = profilesRes.data ?? [];
  const captadorPixMap = new Map(captadorProfiles.map((p) => [p.id, p.pix_key ?? null]));
  const captadorPixQrMap = await buildPixQrCodeMap(captadorProfiles);

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
      <form className="mb-4" method="get">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="min-h-11 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm font-semibold text-white outline-none placeholder:text-zinc-500 focus:border-[#00E07A] focus:ring-4 focus:ring-[#00E07A]/10"
            defaultValue={searchTerm}
            name="q"
            placeholder="Pesquisar por nome, e-mail ou identificador"
          />
          <button
            className="min-h-11 rounded-2xl border border-white/[0.08] bg-white/[0.06] px-4 text-sm font-bold text-white transition-colors hover:bg-white/[0.12]"
            type="submit"
          >
            Buscar
          </button>
        </div>
      </form>
      <div className="grid gap-4 lg:grid-cols-2">
        {list.length ? (
          list.map((account) => (
            <AccountCard
              account={account}
              accountPrintSignedUrl={printUrls.get(account.id) ?? null}
              captadorPixKey={captadorPixMap.get(account.captador_id) ?? null}
              captadorPixQrDataUrl={captadorPixQrMap.get(account.captador_id) ?? null}
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

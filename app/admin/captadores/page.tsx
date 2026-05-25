import { ApproveCaptadorButton } from "@/components/admin/approve-captador-button";
import { CaptadorAdminListItem } from "@/components/admin/captador-admin-list-item";
import { CaptadoresSearchBar } from "@/components/admin/captadores-search-bar";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  quotePostgrestFilterValue,
  sanitizeIlikeSearchTerm,
} from "@/lib/search-utils";
import type { CaptadorSubmissionBrief } from "@/lib/types";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

type SearchParams = {
  profile_error?: string;
  profile_success?: string;
  q?: string;
};

export default async function AdminCaptadoresPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const profile = await requireRole(["admin"]);
  const params = await searchParams;
  const profileError = params.profile_error;
  const profileSuccess = params.profile_success;
  const rawQuery = typeof params.q === "string" ? params.q : "";
  const searchTerm = sanitizeIlikeSearchTerm(rawQuery);
  const hasSearch = searchTerm.length > 0;
  const pattern = hasSearch ? `%${searchTerm}%` : null;

  const supabase = await createClient();

  // Captadores ativos/inativos (lista principal)
  let captadoresQuery = supabase
    .from("profiles")
    .select("*")
    .eq("role", "captador")
    .in("status", ["active", "inactive"])
    .order("created_at", { ascending: false });

  if (pattern) {
    const quoted = quotePostgrestFilterValue(pattern);
    captadoresQuery = captadoresQuery.or(
      `name.ilike.${quoted},email.ilike.${quoted}`,
    );
  }

  const { data: captadores, error: captadoresError } = await captadoresQuery;

  // Captadores aguardando aprovação (sempre visíveis, independente de busca)
  const { data: pendingCaptadores } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "captador")
    .eq("status", "pending_approval")
    .order("created_at", { ascending: false });

  const captadorIds = (captadores ?? []).map((c) => c.id).filter(Boolean);

  let briefs: CaptadorSubmissionBrief[] = [];

  if (captadorIds.length > 0) {
    const { data: briefRows, error: briefError } = await supabase
      .from("captador_submission_briefs")
      .select("captador_id, min_deposit_brl, updated_at, updated_by")
      .in("captador_id", captadorIds);

    if (briefError) {
      console.error("captador_submission_briefs fetch failed:", briefError);
    } else {
      briefs = (briefRows ?? []) as CaptadorSubmissionBrief[];
    }
  }

  const briefByCaptadorId = new Map<string, CaptadorSubmissionBrief>(
    briefs.map((b) => [b.captador_id, b]),
  );

  const count = captadores?.length ?? 0;
  const countLabel =
    count === 1 ? "1 captador encontrado" : `${count} captadores encontrados`;

  return (
    <RoleBasedLayout
      description="Lista densa: abra uma linha para editar perfil, depósito no envio ou exclusão. Busca por nome ou e-mail."
      profile={profile}
      title="Captadores"
    >
      <div className="mb-5 flex flex-col gap-3 rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5">
        <Suspense
          fallback={
            <div
              aria-hidden
              className="h-12 min-w-0 flex-1 animate-pulse rounded-2xl bg-white/[0.06]"
            />
          }
        >
          <CaptadoresSearchBar
            initialQuery={searchTerm}
            key={rawQuery.trim() || "__no-q__"}
          />
        </Suspense>
        <p
          className="shrink-0 text-center text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 sm:text-left"
          role="status"
        >
          <span className="text-zinc-300">{countLabel}</span>
          {hasSearch ? (
            <>
              <span className="mx-1 text-zinc-600">·</span>
              <span className="font-normal normal-case text-zinc-500">“{searchTerm}”</span>
            </>
          ) : null}
        </p>
      </div>

      {profileError ? (
        <div className="mb-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {decodeURIComponent(profileError)}
        </div>
      ) : null}

      {profileSuccess ? (
        <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {decodeURIComponent(profileSuccess)}
        </div>
      ) : null}

      {pendingCaptadores && pendingCaptadores.length > 0 ? (
        <div className="mb-6 rounded-[2rem] border border-amber-400/20 bg-amber-400/[0.05] p-5 shadow-lg backdrop-blur-sm">
          <p className="mb-1 text-xs font-black uppercase tracking-[0.14em] text-amber-300">
            Aguardando aprovação · {pendingCaptadores.length}
          </p>
          <p className="mb-4 text-xs text-amber-100/70">
            Estes usuários criaram conta mas ainda não têm acesso ao painel.
          </p>
          <div className="flex flex-col gap-2">
            {pendingCaptadores.map((c) => (
              <div
                key={c.id}
                className="flex flex-col items-start gap-3 rounded-2xl border border-amber-400/15 bg-black/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">
                    {c.name?.trim() || c.email || "Sem nome"}
                  </p>
                  <p className="truncate text-xs text-zinc-400">{c.email}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-600">
                    Cadastro: {new Date(c.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <ApproveCaptadorButton profileId={c.id} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {captadoresError ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          Erro ao carregar captadores: {captadoresError.message}
        </div>
      ) : null}

      {!captadoresError && count === 0 ? (
        <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-10 text-center backdrop-blur-sm">
          <p className="text-lg font-bold text-white">
            {hasSearch
              ? "Nenhum captador encontrado para essa busca."
              : "Nenhum captador cadastrado."}
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            {hasSearch
              ? "Ajuste o termo ou limpe o filtro para ver todos os captadores."
              : "Assim que um usuário for promovido a captador, ele aparecerá aqui."}
          </p>
          {hasSearch ? (
            <div className="mt-6">
              <a
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-5 text-sm font-bold text-zinc-200 transition-colors duration-200 hover:bg-white/[0.1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00E07A]"
                href="/admin/captadores"
              >
                Limpar busca
              </a>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mx-auto flex max-w-4xl flex-col gap-2">
          {captadores?.map((captador) => (
            <CaptadorAdminListItem
              depositBrief={briefByCaptadorId.get(captador.id) ?? null}
              key={captador.id}
              profile={captador}
            />
          ))}
        </div>
      )}
    </RoleBasedLayout>
  );
}

import { CaptadorAdminListItem } from "@/components/admin/captador-admin-list-item";
import { CaptadoresSearchBar } from "@/components/admin/captadores-search-bar";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  quotePostgrestFilterValue,
  sanitizeIlikeSearchTerm,
} from "@/lib/search-utils";
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

  let captadoresQuery = supabase
    .from("profiles")
    .select("*")
    .eq("role", "captador")
    .order("created_at", { ascending: false });

  if (pattern) {
    const quoted = quotePostgrestFilterValue(pattern);
    captadoresQuery = captadoresQuery.or(
      `name.ilike.${quoted},email.ilike.${quoted}`,
    );
  }

  const { data: captadores, error: captadoresError } = await captadoresQuery;

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
              key={captador.id}
              profile={captador}
            />
          ))}
        </div>
      )}
    </RoleBasedLayout>
  );
}

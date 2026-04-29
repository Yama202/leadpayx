import { ProfileAdminCard } from "@/components/admin/profile-admin-card";
import { CaptadoresSearchBar } from "@/components/admin/captadores-search-bar";
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
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight text-white">
          Captadores
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Gerencie os perfis de captadores, edite informações e controle o
          depósito exigido no envio.
        </p>
      </div>

      <Suspense
        fallback={
          <div
            aria-hidden
            className="h-24 animate-pulse rounded-2xl border border-white/[0.08] bg-white/[0.04]"
          />
        }
      >
        <CaptadoresSearchBar
          initialQuery={searchTerm}
          key={rawQuery.trim() || "__no-q__"}
        />
      </Suspense>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-zinc-300" role="status">
          {countLabel}
          {hasSearch ? (
            <span className="ml-2 font-normal text-zinc-500">
              (filtro: “{searchTerm}”)
            </span>
          ) : null}
        </p>
      </div>

      {profileError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {decodeURIComponent(profileError)}
        </div>
      ) : null}

      {profileSuccess ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          {decodeURIComponent(profileSuccess)}
        </div>
      ) : null}

      {captadoresError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          Erro ao carregar captadores: {captadoresError.message}
        </div>
      ) : null}

      {!captadoresError && count === 0 ? (
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-10 text-center">
          <p className="text-lg font-bold text-white">
            {hasSearch
              ? "Nenhum captador encontrado para essa busca."
              : "Nenhum captador cadastrado."}
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            {hasSearch
              ? "Tente outro nome ou e-mail, ou limpe o filtro para ver todos."
              : "Assim que um usuário for promovido a captador, ele aparecerá aqui."}
          </p>
          {hasSearch ? (
            <div className="mt-6">
              <a
                className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-5 text-sm font-bold text-zinc-200 transition-colors duration-200 hover:bg-white/[0.1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00E07A]"
                href="/admin/captadores"
              >
                Limpar busca
              </a>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {captadores?.map((captador) => (
            <ProfileAdminCard
              depositBrief={briefByCaptadorId.get(captador.id) ?? null}
              key={captador.id}
              profile={captador}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import { ApproveCaptadorButton } from "@/components/admin/approve-captador-button";
import { CaptadorAdminListItem } from "@/components/admin/captador-admin-list-item";
import { CaptadoresSearchBar } from "@/components/admin/captadores-search-bar";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  quotePostgrestFilterValue,
  sanitizeIlikeSearchTerm,
} from "@/lib/search-utils";
import { Suspense } from "react";
import type { CaptadorLoan, CaptadorLoanRepayment, CaptadorOfferRate, PromotionOfferBasic } from "@/lib/types";

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

  // Contas de todos os captadores visíveis (batch)
  const captadorIds = (captadores ?? []).map((c) => c.id);
  const accountsByCaptadorId = new Map<string, import("@/lib/types").Account[]>();
  if (captadorIds.length > 0) {
    const { data: allAccounts } = await supabase
      .from("accounts")
      .select("id,captador_id,account_identifier,lead_account_email,status,created_at,completed_at,rejection_reason,operator_balance_destination")
      .in("captador_id", captadorIds)
      .order("created_at", { ascending: false });
    for (const acc of allAccounts ?? []) {
      const list = accountsByCaptadorId.get(acc.captador_id) ?? [];
      list.push(acc as import("@/lib/types").Account);
      accountsByCaptadorId.set(acc.captador_id, list);
    }
  }

  // Empréstimos de todos os captadores visíveis
  const loansByCaptadorId = new Map<string, CaptadorLoan[]>();
  const allRepayments: CaptadorLoanRepayment[] = [];
  if (captadorIds.length > 0) {
    const adminSupabase = await createAdminClient();
    const { data: allLoans } = await adminSupabase
      .from("captador_loans")
      .select("*")
      .in("captador_id", captadorIds)
      .order("created_at", { ascending: false });
    const loanIds = (allLoans ?? []).map((l) => l.id);
    if (loanIds.length > 0) {
      const { data: allReps } = await adminSupabase
        .from("captador_loan_repayments")
        .select("*")
        .in("loan_id", loanIds)
        .order("created_at", { ascending: false });
      for (const r of allReps ?? []) {
        allRepayments.push(r as CaptadorLoanRepayment);
      }
    }
    for (const loan of allLoans ?? []) {
      const list = loansByCaptadorId.get(loan.captador_id) ?? [];
      list.push(loan as CaptadorLoan);
      loansByCaptadorId.set(loan.captador_id, list);
    }
  }

  // Offer rates + active offers (para o painel de comissões por oferta)
  const offerRatesByCaptadorId = new Map<string, CaptadorOfferRate[]>();
  let activeOffers: PromotionOfferBasic[] = [];
  if (captadorIds.length > 0) {
    const [{ data: rateRows }, { data: offerRows }] = await Promise.all([
      supabase
        .from("captador_offer_rates")
        .select("id,captador_id,offer_id,commission_amount,created_at,updated_at")
        .in("captador_id", captadorIds),
      supabase
        .from("promotion_offers")
        .select("id,name,status")
        .eq("status", "active")
        .order("name"),
    ]);
    for (const rate of rateRows ?? []) {
      const list = offerRatesByCaptadorId.get(rate.captador_id) ?? [];
      list.push(rate as CaptadorOfferRate);
      offerRatesByCaptadorId.set(rate.captador_id, list);
    }
    activeOffers = (offerRows ?? []) as PromotionOfferBasic[];
  }

  // Ordena: captadores com contas primeiro, depois por data de criação desc
  const sortedCaptadores = [...(captadores ?? [])].sort((a, b) => {
    const countA = accountsByCaptadorId.get(a.id)?.length ?? 0;
    const countB = accountsByCaptadorId.get(b.id)?.length ?? 0;
    if (countB !== countA) return countB - countA;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const count = captadores?.length ?? 0;
  const countLabel = count === 1 ? "1 captador encontrado" : `${count} captadores encontrados`;

  // Resumo de dívidas ativas
  const debtors = (captadores ?? [])
    .map((c) => {
      const activeLoans = (loansByCaptadorId.get(c.id) ?? []).filter((l) => l.status === "active");
      const remaining = activeLoans.reduce((s, l) => s + Number(l.remaining_amount ?? 0), 0);
      return remaining > 0 ? { name: c.name?.trim() || c.email || "—", remaining } : null;
    })
    .filter(Boolean) as { name: string; remaining: number }[];
  const totalDebt = debtors.reduce((s, d) => s + d.remaining, 0);

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

      {totalDebt > 0 ? (
        <div className="mb-6 rounded-[2rem] border border-violet-400/20 bg-violet-400/[0.05] p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-300">
              Empréstimos ativos
            </p>
            <span className="rounded-xl border border-violet-400/20 bg-black/20 px-3 py-1 text-sm font-black text-violet-200">
              R$ {totalDebt.toFixed(2).replace(".", ",")}
            </span>
          </div>
          <p className="mb-3 mt-0.5 text-xs text-violet-100/60">
            Total a receber de {debtors.length} captador{debtors.length !== 1 ? "es" : ""}.
          </p>
          <ul className="space-y-1.5">
            {debtors.map((d) => (
              <li
                key={d.name}
                className="flex items-center justify-between gap-3 rounded-xl border border-violet-400/10 bg-black/20 px-3 py-2"
              >
                <span className="truncate text-sm text-zinc-200">{d.name}</span>
                <span className="shrink-0 text-sm font-bold text-violet-200">
                  R$ {d.remaining.toFixed(2).replace(".", ",")}
                </span>
              </li>
            ))}
          </ul>
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
          {sortedCaptadores.map((captador) => (
            <CaptadorAdminListItem
              accounts={accountsByCaptadorId.get(captador.id) ?? []}
              key={captador.id}
              loanRepayments={allRepayments.filter(
                (r) => (loansByCaptadorId.get(captador.id) ?? []).some((l) => l.id === r.loan_id),
              )}
              loans={loansByCaptadorId.get(captador.id) ?? []}
              offerRates={offerRatesByCaptadorId.get(captador.id) ?? []}
              offers={activeOffers}
              profile={captador}
            />
          ))}
        </div>
      )}
    </RoleBasedLayout>
  );
}

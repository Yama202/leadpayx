import { CopyLinkButton } from "@/components/admin/copy-link-button";
import { ReferralBox } from "@/components/domain/referral-box";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { DashboardCard } from "@/components/ui/cards";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ReferralSummary, RegistrationLink } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function IndicacoesPage() {
  const profile = await requireRole(["captador"]);
  const supabase = await createClient();
  const { data: count } = await supabase.rpc("get_referral_count", {
    target_user_id: profile.id,
  });
  const { data: referrals } = await supabase.rpc("get_referral_summary", {
    target_user_id: profile.id,
  });
  const { data: links } = await supabase
    .from("registration_links")
    .select("*")
    .eq("captador_id", profile.id)
    .eq("role", "captador")
    .eq("status", "active")
    .or("expires_at.is.null,expires_at.gt.now()")
    .order("created_at", { ascending: false })
    .returns<RegistrationLink[]>();
  const referralRows = (referrals ?? []) as ReferralSummary[];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const validLinks = links ?? [];

  return (
    <RoleBasedLayout
      description="Compartilhe seu código. O bônus é gerado uma única vez após a qualificação do indicado."
      profile={profile}
      title="Indicações"
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <DashboardCard
          hint="A listagem individual é restrita para evitar exposição de dados pessoais de outros captadores."
          label="Indicados vinculados"
          value={String(count ?? 0)}
        />
        <ReferralBox profile={profile} />
      </div>
      <section className="mt-6 rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-lg font-black text-slate-950 dark:text-white">Links oficiais de captação</p>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Use apenas links ativos e autorizados pela administração. Cada link mantém rastreabilidade de origem e valor por conta quando houver regra específica.
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">
            {validLinks.length} ativos
          </span>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {validLinks.length ? (
            validLinks.map((link) => {
              const finalUrl = `${appUrl}/register?ref=${link.code}`;
              return (
                <article className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950/70" key={link.id}>
                  <p className="font-black text-slate-950 dark:text-white">{link.label}</p>
                  <p className="mt-2 break-all text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    {finalUrl}
                  </p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Valor por conta:{" "}
                    {link.captador_commission_override
                      ? Number(link.captador_commission_override).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })
                      : "conforme regra do perfil/global"}
                  </p>
                  <div className="mt-3">
                    <CopyLinkButton url={finalUrl} />
                  </div>
                </article>
              );
            })
          ) : (
            <p className="rounded-3xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
              Nenhum link específico ativo no momento. O link de indicação pessoal continua disponível ao lado.
            </p>
          )}
        </div>
      </section>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {referralRows.map((referral) => (
          <article
            className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80"
            key={referral.profile_id}
          >
            <p className="text-lg font-black text-slate-950 dark:text-white">
              {referral.name ?? "Indicado"}
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {referral.completed_accounts} contas concluídas ·{" "}
              {referral.qualified ? "qualificado" : "em progresso"} ·{" "}
              {referral.bonus_paid ? "bônus liberado" : "bônus pendente"}
            </p>
          </article>
        ))}
      </div>
    </RoleBasedLayout>
  );
}

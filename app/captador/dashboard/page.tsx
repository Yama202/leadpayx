import { AccountCard } from "@/components/domain/account-card";
import { ReferralBox } from "@/components/domain/referral-box";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { LinkButton } from "@/components/ui/button";
import { DashboardCard, EmptyState } from "@/components/ui/cards";
import { requireRole } from "@/lib/auth";
import { toCurrency } from "@/lib/payments";
import { getReferralSettings } from "@/lib/referrals";
import { getWhatsappGroupUrl } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import type { Account, AppSetting } from "@/lib/types";

type DashboardEarning = {
  amount: number | string;
  status: string;
  type: string;
};

export const dynamic = "force-dynamic";

export default async function CaptadorDashboardPage() {
  const profile = await requireRole(["captador"]);
  const supabase = await createClient();

  const [{ data: accounts }, { data: earnings }, { data: settings }, whatsappUrl] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .eq("captador_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(3)
      .returns<Account[]>(),
    supabase
      .from("earnings")
      .select("amount,status,type")
      .eq("user_id", profile.id)
      .returns<DashboardEarning[]>(),
    supabase
      .from("app_settings")
      .select("key,value")
      .in("key", [
        "referral_bonus_brl",
        "referral_completed_accounts_target",
        "referral_utm_source",
        "referral_utm_medium",
        "referral_utm_campaign",
      ])
      .returns<AppSetting[]>(),
    getWhatsappGroupUrl(),
  ]);
  const referralSettings = getReferralSettings(settings);

  const pendingAmount =
    earnings?.filter((earning) => earning.status === "pending").reduce(
      (sum, earning) => sum + Number(earning.amount),
      0,
    ) ?? 0;
  const normalPendingAmount =
    earnings
      ?.filter((earning) => earning.status === "pending" && earning.type === "account_completed")
      .reduce((sum, earning) => sum + Number(earning.amount), 0) ?? 0;
  const referralPendingAmount =
    earnings
      ?.filter((earning) => earning.status === "pending" && earning.type === "referral_bonus")
      .reduce((sum, earning) => sum + Number(earning.amount), 0) ?? 0;

  return (
    <RoleBasedLayout
      description="Envie registros autorizados, acompanhe o status pelo sistema e solicite pagamentos sem contato direto com operadores."
      profile={profile}
      title="Painel do captador"
    >
      <section className="mb-6 grid gap-4 lg:grid-cols-4">
        {[
          ["1. Envie contas", "Cadastre apenas leads/contas autorizados, com contexto suficiente e sem senhas."],
          ["2. Acompanhe status", "Cada registro passa por fila, atribuição, operação, conclusão ou recusa com motivo."],
          ["3. Ganhos e Pix", "Ganhos são gerados automaticamente após conclusão válida e ficam separados por tipo."],
          ["4. Indicação", "Compartilhe links oficiais. O bônus sai uma única vez quando o indicado cumprir o critério."],
        ].map(([title, text]) => (
          <article className="rounded-[1.75rem] border border-[#00E07A]/15 bg-[#00E07A]/5 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.18)]" key={title}>
            <p className="font-black text-[#16F28A]">{title}</p>
            <p className="mt-2 text-sm leading-6 text-[#A1A1AA]">{text}</p>
          </article>
        ))}
      </section>
      {whatsappUrl ? (
        <section className="mb-6 rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <p className="text-sm font-black text-white">Canal oficial</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#A1A1AA]">
            Use o grupo para comunicados gerais. Status, pagamentos e contas continuam sendo tratados pelo sistema.
          </p>
          <LinkButton className="mt-4 w-full sm:w-auto" href={whatsappUrl} target="_blank" rel="noreferrer" variant="secondary">
            Entrar no grupo WhatsApp
          </LinkButton>
        </section>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <DashboardCard label="Contas enviadas" value={String(accounts?.length ?? 0)} />
        <DashboardCard label="Ganhos pendentes" value={toCurrency(pendingAmount)} />
        <DashboardCard
          hint="Contas concluídas aprovadas pela operação."
          label="Ganhos normais"
          value={toCurrency(normalPendingAmount)}
        />
        <DashboardCard
          hint={`${toCurrency(referralSettings.bonusAmount)} liberados quando um indicado completa ${referralSettings.targetAccounts} contas.`}
          label="Saldo de indicação"
          value={toCurrency(referralPendingAmount)}
        />
        <DashboardCard label="Código" value={profile.referral_code} />
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          {accounts?.length ? (
            accounts.map((account) => <AccountCard account={account} key={account.id} />)
          ) : (
            <EmptyState
              action={<LinkButton href="/captador/enviar-conta">Enviar primeira conta</LinkButton>}
              description="Envie apenas contas/leads operacionais autorizados."
              title="Nenhuma conta enviada"
            />
          )}
        </section>
        <ReferralBox
          appUrl={process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? ""}
          profile={profile}
          utmCampaign={referralSettings.utmCampaign}
          utmMedium={referralSettings.utmMedium}
          utmSource={referralSettings.utmSource}
        />
      </div>
    </RoleBasedLayout>
  );
}

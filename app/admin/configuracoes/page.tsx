import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { Button } from "@/components/ui/button";
import { updateAppSettingsAction } from "@/lib/actions/domain";
import { requireRole } from "@/lib/auth";
import { getReferralSettings } from "@/lib/referrals";
import { createClient } from "@/lib/supabase/server";
import type { AppSetting } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminConfiguracoesPage() {
  const profile = await requireRole(["admin"]);
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("app_settings")
    .select("key,value,updated_at,updated_by")
    .order("key")
    .returns<AppSetting[]>();
  const { data: auditLogs } = await supabase
    .from("audit_logs")
    .select("id,user_id,metadata,created_at")
    .eq("action", "settings.updated")
    .order("created_at", { ascending: false })
    .limit(8)
    .returns<{ id: string; user_id: string | null; metadata: { key?: string }; created_at: string }[]>();
  const values = Object.fromEntries(
    (settings ?? []).map((setting) => [setting.key, setting.value]),
  );
  const referralSettings = getReferralSettings(settings);

  return (
    <RoleBasedLayout
      description="Valores de comissão e bônus ficam no banco para ajuste controlado."
      profile={profile}
      title="Configurações"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form
          action={updateAppSettingsAction}
          className="grid gap-4 rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#16F28A]">
            Operação e pagamento
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#A1A1AA]">
            Ajustes administrativos ficam auditados e afetam apenas novas leituras operacionais.
          </p>
          </div>
        <label className="block">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Comissão captador padrão</span>
          <input className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white" defaultValue={String(values.commission_amount_brl ?? 30)} name="commissionAmount" step="0.01" type="number" />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Comissão operador padrão</span>
          <input className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white" defaultValue={String(values.operator_commission_amount_brl ?? 10)} name="operatorCommissionAmount" step="0.01" type="number" />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Bônus de indicação</span>
          <input className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white" defaultValue={String(values.referral_bonus_brl ?? 60)} name="referralBonus" step="0.01" type="number" />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Contas para qualificar indicação</span>
          <input className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white" defaultValue={String(values.referral_completed_accounts_target ?? 2)} name="referralTarget" type="number" />
        </label>
        <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 sm:col-span-2">
          <input
            defaultChecked={referralSettings.enabled}
            name="referralBonusEnabled"
            type="checkbox"
          />
          Campanha de indicação ativa
        </label>
        <div className="sm:col-span-2">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#16F28A]">
            UTM padrão do convite
          </p>
          <p className="mt-2 text-sm leading-6 text-[#A1A1AA]">
            Esses parâmetros entram automaticamente no link pessoal do captador.
          </p>
        </div>
        <label className="block">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">utm_source</span>
          <input className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white" defaultValue={referralSettings.utmSource} name="referralUtmSource" />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">utm_medium</span>
          <input className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white" defaultValue={referralSettings.utmMedium} name="referralUtmMedium" />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">utm_campaign</span>
          <input className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white" defaultValue={referralSettings.utmCampaign} name="referralUtmCampaign" />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Mínimo de contas concluídas para operador apto</span>
          <input className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white" defaultValue={String(values.operator_min_completed_accounts ?? 0)} name="operatorMinCompletedAccounts" type="number" />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Mínimo operacional por lote</span>
          <input className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white" defaultValue={String(values.operational_min_batch_size ?? 2)} max={2} min={1} name="operationalMinBatchSize" type="number" />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Link do grupo WhatsApp</span>
          <input
            className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
            defaultValue={String(values.whatsapp_group_url ?? "")}
            name="whatsappGroupUrl"
            placeholder="https://chat.whatsapp.com/..."
            type="url"
          />
          <span className="mt-2 block text-xs leading-5 text-[#A1A1AA]">
            Mostrado apenas quando preenchido. Use somente links oficiais do WhatsApp.
          </span>
        </label>
        <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 sm:col-span-2">
          <input
            defaultChecked={values.require_new_account_print === true}
            name="requireNewAccountPrint"
            type="checkbox"
          />
          Exigir print no envio de conta nova
        </label>
          <Button className="sm:col-span-2" type="submit">
            Salvar configurações
          </Button>
        </form>

        <aside className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80">
          <p className="text-lg font-black text-slate-950 dark:text-white">Histórico recente</p>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Auditoria básica das mudanças de configuração.
          </p>
          <div className="mt-4 space-y-3">
            {auditLogs?.length ? (
              auditLogs.map((log) => (
                <div
                  className="rounded-2xl border border-slate-200 bg-white p-3 text-sm dark:border-white/10 dark:bg-slate-950/70"
                  key={log.id}
                >
                  <p className="font-bold text-slate-950 dark:text-white">
                    {log.metadata?.key ?? "configuração"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {new Date(log.created_at).toLocaleString("pt-BR")} ·{" "}
                    {log.user_id ? `admin ${log.user_id.slice(0, 8)}` : "sistema"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Nenhuma alteração recente registrada.
              </p>
            )}
          </div>
        </aside>
      </div>
    </RoleBasedLayout>
  );
}

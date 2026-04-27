import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { Button } from "@/components/ui/button";
import { updateAppSettingsAction } from "@/lib/actions/domain";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AppSetting } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminConfiguracoesPage() {
  const profile = await requireRole(["admin"]);
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("app_settings")
    .select("key,value")
    .order("key")
    .returns<AppSetting[]>();
  const values = Object.fromEntries(
    (settings ?? []).map((setting) => [setting.key, setting.value]),
  );

  return (
    <RoleBasedLayout
      description="Valores de comissão e bônus ficam no banco para ajuste controlado."
      profile={profile}
      title="Configurações"
    >
      <form
        action={updateAppSettingsAction}
        className="grid max-w-3xl gap-4 rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80 sm:grid-cols-2"
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
    </RoleBasedLayout>
  );
}

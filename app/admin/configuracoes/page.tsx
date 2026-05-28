import Link from "next/link";

import { PrefixTestAccountsPurgePanel } from "@/components/admin/prefix-test-accounts-purge";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { Button } from "@/components/ui/button";
import { updateAppSettingsAction } from "@/lib/actions/domain";
import { requireRole } from "@/lib/auth";
import { getReferralSettings } from "@/lib/referrals";
import { createClient } from "@/lib/supabase/server";
import type { AppSetting } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
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
    .returns<
      {
        id: string;
        user_id: string | null;
        metadata: { key?: string; previous?: unknown; next?: unknown };
        created_at: string;
      }[]
    >();
  const values = Object.fromEntries(
    (settings ?? []).map((setting) => [setting.key, setting.value]),
  );
  const referralSettings = getReferralSettings(settings);

  return (
    <RoleBasedLayout
      description="Operação, indicação e integrações. Comissões por papel ficam em Comissões globais."
      profile={profile}
      title="Configurações"
    >
      {error ? (
        <div className="mb-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mb-2 rounded-2xl border border-[#00E07A]/30 bg-[#00E07A]/10 px-4 py-3 text-sm font-semibold text-[#16F28A]">
          Configurações salvas com sucesso.
        </div>
      ) : null}
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
            Ajustes administrativos ficam auditados. Comissões por conta de captador e operador são
            definidas na página{" "}
            <Link className="font-bold text-[#16F28A] underline-offset-2 hover:underline" href="/admin/comissoes">
              Comissões globais
            </Link>
            .
          </p>
          </div>
        <div className="sm:col-span-2">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#16F28A]">Indicação (global)</p>
          <p className="mt-1 text-xs text-[#A1A1AA]">
            Igual para todos.{" "}
            <abbr
              className="cursor-help no-underline"
              title="1ª indicação qualificada: valor base. Cada novo indicado que atingir a meta: incremento (ex.: R$ 60 + 60 + 60)."
            >
              O que é “meta”?
            </abbr>
          </p>
        </div>
        <label className="block">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Valor base (1ª qualificação)</span>
          <input
            className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
            defaultValue={String(values.referral_bonus_base_brl ?? values.referral_bonus_brl ?? 60)}
            name="referralBonusBase"
            step="0.01"
            type="number"
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Incremento (cada nova qualificação)</span>
          <input
            className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
            defaultValue={String(
              values.referral_bonus_increment_brl ??
                values.referral_bonus_tier2_brl ??
                values.referral_bonus_brl ??
                60,
            )}
            name="referralBonusIncrement"
            step="0.01"
            type="number"
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Meta: contas concluídas por indicado</span>
          <input
            className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
            defaultValue={String(values.referral_completed_accounts_target ?? 2)}
            name="referralTarget"
            type="number"
          />
        </label>
        <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 sm:col-span-2">
          <input
            defaultChecked={referralSettings.enabled}
            name="referralBonusEnabled"
            type="checkbox"
          />
          Campanha de indicação ativa
        </label>
        <details className="sm:col-span-2 rounded-2xl border border-slate-200 px-4 py-3 dark:border-white/10">
          <summary className="min-h-11 cursor-pointer text-sm font-bold text-slate-700 dark:text-slate-200">
            UTM do link pessoal (avançado)
          </summary>
          <p className="mt-2 text-xs text-[#A1A1AA]">Anexados ao link fixo de indicação.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">utm_source</span>
              <input
                className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
                defaultValue={referralSettings.utmSource}
                name="referralUtmSource"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">utm_medium</span>
              <input
                className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
                defaultValue={referralSettings.utmMedium}
                name="referralUtmMedium"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">utm_campaign</span>
              <input
                className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
                defaultValue={referralSettings.utmCampaign}
                name="referralUtmCampaign"
              />
            </label>
          </div>
        </details>
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

        <div className="sm:col-span-2 rounded-2xl border border-amber-400/30 bg-amber-500/5 p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-400">Confirmação de selfie</p>
          <label className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200">
            <input
              defaultChecked={values.require_selfie_confirmation === true}
              name="requireSelfieConfirmation"
              type="checkbox"
            />
            Exigir confirmação de selfie antes de enviar conta
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-[#A1A1AA]">Texto do checkbox (deixe em branco para usar o padrão)</span>
            <textarea
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-950/70 dark:text-white resize-none"
              defaultValue={typeof values.selfie_confirmation_message === "string" ? values.selfie_confirmation_message : ""}
              name="selfieConfirmationMessage"
              placeholder="Já fiz a verificação facial (selfie) na plataforma. Sei que sem isso a conta não fica ativa e não pode ser operada."
              rows={3}
            />
          </label>
        </div>

        <div className="sm:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Operador — contato com captador</p>
          <label className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200">
            <input
              defaultChecked={values.show_captador_whatsapp_to_operator === true}
              name="showCaptadorWhatsappToOperator"
              type="checkbox"
            />
            Mostrar WhatsApp do captador ao operador (botão de contato após recusa)
          </label>
          <p className="text-xs text-[#A1A1AA]">
            Quando ativo, o operador vê o nome do captador sempre. Ao recusar por facial ou sem saldo, aparece um botão de WhatsApp com mensagem pronta.
          </p>
        </div>

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
                  {log.metadata?.previous !== undefined && log.metadata?.next !== undefined ? (
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      Valor anterior → novo (auditoria numérica)
                    </p>
                  ) : null}
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

        <div className="xl:col-span-2">
          <PrefixTestAccountsPurgePanel />
        </div>
      </div>
    </RoleBasedLayout>
  );
}

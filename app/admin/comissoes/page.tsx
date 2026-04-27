import { GlobalCommissionForm } from "@/components/admin/global-commission-form";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { requireRole } from "@/lib/auth";
import {
  resolveCaptadorCommissionPerAccount,
  resolveOperatorCommissionPerAccount,
} from "@/lib/global-commission";
import { createClient } from "@/lib/supabase/server";
import type { AppSetting } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminComissoesPage() {
  const profile = await requireRole(["admin"]);
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("app_settings")
    .select("key,value")
    .in("key", [
      "captador_commission_per_account",
      "operator_commission_per_account",
      "commission_amount_brl",
      "operator_commission_amount_brl",
    ])
    .returns<AppSetting[]>();

  const values = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));
  const captador = resolveCaptadorCommissionPerAccount(values);
  const operador = resolveOperatorCommissionPerAccount(values);

  return (
    <RoleBasedLayout
      description="Um único par de valores por papel. Alterações valem para novos ganhos; linhas já criadas em earnings não são recalculadas."
      profile={profile}
      title="Comissões globais"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#16F28A]">
            Parâmetros
          </p>
          <p className="mt-2 text-sm leading-6 text-[#A1A1AA]">
            Todo captador recebe o mesmo valor por conta concluída (exceto campanhas com override no
            link de cadastro). Todo operador recebe o mesmo valor por conta que concluir. Pagamentos
            já emitidos ou ganhos pendentes já gravados no extrato mantêm o valor histórico.
          </p>
          <div className="mt-6">
            <GlobalCommissionForm
              defaultCaptador={String(captador)}
              defaultOperador={String(operador)}
            />
          </div>
        </div>

        <aside className="space-y-4 rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80">
          <p className="text-lg font-black text-slate-950 dark:text-white">Política resumida</p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600 dark:text-slate-400">
            <li>RLS: somente administradores leem ou alteram `app_settings`.</li>
            <li>
              Auditoria: cada salvamento gera evento `settings.updated` com chave e valores anterior /
              novo (sem dados pessoais).
            </li>
            <li>
              Espelhamento: chaves legadas `commission_amount_brl` são mantidas alinhadas às
              canônicas para compatibilidade.
            </li>
          </ul>
        </aside>
      </div>
    </RoleBasedLayout>
  );
}

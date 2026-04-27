import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { Field, SubmitButton, TextArea } from "@/components/ui/forms";
import { submitAccountFormAction } from "@/lib/actions/domain";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EnviarContaPage() {
  const profile = await requireRole(["captador"]);

  return (
    <RoleBasedLayout
      description="Envie somente registros/leads autorizados. Não informe senhas nem dados fora do consentimento operacional."
      profile={profile}
      title="Enviar conta"
    >
      <div className="max-w-2xl rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <div className="mb-5 rounded-3xl border border-[#00E07A]/15 bg-[#00E07A]/5 p-4">
          <p className="font-black text-[#16F28A]">Fluxo transparente</p>
          <p className="mt-2 text-sm leading-6 text-[#A1A1AA]">
            O operador recebe apenas o registro atribuído pelo sistema. A comunicação,
            pagamentos e gestão ficam dentro do LeadPayX/admin.
          </p>
        </div>
        <form action={submitAccountFormAction} className="space-y-5">
          <Field
            label="Identificador da conta/lead"
            name="accountIdentifier"
            placeholder="Ex: @perfil ou código operacional"
            required
          />
          <TextArea
            label="Observações"
            name="accountNotes"
            placeholder="Contexto autorizado para o operador"
          />
          <label className="block">
            <span className="text-sm font-bold text-slate-200">
              Print da conta nova
            </span>
            <input
              accept="image/*,application/pdf"
              className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white focus:border-[#00E07A] focus:outline-none focus:ring-4 focus:ring-[#00E07A]/10"
              name="accountPrint"
              type="file"
            />
            <span className="mt-2 block text-xs leading-5 text-[#A1A1AA]">
              Obrigatório quando a regra global estiver ativa. Não envie senhas.
            </span>
          </label>
          <SubmitButton>Enviar para fila</SubmitButton>
        </form>
      </div>
    </RoleBasedLayout>
  );
}

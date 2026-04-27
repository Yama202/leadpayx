import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { Field, SubmitButton } from "@/components/ui/forms";
import { updateProfileFormAction } from "@/lib/actions/domain";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const profile = await requireRole(["captador"]);

  return (
    <RoleBasedLayout
      description="Pix fica restrito ao seu perfil e admins autorizados. Operadores não acessam seus ganhos ou chave Pix."
      profile={profile}
      title="Perfil"
    >
      <div className="max-w-2xl rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80">
        <form action={updateProfileFormAction} className="space-y-5">
          <Field defaultValue={profile.name ?? ""} label="Nome" name="name" required />
          <Field
            defaultValue={profile.instagram ?? ""}
            label="Instagram"
            name="instagram"
            placeholder="@seuperfil"
          />
          <Field
            defaultValue={profile.whatsapp ?? ""}
            label="WhatsApp"
            name="whatsapp"
            placeholder="(11) 99999-9999"
            required
          />
          <Field
            defaultValue={profile.pix_key ?? ""}
            label="Chave Pix"
            name="pixKey"
            required
          />
          <SubmitButton>Salvar perfil</SubmitButton>
        </form>
      </div>
    </RoleBasedLayout>
  );
}

import { CaptadorProfileForm } from "@/components/domain/captador-profile-form";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OperadorPerfilPage() {
  const profile = await requireRole(["operator"]);

  return (
    <RoleBasedLayout
      description="Mantenha seu cadastro atualizado para receber pagamentos com segurança."
      profile={profile}
      title="Perfil"
    >
      <div className="max-w-2xl rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <CaptadorProfileForm profile={profile} />
      </div>
    </RoleBasedLayout>
  );
}

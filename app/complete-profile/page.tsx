import { AuthCard } from "@/components/auth/auth-card";
import { CompleteProfileForm } from "@/components/auth/complete-profile-form";
import { getCurrentAuthState } from "@/lib/auth";
import { roleHome } from "@/lib/constants";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CompleteProfilePage() {
  const { profile, userId } = await getCurrentAuthState();

  if (!userId) {
    redirect("/login");
  }

  if (profile) {
    redirect(roleHome[profile.role]);
  }

  return (
    <AuthCard
      backHref="/login"
      description="Informe os dados necessários para liberar seu painel e pagamentos."
      title="Complete seu perfil"
    >
      <CompleteProfileForm />
    </AuthCard>
  );
}

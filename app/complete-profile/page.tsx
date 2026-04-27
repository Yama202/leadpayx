import { AuthCard } from "@/components/auth/auth-card";
import { CompleteProfileForm } from "@/components/auth/complete-profile-form";
import { getAuthenticatedUserId, getCurrentProfile } from "@/lib/auth";
import { roleHome } from "@/lib/constants";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CompleteProfilePage() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    redirect("/login");
  }

  const profile = await getCurrentProfile();

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

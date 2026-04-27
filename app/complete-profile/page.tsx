import { AuthCard } from "@/components/auth/auth-card";
import { CompleteProfileForm } from "@/components/auth/complete-profile-form";
import { getCurrentAuthState } from "@/lib/auth";
import { roleHome } from "@/lib/constants";
import { normalizeReferralCode } from "@/lib/referrals";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CompleteProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; utm_content?: string }>;
}) {
  const { profile, userId } = await getCurrentAuthState();
  const params = await searchParams;
  const registrationCode = normalizeReferralCode(params.ref) || normalizeReferralCode(params.utm_content);

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
      <CompleteProfileForm registrationCode={registrationCode} />
    </AuthCard>
  );
}

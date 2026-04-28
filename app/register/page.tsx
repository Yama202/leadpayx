import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { redirectAuthenticatedUser } from "@/lib/auth";
import { normalizeReferralCode } from "@/lib/referrals";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{
    ref?: string;
    utm_content?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  }>;
}) {
  await redirectAuthenticatedUser();
  const params = await searchParams;
  const registrationCode = normalizeReferralCode(params.ref) || normalizeReferralCode(params.utm_content);

  return (
    <AuthCard
      backHref="/login"
      description="Crie seu acesso para enviar contas, acompanhar status e consultar ganhos pelo painel."
      title="Crie seu acesso"
    >
      <RegisterForm registrationCode={registrationCode} />
    </AuthCard>
  );
}

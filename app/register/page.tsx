import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { redirectAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  await redirectAuthenticatedUser();
  const params = await searchParams;

  return (
    <AuthCard
      backHref="/login"
      description="Crie seu acesso para enviar contas, acompanhar status e consultar ganhos pelo painel."
      title="Crie seu acesso"
    >
      <RegisterForm registrationCode={params.ref} />
    </AuthCard>
  );
}

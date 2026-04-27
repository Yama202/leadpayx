import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { redirectAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  await redirectAuthenticatedUser();

  return (
    <AuthCard
      backHref="/"
      description="Entre para acessar seu painel operacional com permissões do seu perfil."
      title="Acesse sua operação"
    >
      <LoginForm />
    </AuthCard>
  );
}

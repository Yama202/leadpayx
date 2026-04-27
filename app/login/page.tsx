import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { redirectAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  await redirectAuthenticatedUser();
  const params = await searchParams;

  return (
    <AuthCard
      backHref="/"
      description={
        params.created === "1"
          ? "Cadastro criado. Entre com seus dados para continuar."
          : "Entre para acessar seu painel operacional com permissões do seu perfil."
      }
      title="Acesse sua operação"
    >
      <LoginForm />
    </AuthCard>
  );
}

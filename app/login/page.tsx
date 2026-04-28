import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { redirectAuthenticatedUser } from "@/lib/auth";
import type { RegisterLinkSearchInput } from "@/lib/register-href";
import { buildRegisterHref } from "@/lib/register-href";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<RegisterLinkSearchInput & { created?: string }>;
}) {
  await redirectAuthenticatedUser();
  const params = await searchParams;
  const registerHref = buildRegisterHref(params);

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
      <LoginForm registerHref={registerHref} />
    </AuthCard>
  );
}

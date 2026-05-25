import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { LinkButton } from "@/components/ui/button";
import { getCurrentAuthState } from "@/lib/auth";
import { roleHome } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AguardandoAprovacaoPage() {
  const { profile, userId, pendingApproval } = await getCurrentAuthState();

  if (profile) redirect(roleHome[profile.role]);
  if (!userId) redirect("/login");
  if (!pendingApproval) redirect("/complete-profile");

  return (
    <AuthCard
      backHref="/login"
      description="Seu cadastro foi recebido e está em análise pela equipe."
      title="Conta em análise"
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.08] px-4 py-4">
          <p className="text-sm font-bold text-amber-200">Aguardando aprovação</p>
          <p className="mt-1 text-sm leading-6 text-amber-100/80">
            Um administrador irá revisar seu perfil em breve. Você receberá acesso ao painel assim
            que sua conta for aprovada.
          </p>
        </div>
        <p className="text-center text-xs text-zinc-500">
          Se precisar de ajuda, entre em contato com o administrador.
        </p>
        <LinkButton className="w-full" href="/logout" variant="secondary">
          Sair
        </LinkButton>
      </div>
    </AuthCard>
  );
}

/**
 * Mapeia erros da RPC `set_admin_role` (PostgREST / Postgres) para mensagens seguras em PT-BR.
 * Detalhes técnicos ficam apenas em `logSetAdminRoleRpcError`.
 */

export type SetAdminRoleRpcContext = {
  targetEmail: string;
  makeAdmin: boolean;
};

type PostgrestLike = {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
};

function asPostgrestLike(error: unknown): PostgrestLike {
  if (!error || typeof error !== "object") {
    return {};
  }
  const o = error as Record<string, unknown>;
  return {
    message: typeof o.message === "string" ? o.message : undefined,
    code: typeof o.code === "string" ? o.code : undefined,
    details: typeof o.details === "string" ? o.details : o.details === null ? null : undefined,
    hint: typeof o.hint === "string" ? o.hint : o.hint === null ? null : undefined,
  };
}

/** Texto agregado para casar mensagens internas da função SQL e textos do PostgREST. */
export function aggregateSetAdminRoleErrorText(error: unknown): string {
  const p = asPostgrestLike(error);
  return [p.message, p.details, p.hint].filter((s): s is string => typeof s === "string" && s.length > 0).join(" | ");
}

export function logSetAdminRoleRpcError(error: unknown, ctx: SetAdminRoleRpcContext): void {
  const p = asPostgrestLike(error);
  console.error(
    JSON.stringify({
      scope: "set_admin_role",
      target_email: ctx.targetEmail,
      make_admin: ctx.makeAdmin,
      code: p.code ?? null,
      message: p.message ?? null,
      details: p.details ?? null,
      hint: p.hint ?? null,
    }),
  );
}

/**
 * Mensagem para exibição ao admin. Sem stack, sem secrets; não inclui detalhes de infra.
 */
export function mapSetAdminRoleRpcToUserMessage(error: unknown, ctx: SetAdminRoleRpcContext): string {
  const p = asPostgrestLike(error);
  const blob = aggregateSetAdminRoleErrorText(error).toLowerCase();
  const code = (p.code ?? "").toUpperCase();

  if (code === "42501" || blob.includes("permission denied")) {
    return "Sua sessão não tem permissão para esta operação. Faça login novamente como administrador.";
  }

  if (
    code === "42883" ||
    blob.includes("does not exist") ||
    (blob.includes("function") && blob.includes("set_admin_role"))
  ) {
    return "A função de gestão de administradores não está disponível neste ambiente. Verifique se as migrações do banco foram aplicadas.";
  }

  if (blob.includes("target profile not found") || blob.includes("não foi encontrado")) {
    return "Não encontramos um cadastro com este e-mail. Confirme o endereço ou peça ao usuário para concluir o cadastro no sistema.";
  }

  if (blob.includes("target email required")) {
    return "Informe um e-mail válido.";
  }

  if (blob.includes("admin required")) {
    return "Apenas administradores podem promover ou revogar outros administradores.";
  }

  if (blob.includes("admin role changes require audited function")) {
    return "A alteração de papel exige o fluxo auditado do sistema. Recarregue a página e tente de outra vez; se repetir, contate o suporte (regra de segurança do banco).";
  }

  if (blob.includes("bootstrap admin cannot be revoked")) {
    return "O administrador inicial não pode ser revogado.";
  }

  if (blob.includes("self admin revocation denied")) {
    return "Você não pode revogar o seu próprio acesso de administrador.";
  }

  if (blob.includes("cannot revoke last active admin")) {
    return "Não é possível remover o último administrador ativo. Promova outro admin antes de revogar este.";
  }

  if (blob.includes("profile update denied")) {
    return "O sistema bloqueou a atualização do perfil. Verifique se você está usando a ação de administradores.";
  }

  if (blob.includes("jwt") || blob.includes("not authorized") || code === "PGRST301") {
    return "Sessão inválida ou expirada. Entre novamente e tente outra vez.";
  }

  return ctx.makeAdmin
    ? "Não foi possível promover este usuário. Confira o e-mail e tente novamente."
    : "Não foi possível revogar este administrador. Confira os dados e tente novamente.";
}

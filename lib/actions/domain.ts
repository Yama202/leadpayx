"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  encryptAccountPassword,
  isEncryptionConfigured,
} from "@/lib/account-credentials-crypto";
import { requireProfile, requireRole } from "@/lib/auth";
import { getCaptadorSubmissionBrief } from "@/lib/captador-submission-brief";
import { DEFAULT_OPERATOR_BATCH_SIZE } from "@/lib/constants";
import { roundBrlHalfUp } from "@/lib/global-commission";
import {
  OPERATOR_BALANCE_DESTINATION_ALTERNATE,
  OPERATOR_BALANCE_DESTINATION_PRIMARY,
} from "@/lib/operator-balance-destinations";
import {
  logSetAdminRoleRpcError,
  mapSetAdminRoleRpcToUserMessage,
} from "@/lib/set-admin-role-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  adminUserDeleteSchema,
  adminRoleActionSchema,
  adminProfileUpdateSchema,
  accountSchema,
  appSettingsSchema,
  captadorDepositBriefClearSchema,
  captadorDepositBriefSchema,
  captadorGlobalOfferSchema,
  captadorGlobalOfferToggleSchema,
  formDataStringFields,
  formDataToObject,
  globalCommissionSettingsSchema,
  initialActionState,
  payoutProcessSchema,
  profileSchema,
  promotionOfferSchema,
  promotionOfferDeleteSchema,
  promotionOfferStatusSchema,
  rejectAccountSchema,
  completeAccountSchema,
  completeOperatorCycleSchema,
  registrationLinkSchema,
  registrationLinkDeleteSchema,
  registrationLinkStatusSchema,
  startAccountSchema,
  validationError,
  type ActionState,
} from "@/lib/validation";

export async function createAuditLog(
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {},
) {
  const supabase = await createClient();
  await supabase.from("audit_logs").insert({
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
}

export async function updateProfileAction(
  stateOrFormData: ActionState | FormData = initialActionState,
  maybeFormData?: FormData,
): Promise<ActionState> {
  const formData = maybeFormData ?? (stateOrFormData as FormData);
  const profile = await requireRole(["captador"]);
  const parsed = profileSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return validationError("Revise os dados do perfil.", parsed.error);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      name: parsed.data.name,
      instagram: parsed.data.instagram || null,
      whatsapp: parsed.data.whatsapp,
      pix_key: parsed.data.pixKey,
    })
    .eq("id", profile.id);

  if (error) {
    return { ok: false, message: "Não foi possível atualizar seu perfil." };
  }

  revalidatePath("/captador/perfil");
  return { ok: true, message: "Perfil atualizado com segurança." };
}

function coerceAppSettingBoolean(value: unknown): boolean {
  if (value === true) return true;
  if (value === false || value == null) return false;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    return s === "true" || s === "1";
  }
  return false;
}

function mapAccountInsertError(message: string, code?: string): string {
  const m = message.toLowerCase();
  if (m.includes("account print is required") || m.includes("print is required")) {
    return "Envie o print da conta (imagem ou PDF) para continuar.";
  }
  if (m.includes("row-level security") || code === "42501") {
    return "Sem permissão para gravar a conta. Confirme que você está logado como captador ativo.";
  }
  if (m.includes("foreign key") || m.includes("violates foreign key") || code === "23503") {
    return "Dados de referência inválidos (perfil ou link). Atualize a página ou contate o suporte.";
  }
  if (m.includes("duplicate") || code === "23505") {
    return "Conflito ao registrar a conta. Atualize a página e tente novamente.";
  }
  return "Não foi possível enviar a conta.";
}

export async function submitAccountAction(
  stateOrFormData: ActionState | FormData = initialActionState,
  maybeFormData?: FormData,
): Promise<ActionState> {
  const formData = maybeFormData ?? (stateOrFormData as FormData);
  const profile = await requireRole(["captador"]);
  const parsed = accountSchema.safeParse(formDataStringFields(formData));

  if (!parsed.success) {
    return validationError("Revise a conta enviada.", parsed.error);
  }

  if (!isEncryptionConfigured()) {
    return {
      ok: false,
      message:
        "Envio de credenciais indisponível: configure ACCOUNTS_CREDENTIALS_SECRET no servidor (mín. 16 caracteres).",
    };
  }

  let secretCipher: string;
  try {
    secretCipher = encryptAccountPassword(parsed.data.leadAccountPassword);
  } catch {
    return { ok: false, message: "Não foi possível proteger a senha da conta. Tente novamente." };
  }

  const supabase = await createClient();
  const { data: printSetting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "require_new_account_print")
    .maybeSingle();
  const requireNewAccountPrint = coerceAppSettingBoolean(printSetting?.value);

  const depositBrief = await getCaptadorSubmissionBrief(profile.id);
  const minDepositRequired = Number(depositBrief?.min_deposit_brl ?? 0);
  const declaredDeposit = parsed.data.declaredDepositBrl ?? null;
  if (minDepositRequired > 0) {
    if (declaredDeposit == null) {
      return { ok: false, message: "Informe o valor já depositado para continuar." };
    }
    if (declaredDeposit < minDepositRequired) {
      return {
        ok: false,
        message: `Envio bloqueado: o valor já depositado deve ser no mínimo R$ ${minDepositRequired.toFixed(2)}.`,
      };
    }
  }
  const accountId = crypto.randomUUID();
  const printFile = formData.get("accountPrint");
  const hasPrintFile = printFile instanceof File && printFile.size > 0;

  if (requireNewAccountPrint && !hasPrintFile) {
    return {
      ok: false,
      message: "Envie o print da conta (imagem ou PDF) para continuar.",
    };
  }

  let accountPrintPath: string | null = null;

  if (hasPrintFile && printFile instanceof File) {
    if (!printFile.type.startsWith("image/") && printFile.type !== "application/pdf") {
      return { ok: false, message: "Envie um print em imagem ou PDF." };
    }

    if (printFile.size > 5 * 1024 * 1024) {
      return { ok: false, message: "O print deve ter no máximo 5MB." };
    }

    const safeName = printFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    accountPrintPath = `${profile.id}/${accountId}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("account-prints")
      .upload(accountPrintPath, printFile, { upsert: false });

    if (uploadError) {
      console.error("[submitAccountAction] storage upload", {
        message: uploadError.message,
        path: accountPrintPath,
      });
      const um = uploadError.message.toLowerCase();
      if (um.includes("row-level security") || um.includes("policy") || um.includes("403")) {
        return {
          ok: false,
          message:
            "Não foi possível enviar o print: permissão negada no armazenamento. Confirme políticas do bucket account-prints.",
        };
      }
      return { ok: false, message: "Não foi possível enviar o print da conta." };
    }
  }

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      id: accountId,
      captador_id: profile.id,
      account_identifier: parsed.data.accountIdentifier,
      account_notes: parsed.data.accountNotes || null,
      lead_account_email: parsed.data.leadAccountEmail,
      lead_account_secret_cipher: secretCipher,
      account_print_path: accountPrintPath,
      source_registration_link_id: profile.registration_link_id,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    if (accountPrintPath) {
      await supabase.storage.from("account-prints").remove([accountPrintPath]);
    }
    console.error("[submitAccountAction] accounts insert", {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    });
    const userMessage = mapAccountInsertError(error?.message ?? "", error?.code);
    return { ok: false, message: userMessage };
  }

  await createAuditLog("account.submitted", "account", data.id, {
    has_print: Boolean(accountPrintPath),
    declared_deposit_brl: declaredDeposit,
    min_deposit_required_brl: minDepositRequired > 0 ? minDepositRequired : null,
  });
  revalidatePath("/captador/dashboard");
  revalidatePath("/captador/minhas-contas");
  revalidatePath("/captador/enviar-conta");
  revalidatePath("/admin/contas");

  return { ok: true, message: "Conta enviada para a fila. Quando houver ciclo completo, um operador apto recebe o lote." };
}

export async function assignAccountToOperator(accountId: string) {
  const supabase = await createClient();
  return supabase.rpc("assign_account_to_operator", { target_account_id: accountId });
}

export async function assignNextBatchToOperator(
  operatorId?: string,
  batchSize = DEFAULT_OPERATOR_BATCH_SIZE,
) {
  const profile = await requireRole(["operator", "admin"]);
  const supabase = await createClient();

  const primary = await supabase.rpc("assign_next_batch_to_operator", {
    target_operator_id: operatorId ?? profile.id,
    batch_size: batchSize,
  });

  if (primary.error?.code !== "42883") {
    return primary;
  }

  // Compatibilidade com ambientes onde a RPC ainda expõe assinatura sem batch_size.
  return supabase.rpc("assign_next_batch_to_operator", {
    target_operator_id: operatorId ?? profile.id,
  });
}

export async function pickNextBatchAction(): Promise<ActionState> {
  const { data, error } = await assignNextBatchToOperator();

  if (error) {
    const errorMessage = String(error.message ?? "");
    const normalizedError = errorMessage.toLowerCase();
    if (normalizedError.includes("minimum operational batch not available")) {
      return { ok: false, message: "Ainda não há ciclo completo (2 contas) disponível para atribuição." };
    }
    if (normalizedError.includes("operator unavailable")) {
      return { ok: false, message: "Seu perfil de operador está indisponível no momento." };
    }
    if (normalizedError.includes("assignment denied")) {
      return { ok: false, message: "Permissão negada para pegar lote com este usuário." };
    }
    if (normalizedError.includes("operator not in current rotation slot")) {
      return {
        ok: false,
        message:
          "Seu operador não está na janela de rotação da RPC antiga. Aplique as migrations mais recentes do fluxo sem rotação e tente novamente.",
      };
    }
    if (normalizedError.includes("operator rotation unavailable")) {
      return {
        ok: false,
        message:
          "A fila está bloqueada pela rotação legada. Aplique as migrations mais recentes do operador para liberar atribuição por ciclo.",
      };
    }
    if (normalizedError.includes("operator cannot change account ownership or source data")) {
      console.error("[pickNextBatchAction] RPC blocked by account row policy", error.message);
      return {
        ok: false,
        message:
          "Atribuição bloqueada pela regra de segurança do banco. Aplique a migração mais recente (account_row_protect) ou contate o suporte.",
      };
    }
    if (normalizedError.includes("pgrst203") || normalizedError.includes("could not choose the best candidate function")) {
      return {
        ok: false,
        message:
          "Ambiguidade na RPC de atribuição. Aplique a migração de estabilidade do operador (assinatura única da função) e tente novamente.",
      };
    }
    console.error("[pickNextBatchAction] assign_next_batch_to_operator", {
      message: error.message,
      code: error.code,
    });
    return {
      ok: false,
      message: `Não foi possível pegar o próximo lote (${error.code ?? "sem-codigo"}). Detalhe: ${errorMessage || "erro desconhecido"}.`,
    };
  }

  revalidatePath("/operador/dashboard");
  revalidatePath("/operador/contas");
  const assigned = Number(data ?? 0);
  if (!Number.isFinite(assigned) || assigned <= 0) {
    return {
      ok: false,
      message:
        "Nenhuma conta foi atribuída neste ciclo. Se houver 2+ contas pendentes do mesmo captador, aplique as migrations recentes do operador (sem rotação).",
    };
  }
  return {
    ok: true,
    message: `Lote atribuído com ${assigned} conta(s).`,
  };
}

export async function pickNextBatchFormAction(): Promise<void> {
  await pickNextBatchAction();
}

export async function pickNextBatchStateAction(
  state: ActionState = initialActionState,
): Promise<ActionState> {
  void state;
  return pickNextBatchAction();
}

export async function completeAccount(accountId: string, balanceDestination: string) {
  const supabase = await createClient();
  return supabase.rpc("complete_account", {
    target_account_id: accountId,
    balance_destination: balanceDestination,
  });
}

export async function startAccount(accountId: string) {
  const supabase = await createClient();
  return supabase.rpc("start_account", { target_account_id: accountId });
}

export async function startAccountAction(formData: FormData): Promise<void> {
  await requireRole(["operator"]);
  const parsed = startAccountSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    redirect("/operador/dashboard?op_error=invalid");
  }

  const { error } = await startAccount(parsed.data.accountId);
  if (error) {
    redirect("/operador/dashboard?op_error=start");
  }

  revalidatePath("/operador/dashboard");
  revalidatePath("/operador/contas");
}

export async function completeAccountAction(formData: FormData): Promise<void> {
  const operatorProfile = await requireRole(["operator"]);
  const parsed = completeAccountSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    redirect("/operador/dashboard?op_error=complete_balance");
  }

  const { error } = await completeAccount(parsed.data.accountId, parsed.data.balanceDestination);
  if (error) {
    const msg = String(error.message ?? "").toLowerCase();
    if (msg.includes("balance destination required")) {
      redirect("/operador/dashboard?op_error=complete_balance");
    }
    redirect("/operador/dashboard?op_error=complete");
  }

  try {
    const { notifyCaptadorOnAccountCompletionPush } = await import("@/lib/web-push/send-completion");
    await notifyCaptadorOnAccountCompletionPush({
      actorUserId: operatorProfile.id,
      accountId: parsed.data.accountId,
    });
  } catch (pushErr) {
    console.error("[completeAccountAction] push pós-finalização", pushErr);
  }

  revalidatePath("/operador/dashboard");
  revalidatePath("/operador/contas");
  revalidatePath("/captador/minhas-contas");
  revalidatePath("/captador/dashboard");
  revalidatePath("/captador/avisos");
}

export async function completeOperatorCycleAction(formData: FormData): Promise<void> {
  const operatorProfile = await requireRole(["operator"]);
  const parsed = completeOperatorCycleSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    redirect("/operador/dashboard?op_error=complete_balance");
  }

  const { orderedAccountIds, balanceDestination } = parsed.data;
  const supabase = await createClient();

  const { data: rows, error: loadErr } = await supabase
    .from("accounts")
    .select("id,status,operador_id")
    .in("id", orderedAccountIds);

  const rowById = new Map((rows ?? []).map((row) => [row.id, row]));

  if (loadErr || rowById.size !== orderedAccountIds.length) {
    redirect("/operador/dashboard?op_error=complete");
  }

  for (const accountId of orderedAccountIds) {
    const row = rowById.get(accountId);
    if (!row) {
      redirect("/operador/dashboard?op_error=complete");
    }
    if (row.operador_id !== operatorProfile.id) {
      redirect("/operador/dashboard?op_error=complete");
    }
    if (row.status !== "assigned" && row.status !== "in_progress") {
      redirect("/operador/dashboard?op_error=complete");
    }
  }

  const destinations: string[] =
    orderedAccountIds.length === 1
      ? [balanceDestination!]
      : [OPERATOR_BALANCE_DESTINATION_PRIMARY, OPERATOR_BALANCE_DESTINATION_ALTERNATE];

  for (let i = 0; i < orderedAccountIds.length; i += 1) {
    const accountId = orderedAccountIds[i]!;
    const dest = destinations[i]!;
    const { error } = await completeAccount(accountId, dest);
    if (error) {
      const msg = String(error.message ?? "").toLowerCase();
      if (msg.includes("balance destination required")) {
        redirect("/operador/dashboard?op_error=complete_balance");
      }
      redirect("/operador/dashboard?op_error=complete");
    }

    try {
      const { notifyCaptadorOnAccountCompletionPush } = await import("@/lib/web-push/send-completion");
      await notifyCaptadorOnAccountCompletionPush({
        actorUserId: operatorProfile.id,
        accountId,
      });
    } catch (pushErr) {
      console.error("[completeOperatorCycleAction] push pós-finalização", pushErr);
    }
  }

  revalidatePath("/operador/dashboard");
  revalidatePath("/operador/contas");
  revalidatePath("/captador/minhas-contas");
  revalidatePath("/captador/dashboard");
  revalidatePath("/captador/avisos");
}

export async function markAllCaptadorNotificationsReadAction(): Promise<void> {
  const profile = await requireRole(["captador"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", profile.id)
    .is("read_at", null);

  if (error) {
    console.error("[markAllCaptadorNotificationsReadAction]", error.message);
  }

  revalidatePath("/captador/dashboard");
  revalidatePath("/captador/avisos");
}

export async function rejectAccount(accountId: string, reason: string) {
  const supabase = await createClient();
  return supabase.rpc("reject_account", {
    target_account_id: accountId,
    reason,
  });
}

export async function rejectAccountAction(
  stateOrFormData: ActionState | FormData = initialActionState,
  maybeFormData?: FormData,
): Promise<ActionState> {
  const formData = maybeFormData ?? (stateOrFormData as FormData);
  await requireRole(["operator"]);
  const parsed = rejectAccountSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return validationError("Informe o motivo da recusa.", parsed.error);
  }

  const { error } = await rejectAccount(parsed.data.accountId, parsed.data.reason);

  if (error) {
    return { ok: false, message: "Não foi possível recusar esta conta." };
  }

  revalidatePath("/operador/dashboard");
  revalidatePath("/operador/contas");
  return { ok: true, message: "Conta recusada com motivo registrado." };
}

export async function generateAccountEarning(accountId: string) {
  const supabase = await createClient();
  return supabase.rpc("generate_account_earning", { target_account_id: accountId });
}

export async function checkAndGenerateReferralBonus(captadorId: string) {
  const supabase = await createClient();
  return supabase.rpc("check_and_generate_referral_bonus", {
    target_captador_id: captadorId,
  });
}

export async function markPayoutAsProcessed(
  payoutId: string,
  proofFile?: File,
  notes?: string,
) {
  await requireRole(["admin"]);
  const supabase = await createClient();
  let proofPath: string | null = null;

  if (proofFile && proofFile.size > 0) {
    if (!proofFile.type.startsWith("image/") && proofFile.type !== "application/pdf") {
      return { error: new Error("invalid proof type") };
    }

    if (proofFile.size > 5 * 1024 * 1024) {
      return { error: new Error("proof too large") };
    }

    const safeName = proofFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    proofPath = `payouts/${payoutId}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("payment-proofs")
      .upload(proofPath, proofFile, { upsert: false });

    if (uploadError) {
      return { error: uploadError };
    }
  }

  return supabase.rpc("mark_payout_as_processed", {
    target_payout_id: payoutId,
    proof_path: proofPath,
    admin_notes: notes || null,
  });
}

export async function reassignExpiredOperatorAccounts() {
  await requireRole(["admin", "operator"]);
  const supabase = await createClient();
  return supabase.rpc("reassign_expired_operator_accounts");
}

export async function processPayoutAction(
  stateOrFormData: ActionState | FormData = initialActionState,
  maybeFormData?: FormData,
): Promise<ActionState> {
  const formData = maybeFormData ?? (stateOrFormData as FormData);
  const parsed = payoutProcessSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return validationError("Revise os dados do pagamento.", parsed.error);
  }

  const proof = formData.get("proof");
  const file = proof instanceof File ? proof : undefined;
  const { error } = await markPayoutAsProcessed(
    parsed.data.payoutId,
    file,
    parsed.data.notes,
  );

  if (error) {
    const message = error.message?.toLowerCase() ?? "";
    if (message.includes("invalid proof type")) {
      return { ok: false, message: "Comprovante inválido. Envie imagem ou PDF." };
    }
    if (message.includes("proof too large")) {
      return { ok: false, message: "Comprovante muito grande. Limite de 5MB." };
    }
    return { ok: false, message: "Não foi possível processar o pagamento." };
  }

  revalidatePath("/admin/pagamentos");
  revalidatePath("/admin/pagamentos/captadores");
  revalidatePath("/admin/pagamentos/operadores");
  revalidatePath("/captador/pagamentos");
  revalidatePath("/captador/dashboard");
  revalidatePath("/operador/pagamentos");
  revalidatePath("/operador/dashboard");
  return { ok: true, message: "Pagamento marcado como processado." };
}

function mapEnsurePayoutRpcError(message: string | undefined): string {
  const m = message ?? "";
  if (m.includes("pix_key_required")) {
    return "Cadastre sua chave Pix em Perfil antes de solicitar pagamento.";
  }
  if (m.includes("no pending earnings")) {
    return "Não há saldo pendente disponível para pagamento.";
  }
  return "Não foi possível solicitar pagamento.";
}

export async function ensurePayoutAction(): Promise<ActionState> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.rpc("ensure_pending_payout", {
    target_user_id: profile.id,
  });

  if (error) {
    return { ok: false, message: mapEnsurePayoutRpcError(error.message) };
  }

  revalidatePath("/captador/pagamentos");
  revalidatePath("/operador/pagamentos");
  revalidatePath("/admin/pagamentos");
  revalidatePath("/admin/pagamentos/captadores");
  revalidatePath("/admin/pagamentos/operadores");
  return { ok: true, message: "Pagamento pendente criado ou atualizado." };
}

export async function ensurePayoutFormAction(): Promise<void> {
  await ensurePayoutAction();
}

export async function adminUpdateProfileAction(formData: FormData): Promise<void> {
  await requireRole(["admin"]);
  const parsed = adminProfileUpdateSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return;
  }

  if (parsed.data.role === "admin") {
    return;
  }

  const supabase = await createClient();
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", parsed.data.profileId)
    .maybeSingle<{ role: string }>();

  if (currentProfile?.role === "admin") {
    return;
  }

  await supabase
    .from("profiles")
    .update({
      role: parsed.data.role,
      status: parsed.data.status,
      whatsapp: parsed.data.whatsapp,
    })
    .eq("id", parsed.data.profileId);

  await createAuditLog("profile.admin_updated", "profile", parsed.data.profileId, {
    role: parsed.data.role,
    status: parsed.data.status,
    whatsapp: parsed.data.whatsapp,
  });

  revalidatePath("/admin/captadores");
  revalidatePath("/admin/operadores");
  revalidatePath("/captador/dashboard");
  revalidatePath("/captador/enviar-conta");
  revalidatePath("/captador/perfil");
}

function normalizeAdminReturnPath(path: string): "/admin/captadores" | "/admin/operadores" {
  return path === "/admin/operadores" ? "/admin/operadores" : "/admin/captadores";
}

function buildAdminRedirect(path: "/admin/captadores" | "/admin/operadores", key: string, message: string) {
  return `${path}?${key}=${encodeURIComponent(message)}`;
}

function isNextRedirectError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

function mapAdminDeleteUserError(message: string): string {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("foreign key") ||
    normalized.includes("violates foreign key constraint") ||
    normalized.includes("still referenced")
  ) {
    return "Exclusão bloqueada: existem vínculos operacionais que precisam ser finalizados antes de remover o usuário.";
  }
  if (
    normalized.includes("permission") ||
    normalized.includes("not authorized") ||
    normalized.includes("service_role") ||
    normalized.includes("jwt")
  ) {
    return "Não foi possível excluir o usuário agora: verifique a configuração server-side do Supabase Admin.";
  }
  return "Não foi possível excluir o usuário com segurança. Tente novamente em instantes.";
}

export async function adminDeleteManagedUserAction(formData: FormData): Promise<void> {
  const fallbackPath = normalizeAdminReturnPath(String(formData.get("returnPath") ?? ""));
  try {
    const actor = await requireRole(["admin"]);
    const parsed = adminUserDeleteSchema.safeParse(formDataToObject(formData));

    if (!parsed.success) {
      redirect(buildAdminRedirect(fallbackPath, "profile_error", "Confirmação inválida para excluir usuário."));
    }

    const { profileId, role, returnPath } = parsed.data;
    const safeReturnPath = normalizeAdminReturnPath(returnPath);

    if (profileId === actor.id) {
      redirect(buildAdminRedirect(safeReturnPath, "profile_error", "Você não pode excluir seu próprio usuário."));
    }

    const supabase = await createClient();
    const { data: targetProfile, error: targetError } = await supabase
      .from("profiles")
      .select("id,role,email")
      .eq("id", profileId)
      .maybeSingle<{ id: string; role: string; email: string | null }>();

    if (targetError || !targetProfile) {
      redirect(buildAdminRedirect(safeReturnPath, "profile_error", "Usuário não encontrado."));
    }

    if (targetProfile.role !== role) {
      redirect(
        buildAdminRedirect(
          safeReturnPath,
          "profile_error",
          "Somente captador ou operador pode ser excluído por este fluxo.",
        ),
      );
    }

    const [activeAccounts, pendingPayouts, activeAssignments, historicalEarnings, historicalPayouts] =
      await Promise.all([
      supabase
        .from("accounts")
        .select("id", { count: "exact", head: true })
        .or(`captador_id.eq.${profileId},operador_id.eq.${profileId}`)
        .in("status", ["pending", "assigned", "in_progress"]),
      supabase
        .from("payouts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profileId)
        .eq("status", "pending"),
      role === "operator"
        ? supabase
            .from("operator_assignments")
            .select("id", { count: "exact", head: true })
            .eq("operador_id", profileId)
            .in("status", ["assigned", "in_progress"])
        : Promise.resolve({ error: null, count: 0 } as { error: null; count: number }),
      supabase.from("earnings").select("id", { count: "exact", head: true }).eq("user_id", profileId),
      supabase.from("payouts").select("id", { count: "exact", head: true }).eq("user_id", profileId),
    ]);

    if (
      activeAccounts.error ||
      pendingPayouts.error ||
      activeAssignments.error ||
      historicalEarnings.error ||
      historicalPayouts.error
    ) {
      console.error("adminDeleteManagedUserAction pending-check error", {
        profileId,
        activeAccountsError: activeAccounts.error?.message ?? null,
        pendingPayoutsError: pendingPayouts.error?.message ?? null,
        activeAssignmentsError: activeAssignments.error?.message ?? null,
        historicalEarningsError: historicalEarnings.error?.message ?? null,
        historicalPayoutsError: historicalPayouts.error?.message ?? null,
      });
      redirect(
        buildAdminRedirect(
          safeReturnPath,
          "profile_error",
          "Não foi possível validar pendências operacionais deste usuário agora.",
        ),
      );
    }

    const activeCount = Number(activeAccounts.count ?? 0);
    const payoutCount = Number(pendingPayouts.count ?? 0);
    const assignmentCount = Number(activeAssignments.count ?? 0);
    const earningsCount = Number(historicalEarnings.count ?? 0);
    const payoutsCount = Number(historicalPayouts.count ?? 0);

    if (activeCount > 0 || payoutCount > 0 || assignmentCount > 0) {
      redirect(
        buildAdminRedirect(
          safeReturnPath,
          "profile_error",
          "Exclusão bloqueada: finalize contas/pagamentos pendentes antes de remover o usuário.",
        ),
      );
    }

    if (earningsCount > 0 || payoutsCount > 0) {
      redirect(
        buildAdminRedirect(
          safeReturnPath,
          "profile_error",
          "Exclusão bloqueada: o usuário já possui histórico financeiro (ganhos/pagamentos). Inative o perfil para preservar auditoria.",
        ),
      );
    }

    if (role === "operator") {
      const { error: cleanupAssignmentsError } = await supabase
        .from("operator_assignments")
        .delete()
        .eq("operador_id", profileId)
        .in("status", ["completed", "rejected", "reassigned", "cancelled"]);
      if (cleanupAssignmentsError) {
        console.error("adminDeleteManagedUserAction cleanup operator assignments error", {
          profileId,
          message: cleanupAssignmentsError.message,
        });
        redirect(
          buildAdminRedirect(
            safeReturnPath,
            "profile_error",
            "Não foi possível limpar vínculos históricos do operador antes da exclusão.",
          ),
        );
      }
    }

    const adminClient = createAdminClient();
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(profileId);

    if (deleteError) {
      console.error("adminDeleteManagedUserAction deleteUser error", {
        profileId,
        role,
        message: deleteError.message,
      });
      redirect(
        buildAdminRedirect(
          safeReturnPath,
          "profile_error",
          mapAdminDeleteUserError(deleteError.message),
        ),
      );
    }

    await createAuditLog("profile.admin_deleted", "profile", profileId, {
      deleted_role: role,
      deleted_email: targetProfile.email,
      deleted_by: actor.id,
    });

    revalidatePath("/admin/captadores");
    revalidatePath("/admin/operadores");
    revalidatePath("/admin/dashboard");
    redirect(buildAdminRedirect(safeReturnPath, "profile_success", "Usuário excluído com sucesso."));
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    console.error("adminDeleteManagedUserAction unexpected error", error);
    redirect(
      buildAdminRedirect(
        fallbackPath,
        "profile_error",
        "Não foi possível concluir a exclusão agora. Verifique as configurações do servidor e tente novamente.",
      ),
    );
  }
}

export async function setAdminRoleAction(
  stateOrFormData: ActionState | FormData = initialActionState,
  maybeFormData?: FormData,
): Promise<ActionState> {
  const formData = maybeFormData ?? (stateOrFormData as FormData);
  await requireRole(["admin"]);

  const parsed = adminRoleActionSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return validationError("Revise a gestão de administrador.", parsed.error);
  }

  const supabase = await createClient();
  const makeAdmin = parsed.data.action === "promote";
  const targetEmail = parsed.data.email.trim().toLowerCase();
  const rpcContext = { targetEmail, makeAdmin };

  const { error } = await supabase.rpc("set_admin_role", {
    target_email: targetEmail,
    make_admin: makeAdmin,
  });

  if (error) {
    logSetAdminRoleRpcError(error, rpcContext);
    return {
      ok: false,
      message: mapSetAdminRoleRpcToUserMessage(error, rpcContext),
    };
  }

  revalidatePath("/admin/administradores");
  revalidatePath("/admin/captadores");
  revalidatePath("/admin/operadores");
  revalidatePath("/admin/logs");

  return {
    ok: true,
    message: makeAdmin ? "Administrador promovido com auditoria." : "Admin revogado com auditoria.",
  };
}

export async function updateAppSettingsAction(formData: FormData): Promise<void> {
  await requireRole(["admin"]);
  const parsed = appSettingsSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return;
  }

  const supabase = await createClient();
  const updates = [
    ["referral_bonus_base_brl", parsed.data.referralBonusBase],
    ["referral_bonus_increment_brl", parsed.data.referralBonusIncrement],
    ["referral_bonus_brl", parsed.data.referralBonusBase],
    ["referral_bonus_tier2_brl", parsed.data.referralBonusIncrement],
    ["referral_completed_accounts_target", parsed.data.referralTarget],
    ["referral_bonus_enabled", parsed.data.referralBonusEnabled],
    ["referral_utm_source", parsed.data.referralUtmSource],
    ["referral_utm_medium", parsed.data.referralUtmMedium],
    ["referral_utm_campaign", parsed.data.referralUtmCampaign],
    ["operator_min_completed_accounts", parsed.data.operatorMinCompletedAccounts],
    ["operational_min_batch_size", parsed.data.operationalMinBatchSize],
    ["whatsapp_group_url", parsed.data.whatsappGroupUrl],
    ["require_new_account_print", parsed.data.requireNewAccountPrint],
  ] as const;

  await Promise.all(
    updates.map(([key, value]) =>
      supabase.rpc("upsert_app_setting", {
        setting_key: key,
        setting_value: value,
      }),
    ),
  );

  revalidatePath("/admin/configuracoes");
  revalidatePath("/captador/indicacoes");
  revalidatePath("/captador/dashboard");
  revalidatePath("/captador/pagamentos");
}

export async function upsertCaptadorDepositBriefAction(formData: FormData): Promise<void> {
  await requireRole(["admin"]);
  const parsed = captadorDepositBriefSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return;
  }

  const admin = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("captador_submission_briefs").upsert(
    {
      captador_id: parsed.data.captadorId,
      min_deposit_brl: parsed.data.minDepositBrl,
      updated_at: new Date().toISOString(),
      updated_by: admin.id,
    },
    { onConflict: "captador_id" },
  );

  if (error) {
    console.error("[upsertCaptadorDepositBriefAction] upsert failed", {
      captadorId: parsed.data.captadorId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
  }

  if (!error) {
    await createAuditLog("captador.deposit_brief_upserted", "profile", parsed.data.captadorId, {
      min_deposit_brl: parsed.data.minDepositBrl,
    });
  }

  revalidatePath("/admin/captadores");
  revalidatePath("/captador/dashboard");
  revalidatePath("/captador/enviar-conta");
}

export async function clearCaptadorDepositBriefAction(formData: FormData): Promise<void> {
  await requireRole(["admin"]);
  const parsed = captadorDepositBriefClearSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("captador_submission_briefs")
    .delete()
    .eq("captador_id", parsed.data.captadorId);

  if (error) {
    console.error("[clearCaptadorDepositBriefAction] delete failed", {
      captadorId: parsed.data.captadorId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
  }

  if (!error) {
    await createAuditLog("captador.deposit_brief_cleared", "profile", parsed.data.captadorId, {});
  }

  revalidatePath("/admin/captadores");
  revalidatePath("/captador/dashboard");
  revalidatePath("/captador/enviar-conta");
}

export async function updateGlobalCommissionsAction(
  stateOrFormData: ActionState | FormData = initialActionState,
  maybeFormData?: FormData,
): Promise<ActionState> {
  const formData = maybeFormData ?? (stateOrFormData as FormData);
  await requireRole(["admin"]);
  const raw = formDataToObject(formData);
  const parsed = globalCommissionSettingsSchema.safeParse({
    captadorCommissionPerAccount: raw.captadorCommissionPerAccount,
    operatorCommissionPerAccount: raw.operatorCommissionPerAccount,
  });

  if (!parsed.success) {
    return validationError("Revise os valores de comissão.", parsed.error);
  }

  const captador = roundBrlHalfUp(parsed.data.captadorCommissionPerAccount);
  const operador = roundBrlHalfUp(parsed.data.operatorCommissionPerAccount);
  const supabase = await createClient();
  const payload = [
    ["captador_commission_per_account", captador],
    ["operator_commission_per_account", operador],
    ["commission_amount_brl", captador],
    ["operator_commission_amount_brl", operador],
  ] as const;

  for (const [setting_key, value] of payload) {
    const { error } = await supabase.rpc("upsert_app_setting", {
      setting_key,
      setting_value: value,
    });
    if (error) {
      return { ok: false, message: "Não foi possível salvar as comissões. Tente novamente." };
    }
  }

  revalidatePath("/admin/comissoes");
  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin/captadores");
  revalidatePath("/admin/operadores");

  return { ok: true, message: "Comissões globais salvas. Novos ganhos usarão estes valores." };
}

export async function createRegistrationLinkAction(formData: FormData): Promise<void> {
  const admin = await requireRole(["admin"]);
  const parsed = registrationLinkSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return;
  }

  const supabase = await createClient();
  const code = parsed.data.code.toUpperCase();
  await supabase.from("registration_links").insert({
    code,
    label: parsed.data.label,
    role: parsed.data.role,
    origin: parsed.data.origin || null,
    campaign: parsed.data.campaign || null,
    captador_id: null,
    captador_commission_override: null,
    expires_at: parsed.data.expiresAt || null,
    max_uses: parsed.data.maxUses,
    created_by: admin.id,
  });

  await createAuditLog("registration_link.created", "registration_link", null, {
    code,
    role: parsed.data.role,
  });

  revalidatePath("/admin/ofertas");
}

export async function updateRegistrationLinkStatusAction(
  formData: FormData,
): Promise<void> {
  await requireRole(["admin"]);
  const parsed = registrationLinkStatusSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("registration_links")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.linkId);

  await createAuditLog("registration_link.status_updated", "registration_link", parsed.data.linkId, {
    status: parsed.data.status,
  });

  revalidatePath("/admin/ofertas");
}

export async function deleteRegistrationLinkAction(formData: FormData): Promise<void> {
  await requireRole(["admin"]);
  const parsed = registrationLinkDeleteSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("registration_links")
    .delete()
    .eq("id", parsed.data.linkId);

  if (!error) {
    await createAuditLog("registration_link.deleted", "registration_link", parsed.data.linkId, {});
  }

  revalidatePath("/admin/ofertas");
}

export async function upsertCaptadorGlobalOfferAction(
  stateOrFormData: ActionState | FormData = initialActionState,
  maybeFormData?: FormData,
): Promise<ActionState> {
  const formData = maybeFormData ?? (stateOrFormData as FormData);
  await requireRole(["admin"]);
  const parsed = captadorGlobalOfferSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return validationError("Revise os dados do link global.", parsed.error);
  }

  const supabase = await createClient();
  const payload = {
    name: parsed.data.name.trim(),
    url_base: parsed.data.urlBase.trim(),
    is_active: parsed.data.isActive,
  };

  if (parsed.data.offerId) {
    const { error } = await supabase
      .from("captador_global_offers")
      .update(payload)
      .eq("id", parsed.data.offerId);

    if (error) {
      return { ok: false, message: "Não foi possível atualizar o link." };
    }
  } else {
    const { error } = await supabase.from("captador_global_offers").insert(payload);

    if (error) {
      return { ok: false, message: "Não foi possível criar o link." };
    }
  }

  revalidatePath("/admin/ofertas");
  revalidatePath("/captador/ofertas");
  revalidatePath("/captador/dashboard");

  return { ok: true, message: "Link global salvo." };
}

export async function toggleCaptadorGlobalOfferActiveAction(formData: FormData): Promise<void> {
  await requireRole(["admin"]);
  const parsed = captadorGlobalOfferToggleSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("captador_global_offers")
    .update({ is_active: parsed.data.nextActive === "true" })
    .eq("id", parsed.data.offerId);

  revalidatePath("/admin/ofertas");
  revalidatePath("/captador/ofertas");
  revalidatePath("/captador/dashboard");
}

export async function upsertPromotionOfferAction(
  stateOrFormData: ActionState | FormData = initialActionState,
  maybeFormData?: FormData,
): Promise<ActionState> {
  const formData = maybeFormData ?? (stateOrFormData as FormData);
  const admin = await requireRole(["admin"]);
  const parsed = promotionOfferSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return validationError("Revise os dados da oferta.", parsed.error);
  }

  const supabase = await createClient();
  const descTrim = parsed.data.description.trim();
  const description =
    descTrim.length >= 8 ? descTrim : "Promoção ativa — detalhes no painel do captador.";
  const manualValidUntil = parsed.data.validUntilManual?.trim() ?? "";
  const pickerValidUntil = parsed.data.validUntil?.trim() ?? "";
  let validUntilInput: string | null = null;

  if (manualValidUntil) {
    const normalized = manualValidUntil.replace(" ", "T");
    const parsedDate = new Date(normalized);
    if (Number.isNaN(parsedDate.getTime())) {
      return {
        ok: false,
        message: "Data inválida em 'Válida até'. Use AAAA-MM-DD HH:mm ou o seletor.",
        fieldErrors: { validUntilManual: ["Formato inválido para data/hora."] },
      };
    }
    validUntilInput = parsedDate.toISOString();
  } else if (pickerValidUntil) {
    const parsedDate = new Date(pickerValidUntil);
    if (Number.isNaN(parsedDate.getTime())) {
      return {
        ok: false,
        message: "Data inválida em 'Válida até'.",
        fieldErrors: { validUntil: ["Formato inválido para data/hora."] },
      };
    }
    validUntilInput = parsedDate.toISOString();
  }

  const payload = {
    name: parsed.data.name,
    description,
    reward_amount: parsed.data.rewardAmount,
    min_deposit_brl: parsed.data.minDepositBrl,
    max_deposit_brl: parsed.data.maxDepositBrl,
    cycle_deposit_brl: parsed.data.cycleDepositBrl,
    only_new_accounts: parsed.data.onlyNewAccounts,
    promotion_url: parsed.data.promotionUrl,
    status: parsed.data.status,
    valid_until: validUntilInput,
    updated_by: admin.id,
  };

  const { data, error } = parsed.data.offerId
    ? await supabase
        .from("promotion_offers")
        .update(payload)
        .eq("id", parsed.data.offerId)
        .select("id")
        .single()
    : await supabase
        .from("promotion_offers")
        .insert({ ...payload, created_by: admin.id })
        .select("id")
        .single();

  if (error || !data) {
    return {
      ok: false,
      message: `Não foi possível salvar a oferta.${error?.message ? ` (${error.message})` : ""}`,
    };
  }

  await createAuditLog(
    parsed.data.offerId ? "promotion_offer.updated" : "promotion_offer.created",
    "promotion_offer",
    data.id,
    {
      status: parsed.data.status,
      rewardAmount: parsed.data.rewardAmount,
      cycleDepositBrl: parsed.data.cycleDepositBrl,
      minDepositBrl: parsed.data.minDepositBrl,
      maxDepositBrl: parsed.data.maxDepositBrl,
      onlyNewAccounts: parsed.data.onlyNewAccounts,
    },
  );

  revalidatePath("/admin/ofertas");
  revalidatePath("/captador/ofertas");
  revalidatePath("/captador/dashboard");
  revalidatePath("/operador/ofertas");
  return { ok: true, message: "Oferta salva e disponível conforme status configurado." };
}

export async function updatePromotionOfferStatusAction(formData: FormData): Promise<void> {
  await requireRole(["admin"]);
  const parsed = promotionOfferStatusSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    redirect("/admin/ofertas?offer_error=Requisição inválida para status da oferta.");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("promotion_offers")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.offerId);

  if (error) {
    redirect("/admin/ofertas?offer_error=Não foi possível alterar o status da oferta.");
    return;
  }

  await createAuditLog("promotion_offer.status_updated", "promotion_offer", parsed.data.offerId, {
    status: parsed.data.status,
  });

  revalidatePath("/admin/ofertas");
  revalidatePath("/captador/ofertas");
  revalidatePath("/captador/dashboard");
  revalidatePath("/operador/ofertas");
  redirect("/admin/ofertas?offer_success=Status da oferta atualizado.");
}

export async function deletePromotionOfferAction(formData: FormData): Promise<void> {
  await requireRole(["admin"]);
  const parsed = promotionOfferDeleteSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    redirect("/admin/ofertas?offer_error=Requisição inválida para exclusão da oferta.");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("promotion_offers")
    .delete()
    .eq("id", parsed.data.offerId);

  if (!error) {
    await createAuditLog("promotion_offer.deleted", "promotion_offer", parsed.data.offerId, {});
  } else {
    redirect("/admin/ofertas?offer_error=Não foi possível excluir a oferta.");
    return;
  }

  revalidatePath("/admin/ofertas");
  revalidatePath("/captador/ofertas");
  revalidatePath("/captador/dashboard");
  revalidatePath("/operador/ofertas");
  redirect("/admin/ofertas?offer_success=Oferta excluída.");
}

export async function updateProfileFormAction(
  stateOrFormData: ActionState | FormData = initialActionState,
  maybeFormData?: FormData,
): Promise<ActionState> {
  return updateProfileAction(stateOrFormData, maybeFormData);
}

export async function submitAccountFormAction(
  stateOrFormData: ActionState | FormData = initialActionState,
  maybeFormData?: FormData,
): Promise<ActionState> {
  return submitAccountAction(stateOrFormData, maybeFormData);
}

export async function upsertPromotionOfferFormAction(formData: FormData): Promise<void> {
  const result = await upsertPromotionOfferAction(formData);
  const key = result.ok ? "offer_success" : "offer_error";
  redirect(`/admin/ofertas?${key}=${encodeURIComponent(result.message)}`);
}

export async function rejectAccountFormAction(formData: FormData): Promise<void> {
  await rejectAccountAction(formData);
}

export async function processPayoutFormAction(formData: FormData): Promise<void> {
  await processPayoutAction(formData);
}

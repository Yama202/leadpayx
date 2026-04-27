"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireProfile, requireRole } from "@/lib/auth";
import { DEFAULT_OPERATOR_BATCH_SIZE } from "@/lib/constants";
import { roundBrlHalfUp } from "@/lib/global-commission";
import { createClient } from "@/lib/supabase/server";
import {
  accountIdSchema,
  adminRoleActionSchema,
  adminProfileUpdateSchema,
  accountSchema,
  appSettingsSchema,
  formDataToObject,
  globalCommissionSettingsSchema,
  initialActionState,
  payoutProcessSchema,
  profileSchema,
  promotionOfferSchema,
  promotionOfferStatusSchema,
  rejectAccountSchema,
  registrationLinkSchema,
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

export async function submitAccountAction(
  stateOrFormData: ActionState | FormData = initialActionState,
  maybeFormData?: FormData,
): Promise<ActionState> {
  const formData = maybeFormData ?? (stateOrFormData as FormData);
  const profile = await requireRole(["captador"]);
  const parsed = accountSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return validationError("Revise a conta enviada.", parsed.error);
  }

  const supabase = await createClient();
  const accountId = crypto.randomUUID();
  const printFile = formData.get("accountPrint");
  let accountPrintPath: string | null = null;

  if (printFile instanceof File && printFile.size > 0) {
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
    return { ok: false, message: "Não foi possível enviar a conta." };
  }

  await assignAccountToOperator(data.id);
  revalidatePath("/captador/dashboard");
  revalidatePath("/captador/minhas-contas");

  return { ok: true, message: "Conta enviada e encaminhada para a fila." };
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

  return supabase.rpc("assign_next_batch_to_operator", {
    target_operator_id: operatorId ?? profile.id,
    batch_size: batchSize,
  });
}

export async function pickNextBatchAction(): Promise<ActionState> {
  const { error } = await assignNextBatchToOperator();

  if (error) {
    return { ok: false, message: "Não foi possível pegar o próximo lote." };
  }

  revalidatePath("/operador/dashboard");
  revalidatePath("/operador/contas");
  return { ok: true, message: "Lote atualizado." };
}

export async function pickNextBatchFormAction(): Promise<void> {
  await pickNextBatchAction();
}

export async function completeAccount(accountId: string) {
  const supabase = await createClient();
  return supabase.rpc("complete_account", { target_account_id: accountId });
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
  await requireRole(["operator"]);
  const parsed = accountIdSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    redirect("/operador/dashboard?op_error=invalid");
  }

  const { error } = await completeAccount(parsed.data.accountId);
  if (error) {
    redirect("/operador/dashboard?op_error=complete");
  }

  revalidatePath("/operador/dashboard");
  revalidatePath("/operador/contas");
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
    return { ok: false, message: "Não foi possível processar o pagamento." };
  }

  revalidatePath("/admin/pagamentos");
  return { ok: true, message: "Pagamento marcado como processado." };
}

export async function ensurePayoutAction(): Promise<ActionState> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.rpc("ensure_pending_payout", {
    target_user_id: profile.id,
  });

  if (error) {
    return { ok: false, message: "Não foi possível solicitar pagamento." };
  }

  revalidatePath("/captador/pagamentos");
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
  const { error } = await supabase.rpc("set_admin_role", {
    target_email: parsed.data.email,
    make_admin: makeAdmin,
  });

  if (error) {
    return {
      ok: false,
      message: makeAdmin
        ? "Não foi possível promover este usuário. Confirme se o cadastro existe."
        : "Não foi possível revogar este admin. Verifique a confirmação e as proteções.",
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
    ["referral_bonus_brl", parsed.data.referralBonus],
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
    captador_id: parsed.data.captadorId || null,
    captador_commission_override: parsed.data.captadorCommissionOverride,
    expires_at: parsed.data.expiresAt || null,
    max_uses: parsed.data.maxUses,
    created_by: admin.id,
  });

  await createAuditLog("registration_link.created", "registration_link", null, {
    code,
    role: parsed.data.role,
    captadorCommissionOverride: parsed.data.captadorCommissionOverride,
  });

  revalidatePath("/admin/links");
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

  revalidatePath("/admin/links");
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
  const payload = {
    name: parsed.data.name,
    description: parsed.data.description,
    reward_amount: parsed.data.rewardAmount,
    promotion_url: parsed.data.promotionUrl,
    status: parsed.data.status,
    valid_until: parsed.data.validUntil || null,
    display_order: parsed.data.displayOrder,
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
    return { ok: false, message: "Não foi possível salvar a oferta." };
  }

  await createAuditLog(
    parsed.data.offerId ? "promotion_offer.updated" : "promotion_offer.created",
    "promotion_offer",
    data.id,
    { status: parsed.data.status, rewardAmount: parsed.data.rewardAmount },
  );

  revalidatePath("/admin/ofertas");
  revalidatePath("/captador/ofertas");
  return { ok: true, message: "Oferta salva e disponível conforme status configurado." };
}

export async function updatePromotionOfferStatusAction(formData: FormData): Promise<void> {
  await requireRole(["admin"]);
  const parsed = promotionOfferStatusSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("promotion_offers")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.offerId);

  await createAuditLog("promotion_offer.status_updated", "promotion_offer", parsed.data.offerId, {
    status: parsed.data.status,
  });

  revalidatePath("/admin/ofertas");
  revalidatePath("/captador/ofertas");
}

export async function updateProfileFormAction(formData: FormData): Promise<void> {
  await updateProfileAction(formData);
}

export async function submitAccountFormAction(formData: FormData): Promise<void> {
  await submitAccountAction(formData);
}

export async function upsertPromotionOfferFormAction(formData: FormData): Promise<void> {
  await upsertPromotionOfferAction(formData);
}

export async function rejectAccountFormAction(formData: FormData): Promise<void> {
  await rejectAccountAction(formData);
}

export async function processPayoutFormAction(formData: FormData): Promise<void> {
  await processPayoutAction(formData);
}

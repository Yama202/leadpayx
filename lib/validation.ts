import { z } from "zod";

import { isValidPixKey } from "./pix-key.ts";

export const loginSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
});

export const registerSchema = loginSchema.extend({
  name: z.string().min(2, "Informe seu nome completo.").max(120),
  registrationCode: z
    .string()
    .trim()
    .max(32)
    .regex(/^[a-zA-Z0-9_-]*$/, "Use apenas letras, números, _ ou -.")
    .transform((value) => (value ? value.toUpperCase() : undefined))
    .optional(),
});

function normalizeBrazilianWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "");
  const withCountryCode = digits.startsWith("55") ? digits : `55${digits}`;

  return withCountryCode;
}

const whatsappSchema = z
  .string()
  .trim()
  .min(1, "Informe seu WhatsApp.")
  .transform(normalizeBrazilianWhatsapp)
  .refine((value) => /^55\d{10,11}$/.test(value), {
    message: "Informe um WhatsApp brasileiro válido com DDD.",
  });

export const profileSchema = z.object({
  name: z.string().min(2, "Informe seu nome.").max(120),
  instagram: z.string().trim().max(80).optional(),
  whatsapp: whatsappSchema,
  pixKey: z
    .string()
    .trim()
    .min(3, "Informe uma chave Pix válida.")
    .max(160)
    .refine(isValidPixKey, {
      message:
        "Chave Pix: use e-mail, telefone (com DDD), CPF, CNPJ, chave aleatória ou EVP (UUID).",
    }),
  registrationCode: z
    .string()
    .trim()
    .max(32)
    .regex(/^[a-zA-Z0-9_-]*$/, "Use apenas letras, números, _ ou -.")
    .transform((value) => (value ? value.toUpperCase() : undefined))
    .optional(),
});

export const accountSchema = z.object({
  promotionOfferId: z
    .string()
    .min(1, "Selecione a casa/oferta antes de enviar.")
    .uuid("Oferta inválida — recarregue a página."),
  accountIdentifier: z
    .string()
    .trim()
    .min(3, "Informe um identificador autorizado.")
    .max(160),
  leadAccountEmail: z
    .string()
    .trim()
    .min(3, "Informe o e-mail da conta.")
    .email("Informe um e-mail válido (precisa de @).")
    .transform((v) => v.toLowerCase()),
  leadAccountPassword: z
    .string()
    .min(8, "A senha da conta deve ter pelo menos 8 caracteres.")
    .max(512, "Senha muito longa."),
  accountNotes: z.string().trim().max(1000).optional(),
  declaredDepositBrl: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .optional()
    .transform((value) => {
      if (value == null) return null;
      if (typeof value === "number") return Number.isFinite(value) ? value : null;
      const normalized = value.trim().replace(",", ".");
      if (!normalized) return null;
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : Number.NaN;
    })
    .refine((value) => value == null || (Number.isFinite(value) && value >= 0), {
      message: "Informe um valor já depositado válido (zero ou positivo).",
    }),
});

export const rejectAccountSchema = z
  .object({
    accountId: z.string().uuid(),
    reasonPreset: z.enum(["not_new_account", "no_balance", "no_facial", "other"]),
    otherReason: z.string().trim().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.reasonPreset === "other") {
      const detail = (data.otherReason ?? "").trim();
      if (detail.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Descreva o motivo com pelo menos 8 caracteres.",
          path: ["otherReason"],
        });
      }
    }
  })
  .transform((data) => ({
    accountId: data.accountId,
    reason:
      data.reasonPreset === "not_new_account"
        ? "Recusa pelo operador: não é conta nova."
        : data.reasonPreset === "no_balance"
          ? "Recusa pelo operador: conta sem saldo."
          : data.reasonPreset === "no_facial"
            ? "Recusa pelo operador: falta de verificação facial (selfie)."
            : (data.otherReason ?? "").trim(),
    rejectionType: data.reasonPreset === "no_balance"
      ? "no_balance"
      : data.reasonPreset === "no_facial"
        ? "no_facial"
        : "permanent",
  }));

export const accountIdSchema = z.object({
  accountId: z.string().uuid(),
});

export const startAccountSchema = accountIdSchema;

export const completeAccountSchema = z.object({
  accountId: z.string().uuid(),
  balanceDestination: z
    .string()
    .trim()
    .min(8, "Descreva o destino do saldo com pelo menos 8 caracteres (conta, titular, banco etc.).")
    .max(800, "Texto muito longo. Resuma em até 800 caracteres."),
});

const destinationString = z
  .string()
  .trim()
  .min(8, "Descreva o destino do saldo com pelo menos 8 caracteres (conta, titular, banco etc.).")
  .max(800, "Texto muito longo. Resuma em até 800 caracteres.");

/** Finaliza todas as contas do lote (ordem = assigned_at). Mensagem ao captador gravada em cada conta. */
export const completeOperatorCycleSchema = z
  .object({
    orderedAccountIds: z
      .string()
      .min(1, "Ciclo inválido.")
      .transform((s) =>
        s
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean),
      )
      .pipe(
        z
          .array(z.string().uuid())
          .min(1, "Nenhuma conta no ciclo.")
          .max(2, "Ciclo com mais de duas contas — atualize a página."),
      ),
    balanceDestination: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      destinationString.optional(),
    ),
    balanceTargetAccountId: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().uuid().optional(),
    ),
    balanceInitialBrl: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
      z.number().min(0).optional(),
    ),
    balanceFinalBrl: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
      z.number().min(0).optional(),
    ),
  })
  .superRefine((data, ctx) => {
    const n = data.orderedAccountIds.length;
    if (n === 1) {
      if (!data.balanceDestination) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Descreva para onde foi o saldo desta conta antes de finalizar.",
          path: ["balanceDestination"],
        });
      }
      return;
    }
    if (!data.balanceTargetAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Escolhe em qual conta ficou o saldo das duas antes de finalizar.",
        path: ["balanceTargetAccountId"],
      });
      return;
    }
    if (!data.orderedAccountIds.includes(data.balanceTargetAccountId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Conta selecionada não pertence a este ciclo.",
        path: ["balanceTargetAccountId"],
      });
    }
  });

export const payoutProcessSchema = z.object({
  payoutId: z.string().uuid(),
  notes: z.string().trim().max(500).optional(),
  amountPaid: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().positive().optional(),
  ),
});

export const approveCaptadorSchema = z.object({
  profileId: z.string().uuid(),
});

export const adminResetUserDataSchema = z.object({
  profileId: z.string().uuid(),
  role: z.enum(["captador", "operator"]),
});

export const adminProfileUpdateSchema = z.object({
  profileId: z.string().uuid(),
  role: z.enum(["admin", "operator", "captador"]),
  status: z.enum(["active", "inactive", "pending_approval"]),
  whatsapp: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? normalizeBrazilianWhatsapp(value) : null))
    .refine((value) => value === null || /^55\d{10,11}$/.test(value), {
      message: "Informe um WhatsApp brasileiro válido com DDD.",
    }),
});

export const adminUserDeleteSchema = z.object({
  profileId: z.string().uuid(),
  role: z.enum(["captador", "operator"]),
  returnPath: z.enum(["/admin/captadores", "/admin/operadores"]),
  confirmation: z
    .string()
    .trim()
    .refine((value) => value === "EXCLUIR", {
      message: "Digite EXCLUIR para confirmar.",
    }),
});

/** Senha em server env: LEADPAY_PREFIX_TEST_PURGE_SECRET — nunca no cliente. */
export const prefixTestPurgeSchema = z.object({
  purgePassword: z.string().min(1, "Informe a senha de confirmação."),
});

const brlCommissionField = z.coerce
  .number()
  .min(0, "Informe um valor zero ou positivo.")
  .max(999_999.99, "Valor acima do limite permitido para comissão.")
  .refine((value) => Number.isFinite(value), { message: "Valor inválido." });

export const globalCommissionSettingsSchema = z.object({
  captadorCommissionPerAccount: brlCommissionField,
  operatorCommissionPerAccount: brlCommissionField,
});

export const appSettingsSchema = z.object({
  referralBonusBase: z.coerce.number().positive(),
  referralBonusIncrement: z.coerce.number().positive(),
  referralTarget: z.coerce.number().int().positive(),
  referralBonusEnabled: z
    .string()
    .optional()
    .transform((value) => value === "on"),
  referralUtmSource: z.string().trim().min(2).max(60).regex(/^[a-zA-Z0-9_-]+$/),
  referralUtmMedium: z.string().trim().min(2).max(60).regex(/^[a-zA-Z0-9_-]+$/),
  referralUtmCampaign: z.string().trim().min(2).max(80).regex(/^[a-zA-Z0-9_-]+$/),
  operatorMinCompletedAccounts: z.coerce.number().int().min(0),
  operationalMinBatchSize: z.coerce.number().int().min(1).max(2),
  whatsappGroupUrl: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((value) => value || null)
    .refine((value) => value === null || value.startsWith("https://"), {
      message: "Informe uma URL que comece com https://.",
    }),
  requireNewAccountPrint: z
    .string()
    .optional()
    .transform((value) => value === "on"),
  requireSelfieConfirmation: z
    .string()
    .optional()
    .transform((value) => value === "on"),
  selfieConfirmationMessage: z.string().trim().max(300).optional(),
});

export const captadorDepositBriefSchema = z.object({
  captadorId: z.string().uuid(),
  minDepositBrl: z.coerce
    .number()
    .positive("Informe um valor maior que zero.")
    .max(99_999_999.99, "Valor acima do limite."),
});

export const captadorDepositBriefClearSchema = z.object({
  captadorId: z.string().uuid(),
});

export const registrationLinkSchema = z.object({
  label: z.string().trim().min(2, "Informe um nome para o link.").max(120),
  code: z
    .string()
    .trim()
    .min(4)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/, "Use apenas letras, números, _ ou -."),
  role: z.enum(["captador", "operator"]),
  origin: z.string().trim().max(120).optional(),
  campaign: z.string().trim().max(120).optional(),
  expiresAt: z.string().or(z.literal("")).optional(),
  maxUses: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? Number(value) : null))
    .refine((value) => value === null || (Number.isInteger(value) && value > 0), {
      message: "Informe um número inteiro positivo.",
    }),
});

export const registrationLinkStatusSchema = z.object({
  linkId: z.string().uuid(),
  status: z.enum(["active", "inactive"]),
});

export const registrationLinkDeleteSchema = z.object({
  linkId: z.string().uuid(),
});

export const captadorGlobalOfferSchema = z.object({
  offerId: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Informe o nome da oferta.").max(120),
  urlBase: z
    .string()
    .trim()
    .url("Informe uma URL válida.")
    .refine((value) => value.startsWith("https://"), "Use apenas HTTPS."),
  isActive: z
    .string()
    .optional()
    .transform((value) => value === "on"),
});

export const captadorGlobalOfferToggleSchema = z.object({
  offerId: z.string().uuid(),
  nextActive: z.enum(["true", "false"]),
});

export const promotionOfferSchema = z.object({
  offerId: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Informe o nome da oferta.").max(120),
  description: z
    .string()
    .trim()
    .max(1200)
    .optional()
    .transform((value) => value ?? ""),
  rewardAmount: z.coerce.number().positive("Informe um valor positivo."),
  minDepositBrl: z
    .union([z.string(), z.number(), z.undefined()])
    .optional()
    .transform((value) => {
      if (value == null || value === "") return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : Number.NaN;
    })
    .refine((value) => value == null || value >= 0, {
      message: "Depósito mínimo deve ser zero ou positivo.",
    }),
  maxDepositBrl: z
    .union([z.string(), z.number(), z.undefined()])
    .optional()
    .transform((value) => {
      if (value == null || value === "") return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : Number.NaN;
    })
    .refine((value) => value == null || value >= 0, {
      message: "Depósito máximo deve ser zero ou positivo.",
    }),
  cycleDepositBrl: z
    .union([z.string(), z.number(), z.undefined()])
    .optional()
    .transform((value) => {
      if (value == null || value === "") return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : Number.NaN;
    })
    .refine((value) => value == null || value > 0, {
      message: "Valor por ciclo deve ser maior que zero.",
    }),
  onlyNewAccounts: z
    .string()
    .optional()
    .transform((value) => value === "on"),
  requiresPair: z
    .string()
    .optional()
    .transform((value) => value !== "off"),
  promotionUrl: z
    .string()
    .trim()
    .url("Informe uma URL válida.")
    .refine((value) => value.startsWith("https://"), "Use apenas links HTTPS."),
  status: z.enum(["active", "inactive"]).default("active"),
  validUntil: z.string().or(z.literal("")).optional(),
  validUntilManual: z.string().trim().max(40).optional(),
}).superRefine((value, ctx) => {
  if (value.minDepositBrl != null && value.maxDepositBrl != null && value.maxDepositBrl < value.minDepositBrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["maxDepositBrl"],
      message: "Depósito máximo deve ser maior ou igual ao mínimo.",
    });
  }
});

export const promotionOfferStatusSchema = z.object({
  offerId: z.string().uuid(),
  status: z.enum(["active", "inactive"]),
});

export const promotionOfferDeleteSchema = z.object({
  offerId: z.string().uuid(),
});

export const adminRoleActionSchema = z
  .object({
    email: z.string().trim().email("Informe o e-mail do usuário."),
    action: z.enum(["promote", "revoke"]),
    confirmation: z.string().trim().optional(),
  })
  .transform((value) => ({
    ...value,
    confirmationNormalized: value.confirmation
      ?.toUpperCase()
      .replace(/\s+/g, " ")
      .trim(),
  }))
  .refine(
    (value) => value.action === "promote" || value.confirmationNormalized === "REVOGAR ADMIN",
    {
      message: "Digite REVOGAR ADMIN para confirmar.",
      path: ["confirmation"],
    },
  )
  .transform((value) => {
    const copy = { ...value };
    delete copy.confirmationNormalized;
    return copy;
  });

export const createLoanSchema = z.object({
  captadorId: z.string().uuid("ID de captador inválido."),
  amount: z.preprocess(
    (v) => Number(v),
    z.number().positive("Valor deve ser positivo."),
  ),
  notes: z.string().max(500).optional(),
});

export const claimLoanRepaymentSchema = z.object({
  loanId: z.string().uuid("ID de empréstimo inválido."),
  amount: z.preprocess(
    (v) => Number(v),
    z.number().positive("Valor deve ser positivo."),
  ),
  notes: z.string().max(500).optional(),
});

export type ActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialActionState: ActionState = {
  ok: false,
  message: "",
};

export function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

/** Apenas campos string (ignora File) — use com multipart + Zod. */
export function formDataStringFields(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      out[key] = value;
    }
  }
  return out;
}

export function validationError(message: string, error: z.ZodError): ActionState {
  return {
    ok: false,
    message,
    fieldErrors: error.flatten().fieldErrors,
  };
}

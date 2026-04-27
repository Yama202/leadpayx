import { z } from "zod";

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
  pixKey: z.string().trim().min(3, "Informe uma chave Pix válida.").max(160),
});

export const accountSchema = z.object({
  accountIdentifier: z
    .string()
    .trim()
    .min(3, "Informe um identificador autorizado.")
    .max(160),
  accountNotes: z.string().trim().max(1000).optional(),
});

export const rejectAccountSchema = z.object({
  accountId: z.string().uuid(),
  reason: z.string().trim().min(8, "Informe um motivo com contexto.").max(500),
});

export const accountIdSchema = z.object({
  accountId: z.string().uuid(),
});

export const startAccountSchema = accountIdSchema;

export const payoutProcessSchema = z.object({
  payoutId: z.string().uuid(),
  notes: z.string().trim().max(500).optional(),
});

export const adminProfileUpdateSchema = z.object({
  profileId: z.string().uuid(),
  role: z.enum(["admin", "operator", "captador"]),
  status: z.enum(["active", "inactive"]),
  whatsapp: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? normalizeBrazilianWhatsapp(value) : null))
    .refine((value) => value === null || /^55\d{10,11}$/.test(value), {
      message: "Informe um WhatsApp brasileiro válido com DDD.",
    }),
  captadorCommissionOverride: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? Number(value) : null))
    .refine((value) => value === null || (Number.isFinite(value) && value > 0), {
      message: "Informe um valor positivo.",
    }),
  operatorCommissionOverride: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? Number(value) : null))
    .refine((value) => value === null || (Number.isFinite(value) && value > 0), {
      message: "Informe um valor positivo.",
    }),
});

export const appSettingsSchema = z.object({
  commissionAmount: z.coerce.number().positive(),
  operatorCommissionAmount: z.coerce.number().positive(),
  referralBonus: z.coerce.number().positive(),
  referralTarget: z.coerce.number().int().positive(),
  operatorMinCompletedAccounts: z.coerce.number().int().min(0),
  operationalMinBatchSize: z.coerce.number().int().min(1).max(2),
  whatsappGroupUrl: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((value) => value || null)
    .refine((value) => value === null || /^https:\/\/(chat\.whatsapp\.com|wa\.me)\//.test(value), {
      message: "Informe uma URL segura de grupo WhatsApp.",
    }),
  requireNewAccountPrint: z
    .string()
    .optional()
    .transform((value) => value === "on"),
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
  captadorId: z.string().uuid().or(z.literal("")).optional(),
  captadorCommissionOverride: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? Number(value) : null))
    .refine((value) => value === null || (Number.isFinite(value) && value > 0), {
      message: "Informe um valor positivo.",
    }),
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

export const adminRoleActionSchema = z
  .object({
    email: z.string().trim().email("Informe o e-mail do usuário."),
    action: z.enum(["promote", "revoke"]),
    confirmation: z.string().trim().optional(),
  })
  .refine(
    (value) => value.action === "promote" || value.confirmation === "REVOGAR ADMIN",
    {
      message: "Digite REVOGAR ADMIN para confirmar.",
      path: ["confirmation"],
    },
  );

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

export function validationError(message: string, error: z.ZodError): ActionState {
  return {
    ok: false,
    message,
    fieldErrors: error.flatten().fieldErrors,
  };
}

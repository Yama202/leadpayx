import type { AccountStatus, EarningStatus, UserRole } from "@/lib/types";

export const BRAND_NAME = "LeadPayX";
export const BRAND_SLOGAN = "Controle leads. Distribua operações. Pague resultados.";

export const COMMISSION_AMOUNT_BRL = 30;
export const REFERRAL_BONUS_BRL = 60;
export const REFERRAL_COMPLETED_ACCOUNTS_TARGET = 2;
export const DEFAULT_OPERATOR_BATCH_SIZE = 2;

export const roleHome: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  operator: "/operador/dashboard",
  captador: "/captador/dashboard",
};

export const accountStatusLabel: Record<AccountStatus, string> = {
  pending: "Pendente",
  assigned: "Atribuída",
  in_progress: "Em andamento",
  completed: "Finalizada",
  rejected: "Recusada",
  rejected_no_balance: "Sem saldo",
  rejected_no_facial: "Selfie pendente",
  wrong_password: "Senha incorreta",
};

export const earningStatusLabel: Record<EarningStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
  canceled: "Cancelado",
};

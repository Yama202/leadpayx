export type UserRole = "admin" | "operator" | "captador";
export type ProfileStatus = "active" | "inactive" | "pending_approval";
export type AccountStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "completed"
  | "rejected"
  | "rejected_no_balance"
  | "rejected_no_facial"
  | "wrong_password";
export type EarningStatus = "pending" | "paid" | "canceled";
export type PayoutStatus = "pending" | "processed";

export type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  instagram: string | null;
  whatsapp: string | null;
  pix_key: string | null;
  referral_code: string;
  referred_by: string | null;
  status: ProfileStatus;
  referral_bonus_paid: boolean;
  /** @deprecated Ignorado no cálculo; comissão vem de `app_settings`. */
  captador_commission_override: number | null;
  /** @deprecated Ignorado no cálculo; comissão vem de `app_settings`. */
  operator_commission_override: number | null;
  registration_link_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Account = {
  id: string;
  captador_id: string;
  operador_id: string | null;
  status: AccountStatus;
  account_identifier: string;
  account_notes: string | null;
  /** E-mail de login do lead (texto; visível ao captador dono e a papéis operacionais). */
  lead_account_email: string | null;
  /** Presente apenas em selects explícitos; nunca enviar ao cliente do captador. */
  lead_account_secret_cipher?: string | null;
  account_print_path: string | null;
  source_registration_link_id: string | null;
  operation_started_at: string | null;
  operation_deadline_at: string | null;
  reassigned_at: string | null;
  reassign_reason: string | null;
  last_operator_id: string | null;
  rejection_reason: string | null;
  wrong_password_at: string | null;
  created_at: string;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  rejected_at: string | null;
  updated_at: string;
  /** Operador que concluiu a operação (imutável após finalização). */
  completed_by_operador_id?: string | null;
  /** Informado pelo operador ao finalizar: destino/conta do saldo (visível ao captador). */
  operator_balance_destination?: string | null;
  /** Saldo inicial da conta informado pelo operador ao finalizar (contas únicas). */
  balance_initial_brl?: number | null;
  /** Saldo após a operação informado pelo operador ao finalizar (contas únicas). */
  balance_final_brl?: number | null;
  /** Oferta/casa selecionada pelo captador no envio. */
  promotion_offer_id?: string | null;
  promotion_offer_name?: string | null;
};

export type Earning = {
  id: string;
  user_id: string;
  account_id: string | null;
  referral_user_id: string | null;
  type: "account_completed" | "operator_account_completed" | "referral_bonus";
  amount: number;
  status: EarningStatus;
  created_at: string;
  paid_at: string | null;
};

export type UserNotification = {
  id: string;
  user_id: string;
  kind: "account_approved";
  title: string;
  body: string;
  metadata: {
    account_id?: string;
    commission_brl?: number;
    account_identifier?: string;
    balance_destination?: string | null;
  };
  read_at: string | null;
  created_at: string;
};

export type Payout = {
  id: string;
  user_id: string;
  amount: number;
  /** Valor efetivamente pago pelo admin — nulo = igual a amount. */
  amount_paid: number | null;
  status: PayoutStatus;
  payment_proof_url: string | null;
  notes: string | null;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
};

export type RegistrationLink = {
  id: string;
  code: string;
  label: string;
  role: "captador" | "operator";
  status: ProfileStatus;
  origin: string | null;
  campaign: string | null;
  captador_id: string | null;
  captador_commission_override: number | null;
  expires_at: string | null;
  max_uses: number | null;
  uses_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AppSetting = {
  key: string;
  value: string | number | boolean | Record<string, unknown> | null;
  updated_at?: string;
  updated_by?: string | null;
};

/** Links de operação globais exibidos a todos os captadores (URLs externas). */
export type CaptadorGlobalOffer = {
  id: string;
  name: string;
  url_base: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PromotionOffer = {
  id: string;
  name: string;
  description: string;
  reward_amount: number;
  min_deposit_brl: number | null;
  max_deposit_brl: number | null;
  cycle_deposit_brl: number | null;
  only_new_accounts: boolean;
  /** Quando true, o captador deve enviar em par (2 contas) para que o operador opere. Default true. */
  requires_pair: boolean;
  promotion_url: string;
  status: ProfileStatus;
  valid_until: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ReferralSummary = {
  profile_id: string;
  name: string | null;
  created_at: string;
  completed_accounts: number;
  qualified: boolean;
  bonus_paid: boolean;
};

/** Admin solicita envios com comprovante de depósito ≥ valor (BRL). */
export type CaptadorSubmissionBrief = {
  captador_id: string;
  min_deposit_brl: number;
  updated_at: string;
  updated_by: string | null;
};

export type FinancialSummary = {
  user_id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  pending_amount: number;
  paid_amount: number;
  pending_payout_amount: number;
  processed_payout_amount: number;
  processed_payouts: number;
  amount_paid_total: number;
};

export type CaptadorOfferRate = {
  id: string;
  captador_id: string;
  offer_id: string;
  commission_amount: number;
  created_at: string;
  updated_at: string;
};

export type PromotionOfferBasic = {
  id: string;
  name: string;
  status: string;
};

export type CaptadorRanking = {
  captador_id: string;
  name: string | null;
  email: string | null;
  accounts_submitted: number;
  completed_accounts: number;
  rejected_accounts: number;
  completion_rate: number;
  rejection_rate: number;
  generated_amount: number;
  active_days: number;
  score: number;
};

export type CaptadorLoan = {
  id: string;
  captador_id: string;
  amount: number;
  remaining_amount: number;
  notes: string | null;
  status: "active" | "paid";
  created_by: string;
  created_at: string;
  paid_at: string | null;
  updated_at: string;
};

export type CaptadorLoanRepayment = {
  id: string;
  loan_id: string;
  amount: number;
  kind: "captador_claim" | "payout_deduction" | "admin_adjustment";
  status: "pending" | "approved" | "rejected";
  claimed_by: string | null;
  approved_by: string | null;
  notes: string | null;
  created_at: string;
  approved_at: string | null;
};

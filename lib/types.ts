export type UserRole = "admin" | "operator" | "captador";
export type ProfileStatus = "active" | "inactive";
export type AccountStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "completed"
  | "rejected";
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
  account_print_path: string | null;
  source_registration_link_id: string | null;
  operation_started_at: string | null;
  operation_deadline_at: string | null;
  reassigned_at: string | null;
  reassign_reason: string | null;
  last_operator_id: string | null;
  rejection_reason: string | null;
  created_at: string;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  rejected_at: string | null;
  updated_at: string;
  /** Operador que concluiu a operação (imutável após finalização). */
  completed_by_operador_id?: string | null;
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

export type Payout = {
  id: string;
  user_id: string;
  amount: number;
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

export type PromotionOffer = {
  id: string;
  name: string;
  description: string;
  reward_amount: number;
  promotion_url: string;
  status: ProfileStatus;
  valid_until: string | null;
  display_order: number;
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

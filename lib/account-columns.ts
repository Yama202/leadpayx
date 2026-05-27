/** Campos de conta sem o cofre de senha (captador / listagens seguras). */
export const ACCOUNT_SELECT_CAPTADOR =
  "id,captador_id,operador_id,status,account_identifier,account_notes,lead_account_email,account_print_path,source_registration_link_id,operation_started_at,operation_deadline_at,reassigned_at,reassign_reason,last_operator_id,rejection_reason,created_at,assigned_at,started_at,completed_at,rejected_at,updated_at,completed_by_operador_id,operator_balance_destination,promotion_offer_id,promotion_offer_name";

/** Fallback para ambientes com schema parcial durante rollout de migrations. */
export const ACCOUNT_SELECT_CAPTADOR_FALLBACK =
  "id,captador_id,operador_id,status,account_identifier,account_notes,lead_account_email,account_print_path,rejection_reason,created_at,assigned_at,started_at,completed_at,rejected_at,updated_at";

/** Operador/admin: inclui blob cifrado para decifrar no servidor. */
export const ACCOUNT_SELECT_WITH_SECRET = `${ACCOUNT_SELECT_CAPTADOR},lead_account_secret_cipher`;

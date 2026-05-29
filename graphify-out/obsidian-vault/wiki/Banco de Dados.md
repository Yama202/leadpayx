# Banco de Dados

Tabelas principais, campos importantes, RPCs e audit_logs.

Ver também: [[Sistema]] · [[Fluxos]] · [[Funcoes Criticas]]

---

## Tabelas Principais

### `profiles`

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | uuid | PK, igual ao `auth.users.id` |
| `name` | text | |
| `email` | text | |
| `role` | text | `captador`, `operator`, `admin` — **imutável pelo usuário** |
| `status` | text | `pending_approval`, `active`, `inactive` |
| `whatsapp` | text | |
| `pix_key` | text | Obrigatório para solicitar payout |
| `referral_code` | text | Código único para indicações |
| `referred_by` | uuid | FK → profiles |

### `accounts`

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | uuid | PK |
| `captador_id` | uuid | FK → profiles |
| `operador_id` | uuid | FK → profiles — operador atual |
| `status` | text | `pending`, `assigned`, `in_progress`, `completed`, `rejected`, `rejected_no_balance`, `rejected_no_facial` |
| `account_identifier` | text | Identificador da conta |
| `lead_account_email` | text | Email da conta do lead |
| `lead_account_secret_cipher` | text | Senha AES-256 cifrada |
| `operator_balance_destination` | text | Para onde foi o saldo (texto livre) |
| `rejection_reason` | text | Mín. 8 chars |
| `operation_deadline_at` | timestamptz | SLA — cron reassigna se vencer |
| `completed_by_operador_id` | uuid | Imutável após conclusão |
| `promotion_offer_id` | uuid | FK → promotion_offers |
| `source_registration_link_id` | uuid | FK → registration_links |

### `earnings`

| Campo | Notas |
|-------|-------|
| `type` | `account_completed`, `referral_bonus`, `operator_account_completed` |
| `status` | `pending`, `paid` |
| `user_id` | Quem recebe |
| `account_id` | Conta associada |
| `amount` | Valor em BRL |

### `payouts`

| Campo | Notas |
|-------|-------|
| `status` | `pending`, `processed` |
| `amount` | Valor solicitado |
| `amount_paid` | Valor realmente pago (pode diferir de `amount`) |
| `payment_proof_url` | URL do comprovante |

### `payout_earnings`

Join table — liga payout aos earnings específicos. Usado por `mark_payout_as_processed` para não fazer sweep global.

### `audit_logs`

| Campo | Notas |
|-------|-------|
| `action` | Ex: `account.submitted`, `admin.captador_approved`, `captador_offer_rate.set` |
| `entity_type` | `account`, `profile`, `registration_link`, `promotion_offer`, `captador_offer_rate` |
| `entity_id` | UUID do objeto afetado |
| `metadata` | JSONB com contexto adicional |
| `user_id` | Quem executou (null = sistema) |

#### Ações de conta registradas

| Action | Quando |
|--------|--------|
| `account.submitted` | Captador enviou conta |
| `account.assigned` | Conta atribuída ao operador |
| `account.operation_started` | Operador iniciou trabalho |
| `account.operation_completed` | Conta concluída |
| `account.rejected` | Conta recusada |
| `account.requeued` | Devolvida para fila |
| `account.sla_reassigned` | Reatribuída por SLA vencido |

---

## Tabelas de Features Novas

### `captador_offer_rates`

Override de comissão por captador + oferta específica. Tem prioridade máxima em `get_captador_commission`.

| Campo | Notas |
|-------|-------|
| `captador_id` | FK → profiles |
| `offer_id` | FK → promotion_offers |
| `commission_amount` | Valor em BRL |
| Constraint unique | `(captador_id, offer_id)` |

Ver [[Features Recentes#Comissão por Oferta por Captador]].

### `captador_loans`

Empréstimos do admin para captadores (deduzidos automaticamente nos payouts).

| Campo | Notas |
|-------|-------|
| `captador_id` | FK → profiles |
| `amount` | Valor original |
| `remaining_amount` | Saldo devedor atual |
| `status` | `active`, `paid_off` |

Ver [[Features Recentes#Empréstimos de Captadores]].

### `xxx_web_push_subscriptions`

Uma tabela por papel:
- `captador_web_push_subscriptions`
- `operator_web_push_subscriptions`
- `admin_web_push_subscriptions`

Cada linha = um dispositivo/browser inscrito. Endpoint único por row.

Ver [[Features Recentes#Push Notifications Admin]].

---

## RPCs principais

| RPC | O que faz |
|-----|-----------|
| `get_captador_commission(captador_id, account_id)` | Retorna comissão com precedência: offer_rate → link override → global |
| `get_financial_summary(from, to)` | Resumo financeiro por usuário (usado em admin/pagamentos) |
| `assign_account_to_operator(account_id)` | Atribui conta ao operador com menor carga |
| `complete_account(account_id, balance_destination)` | Finaliza conta, gera earnings, notifica captador |
| `reject_account(account_id, reason, rejection_type)` | Recusa conta, registra motivo, notifica captador |
| `mark_payout_as_processed(payout_id, amount_paid)` | Marca payout + earnings linkados como pagos |
| `set_captador_offer_rate(captador_id, offer_id, amount)` | Upsert override de comissão |
| `delete_captador_offer_rate(captador_id, offer_id)` | Remove override |

---

## `app_settings` — Configurações Globais

| Chave | Descrição |
|-------|-----------|
| `captador_commission_per_account` | R$ por conta para captador (global) |
| `operator_commission_per_account` | R$ por conta para operador |
| `referral_bonus_base_brl` | Valor do bônus de indicação |
| `referral_completed_accounts_target` | Contas para acionar bônus |
| `referral_bonus_enabled` | Liga/desliga indicações |
| `operational_min_batch_size` | Tamanho do lote (1 ou 2) |
| `require_new_account_print` | Obriga comprovante no envio |
| `require_selfie_confirmation` | Obriga confirmação de selfie antes de enviar |
| `whatsapp_group_url` | Link do grupo exibido para captadores |
| `show_captador_whatsapp_to_operator` | Mostra WhatsApp do captador ao operador |

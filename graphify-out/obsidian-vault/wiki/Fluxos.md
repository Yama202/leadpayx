# Fluxos

Passo-a-passo de cada fluxo ligado ao grafo de código.

Ver também: [[Sistema]] · [[Funcoes Criticas]] · [[Banco de Dados]]

---

## Fluxo do Captador

1. **Aquisição** — Pode chegar por referral (`buildRegisterHref`, UTMs — Community **6**).
2. **Registo e perfil** — Após Auth, completar perfil (`completeProfileAction`, formulários Community **2**/**3**): Pix (`isValidPixKey`, Community **7**), dados obrigatórios.
3. **Brief / depósito** — `getCaptadorSubmissionBrief`, `clearCaptadorDepositBriefAction` (Community **0**/**4**).
4. **Submissão de contas** — `submitAccountAction`; contas ficam ligadas a `captador_id`. Dispara push para operadores e admins.
5. **Acompanhamento** — Dashboard com contas, ganhos, `ReferralBox`, `CaptadorNotificationsSection`; avisos em `/captador/avisos`.
6. **Notificações e push** — `user_notifications` + Web Push (`registerCaptadorPushSubscriptionAction`). Push quando conta concluída ou rejeitada.
7. **Pagamentos** — Pedidos de payout alinhados a `earnings` / `payouts`.

---

## Fluxo do Operador

1. **Fila** — `OperatorQueueAutoRefresh`, `OperatorPickBatchForm` (Community **1**).
2. **Pegar ciclo** — `pickNextBatchAction` — só quando não há contas atribuídas; caso contrário deve **finalizar ou recusar** o ciclo atual primeiro.
3. **Trabalhar o lote** — Contas chegam em `assigned` (ou `in_progress`); o ciclo é tratado como um bloco.
4. **Painel único de ciclo** — `OperatorWorkPanel`:
   - `completeOperatorCycleAction` finaliza **todas** as contas do lote;
   - Com **2 contas**: operador escolhe a linha destino → mensagem automática gerada (`lib/operator-cycle-balance-message.ts`);
   - Com **1 conta**: texto livre (mín. 8 chars);
   - `rejectAccountAction` recusa **uma** conta por vez.
5. **Após conclusão** — Push ao captador + push ao admin.
6. **Recusa** — Motivos pré-definidos + texto livre; push ao captador + push ao admin.
7. **RPC** — `complete_account` por conta (em sequência no ciclo).
8. **Regras de negócio** — `operatorCanProgressAccount` e `isTerminalAccountStatus` (Community **14**).

Erros redirecionam com query `op_error` (ex.: `complete`, `start`, `complete_balance`).

---

## Fluxo do Admin

1. **Painel** — Métricas agregadas, rankings (`get_financial_summary`, `get_captador_ranking`).
2. **Contas** — Auditoria de contas, URLs de print assinadas, QR Pix, **timeline de eventos** por conta (via `audit_logs`). Ver [[Features Recentes#Timeline de Contas]].
3. **Pagamentos** — `processPayoutAction`, `ensurePayoutAction`.
4. **Configuração** — `updateAppSettingsAction`, comissões globais, links, push notifications admin. Ver [[Features Recentes#Push Notifications Admin]].
5. **Governança** — `adminUpdateProfileAction`, `adminDeleteManagedUserAction`, `setAdminRoleAction`.
6. **Captadores** — Aprovar, editar, ver contas, empréstimos, comissões por oferta. Ver [[Features Recentes#Empréstimos de Captadores]] e [[Features Recentes#Comissão por Oferta por Captador]].

---

## Fluxo de Cadastro e Complete-Profile

1. **Registo** — `registerAction` (Community **2**); cria usuário em Supabase Auth + perfil (triggers em migrations).
2. **Sessão sem perfil completo** — `redirectAuthenticatedUser` ou `getCurrentAuthState` envia para `/complete-profile`.
3. **Complete profile** — `CompleteProfileForm`, `completeProfileAction`; pode envolver `normalizeReferralCode`.
4. **Destino final** — Usuário ativo com papel → home por papel (`roleHome` em `lib/constants`).

---

## Fluxo de Payout e Comissões

### Payout

- **`payouts`** — pedidos com estado `pending` / `processed`; processamento admin.
- **`payout_earnings`** — join table ligando payout aos earnings específicos. `mark_payout_as_processed` só marca os earnings ligados via esta tabela (nunca faz sweep global).
- Captador e operador têm páginas de pagamentos separadas.

### Comissões

- **Globais** — `app_settings` + formulários admin; resolvers `resolveCaptadorCommissionPerAccount` e `resolveOperatorCommissionPerAccount`.
- **Por captador + oferta** — `captador_offer_rates` (override máxima precedência). Ver [[Features Recentes#Comissão por Oferta por Captador]].
- **Por link de cadastro** — `registration_links.captador_commission_override`.
- **Ganhos** — registos em `earnings` (tipos: `account_completed`, `referral_bonus`).

---

## Fluxo Web Push

```
Usuário ativa push no browser
    │  registerXxxPushSubscriptionAction
    ▼
Salvo em xxx_web_push_subscriptions
    │
    │  Evento acontece (ex.: conta concluída)
    ▼
JS chama notifyXxx() em lib/web-push/
    │  web-push library (VAPID)
    ▼
Browser recebe notificação
```

### Tabelas de subscriptions

| Tabela | Quem usa |
|--------|---------|
| `captador_web_push_subscriptions` | Captadores |
| `operator_web_push_subscriptions` | Operadores |
| `admin_web_push_subscriptions` | Admins |

### Eventos que disparam push ao admin

| Evento | Função |
|--------|--------|
| Conta enviada por captador | `notifyAdminsOnNewAccount` |
| Conta concluída pelo operador | `notifyAdminsOnAccountCompleted` |
| Conta recusada pelo operador | `notifyAdminsOnAccountRejected` |

---

## Fluxo de Cron — SLA de Operadores

**Rota:** `GET /api/cron/reassign-sla` (Vercel Cron)

```
Busca contas "in_progress" com operation_deadline_at vencido
    │
    ▼
Remove o operador atual
    │
    ▼
Volta para status "pending" (entra na fila novamente)
    │
    ▼
Registra reassign_reason + reassigned_at em audit_logs
```

# Fluxos

Descrição dos fluxos principais do LeadPayX, alinhada ao grafo (**GRAPH_REPORT.md** / `graph.json`) e aos nomes das Server Actions referenciados nos nós.

## Fluxo do captador

1. **Aquisição** — Pode chegar por referral (`buildRegisterHref`, UTMs — Community **6**).
2. **Registo e perfil** — Após Auth, completar perfil (`completeProfileAction`, formulários Community **2**/ **3**): Pix (`isValidPixKey`, Community **7**), dados obrigatórios.
3. **Brief / depósito** — `getCaptadorSubmissionBrief`, `clearCaptadorDepositBriefAction` (Community **0**/ **4**).
4. **Submissão de contas** — `submitAccountAction` / variantes de formulário; contas ficam ligadas a `captador_id`.
5. **Acompanhamento** — Dashboard com contas, ganhos, `ReferralBox`, `CaptadorNotificationsSection`; avisos em `/captador/avisos`.
6. **Notificações e push** — `user_notifications`; web push (**Community 11**: `registerCaptadorPushSubscriptionAction`, …).
7. **Pagamentos** — Pedidos de payout alinhados a `earnings` / `payouts` (ver secção payout abaixo).

## Fluxo do operador

1. **Fila** — `OperatorQueueAutoRefresh`, `OperatorPickBatchForm` (Community **1**).
2. **Pegar lote** — `pickNextBatchAction`, variantes de estado (`pickNextBatchStateAction`, …).
3. **Trabalhar conta** — `startAccountAction` quando aplicável; estados `assigned` / `in_progress`.
4. **Painel único de ciclo** — Na dashboard, **`OperatorWorkPanel`** concentra iniciar trabalho, **finalizar** (`completeAccountAction`) e **recusar** (`rejectAccountAction`), sem formulários duplicados nos cartões.
5. **Destino do saldo ao concluir** — Textos fixos alinhados ao domínio em **`lib/operator-balance-destinations.ts`** (valor enviado no form como `balanceDestination`).
6. **Recusa** — Motivos pré-definidos + texto livre opcional; validação em **`rejectAccountSchema`** (`lib/validation.ts`).
7. **Recusa ou conclusão (servidor)** — `rejectAccountFormAction` → `rejectAccountAction`; `completeAccountAction` com regras de saldo/destino conforme migrations e push ao captador quando aplicável.
8. **Regras de negócio** — **`operatorCanProgressAccount`** e **`isTerminalAccountStatus`** (Community **14**) alinham UI e servidor com a máquina de estados em `accounts`.

Erros de fluxo podem redirecionar com query `op_error` (ex.: `complete`, `start`, `complete_balance`) para mensagens na dashboard do operador.

## Fluxo do admin

1. **Painel** — Métricas agregadas, rankings (RPCs como `get_financial_summary`, `get_captador_ranking`, métricas de referral validado — conforme páginas em `app/admin/dashboard`).
2. **Contas** — Auditoria de contas, URLs de print assinadas, QR Pix de captadores (leitura privilegiada).
3. **Pagamentos** — `processPayoutAction`, `ensurePayoutAction`, formulários associados.
4. **Configuração** — `updateAppSettingsAction`, comissões globais (**Community 12**), links de registo, ofertas.
5. **Governança de utilizadores** — `adminUpdateProfileAction`, `adminDeleteManagedUserAction`, `setAdminRoleAction` com tratamento de erros **Community 13**.

## Fluxo de cadastro e complete-profile

1. **Registo** — `registerAction`, `registerFormAction` (Community **2**); cria utilizador em Supabase Auth e perfil (triggers em migrations).
2. **Sessão sem perfil completo** — `redirectAuthenticatedUser` (Community **3**) ou `getCurrentAuthState` envia para **`/complete-profile`** quando há `userId` mas perfil inválido/incompleto.
3. **Complete profile** — `CompleteProfileForm`, `completeProfileAction`; pode envolver `normalizeReferralCode` (ligação inferida no grafo a partir de `CompleteProfilePage`).
4. **Destino final** — Utilizador ativo com papel → home por papel (`roleHome` em `lib/constants`).

## Fluxo de payout e comissões

### Payout (utilizador)

- **`payouts`** — pedidos com estado `pending` / `processed`; processamento admin (`processPayout` / forms).
- Ligação a **`payout_earnings`** (migration `production_hardening`) quando aplicável ao modelo de parcelas.
- **Captador** e **operador** têm páginas de pagamentos sob os respetivos segmentos.

### Comissões

- **Globais** — `app_settings` + formulários admin; resolvers **`resolveCaptadorCommissionPerAccount`** e **`resolveOperatorCommissionPerAccount`** com **`roundBrlHalfUp`** (Community **12**).
- **Ganhos** — registos em **`earnings`** (tipos como `account_completed`, `referral_bonus`, extensões em migrations).

Para superfície de dados, ver [banco-de-dados.md](./banco-de-dados.md).

# Features Recentes

Features implementadas na fase atual (maio/junho 2026). Cada seção documenta o que foi feito, onde está e como funciona.

Ver também: [[Sistema]] · [[Fluxos]] · [[Banco de Dados]]

---

## Timeline de Contas

**Onde:** `/admin/contas` — dentro de cada `AccountCard`

**O que é:** Cronologia completa de cada conta, exibida no painel admin. Mostra cada evento do ciclo de vida com timestamp e cor por tipo.

### Eventos exibidos

| Evento | Cor | Quando |
|--------|-----|--------|
| Enviada pelo captador | Cinza | Captador submete |
| Atribuída ao operador | Azul | Operador pega lote |
| Operação iniciada | Âmbar | Operador inicia trabalho |
| Concluída | Verde | Conta finalizada |
| Recusada | Rosa | Conta recusada |
| Devolvida à fila | Âmbar | Requeue após recusa |
| Reatribuída (SLA) | Violeta | Cron de SLA |

### Como funciona

1. `/admin/contas` faz batch fetch de `audit_logs` para todos os `account.id` da página atual
2. Agrupa por `entity_id` (= account id)
3. Passa como `children` ao `AccountCard`
4. `AccountTimeline` renderiza os eventos ordenados por `created_at`

### Arquivos

- `components/admin/account-timeline.tsx` — componente de UI
- `app/admin/contas/page.tsx` — batch fetch + passagem como children

---

## Push Notifications Admin

**Onde:** Ativado em `/admin/configuracoes` — seção "Notificações push (admin)"

**O que é:** O admin recebe push notification no browser/celular quando eventos de conta acontecem.

### Eventos que disparam push

| Evento | Função |
|--------|--------|
| Captador enviou conta | `notifyAdminsOnNewAccount` |
| Operador concluiu conta | `notifyAdminsOnAccountCompleted` |
| Operador recusou conta | `notifyAdminsOnAccountRejected` |

### Como ativar

1. Ir em `/admin/configuracoes`
2. Clicar "Ativar" no card "Notificações push (admin)"
3. Aceitar permissão do browser
4. Funciona igual ao push do operador/captador

> **Safari/iPhone:** Precisa instalar o site como PWA (Compartilhar → Adicionar à Tela Inicial) antes de ativar.

> **Troca de chave VAPID:** Se o browser tiver subscription antiga com chave diferente, o sistema desinscreve automaticamente antes de criar a nova (fix de `InvalidStateError`).

### Arquivos

- `supabase/migrations/20260529600000_admin_web_push_subscriptions.sql` — tabela
- `lib/actions/admin-push.ts` — server actions register/remove
- `lib/web-push/send-admin-account-event.ts` — funções de envio
- `components/admin/admin-push-settings.tsx` — UI de ativação
- `lib/actions/domain.ts` — wires nos 3 pontos (submit, complete, reject)

---

## Comissão por Oferta por Captador

**Onde:** `/admin/captadores` — dentro de cada captador expandido, painel "Comissões por oferta"

**O que é:** Override individual de quanto um captador específico recebe por uma oferta específica. Tem prioridade máxima na cadeia de comissão.

### Cadeia de precedência

```
1. captador_offer_rates           ← override admin por captador + oferta
2. registration_links override    ← override por link de cadastro
3. global (app_settings)         ← padrão
```

### Como usar (admin)

1. Abrir captador em `/admin/captadores`
2. No painel "Comissões por oferta": selecionar oferta + digitar valor → "Salvar taxa"
3. Para remover: botão "Remover" na linha da taxa existente

### Arquivos

- `supabase/migrations/20260529500000_captador_offer_rates.sql` — tabela + RPCs + atualização de `get_captador_commission`
- `components/admin/captador-offer-rates-panel.tsx` — UI do painel
- `lib/actions/domain.ts` — `setCaptadorOfferRateAction`, `deleteCaptadorOfferRateAction`
- `lib/validation.ts` — `setCaptadorOfferRateSchema`, `deleteCaptadorOfferRateSchema`

---

## Empréstimos de Captadores

**Onde:** `/admin/captadores` — dentro de cada captador expandido, painel "Empréstimos"

**O que é:** Admin pode registrar um empréstimo para um captador. O valor é descontado automaticamente do próximo payout.

### Fluxo

```
Admin registra empréstimo (valor + motivo)
    │
    ▼
captador_loans → status: active, remaining_amount = valor
    │
    ▼
Captador solicita payout
    │
    ▼
Sistema deduz remaining_amount do payout
    │
    ▼
captador_loan_repayments registrado
remaining_amount atualizado (ou status → paid_off)
```

### Regras

- Dedução automática no próximo payout via `deduct_loan_from_payout` RPC
- Admin pode ajustar `remaining_amount` manualmente se necessário
- Visível no dashboard do captador como "Débito ativo"

### Arquivos

- `supabase/migrations/20260528230000_captador_loans.sql` — tabelas + RPCs
- `components/admin/captador-loan-panel.tsx` — UI do painel
- `lib/actions/domain.ts` — actions de criação, repagamento, ajuste
- `components/domain/captador-deposit-brief-banner.tsx` — banner de dívida no dashboard do captador

---

## Contabilidade de Operadores (fix)

**Problema:** `mark_payout_as_processed` fazia sweep global de todos os earnings `pending` do usuário, em vez de marcar apenas os ligados ao payout.

**Fix:** A função agora usa `payout_earnings` join table para identificar exatamente quais earnings pertencem ao payout sendo processado.

**Arquivo:** `supabase/migrations/20260529400000_fix_mark_payout_earnings_and_summary.sql`

---

## Painel de Pagamentos Captadores (melhorias)

**Onde:** `/admin/pagamentos/captadores`

### Melhorias

- Coluna "Pago (pix)" — valor do `amount_paid` do payout (quanto foi realmente enviado)
- Coluna "Comissões pagas" — soma das comissões marcadas como pagas em `earnings`
- Captadores com `referral_bonus` pendente também aparecem na lista de pendentes (antes só `account_completed` era verificado)
- `get_financial_summary` retorna novo campo `amount_paid_total` para reconciliação

**Arquivo:** `app/admin/pagamentos/_components/payments-by-role.tsx`

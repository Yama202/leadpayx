# Funções e Componentes Críticos

Referência aos **hubs** do grafo com semântica confirmada no código. Útil para onboarding e auditorias.

Ver também: [[Sistema]] · [[Fluxos]] · [[Banco de Dados]]

---

## `requireRole()`

- **Local:** `lib/auth.ts`
- **Grafo:** ~56 arestas (maior hub).
- **Comportamento:** `requireProfile()` → verifica `profile.role ∈ roles` → caso contrário `redirect('/access-denied')`.
- **Uso:** páginas RSC sob `/captador`, `/operador`, `/admin`; no início das Server Actions sensíveis.

---

## `createClient()`

- **Local:** `lib/supabase/server.ts`
- **Grafo:** ~30 arestas.
- **Comportamento:** cliente Supabase SSR com cookies; **RLS ativo**.
- **Uso:** dados em páginas servidor, actions que operam "como o utilizador".

---

## `createAdminClient()`

- **Local:** `lib/supabase/admin.ts`
- **Grafo:** ~14 arestas.
- **Comportamento:** cliente com **service role** — ignora RLS; só em ambiente servidor.
- **Uso:** leituras globais (settings, briefs, push interno, cron), ou caminhos controlados em `lib/actions/domain.ts`.
- **Atenção:** nunca expor no browser. Erros de import server-only geram `CRON_SECRET is not defined` — usar `createAdminClient()` sem argumentos.

---

## `formDataToObject()`

- **Grafo:** ~26 arestas (hub #3).
- **Papel:** converter `FormData` de formulários para objetos antes de validação Zod — padrão transversal nas actions.

---

## `RoleBasedLayout()`

- **Grafo:** ~22 arestas.
- **Papel:** UI com navegação por papel (sidebar, títulos, ações). **Não é segurança** — apenas UX.

---

## `operatorCanProgressAccount()` + `isTerminalAccountStatus()`

- **Local:** `lib/account-operation.ts`
- **Grafo:** Community **14** (coesão alta ~0.83).
- **Papel:** validam se o operador pode avançar o estado de uma conta e se o estado é terminal.

---

## `OperatorWorkPanel` + destinos de saldo

- **UI:** `components/domain/operator-work-panel.tsx`
- `completeOperatorCycleAction`: com **2 contas** → radio escolhe linha destino → mensagem automática; com **1 conta** → texto livre.
- **Validação:** `completeOperatorCycleSchema`, `rejectAccountSchema` em `lib/validation.ts`.
- **Mensagem 2-contas:** `lib/operator-cycle-balance-message.ts`.

---

## `get_captador_commission()` RPC

- **Local:** `supabase/migrations/20260529500000_captador_offer_rates.sql`
- **Precedência:**
  1. `captador_offer_rates` (override por captador + oferta) ← máxima prioridade
  2. `registration_links.captador_commission_override` (override por link)
  3. `captador_commission_per_account` global
- Ver [[Features Recentes#Comissão por Oferta por Captador]].

---

## `mark_payout_as_processed()` RPC

- **Comportamento:** marca como `paid` **apenas** os earnings ligados via `payout_earnings` join table — **nunca** faz sweep global.
- **Atenção:** versão antiga fazia sweep global causando contabilidade errada. Corrigido em migration `20260529400000`.

---

## `createAuditLog()`

- **Local:** `lib/actions/domain.ts`
- **Papel:** insere registro em `audit_logs` com action, entity_type, entity_id, metadata.
- **Usado em:** account.submitted, admin.captador_approved, admin.reset_user_data, profile.admin_updated, captador_offer_rate.set, etc.

---

## Outros nós de alto grau

| Nó | Arestas (ref.) | Notas |
|----|-----------------|-------|
| `validationError()` | ~14 | Respostas de erro uniformes em actions |
| `buildRegisterHref()` | ~15 | Links de registo com ref/UTM |
| `getWhatsappGroupUrl()` | ~13 | Settings via admin client |
| `SubmitButton()` | — | Botão com estado pendente + spinner para Server Actions |

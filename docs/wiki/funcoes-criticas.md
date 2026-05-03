# Funções e componentes críticos

Referência aos **hubs** do **GRAPH_REPORT.md** com semantics confirmadas no código onde indicado. Útil para onboarding e auditorias.

## `requireRole()`

- **Local:** `lib/auth.ts`
- **Grafo:** ~56 arestas (maior hub).
- **Comportamento:** `requireProfile()` → verifica `profile.role ∈ roles` → caso contrário `redirect('/access-denied')`.
- **Uso:** páginas RSC sob `/captador`, `/operador`, `/admin`; também no início das Server Actions sensíveis.

## `createClient()`

- **Local:** `lib/supabase/server.ts` (`export async function createClient`)
- **Grafo:** ~30 arestas.
- **Comportamento:** cliente Supabase SSR com cookies; **RLS ativo**.
- **Uso:** dados em páginas servidor, actions que operam “como o utilizador”.

## `createAdminClient()`

- **Local:** `lib/supabase/admin.ts`
- **Grafo:** ~14 arestas.
- **Comportamento:** cliente com **service role** — ignora RLS; só em ambiente servidor.
- **Uso:** leituras globais necessárias (settings, briefs, push interno, cron), ou caminhos muito controlados em `lib/actions/domain.ts`.

## `formDataToObject()`

- **Grafo:** ~26 arestas (hub #3).
- **Papel:** converter `FormData` de formulários para objetos antes de validação Zod — padrão transversal nas actions.
- **Nota:** ~23 arestas inferidas no relatório — validar mapeamento real ao alterar forms.

## `RoleBasedLayout()`

- **Grafo:** ~22 arestas.
- **Papel:** UI com navegação por papel (sidebar, títulos, ações). **Não é segurança** — apenas UX.

## `operatorCanProgressAccount()`

- **Local:** `lib/account-operation.ts` (com testes em `account-operation.test.ts`)
- **Grafo:** Community **14** (coesão alta ~0,83).
- **Papel:** indica se o operador pode avançar o estado de uma conta segundo regras de negócio (alinhado com `accounts.status` e possivelmente assignments).

## `isTerminalAccountStatus()`

- **Local:** `lib/account-operation.ts`
- **Grafo:** mesmo cluster que `operatorCanProgressAccount`.
- **Papel:** determina se o estado da conta é terminal (ex.: `completed`, `rejected`) para impedir transições inválidas.

## `OperatorWorkPanel` + destinos de saldo

- **UI:** `components/domain/operator-work-panel.tsx` — **Finalizar ciclo** (`completeOperatorCycleAction`): com 2 contas, conclui ambas num envio (1ª → texto principal, 2ª → alternativo); com 1 conta, o operador escolhe principal/alternativo; **recusar** (`rejectAccountAction`) por conta.
- **Labels de destino:** `lib/operator-balance-destinations.ts`.
- **Validação:** `completeOperatorCycleSchema` e `rejectAccountSchema` em `lib/validation.ts`.

## `SubmitButton` / feedback de formulário

- **UI:** `components/ui/forms.tsx` — botão de submit com estado pendente e spinner (`components/ui/spinner.tsx`) para Server Actions que demoram.

## Outros nós de alto grau (referência rápida)

| Nó | Arestas (ref.) | Notas |
|----|------------------|-------|
| `validationError()` | ~14 | Respostas de erro uniformes em actions |
| `buildRegisterHref()` | ~15 | Links de registo com ref/UTM |
| `getWhatsappGroupUrl()` | ~13 | Settings via admin client |

Para riscos associados a estes pontos, ver [riscos-e-refatoracao.md](./riscos-e-refatoracao.md).

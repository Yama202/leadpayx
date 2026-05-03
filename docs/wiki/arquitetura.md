# Arquitetura

## Arquitetura geral

LeadPayX segue o padrão **BFF implícito no Next.js**: páginas e layouts **React Server Components** obtêm dados via **`createClient()`** (Supabase SSR); mutações sensíveis via **Server Actions** (`"use server"`) que também validam papel com **`requireRole()`** ou equivalente. Um **`proxy.ts`** (Next 16+, substituto do middleware na raiz) intercetam pedidos a rotas autenticadas para **renovar cookies de sessão** quando existe cookie `sb-*auth-token*` — não substituem a autorização nas páginas.

O relatório Graphify (**GRAPH_REPORT.md**) resume o código como **358 nós / 692 arestas**, com **14 comunidades**. Os **God nodes** (maior centralidade) são:

| Ordem | Nó | Papel |
|------|-----|--------|
| 1 | `requireRole()` | Bloqueio por papel em rotas servidor |
| 2 | `createClient()` | Acesso Postgres como utilizador |
| 3 | `formDataToObject()` | Normalização de formulários → actions |
| 4 | `RoleBasedLayout()` | Shell com navegação por papel |

Isto confirma uma arquitetura **centrada em auth + dados Supabase + formulários server**.

## Módulos principais (comunidades do grafo)

Resumo alinhado ao **GRAPH_REPORT.md** — nomes **Community N** são os do relatório.

| Comunidade | Coesão (ref.) | Função resumida |
|------------|----------------|-----------------|
| **0** | ~0,09 | Actions de domínio: contas, lotes operador, payouts, perfil admin, settings (`completeProfileAction`, `completeAccount`, `assignNextBatchToOperator`, …). **Módulo mais denso e menos coeso.** |
| **1** | ~0,07 | UI área autenticada: `RoleBasedLayout`, notificações captador, fila operador (`OperatorPickBatchForm`), **`OperatorWorkPanel`** (ciclo operador), referral, cartões de conta. |
| **2** | ~0,07 | Auth formulários: login, registo, logout. |
| **3** | ~0,13 | Páginas públicas/marketing e `complete-profile`, redirects. |
| **4** | ~0,15 | Infra: `proxy`, env, `createClient`, `getCaptadorSubmissionBrief`, cookies. |
| **5** | ~0,12 | E2E / harness (login UI, estado). |
| **6** | ~0,13 | Ofertas globais captador, URLs e promoções. |
| **7** | ~0,23 | Pix: validação, máscara admin, `formDataStringFields`. |
| **8** | ~0,47 | Seeds E2E. |
| **9** | ~0,28 | Navegação sidebar / tema local do layout. |
| **10** | ~0,25 | Tema global (`ThemeProvider`, root layout). |
| **11** | ~0,32 | Web Push captador (subscrições). |
| **12** | ~0,46 | Comissões globais admin (`GlobalCommissionForm`, resolvers). |
| **13** | ~0,73 | Erros RPC mudança de papel admin. |
| **14** | ~0,83 | Regras de estado de conta (`isTerminalAccountStatus`, `operatorCanProgressAccount`). |
| **15** | ~0,67 | Pesquisa segura (`sanitizeIlikeSearchTerm`, …). |

## Next.js, Supabase, Server Actions e UI

### Next.js

- **App Router**: segmentos `app/captador/*`, `app/operador/*`, `app/admin/*` por papel; rotas públicas em paralelo (`login`, `register`, FAQ, etc.).
- **Layouts**: shell partilhado em `app/layout.tsx`; áreas por papel usam **`RoleBasedLayout`** para chrome (sidebar, título, ações).
- **Loading**: ficheiros `loading.tsx` por segmento (ex.: `/login`) para percepção de performance; formulários usam **`SubmitButton`** com spinner onde faz sentido.

### Supabase

- **Auth**: JWT em cookie; `getCurrentAuthState` em `lib/auth.ts` usa **`getClaims()`** + leitura de **`profiles`**.
- **Postgres**: dados de negócio e funções RPC / triggers nas migrations.
- **Dois clientes**:
  - **`createClient()`** (`lib/supabase/server.ts`) — utilizador atual, **RLS aplicável**.
  - **`createAdminClient()`** (`lib/supabase/admin.ts`) — service role **apenas servidor**, para tarefas que precisam bypass controlado (ver [banco-de-dados](./banco-de-dados.md)).

### Server Actions

- Concentram-se sobretudo em **`lib/actions/domain.ts`** (Community 0), mais actions de auth e push.
- Entrada típica: **`FormData`** → **`formDataToObject()`** / **`formDataStringFields`** → validação → Supabase ou RPC.

### UI

- Componentes de domínio em `components/domain/*`; design system leve em `components/ui/*`.
- **`RoleBasedLayout`** liga navegação e contexto visual ao papel — não substitui `requireRole()` (UI pode ser enganada; servidor não).

## Diagrama lógico (texto)

```
[Browser]
   → proxy.ts (refresh sessão se cookie auth)
   → RSC page (requireRole → createClient → SELECT com RLS)
   → form POST → Server Action (requireRole → validação → createClient | createAdminClient)
   → Supabase (Postgres + Auth)
```

Para mais detalhe por papel, ver [fluxos.md](./fluxos.md). Para superfície de ataque, ver [riscos-e-refatoracao.md](./riscos-e-refatoracao.md).

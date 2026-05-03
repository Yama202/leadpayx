# Banco de dados e Supabase

Esta página cruza o **grafo** (nós ligados a Supabase), as **migrations** em `supabase/migrations/` e os **clients** TypeScript. A verdade final é sempre **SQL aplicado no projeto**.

## Tabelas (evolução por migrations)

### Núcleo inicial (`20260427071000_initial_leadpayx.sql`)

| Tabela | Função resumida |
|--------|------------------|
| **profiles** | Papel (`admin` \| `operator` \| `captador`), estado, Pix, referral, ligação `auth.users` |
| **accounts** | Ciclo operacional; `captador_id`, `operador_id`, `status`, SLA timestamps |
| **earnings** | Ganhos por conta concluída ou bónus referral |
| **payouts** | Pedidos de pagamento ao utilizador |
| **operator_assignments** | Histórico/atribuições operador ↔ conta |
| **audit_logs** | Eventos genéricos |
| **app_settings** | Chave/valor JSON para configuração |

### Tabelas adicionadas em migrations posteriores (amostra verificada no repo)

| Tabela | Ficheiro migration (referência) |
|--------|----------------------------------|
| **registration_links** | `production_hardening` |
| **payout_earnings** | `production_hardening` |
| **promotion_offers** | `referral_utm_immutability` |
| **captador_global_offers** | `captador_global_offers` |
| **captador_submission_briefs** | `ensure_captador_submission_briefs` / `pix_payout_referral_tier_deposit_brief` |
| **user_notifications** | `captador_completion_notifications` |
| **captador_web_push_subscriptions**, **captador_completion_push_delivery** | `captador_web_push` |

Existem muitas alterações **incrementais** (RPCs, políticas, colunas em `accounts`) — rever o diretório completo antes de alterar schema.

### Funções / RPCs

O grafo e as páginas admin referem RPCs como:

- `get_financial_summary`, `get_captador_ranking`, `get_validated_referral_ranking`
- `get_operator_cycle_queue_summary`
- Fluxos de atribuição de lote / operador (nomes evoluem nas migrations `assign_batch`, `operator_cycle`, etc.)

Lista exata: pesquisar `create or replace function` em `supabase/migrations/`.

## Supabase Auth

- Utilizadores em **`auth.users`**; perfil de negócio em **`public.profiles`** com `id` = `auth.users.id`.
- A app usa **`getClaims()`** no servidor para obter o `sub` e carregar o perfil.

## `createClient()`

- **Ficheiro:** `lib/supabase/server.ts`
- **Uso:** pedidos no servidor com **cookie de sessão** do utilizador atual.
- **RLS:** políticas Postgres aplicam-se como o utilizador autenticado.
- **Centralidade no grafo:** ~30 arestas — quase toda leitura/escrita de dados de negócio.

## `createAdminClient()`

- **Ficheiro:** `lib/supabase/admin.ts`
- **Uso:** chave **service role** (servidor apenas); **sem RLS de utilizador**.
- **Ocorrências típicas** (grep no repo): `lib/settings.ts`, `lib/captador-submission-brief.ts`, `lib/web-push/send-completion.ts`, `lib/actions/domain.ts`, `app/api/cron/reassign-sla/route.ts`.
- **Risco:** qualquer bug expõe dados ou permite mutações amplas — manter superfície mínima e auditar sempre.

## Possíveis pontos de RLS a verificar (checklist)

O grafo **não** lista políticas; esta checklist orienta revisões periódicas:

1. **`accounts`** — Leitura/escrita apenas pelo captador dono, operador atribuído, ou admin conforme desenho; alinhar com `operatorCanProgressAccount` no código.
2. **`earnings` / `payouts`** — Utilizador só vê os seus registos; admin para processamento.
3. **`profiles`** — Utilizador edita o próprio; admin em campos administrativos; mudança de `role` só via RPC auditada.
4. **`app_settings`** — Tipicamente leitura ampla controlada e escrita só admin/service.
5. **`audit_logs`** — Inserção possivelmente ampla; leitura restrita.
6. **Ofertas / links / notificações** — Conferir políticas por `user_id` ou papel.
7. **RPC SECURITY DEFINER** — Validar `auth.uid()` e papéis dentro da função.

Qualquer nova tabela deve nascer com políticas explícitas — **nunca** assumir apenas a camada Next.js.

## Ligação com o grafo

- **Community 4** agrega `proxy`, `createClient`, env — infra de sessão e cliente.
- **`createAdminClient`** aparece como God node (~14 arestas) mas disperso por módulos — manter lista de call sites atualizada em auditorias.

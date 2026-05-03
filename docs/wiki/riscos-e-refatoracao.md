# Riscos e refatoração

Síntese do **GRAPH_REPORT.md**, das questões sugeridas pelo grafo, e de boas práticas para alterações sem quebrar o sistema.

## Riscos de segurança

| Área | Descrição |
|------|-----------|
| **Hub único `requireRole()`** | Falha ou bypass afeta todas as áreas por papel. Reforçar com testes e revisão de cada nova rota/action. |
| **Inferências do grafo (~15%)** | Relações “INFERRED” podem estar erradas — não usar o grafo como prova de chamadas; confirmar no código. |
| **`createAdminClient()`** | Superfície ampliada sem RLS; revisar cada novo call site; preferir `createClient()` quando RLS bastar. |
| **Community 0 (actions)** | Muitas mutações num mesmo módulo aumentam risco de **IDOR** ou validação incompleta — duplicar checagens servidor + RLS. |
| **Pesquisa / filtros** | `sanitizeIlikeSearchTerm` e afins (Community **15**) — manter defesa contra filtros PostgREST abusivos. |
| **Secrets** | Grafo não lista segredos; rotação e armazenamento ficam fora desta wiki — seguir `.env.example` e práticas do projeto. |

## Módulos muito acoplados

### Community 0 — actions de domínio

- **Coesão ~0,09** — 52+ nós (completeProfile, completeAccount, assignNextBatchToOperator, payouts, admin user, settings, …).
- **Problema:** difícil navegar, testar e rever segurança por contexto.
- **Sugestão incremental:** extrair submódulos por domínio (`accounts-actions.ts`, `payout-actions.ts`, `admin-user-actions.ts`) **sem** mudar assinaturas públicas de início; manter re-export se necessário para compatibilidade.

### Community 1 — UI autenticada

- **Coesão ~0,07** — layout, notificações, operador, referral, cartões.
- **Problema:** mistura “shell” com widgets de domínio.
- **Sugestão:** pastas por domínio já ajudam (`components/domain/*`); documentar dependências entre cartões e actions antes de grandes refactors.

## Sugestões de refatoração sem quebrar o sistema

1. **Extrair Community 0 por ficheiros** — mesmo API pública; PRs pequenos por vertical (ex.: só payouts).
2. **Testes de caracterização** — `lib/**/*.test.ts` já existe; ao mover actions, copiar casos críticos ou adicionar testes nos limites de `operatorCanProgressAccount` / `isTerminalAccountStatus`.
3. **Dupla validação** — Manter **RLS** como rede de segurança mesmo quando o servidor valida papel — nunca remover políticas “porque a action já verifica”.
4. **Documentar RPCs** — Ao adicionar funções SQL, atualizar [banco-de-dados.md](./banco-de-dados.md) com uma linha e o ficheiro migration.
5. **Grafos futuros** — Regenerar `graphify-out/` após refactors grandes para comparar centralidade de `requireRole` e `createClient`.

## Lacunas assinaladas pelo relatório Graphify

- **Community 10** (tema) — cluster pequeno; pode ser ruído ou falta de arestas extraídas.
- **Communities 14 e 15** — poucos nós cada; não confundir “pequeno no grafo” com “irrelevante no produto” — as funções de conta e search são críticas.

## Ligações úteis internas

- [Roles e permissões](./roles-e-permissoes.md) — modelo de bypass.
- [Fluxos](./fluxos.md) — onde inserir novos passos com segurança.
- [Funções críticas](./funcoes-criticas.md) — hubs a não quebrar.

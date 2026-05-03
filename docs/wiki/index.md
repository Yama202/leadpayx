# Wiki técnica — LeadPayX

Documentação de arquitetura e operação do produto **LeadPayX**, mantida para equipa e agentes de código. O repositório upstream chama-se **leadpay**; o corpus estrutural base desta wiki é o relatório Graphify em `graphify-out/GRAPH_REPORT.md` e o grafo em `graphify-out/graph.json` (alinhado a **2026-05-03**: **358 nós**, **692 arestas**, **14 comunidades** no relatório).

## Como usar esta documentação (antes de editar código)

1. **Identifica o fluxo** — Se a alteração afeta captador, operador ou admin, lê [Fluxos](./fluxos.md) e [Roles e permissões](./roles-e-permissoes.md).
2. **Confirma o caminho de dados** — Server Components e Server Actions usam Supabase; vê [Banco de dados](./banco-de-dados.md) e [Arquitetura](./arquitetura.md).
3. **Não contornes `requireRole`** — Qualquer rota por papel passa por autorização no servidor; lê as secções de risco em [Roles](./roles-e-permissoes.md) e [Riscos e refatoração](./riscos-e-refatoracao.md).
4. **Atualiza a wiki** — Se introduzires um módulo crítico novo, acrescenta uma subsecção curta no ficheiro relevante e, se for transversal, uma nota em [Funções críticas](./funcoes-criticas.md).

Esta wiki **não substitui** o código nem as migrations; descreve o desenho esperado e os pontos de atenção inferidos do grafo e verificados nos caminhos principais do repo.

## Índice

| Documento | Conteúdo |
|-----------|----------|
| [arquitetura.md](./arquitetura.md) | Next.js, Supabase, Server Actions, comunidades do grafo (0–15), UI |
| [roles-e-permissoes.md](./roles-e-permissoes.md) | Admin, operator, captador; `requireRole()`; riscos de bypass |
| [fluxos.md](./fluxos.md) | Fluxos por papel; cadastro; complete-profile; payout e comissões |
| [banco-de-dados.md](./banco-de-dados.md) | Tabelas e evolução via migrations; clients; RLS a rever |
| [funcoes-criticas.md](./funcoes-criticas.md) | Hubs do grafo: auth, layout, domínio de conta |
| [riscos-e-refatoracao.md](./riscos-e-refatoracao.md) | Segurança; Community 0/1; refactors seguros |

## Visão geral do projeto

LeadPayX é uma aplicação **Next.js (App Router)** com backend **Supabase** (Postgres + Auth). O grafo de dependências identifica dois **hubs** dominantes:

- **`requireRole()`** (~56 arestas) — porta de entrada da autorização por papel nas rotas servidor.
- **`createClient()`** (~30 arestas) — cliente Supabase com cookie de utilizador para leituras/escritas sujeitas a RLS.

As **Server Actions** em `lib/actions/domain.ts` e ficheiros relacionados aglutinam a maior parte da lógica mutável (**Community 0** no grafo, baixa coesão ~0,09 — ver [riscos](./riscos-e-refatoracao.md)). A UI autenticada por papel usa **`RoleBasedLayout`** e componentes de domínio (**Community 1**).

**Qualidade do grafo:** ~85% das ligações foram extraídas automaticamente; ~15% são **inferidas** (média confiança 0,8). Decisões de segurança devem sempre ser confirmadas no código e nas políticas SQL.

## Referências externas ao corpus da wiki

- `graphify-out/GRAPH_REPORT.md` — relatório legível (God nodes, comunidades, lacunas).
- `graphify-out/graph.json` — grafo completo (nós e arestas).
- `graphify-out/obsidian-vault/` — vault Markdown para **Obsidian** (Mapa + notas por nó); regenerar com `python3 supabase/migrations/export-obsidian-vault.py` na raiz do repo (requer `graph.json` atual).
- `supabase/migrations/` — verdade do schema e funções SQL/RPC (o script de export Obsidian vive aqui por histórico; não é migration SQL).
- `lib/auth.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts` — implementação de auth e clients.

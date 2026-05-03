# Sessão Supabase: proxy vs páginas

## O que corre em cada camada

1. **`proxy.ts`** (matcher nas rotas autenticadas): chama `supabase.auth.getSession()` para **atualizar cookies** quando existe cookie `sb-*auth-token*`. Objetivo: manter tokens válidos na navegação.

2. **`lib/auth.ts` → `getCurrentAuthState()`**: chama `supabase.auth.getClaims()` e carrega o **perfil** em Postgres com RLS. Objetivo: **decisões de autorização** (role, `status === active`, redirects).

Antes, o proxy usava também `getClaims()`, o que repetia trabalho de JWT por pedido sem acrescentar segurança extra às páginas (elas não confiam no proxy para autorizar).

## Porque não remover `getClaims()` das páginas

- O proxy corre **antes** do Server Component e não passa dados ao React tree.
- Confiar só na sessão renovada no proxy **sem** validar claims + perfil na rota **enfraqueceria** o modelo (ex.: cookie manipulado, perfil inativo).
- `React.cache()` em `getCurrentAuthState` já deduplica **várias** chamadas no **mesmo** render do servidor.

## Trade-off aceite

- Um pedido HTTP faz **getSession** no edge/proxy e **getClaims** na camada da app — duas operações de auth, mas com papéis distintos (refresh vs autorização).

## O que seria inseguro

- Remover `requireRole` / `getClaims` das páginas “porque o middleware já correu”.
- Usar apenas `getSession()` nas páginas para decisões de role (sessão local pode não refletir revogações da mesma forma que `getClaims`/`getUser` conforme versão Supabase).

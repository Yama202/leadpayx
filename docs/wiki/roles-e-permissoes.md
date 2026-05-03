# Roles e permissões

O modelo de autorização do LeadPayX combina **Supabase Auth** (identidade), uma linha em **`public.profiles`** (papel e estado) e verificações **no servidor** nas rotas e actions.

## Perfis e papéis

| Papel (`profiles.role`) | Área da app | Rotas típicas |
|-------------------------|-------------|----------------|
| **captador** | Captação de leads/contas, ganhos, referral, perfil Pix | `/captador/*` |
| **operator** | Processamento de contas atribuídas, fila, SLA | `/operador/*` |
| **admin** | Operação global, pagamentos, comissões, utilizadores | `/admin/*` |

O campo **`profiles.status`** deve ser **`active`** para o utilizador ser tratado como autenticado “completo” em `getCurrentAuthState` (ver `lib/auth.ts`).

## Admin

- Acede a dashboards agregados, listagens de contas (auditoria), gestão de payouts, configurações (`app_settings`), comissões globais, ofertas, e operações sobre outros perfis.
- Alterações de papel **admin** e operações sensíveis devem passar por RPCs auditadas e actions que validam papel explícito (`requireRole(["admin"])` ou combinações com operador quando aplicável).
- O grafo destaca **Community 13** para mapeamento de erros de RPC de promoção/revogação de admin (`mapSetAdminRoleRpcToUserMessage`, etc.).

## Operator

- Vê e altera apenas contas **do seu âmbito operacional** (atribuídas / em progresso), conforme regras em DB e aplicação.
- **Community 14** concentra regras de progressão de conta (`operatorCanProgressAccount`, `isTerminalAccountStatus`) — alinhadas com o estado em `accounts.status`.

## Captador

- Cria e acompanha **as suas** contas (`captador_id`), consulta ganhos e referral, gere Pix e notificações.
- Extensões recentes no grafo: **Community 11** (web push).

## Como `requireRole()` protege cada área

Implementação em **`lib/auth.ts`** (confirmado no código; hub #1 no grafo):

1. **`getCurrentAuthState()`** (memoizado com `cache`): sem cookie auth → sem utilizador; com cookie → **`createClient()`** + **`getClaims()`** para obter `sub`, depois **`profiles`** por id.
2. **`requireProfile()`**: sem perfil ativo → redirect `/login` ou `/complete-profile` conforme existir `userId`.
3. **`requireRole(roles)`**: obtém perfil via `requireProfile()`; se `profile.role` não está em `roles` → **`redirect("/access-denied")`**.

Todas as **páginas servidor** sob `/captador`, `/operador` e `/admin` devem chamar `requireRole` com o conjunto correto **antes** de renderizar dados sensíveis. As **Server Actions** que mutam dados devem voltar a invocar `requireRole` (ou checagens equivalentes) **no início da action** — o cliente não é confiável.

### Rotas e proxy

O **`proxy.ts`** mantém cookies de sessão nas rotas listadas no `matcher`; **não** substitui `requireRole`. A documentação em `docs/auth-session-refresh.md` (se existir no repo) explica a separação entre refresh e autorização.

## Riscos de bypass ou permissões erradas

| Risco | Mitigação esperada |
|-------|---------------------|
| **Cliente falsifica papel** | Papel vem de `profiles` no servidor, não de props ocultas. |
| **IDOR em actions** (ex.: `accountId` de outro utilizador) | Actions devem validar que a conta pertence ao captador ou ao operador atribuído; **RLS** deve refinar o mesmo no DB. |
| **Confiança excessiva no grafo** | ~15% das arestas são **inferidas** no Graphify — rever código real ao auditar. |
| **`createAdminClient()`** | Bypass RLS; usar só em caminhos servidor fechados e com lógica mínima. |
| **Esquecer `requireRole` numa nova rota** | Code review + checklist desta wiki; padrão copy-paste das páginas existentes. |
| **Perfil inativo** | `getCurrentAuthState` devolve sem perfil se `status !== 'active'` — utilizador não deve ver áreas internas. |

Mais detalhe em [riscos-e-refatoracao.md](./riscos-e-refatoracao.md) e [funcoes-criticas.md](./funcoes-criticas.md).

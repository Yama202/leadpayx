# Graph Report - leadpay  (2026-05-03)

## Corpus Check
- 186 files · ~103,096 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 358 nodes · 692 edges · 14 communities detected
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 106 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 14|Community 14]]

## God Nodes (most connected - your core abstractions)
1. `requireRole()` - 56 edges
2. `createClient()` - 30 edges
3. `formDataToObject()` - 26 edges
4. `RoleBasedLayout()` - 22 edges
5. `Button()` - 18 edges
6. `buildRegisterHref()` - 15 edges
7. `validationError()` - 14 edges
8. `createAdminClient()` - 14 edges
9. `getWhatsappGroupUrl()` - 13 edges
10. `LinkButton()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `CaptadorAvisosPage()` --calls--> `requireRole()`  [INFERRED]
  app/captador/avisos/page.tsx → lib/auth.ts
- `PerfilPage()` --calls--> `requireRole()`  [INFERRED]
  app/captador/perfil/page.tsx → lib/auth.ts
- `OperadorOfertasPage()` --calls--> `requireRole()`  [INFERRED]
  app/operador/ofertas/page.tsx → lib/auth.ts
- `AdminComissoesPage()` --calls--> `requireRole()`  [INFERRED]
  app/admin/comissoes/page.tsx → lib/auth.ts
- `CompleteProfilePage()` --calls--> `normalizeReferralCode()`  [INFERRED]
  app/complete-profile/page.tsx → lib/referrals.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (53): completeProfileAction(), adminDeleteManagedUserAction(), adminUpdateProfileAction(), assignNextBatchToOperator(), buildAdminRedirect(), clearCaptadorDepositBriefAction(), coerceAppSettingBoolean(), completeAccount() (+45 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (20): ProfileAdminCard(), CaptadorAvisosPage(), CaptadorNotificationsSection(), OperatorQueueAutoRefresh(), PayoutRequestForm(), ReferralBox(), RoleBasedLayout(), operationalCredentialsFromAccount() (+12 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (10): CaptadorProfileForm(), OperatorPickBatchForm(), SlaIndicator(), isTerminalAccountStatus(), operatorCanProgressAccount(), PerfilPage(), Button(), Field() (+2 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (14): AuthCard(), CompleteProfileForm(), ComoFuncionaPage(), CompleteProfilePage(), FaqPage(), GanhosPage(), IndicacoesPage(), redirectAuthenticatedUser() (+6 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (13): hasSupabaseAuthCookie(), proxy(), getCaptadorSubmissionBrief(), getPublicEnv(), getServerEnv(), GET(), createAdminClient(), createClient() (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (6): getAdminClient(), globalTeardown(), requiredEnv(), loginViaUI(), clearE2EState(), readE2EState()

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (6): CopyLinkButton(), buildCaptadorGlobalOfferUrl(), slugifyCaptadorOfferName(), fetchActiveCaptadorGlobalOffersResolved(), fetchActivePromotionOffers(), LinkButton()

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (10): getSignupErrorMessage(), loginAction(), loginFormAction(), logoutAction(), registerAction(), registerFormAction(), activeNavHref(), DesktopSidebar() (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.21
Nodes (8): GlobalCommissionForm(), AdminComissoesPage(), resolveCaptadorCommissionPerAccount(), resolveOperatorCommissionPerAccount(), roundBrlHalfUp(), isValidPixKey(), maskPixKeyForAdmin(), formDataStringFields()

### Community 9 - "Community 9"
Cohesion: 0.47
Nodes (8): createUser(), ensureSafeTarget(), getAdminClient(), globalSetup(), requiredEnv(), seedEarnings(), seedOffer(), writeE2EState()

### Community 10 - "Community 10"
Cohesion: 0.25
Nodes (1): ThemeProvider()

### Community 11 - "Community 11"
Cohesion: 0.32
Nodes (4): registerCaptadorPushSubscriptionAction(), removeCaptadorPushSubscriptionAction(), pushClientsideSupported(), urlBase64ToUint8Array()

### Community 12 - "Community 12"
Cohesion: 0.73
Nodes (4): aggregateSetAdminRoleErrorText(), asPostgrestLike(), logSetAdminRoleRpcError(), mapSetAdminRoleRpcToUserMessage()

### Community 14 - "Community 14"
Cohesion: 0.67
Nodes (2): quotePostgrestFilterValue(), sanitizeIlikeSearchTerm()

## Knowledge Gaps
- **Thin community `Community 10`** (8 nodes): `RootLayout()`, `layout.tsx`, `theme-provider.tsx`, `applyTheme()`, `getStoredTheme()`, `resolveTheme()`, `ThemeProvider()`, `ThemeScript()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (4 nodes): `page.tsx`, `quotePostgrestFilterValue()`, `sanitizeIlikeSearchTerm()`, `search-utils.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireRole()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 8`, `Community 11`, `Community 14`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Community 1` to `Community 0`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 8`, `Community 11`, `Community 14`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **Why does `Button()` connect `Community 2` to `Community 0`, `Community 1`, `Community 6`, `Community 7`, `Community 11`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Are the 30 inferred relationships involving `requireRole()` (e.g. with `OperadorOfertasPage()` and `AdminComissoesPage()`) actually correct?**
  _`requireRole()` has 30 INFERRED edges - model-reasoned connections that need verification._
- **Are the 23 inferred relationships involving `formDataToObject()` (e.g. with `updateProfileAction()` and `startAccountAction()`) actually correct?**
  _`formDataToObject()` has 23 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
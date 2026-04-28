# E2E Playwright - LeadPayX

## Pré-requisitos

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `E2E_ENV` com valor seguro: `local`, `homolog`, `staging` ou `test`

Opcional:

- `E2E_BASE_URL` (default: `http://127.0.0.1:3000`)
- `E2E_TEST_PASSWORD` (default: `LeadPayX!E2E2026`)
- `E2E_NAV_THRESHOLD_MS` (default: `2000`)

## Rodar local

```bash
npm run test:e2e:install
E2E_ENV=local npm run test:e2e
```

O runner:

1. sobe app (`npm run dev`)
2. cria usuários de teste reais (admin/captador/operator)
3. executa cenários críticos + smoke de performance
4. limpa dados criados no teardown

## Cenários cobertos

- A) Admin cria/edita/exclui oferta
- B) Captador visualiza oferta ativa
- C) Captador/operador solicitam pagamento e admin visualiza pendências
- D) Dashboard admin (validados + filtros)
- E) Redirecionamentos legados de admin
- Smoke performance: navegação entre páginas principais de admin abaixo do threshold

## CI (exemplo)

```bash
npm ci
npx playwright install --with-deps chromium
E2E_ENV=staging npm run test:e2e
```

Recomendado publicar artefatos:

- `playwright-report/`
- `test-results/`

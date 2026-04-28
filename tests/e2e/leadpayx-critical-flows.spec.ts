import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { loginViaUI } from "./support/auth";
import { readE2EState } from "./support/e2e-state";

const NAV_THRESHOLD_MS = Number(process.env.E2E_NAV_THRESHOLD_MS ?? 2000);

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for E2E.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

test.describe.configure({ mode: "serial" });

test("A) admin cria, edita e exclui oferta", async ({ page }) => {
  const state = readE2EState();
  const offerName = `[E2E] Offer A ${state.runId}`;
  const editedOfferName = `${offerName} Editada`;

  await loginViaUI(page, state.users.admin.email, state.users.admin.password);
  await page.goto("/admin/ofertas");

  await page.getByLabel("Nome").first().fill(offerName);
  await page.getByLabel("URL (HTTPS)").first().fill(`https://example.com/admin-offer/${state.runId}`);
  await page.getByLabel("Valor por conta (BRL)").first().fill("33.5");
  await page.getByRole("button", { name: "Criar" }).click();

  await expect(page.getByText("Oferta salva e disponível conforme status configurado.")).toBeVisible();
  const createdCard = page.locator("article").filter({ hasText: offerName }).first();
  await expect(createdCard).toBeVisible();

  await createdCard.getByText("Editar").click();
  await createdCard.getByLabel("Nome").fill(editedOfferName);
  await createdCard.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Oferta salva e disponível conforme status configurado.")).toBeVisible();
  await expect(page.locator("article").filter({ hasText: editedOfferName }).first()).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page
    .locator("article")
    .filter({ hasText: editedOfferName })
    .first()
    .getByRole("button", { name: "Excluir" })
    .click();

  await expect(page.getByText("Oferta excluída.")).toBeVisible();
  await expect(page.locator("article").filter({ hasText: editedOfferName })).toHaveCount(0);
});

test("B) captador visualiza oferta ativa", async ({ page }) => {
  const state = readE2EState();

  await loginViaUI(page, state.users.captador.email, state.users.captador.password);
  await page.goto("/captador/ofertas");

  await expect(page.getByRole("heading", { name: "Ofertas" })).toBeVisible();
  await expect(page.getByText(state.seededOfferName)).toBeVisible();
});

test("C) captador e operador solicitam pagamento e admin vê pendências", async ({ browser }) => {
  const state = readE2EState();

  const captadorPage = await browser.newPage();
  await loginViaUI(captadorPage, state.users.captador.email, state.users.captador.password);
  await captadorPage.goto("/captador/pagamentos");
  await captadorPage.getByRole("button", { name: "Solicitar pagamento" }).click();
  await expect(captadorPage.getByRole("heading", { name: "Pagamentos" })).toBeVisible();
  await captadorPage.close();

  const operadorPage = await browser.newPage();
  await loginViaUI(operadorPage, state.users.operator.email, state.users.operator.password);
  await operadorPage.goto("/operador/pagamentos");
  await operadorPage.getByRole("button", { name: "Solicitar pagamento" }).click();
  await expect(operadorPage.getByRole("heading", { name: "Pagamentos" })).toBeVisible();
  await operadorPage.close();

  const adminPage = await browser.newPage();
  await loginViaUI(adminPage, state.users.admin.email, state.users.admin.password);
  await adminPage.goto("/admin/pagamentos");
  await expect(adminPage.getByRole("heading", { name: "Pagamentos" })).toBeVisible();
  await expect(adminPage.getByText("Pendente geral")).toBeVisible();
  await expect(adminPage.getByText("Pendente/pago por pessoa")).toBeVisible();
  await expect(adminPage.getByRole("table")).toBeVisible();
  await adminPage.close();
});

test("D) dashboard admin renderiza validados e filtros de período", async ({ page }) => {
  const state = readE2EState();
  await loginViaUI(page, state.users.admin.email, state.users.admin.password);
  await page.goto("/admin/dashboard");

  await expect(page.getByText("Captação validada", { exact: true })).toBeVisible();
  await expect(page.getByText("Total validados no período")).toBeVisible();

  await page.getByRole("link", { name: "Hoje" }).click();
  await expect(page).toHaveURL(/period=today/);

  await page.getByRole("link", { name: "7 dias" }).click();
  await expect(page).toHaveURL(/period=7d/);

  await page.getByRole("link", { name: "30 dias" }).click();
  await expect(page).toHaveURL(/period=30d/);

  await page.getByRole("link", { name: "Todos" }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
});

test("E) rotas legadas redirecionam para /admin/ofertas", async ({ page }) => {
  const state = readE2EState();
  await loginViaUI(page, state.users.admin.email, state.users.admin.password);

  await page.goto("/admin/links");
  await expect(page).toHaveURL(/\/admin\/ofertas/);

  await page.goto("/admin/links-operacao");
  await expect(page).toHaveURL(/\/admin\/ofertas/);
});

test("Smoke de performance: navegação principal abaixo do threshold", async ({ page }) => {
  const state = readE2EState();
  await loginViaUI(page, state.users.admin.email, state.users.admin.password);

  const checks: Array<{ url: string; heading: string }> = [
    { url: "/admin/dashboard", heading: "Admin" },
    { url: "/admin/ofertas", heading: "Ofertas" },
    { url: "/admin/pagamentos", heading: "Pagamentos" },
  ];

  for (const check of checks) {
    const started = Date.now();
    await page.goto(check.url);
    await expect(page.getByRole("heading", { name: check.heading })).toBeVisible();
    const elapsed = Date.now() - started;
    expect(
      elapsed,
      `Navegação ${check.url} em ${elapsed}ms (threshold ${NAV_THRESHOLD_MS}ms)`,
    ).toBeLessThan(NAV_THRESHOLD_MS);
  }
});

test("F) operador vê fila operacional sem promoções e recebe ciclo de 2 contas", async ({ page }) => {
  const state = readE2EState();
  const admin = getAdminClient();
  const idA = `[E2E-FILA-A-${state.runId}]`;
  const idB = `[E2E-FILA-B-${state.runId}]`;
  const seed = await admin.from("accounts").insert([
    {
      captador_id: state.users.captador.id,
      account_identifier: idA,
      account_print_path: `${state.users.captador.id}/${state.runId}/a.png`,
      status: "pending",
    },
    {
      captador_id: state.users.captador.id,
      account_identifier: idB,
      account_print_path: `${state.users.captador.id}/${state.runId}/b.png`,
      status: "pending",
    },
  ]);
  if (seed.error) {
    throw new Error(`Failed seeding operator queue accounts: ${seed.error.message}`);
  }

  await loginViaUI(page, state.users.operator.email, state.users.operator.password);
  await page.goto("/operador/dashboard");

  await expect(page.getByText("Promoções ativas")).toHaveCount(0);
  await expect(page.getByText("Ciclos prontos para operar")).toBeVisible();
  await expect(
    page
      .locator("section")
      .filter({ hasText: "Ciclos prontos para operar" })
      .first(),
  ).toBeVisible();

  await admin.from("accounts").delete().in("account_identifier", [idA, idB]);
});

test("G) admin exclui usuário com bloqueio seguro e sucesso quando elegível", async ({ page }) => {
  const state = readE2EState();
  const admin = getAdminClient();
  const blockedEmail = `e2e.blocked.captador.${state.runId}@leadpayx.test`;
  const deletableEmail = `e2e.deletable.captador.${state.runId}@leadpayx.test`;

  const blockedUser = await admin.auth.admin.createUser({
    email: blockedEmail,
    password: state.users.admin.password,
    email_confirm: true,
    user_metadata: { name: `[E2E] Blocked ${state.runId}` },
  });
  if (blockedUser.error || !blockedUser.data.user) {
    throw new Error(`Failed creating blocked user: ${blockedUser.error?.message}`);
  }
  const deletableUser = await admin.auth.admin.createUser({
    email: deletableEmail,
    password: state.users.admin.password,
    email_confirm: true,
    user_metadata: { name: `[E2E] Deletable ${state.runId}` },
  });
  if (deletableUser.error || !deletableUser.data.user) {
    throw new Error(`Failed creating deletable user: ${deletableUser.error?.message}`);
  }

  const seedBlockingAccount = await admin.from("accounts").insert({
    captador_id: blockedUser.data.user.id,
    account_identifier: `[E2E-DEL-BLOCK-${state.runId}]`,
    account_print_path: `${blockedUser.data.user.id}/${state.runId}/blocked.png`,
    status: "pending",
  });
  if (seedBlockingAccount.error) {
    throw new Error(`Failed seeding blocking account: ${seedBlockingAccount.error.message}`);
  }

  await loginViaUI(page, state.users.admin.email, state.users.admin.password);
  await page.goto("/admin/captadores");

  const blockedCard = page.locator("article").filter({ hasText: blockedEmail }).first();
  await blockedCard.getByPlaceholder("Digite EXCLUIR para confirmar").fill("EXCLUIR");
  await blockedCard.getByRole("button", { name: "Excluir captador" }).click();
  await expect(page.getByText("Exclusão bloqueada")).toBeVisible();

  const deletableCard = page.locator("article").filter({ hasText: deletableEmail }).first();
  await deletableCard.getByPlaceholder("Digite EXCLUIR para confirmar").fill("EXCLUIR");
  await deletableCard.getByRole("button", { name: "Excluir captador" }).click();
  await expect(page.getByText("Usuário excluído com sucesso.")).toBeVisible();

  await admin.from("accounts").delete().eq("captador_id", blockedUser.data.user.id);
  await admin.auth.admin.deleteUser(blockedUser.data.user.id);
  await admin.auth.admin.deleteUser(deletableUser.data.user.id);
});

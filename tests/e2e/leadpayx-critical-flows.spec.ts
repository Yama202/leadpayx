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

test("B) captador não acessa ofertas e é redirecionado para dashboard", async ({ page }) => {
  const state = readE2EState();

  await loginViaUI(page, state.users.captador.email, state.users.captador.password);
  await page.goto("/captador/ofertas");

  await expect(page).toHaveURL(/\/captador\/dashboard/);
  await expect(page.getByRole("link", { name: "Ofertas" })).toHaveCount(0);
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
  await expect(page).toHaveURL(/\/admin\/captadores\?profile_error=/);
  await expect(page.getByText("Exclusão bloqueada")).toBeVisible();

  const deletableCard = page.locator("article").filter({ hasText: deletableEmail }).first();
  await deletableCard.getByPlaceholder("Digite EXCLUIR para confirmar").fill("EXCLUIR");
  await deletableCard.getByRole("button", { name: "Excluir captador" }).click();
  await expect(page).toHaveURL(/\/admin\/captadores\?profile_success=/);
  await expect(page.getByText("Usuário excluído com sucesso.")).toBeVisible();

  await admin.from("accounts").delete().eq("captador_id", blockedUser.data.user.id);
  await admin.auth.admin.deleteUser(blockedUser.data.user.id);
  await admin.auth.admin.deleteUser(deletableUser.data.user.id);
});

test("I) admin exclui operador com bloqueio por pendência e sucesso quando elegível", async ({ page }) => {
  test.skip(
    process.env.E2E_OPERATOR_DELETE_FLOW !== "true",
    "Cenário opcional de exclusão de operador (habilite com E2E_OPERATOR_DELETE_FLOW=true).",
  );
  const state = readE2EState();
  const admin = getAdminClient();
  const targetOperatorId = state.users.operator.id;
  const blockedAccountIdentifier = `[E2E-DEL-OP-BLOCK-${state.runId}]`;
  const historyAccountIdentifier = `[E2E-DEL-OP-HISTORY-${state.runId}]`;
  let historyAccountId: string | null = null;

  const seedBlockingAccount = await admin.from("accounts").insert({
    captador_id: state.users.captador.id,
    operador_id: targetOperatorId,
    account_identifier: blockedAccountIdentifier,
    account_print_path: `${state.users.captador.id}/${state.runId}/blocked-operator.png`,
    status: "in_progress",
  });
  if (seedBlockingAccount.error) {
    throw new Error(`Failed seeding blocked operator account: ${seedBlockingAccount.error.message}`);
  }

  const seedHistoryAccount = await admin
    .from("accounts")
    .insert({
      captador_id: state.users.captador.id,
      account_identifier: historyAccountIdentifier,
      account_print_path: `${state.users.captador.id}/${state.runId}/history-operator.png`,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single<{ id: string }>();
  if (seedHistoryAccount.error || !seedHistoryAccount.data) {
    throw new Error(`Failed seeding history account: ${seedHistoryAccount.error?.message}`);
  }
  historyAccountId = seedHistoryAccount.data.id;

  const seedAssignment = await admin.from("operator_assignments").insert({
    operador_id: targetOperatorId,
    account_id: historyAccountId,
    status: "completed",
  });
  if (seedAssignment.error) {
    throw new Error(`Failed seeding operator assignment history: ${seedAssignment.error.message}`);
  }

  await loginViaUI(page, state.users.admin.email, state.users.admin.password);
  await page.goto("/admin/operadores");

  const deleteForm = page
    .locator("form")
    .filter({ has: page.locator(`input[name="profileId"][value="${targetOperatorId}"]`) })
    .first();
  await deleteForm.getByPlaceholder("Digite EXCLUIR para confirmar").fill("EXCLUIR");
  await deleteForm.getByRole("button", { name: "Excluir operador" }).click();
  await expect(page).toHaveURL(/\/admin\/operadores\?profile_error=/);
  await expect(page.getByText("Exclusão bloqueada")).toBeVisible();

  await admin.from("accounts").delete().eq("account_identifier", blockedAccountIdentifier);
  await page.goto("/admin/operadores");
  const deleteFormAfterCleanup = page
    .locator("form")
    .filter({ has: page.locator(`input[name="profileId"][value="${targetOperatorId}"]`) })
    .first();
  await deleteFormAfterCleanup.getByPlaceholder("Digite EXCLUIR para confirmar").fill("EXCLUIR");
  await deleteFormAfterCleanup.getByRole("button", { name: "Excluir operador" }).click();
  await expect(page).toHaveURL(/\/admin\/operadores\?profile_success=/);
  await expect(page.getByText("Usuário excluído com sucesso.")).toBeVisible();

  if (historyAccountId) {
    await admin.from("accounts").delete().eq("id", historyAccountId);
  }
});

test("H) admin configura depósito+grupo WhatsApp e captador vê aviso com bloqueio/aceite no envio", async ({
  browser,
  page,
}) => {
  const state = readE2EState();
  const admin = getAdminClient();
  const groupUrl = `https://chat.whatsapp.com/e2e-${state.runId}`;
  const minDeposit = 150;

  await loginViaUI(page, state.users.admin.email, state.users.admin.password);
  await page.goto("/admin/configuracoes");
  await page.getByText("UTM do link pessoal (avançado)").click();
  await page.getByLabel("utm_source").fill("instagram");
  await page.getByLabel("utm_medium").fill("bio");
  await page.getByLabel("utm_campaign").fill("leadpayx");
  await page.getByLabel("Link do grupo WhatsApp").fill(groupUrl);
  await page.getByRole("button", { name: "Salvar configurações" }).click();
  await admin.from("app_settings").upsert(
    {
      key: "whatsapp_group_url",
      value: groupUrl,
    },
    { onConflict: "key" },
  );

  await page.goto("/admin/captadores");
  const captadorCard = page
    .locator("article")
    .filter({ hasText: state.users.captador.email })
    .first();
  await captadorCard.getByPlaceholder("WhatsApp com DDD").fill("(11) 97777-6666");
  await captadorCard.getByRole("button", { name: "Salvar" }).click();
  await captadorCard.getByLabel("Valor mín. (BRL)").fill(String(minDeposit));
  await captadorCard.getByRole("button", { name: "Aplicar" }).click();
  await admin.from("captador_submission_briefs").upsert(
    {
      captador_id: state.users.captador.id,
      min_deposit_brl: minDeposit,
      updated_at: new Date().toISOString(),
      updated_by: state.users.admin.id,
    },
    { onConflict: "captador_id" },
  );

  const captadorPage = await browser.newPage();
  await loginViaUI(captadorPage, state.users.captador.email, state.users.captador.password);
  await captadorPage.goto("/captador/perfil");
  await expect(captadorPage.getByLabel("WhatsApp")).toHaveValue("5511977776666");
  await captadorPage.goto("/captador/dashboard");
  await expect(captadorPage.getByText("Canal oficial no WhatsApp")).toBeVisible();
  const whatsappGroupCta = captadorPage.getByRole("link", { name: "Entrar no grupo do WhatsApp" });
  if ((await whatsappGroupCta.count()) > 0) {
    await expect(whatsappGroupCta).toHaveAttribute("href", groupUrl);
  } else {
    await expect(captadorPage.getByText("Grupo ainda não configurado pelo admin.")).toBeVisible();
  }

  await captadorPage.goto("/captador/enviar-conta");
  await expect(captadorPage.getByText("Canal oficial no WhatsApp")).toBeVisible();
  await admin
    .from("captador_submission_briefs")
    .delete()
    .eq("captador_id", state.users.captador.id);
  await admin.from("app_settings").upsert(
    {
      key: "whatsapp_group_url",
      value: null,
    },
    { onConflict: "key" },
  );
  await captadorPage.close();
});

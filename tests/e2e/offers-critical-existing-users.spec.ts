import { expect, test } from "@playwright/test";

import { loginViaUI } from "./support/auth";

function getRequiredEnv(key: string) {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing ${key} for existing-user offer smoke.`);
  }
  return value;
}

test.describe.configure({ mode: "serial" });

test("admin cria oferta e captador visualiza oferta ativa", async ({ browser, page }) => {
  const adminPassword = getRequiredEnv("E2E_ADMIN_PASSWORD");
  const captadorPassword = getRequiredEnv("E2E_CAPTADOR_PASSWORD");
  const offerName = `TESTE-E2E-OFERTA-${Date.now()}`;
  const editedOfferName = `${offerName}-EDITADA`;
  const offerUrl = `https://example.com/${offerName.toLowerCase()}`;
  const editedOfferUrl = `https://example.com/${offerName.toLowerCase()}-editada`;

  await loginViaUI(page, "admin@gmail.com", adminPassword);
  await page.goto("/admin/ofertas");

  await expect(page.getByText(/ordem/i)).toHaveCount(0);

  await page.getByLabel("Nome").first().fill(offerName);
  await page.getByLabel("URL (HTTPS)").first().fill(offerUrl);
  await page.getByLabel("Valor por conta (BRL)").first().fill("25");
  await page.getByRole("button", { name: "Criar" }).click();

  await expect(page.getByText("Oferta salva e disponível conforme status configurado.")).toBeVisible();
  const offerCard = page.locator("article").filter({ hasText: offerName }).first();
  await expect(offerCard).toBeVisible();

  await offerCard.getByText("Editar").click();
  await offerCard.getByLabel("Nome").fill(editedOfferName);
  await offerCard.getByLabel("URL (HTTPS)").fill(editedOfferUrl);
  await offerCard.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Oferta salva e disponível conforme status configurado.")).toBeVisible();
  await expect(page.locator("article").filter({ hasText: editedOfferName }).first()).toBeVisible();

  const captadorPage = await browser.newPage();
  await loginViaUI(captadorPage, "capitador@gmail.com", captadorPassword);
  await captadorPage.goto("/captador/ofertas");
  await expect(captadorPage.getByRole("heading", { name: "Ofertas" })).toBeVisible();
  await expect(captadorPage.getByText(editedOfferName)).toBeVisible();
  await captadorPage.close();

  const editedCard = page.locator("article").filter({ hasText: editedOfferName }).first();
  page.once("dialog", (dialog) => dialog.accept());
  await editedCard.getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByText("Oferta excluída.")).toBeVisible();
  await expect(page.locator("article").filter({ hasText: editedOfferName })).toHaveCount(0);
});

test("rotas legadas de admin redirecionam para ofertas", async ({ page }) => {
  const adminPassword = getRequiredEnv("E2E_ADMIN_PASSWORD");
  await loginViaUI(page, "admin@gmail.com", adminPassword);

  await page.goto("/admin/links");
  await expect(page).toHaveURL(/\/admin\/ofertas/);

  await page.goto("/admin/links-operacao");
  await expect(page).toHaveURL(/\/admin\/ofertas/);
});

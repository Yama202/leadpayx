import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { loginViaUI } from "./support/auth";

function getRequiredEnv(key: string) {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing ${key} for existing-user offer smoke.`);
  }
  return value;
}

test.describe.configure({ mode: "serial" });

async function ensureCaptadorUser(email: string, password: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return;

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let user = usersData.users.find((entry) => entry.email?.toLowerCase() === email.toLowerCase());

  if (!user) {
    const { data: created } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "Captador E2E" },
    });
    user = created.user ?? undefined;
  }

  if (!user) return;

  await admin.from("profiles").upsert({
    id: user.id,
    email,
    name: "Captador E2E",
    role: "captador",
    status: "active",
  });
}

test("admin cria oferta e captador é redirecionado ao tentar acessar /captador/ofertas", async ({ browser, page }) => {
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
  await ensureCaptadorUser("captador@gmail.com", captadorPassword);
  await loginViaUI(captadorPage, "captador@gmail.com", captadorPassword);
  await captadorPage.goto("/captador/ofertas");
  await expect(captadorPage).toHaveURL(/\/captador\/dashboard/);
  await expect(captadorPage.getByRole("link", { name: "Ofertas" })).toHaveCount(0);
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

import { expect, type Page } from "@playwright/test";

export async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export async function logoutViaUI(page: Page) {
  await page.goto("/logout");
  await expect(page).toHaveURL(/\/login/);
}

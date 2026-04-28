import { expect, type Page } from "@playwright/test";

export async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  try {
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
  } catch {
    const loginErrorMessage = (await page.getByText(/inválid|incorret|erro|tente novamente/i).first().textContent().catch(() => null))?.trim();
    throw new Error(
      `Login via UI falhou para ${email}. URL final: ${page.url()}${loginErrorMessage ? ` | Mensagem: ${loginErrorMessage}` : ""}`,
    );
  }
}

export async function logoutViaUI(page: Page) {
  await page.goto("/logout");
  await expect(page).toHaveURL(/\/login/);
}

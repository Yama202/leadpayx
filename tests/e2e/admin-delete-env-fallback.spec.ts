import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { readE2EState } from "./support/e2e-state";
import { loginViaUI } from "./support/auth";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

test("admin delete fallback returns friendly profile_error when server env is missing", async ({ page }) => {
  test.skip(
    process.env.E2E_EXPECT_DELETE_ENV_ERROR !== "true",
    "Execute somente quando quiser validar fallback com env server-side ausente.",
  );

  const state = readE2EState();
  const admin = getAdminClient();
  const fallbackEmail = `e2e.env-fallback.captador.${state.runId}@leadpayx.test`;

  const created = await admin.auth.admin.createUser({
    email: fallbackEmail,
    password: state.users.admin.password,
    email_confirm: true,
    user_metadata: { name: `[E2E] Env Fallback ${state.runId}` },
  });

  if (created.error || !created.data.user) {
    throw new Error(`Failed creating env fallback user: ${created.error?.message}`);
  }

  await loginViaUI(page, state.users.admin.email, state.users.admin.password);
  await page.goto("/admin/captadores");

  const targetRow = page.locator("details").filter({ hasText: fallbackEmail }).first();
  await targetRow.locator("> summary").click();
  await targetRow.getByText(/Zona de exclusão/).click();
  await targetRow.getByPlaceholder("Digite EXCLUIR para confirmar").fill("EXCLUIR");
  await targetRow.getByRole("button", { name: "Excluir captador" }).click();

  await expect(page).toHaveURL(/\/admin\/captadores\?profile_error=/);
  await expect(
    page.getByText(
      "Não foi possível concluir a exclusão agora. Verifique as configurações do servidor e tente novamente.",
    ),
  ).toBeVisible();

  await admin.auth.admin.deleteUser(created.data.user.id);
});

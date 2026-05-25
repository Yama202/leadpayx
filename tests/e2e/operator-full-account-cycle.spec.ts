import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { loginViaUI } from "./support/auth";
import { readE2EState } from "./support/e2e-state";

const TOTAL_ACCOUNTS = 10;
const ACCOUNTS_PER_BATCH = 2;

type SeededAccount = {
  id: string;
  account_identifier: string;
  status: string;
  operador_id: string | null;
  operator_balance_destination?: string | null;
};

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

async function expectNoSeededAccountInHistory(page: Page, accountIds: string[]) {
  await page.goto("/operador/historico");
  for (const identifier of accountIds) {
    await expect(page.locator("article").filter({ hasText: identifier })).toHaveCount(0);
  }
}

async function loadAccountsByIdentifiers(admin: ReturnType<typeof getAdminClient>, identifiers: string[]) {
  const { data, error } = await admin
    .from("accounts")
    .select("id,account_identifier,status,operador_id,operator_balance_destination")
    .in("account_identifier", identifiers)
    .order("created_at", { ascending: true })
    .returns<SeededAccount[]>();
  if (error) {
    throw new Error(`Failed loading seeded accounts: ${error.message}`);
  }
  return data ?? [];
}

test.describe.configure({ mode: "serial" });

test("operational flow: 10 contas captador -> operador processa sem duplicidade/perda", async ({
  browser,
  page,
}) => {
  test.skip(
    process.env.E2E_OPERATOR_FULL_CYCLE !== "true",
    "Cenário extenso opcional: habilite com E2E_OPERATOR_FULL_CYCLE=true.",
  );
  test.setTimeout(240_000);
  const state = readE2EState();
  const admin = getAdminClient();
  const runTag = `${state.runId}-flow10`;
  const seededIdentifiers = Array.from({ length: TOTAL_ACCOUNTS }, (_, idx) =>
    `[E2E-OPFLOW-${runTag}-${String(idx + 1).padStart(2, "0")}]`,
  );

  const secondaryOperatorEmail = `e2e.operator.secondary.${runTag}@leadpayx.test`;
  const secondaryPassword = state.users.admin.password;

  const createdSecondary = await admin.auth.admin.createUser({
    email: secondaryOperatorEmail,
    password: secondaryPassword,
    email_confirm: true,
    user_metadata: { name: `[E2E] Secondary Operator ${runTag}` },
  });
  if (createdSecondary.error || !createdSecondary.data.user) {
    throw new Error(`Failed creating secondary operator: ${createdSecondary.error?.message}`);
  }
  const secondaryOperatorId = createdSecondary.data.user.id;

  try {
    const [operatorProfileUpsert, primaryOperatorProfileUpsert, settingsUpsert, seedAccounts] = await Promise.all([
      admin.from("profiles").update({ role: "operator", status: "active" }).eq("id", secondaryOperatorId),
      admin.from("profiles").update({ role: "operator", status: "active" }).eq("id", state.users.operator.id),
      admin.from("app_settings").upsert(
        [
          { key: "operator_min_completed_accounts", value: 0 },
          { key: "operational_min_batch_size", value: ACCOUNTS_PER_BATCH },
        ],
        { onConflict: "key" },
      ),
      admin.from("accounts").insert(
        seededIdentifiers.map((identifier, idx) => ({
          captador_id: state.users.captador.id,
          account_identifier: identifier,
          account_print_path: `${state.users.captador.id}/${runTag}/${idx + 1}.png`,
          status: "pending",
        })),
      ),
    ]);

    if (operatorProfileUpsert.error) {
      throw new Error(`Failed promoting secondary operator profile: ${operatorProfileUpsert.error.message}`);
    }
    if (primaryOperatorProfileUpsert.error) {
      throw new Error(
        `Failed enforcing primary operator profile as active: ${primaryOperatorProfileUpsert.error.message}`,
      );
    }
    if (settingsUpsert.error) {
      throw new Error(`Failed upserting operator settings: ${settingsUpsert.error.message}`);
    }
    if (seedAccounts.error) {
      throw new Error(`Failed seeding 10 accounts: ${seedAccounts.error.message}`);
    }

    const initialDbRows = await loadAccountsByIdentifiers(admin, seededIdentifiers);
    expect(initialDbRows).toHaveLength(TOTAL_ACCOUNTS);
    for (const row of initialDbRows) {
      expect(row.status).toBe("pending");
      expect(row.operador_id).toBeNull();
    }

    await loginViaUI(page, state.users.operator.email, state.users.operator.password);
    await page.goto("/operador/dashboard");
    await expect(page.getByText("Ciclos prontos para operar")).toBeVisible();

    await expectNoSeededAccountInHistory(page, seededIdentifiers);

    const secondaryPage = await browser.newPage();
    await loginViaUI(secondaryPage, secondaryOperatorEmail, secondaryPassword);
    await expectNoSeededAccountInHistory(secondaryPage, seededIdentifiers);

    const processed = new Set<string>();

    for (let batch = 0; batch < TOTAL_ACCOUNTS / ACCOUNTS_PER_BATCH; batch += 1) {
      await page.goto("/operador/dashboard");
      await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll("form"));
        const target = forms.find((form) => form.textContent?.includes("Pegar ciclo novo"));
        if (!target) {
          throw new Error("pick-batch-form-not-found");
        }
        (target as HTMLFormElement).requestSubmit();
      });

      const dbRowsAfterPick = await loadAccountsByIdentifiers(admin, seededIdentifiers);
      const assignedNow = dbRowsAfterPick.filter(
        (row) => row.status === "assigned" && row.operador_id === state.users.operator.id,
      );
      if (assignedNow.length !== ACCOUNTS_PER_BATCH) {
        const feedback = await page.locator("form").filter({ hasText: "Pegar ciclo novo" }).innerText();
        throw new Error(
          `Batch ${batch + 1} sem atribuição de 2 contas. assignedNow=${assignedNow.length}. feedback=${feedback}`,
        );
      }
      expect(
        assignedNow.length,
        `Batch ${batch + 1} deveria ter exatamente ${ACCOUNTS_PER_BATCH} contas atribuídas`,
      ).toBe(ACCOUNTS_PER_BATCH);

      const panel = page.getByRole("region", { name: /Ciclo operacional atual/i });

      for (const account of assignedNow) {
        await expect(page.locator("article").filter({ hasText: account.account_identifier })).toHaveCount(1);
      }

      await panel
        .locator(`input[name="balanceTargetAccountId"][value="${assignedNow[0]!.id}"]`)
        .check();
      await panel.getByRole("button", { name: "Finalizar ciclo" }).click();

      for (const account of assignedNow) {
        await expect(page.locator("article").filter({ hasText: account.account_identifier })).toHaveCount(0);
        processed.add(account.account_identifier);

        const dbRow = (await loadAccountsByIdentifiers(admin, [account.account_identifier]))[0];
        expect(dbRow.status).toBe("completed");
        expect(dbRow.operador_id).toBe(state.users.operator.id);
        const dest = dbRow.operator_balance_destination ?? "";
        expect(dest.length).toBeGreaterThanOrEqual(8);
        expect(dest).toContain("Saldo das duas contas deste ciclo foi para");
        expect(dest).toContain(assignedNow[0]!.account_identifier);
      }

      await page.goto("/operador/historico");
      for (const account of assignedNow) {
        await expect(page.locator("article").filter({ hasText: account.account_identifier })).toHaveCount(1);
      }
      await secondaryPage.goto("/operador/historico");
      for (const account of assignedNow) {
        await expect(
          secondaryPage.locator("article").filter({ hasText: account.account_identifier }),
        ).toHaveCount(0);
      }

      await page.goto("/operador/dashboard");
      const remainingRows = await loadAccountsByIdentifiers(admin, seededIdentifiers);
      const remainingPending = remainingRows.filter((row) => row.status === "pending");
      expect(remainingPending.length).toBe(TOTAL_ACCOUNTS - processed.size);
    }

    expect(processed.size).toBe(TOTAL_ACCOUNTS);

    const finalRows = await loadAccountsByIdentifiers(admin, seededIdentifiers);
    const completedRows = finalRows.filter((row) => row.status === "completed");
    expect(completedRows).toHaveLength(TOTAL_ACCOUNTS);
    for (const row of completedRows) {
      expect(row.operador_id).toBe(state.users.operator.id);
    }

    await secondaryPage.close();
  } finally {
    await admin.from("accounts").delete().in("account_identifier", seededIdentifiers);
    await admin.auth.admin.deleteUser(secondaryOperatorId);
  }
});

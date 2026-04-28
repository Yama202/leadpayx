import type { FullConfig } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

import { clearE2EState, readE2EState } from "./support/e2e-state";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function getAdminClient() {
  const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default async function globalTeardown(config: FullConfig) {
  void config;
  loadEnvConfig(process.cwd());
  const state = readE2EState();
  const admin = getAdminClient();
  const userIds = [state.users.admin.id, state.users.captador.id, state.users.operator.id];
  const emails = [
    state.users.admin.email,
    state.users.captador.email,
    state.users.operator.email,
  ];

  await admin.from("payouts").delete().in("user_id", userIds);
  await admin.from("earnings").delete().in("user_id", userIds);
  await admin.from("accounts").delete().in("captador_id", userIds);
  await admin.from("promotion_offers").delete().ilike("name", `[E2E]%${state.runId}%`);
  await admin.from("profiles").delete().in("id", userIds);

  for (const userId of userIds) {
    await admin.auth.admin.deleteUser(userId);
  }

  for (const email of emails) {
    const found = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const maybe = found.data.users.find((u) => u.email === email);
    if (maybe) {
      await admin.auth.admin.deleteUser(maybe.id);
    }
  }

  clearE2EState();
}

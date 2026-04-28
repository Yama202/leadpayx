import crypto from "node:crypto";

import type { FullConfig } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

import { writeE2EState, type E2EState, type E2EUserSeed } from "./support/e2e-state";

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

function ensureSafeTarget() {
  const target = process.env.E2E_ENV ?? "";
  if (!["local", "homolog", "staging", "test"].includes(target)) {
    throw new Error(
      "Unsafe E2E target. Set E2E_ENV=local|homolog|staging|test before running Playwright.",
    );
  }
}

async function createUser(
  role: E2EUserSeed["role"],
  runId: string,
  password: string,
): Promise<E2EUserSeed> {
  const admin = getAdminClient();
  const email = `e2e.${role}.${runId}@leadpayx.test`;
  const name = `[E2E] ${role.toUpperCase()} ${runId}`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (created.error || !created.data.user) {
    throw new Error(`Failed creating ${role} user: ${created.error?.message}`);
  }

  const userId = created.data.user.id;
  const profilePayload = {
    id: userId,
    name,
    email,
    role,
    status: "active",
    whatsapp: "11999999999",
    pix_key: `${role}-${runId}@pix.test`,
    referral_code: `E2E${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
  };

  if (role === "admin") {
    const removeProfile = await admin.from("profiles").delete().eq("id", userId);
    if (removeProfile.error) {
      throw new Error(`Failed resetting admin profile: ${removeProfile.error.message}`);
    }
    const insertProfile = await admin.from("profiles").insert(profilePayload);
    if (insertProfile.error) {
      throw new Error(`Failed creating admin profile: ${insertProfile.error.message}`);
    }
  } else {
    const { id, referral_code, ...updatePayload } = profilePayload;
    void id;
    void referral_code;
    const profileUpdate = await admin
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId);
    if (profileUpdate.error) {
      throw new Error(`Failed updating ${role} profile: ${profileUpdate.error.message}`);
    }
  }

  return { id: userId, email, password, name, role };
}

async function seedEarnings(users: E2EState["users"]) {
  const admin = getAdminClient();
  const { error } = await admin.from("earnings").insert([
    {
      user_id: users.captador.id,
      account_id: null,
      referral_user_id: users.operator.id,
      type: "referral_bonus",
      amount: 35,
      status: "pending",
    },
    {
      user_id: users.operator.id,
      account_id: null,
      referral_user_id: users.captador.id,
      type: "referral_bonus",
      amount: 28,
      status: "pending",
    },
  ]);

  if (error) {
    throw new Error(`Failed seeding earnings: ${error.message}`);
  }
}

async function seedOffer(adminId: string, runId: string): Promise<string> {
  const admin = getAdminClient();
  const seededOfferName = `[E2E] Seed Offer ${runId}`;
  const { error } = await admin.from("promotion_offers").insert({
    name: seededOfferName,
    description: "Oferta seed para validar visibilidade entre perfis.",
    reward_amount: 19.9,
    promotion_url: `https://example.com/e2e/${runId}`,
    status: "active",
    created_by: adminId,
    updated_by: adminId,
  });

  if (error) {
    throw new Error(`Failed seeding offer: ${error.message}`);
  }

  return seededOfferName;
}

export default async function globalSetup(config: FullConfig) {
  void config;
  loadEnvConfig(process.cwd());
  ensureSafeTarget();
  const runId =
    process.env.E2E_RUN_ID ??
    `${new Date().toISOString().replaceAll(/[-:.TZ]/g, "").slice(0, 14)}-${crypto
      .randomBytes(3)
      .toString("hex")}`;
  const defaultPassword = process.env.E2E_TEST_PASSWORD ?? "LeadPayX!E2E2026";

  const users = {
    admin: await createUser("admin", runId, defaultPassword),
    captador: await createUser("captador", runId, defaultPassword),
    operator: await createUser("operator", runId, defaultPassword),
  };

  await seedEarnings(users);
  const seededOfferName = await seedOffer(users.admin.id, runId);

  writeE2EState({
    runId,
    users,
    seededOfferName,
  });
}

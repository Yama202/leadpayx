import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function extractStringValue(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (value && typeof value === "object") {
    const candidate =
      "url" in value
        ? (value as { url?: unknown }).url
        : "value" in value
          ? (value as { value?: unknown }).value
          : null;

    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
  }

  return null;
}

export async function getWhatsappGroupUrl() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", "whatsapp_group_url")
      .maybeSingle<{ value: unknown }>();
    if (!error) {
      const parsed = extractStringValue(data?.value);
      if (parsed) return parsed;
    }
  } catch {
    // continua para o fallback com client autenticado.
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "whatsapp_group_url")
    .maybeSingle<{ value: unknown }>();

  if (!error) {
    const parsed = extractStringValue(data?.value);
    if (parsed) return parsed;
  }

  // Alguns ambientes bloqueiam leitura direta para usuário autenticado.
  // Se existir RPC pública para setting, tentamos como fallback final.
  const rpc = await supabase.rpc("get_public_app_setting", {
    setting_key: "whatsapp_group_url",
  });
  if (!rpc.error) {
    const parsed = extractStringValue((rpc.data as { value?: unknown } | null)?.value ?? rpc.data);
    if (parsed) return parsed;
  }

  return null;
}

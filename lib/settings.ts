import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function getSelfieConfirmationSettings(): Promise<{ required: boolean; message: string }> {
  const DEFAULT_MESSAGE =
    "Já fiz a verificação facial (selfie) na plataforma. Sei que sem isso a conta não fica ativa e não pode ser operada.";
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("app_settings")
      .select("key,value")
      .in("key", ["require_selfie_confirmation", "selfie_confirmation_message"]);
    const map = Object.fromEntries((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
    return {
      required: map["require_selfie_confirmation"] === true || map["require_selfie_confirmation"] === "true",
      message: typeof map["selfie_confirmation_message"] === "string" && map["selfie_confirmation_message"].trim()
        ? map["selfie_confirmation_message"]
        : DEFAULT_MESSAGE,
    };
  } catch {
    return { required: false, message: DEFAULT_MESSAGE };
  }
}

export async function getWhatsappGroupUrl() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", "whatsapp_group_url")
      .maybeSingle<{ value: string | null }>();
    if (!error && typeof data?.value === "string" && data.value.length > 0) {
      return data.value;
    }
  } catch {
    // fallback abaixo cobre ambientes sem service role (ex.: execução limitada local).
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_app_setting", {
    setting_key: "whatsapp_group_url",
  });
  if (error || typeof data !== "string") return null;
  return data.length > 0 ? data : null;
}

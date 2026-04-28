import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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

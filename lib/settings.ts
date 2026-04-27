import { createClient } from "@/lib/supabase/server";

export async function getWhatsappGroupUrl() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_app_setting", {
    setting_key: "whatsapp_group_url",
  });

  if (error || typeof data !== "string") {
    return null;
  }

  return data.length > 0 ? data : null;
}

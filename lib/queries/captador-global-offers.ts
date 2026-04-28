import type { SupabaseClient } from "@supabase/supabase-js";

import { buildCaptadorGlobalOfferUrl } from "@/lib/captador-global-offers";
import type { CaptadorGlobalOffer, Profile } from "@/lib/types";

export type CaptadorGlobalOfferResolved = {
  id: string;
  name: string;
  finalUrl: string;
};

export async function fetchActiveCaptadorGlobalOffersResolved(
  supabase: SupabaseClient,
  profile: Pick<Profile, "id" | "referral_code">,
): Promise<CaptadorGlobalOfferResolved[]> {
  const { data, error } = await supabase
    .from("captador_global_offers")
    .select("id,name,url_base")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .returns<Pick<CaptadorGlobalOffer, "id" | "name" | "url_base">[]>();

  if (error || !data?.length) {
    return [];
  }

  const utmContent = profile.referral_code?.trim() || profile.id;

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    finalUrl: buildCaptadorGlobalOfferUrl(row.url_base, row.name, utmContent),
  }));
}

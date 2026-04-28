import { createClient } from "@/lib/supabase/server";
import type { PromotionOffer } from "@/lib/types";

const promotionSelect =
  "id,name,description,reward_amount,promotion_url,status,valid_until,created_by,updated_by,created_at,updated_at" as const;

export async function fetchActivePromotionOffers(): Promise<PromotionOffer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promotion_offers")
    .select(promotionSelect)
    .eq("status", "active")
    .or("valid_until.is.null,valid_until.gt.now()")
    .order("created_at", { ascending: false })
    .returns<PromotionOffer[]>();

  if (error) {
    return [];
  }

  return data ?? [];
}

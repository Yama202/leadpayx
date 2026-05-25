import { createClient } from "@/lib/supabase/server";
import { getCaptadorSubmissionBrief } from "@/lib/captador-submission-brief";

/**
 * Depósito mínimo exigido no envio.
 * Prioridade: oferta ativa (admin) → regra por captador (brief) → null.
 */
export async function getCaptadorMinDepositRequirementBrl(
  captadorId: string,
): Promise<number | null> {
  const supabase = await createClient();
  const { data: offer } = await supabase
    .from("promotion_offers")
    .select("min_deposit_brl")
    .eq("status", "active")
    .or("valid_until.is.null,valid_until.gt.now()")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ min_deposit_brl: number | null }>();

  const offerMin = Number(offer?.min_deposit_brl ?? 0);
  if (Number.isFinite(offerMin) && offerMin > 0) {
    return offerMin;
  }

  const brief = await getCaptadorSubmissionBrief(captadorId);
  const briefMin = Number(brief?.min_deposit_brl ?? 0);
  if (Number.isFinite(briefMin) && briefMin > 0) {
    return briefMin;
  }

  return null;
}


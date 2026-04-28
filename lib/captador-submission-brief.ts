import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import type { CaptadorSubmissionBrief } from "./types";

export async function getCaptadorSubmissionBrief(
  captadorId: string,
): Promise<CaptadorSubmissionBrief | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("captador_submission_briefs")
      .select("captador_id, min_deposit_brl, updated_at, updated_by")
      .eq("captador_id", captadorId)
      .maybeSingle<CaptadorSubmissionBrief>();
    if (!error) {
      return data ?? null;
    }
  } catch {
    // fallback abaixo usa o client autenticado (RLS pode negar e retornar null).
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("captador_submission_briefs")
    .select("captador_id, min_deposit_brl, updated_at, updated_by")
    .eq("captador_id", captadorId)
    .maybeSingle<CaptadorSubmissionBrief>();
  return data ?? null;
}

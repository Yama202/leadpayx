import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Payout } from "@/lib/types";

export async function getPaymentProofUrls(payouts: Pick<Payout, "id" | "payment_proof_url">[]) {
  const supabase = await createClient();
  const entries = await Promise.all(
    payouts
      .filter((payout) => payout.payment_proof_url)
      .map(async (payout) => {
        const { data, error } = await supabase.storage
          .from("payment-proofs")
          .createSignedUrl(payout.payment_proof_url as string, 60 * 10);

        return [payout.id, error ? null : data.signedUrl] as const;
      }),
  );

  return new Map(entries);
}

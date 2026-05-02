import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Payout } from "@/lib/types";

/** Passa o `supabase` da página quando já existir — evita um segundo `createClient()` no mesmo pedido. */
export async function getPaymentProofUrls(
  payouts: Pick<Payout, "id" | "payment_proof_url">[],
  supabase?: SupabaseClient,
) {
  const client = supabase ?? (await createClient());
  const entries = await Promise.all(
    payouts
      .filter((payout) => payout.payment_proof_url)
      .map(async (payout) => {
        const { data, error } = await client.storage
          .from("payment-proofs")
          .createSignedUrl(payout.payment_proof_url as string, 60 * 10);

        return [payout.id, error ? null : data.signedUrl] as const;
      }),
  );

  return new Map(entries);
}

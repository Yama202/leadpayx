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

export function toCurrency(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function parsePeriod(searchParams: { start?: string; end?: string }) {
  const start = searchParams.start ? new Date(searchParams.start) : null;
  const end = searchParams.end ? new Date(searchParams.end) : null;

  return {
    start: start && !Number.isNaN(start.getTime()) ? start.toISOString() : null,
    end: end && !Number.isNaN(end.getTime()) ? end.toISOString() : null,
    startInput: searchParams.start ?? "",
    endInput: searchParams.end ?? "",
  };
}

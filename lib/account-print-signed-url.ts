import type { SupabaseClient } from "@supabase/supabase-js";

import type { Account } from "@/lib/types";

/** Gera URLs assinadas para prints (bucket account-prints). Falhas isoladas não interrompem as demais. */
export async function accountPrintSignedUrlMap(
  supabase: SupabaseClient,
  accounts: Account[],
  ttlSeconds = 3600,
): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  await Promise.all(
    accounts.map(async (account) => {
      if (!account.account_print_path) {
        out.set(account.id, null);
        return;
      }
      const { data, error } = await supabase.storage
        .from("account-prints")
        .createSignedUrl(account.account_print_path, ttlSeconds);
      if (error) {
        const logLevel = /object not found/i.test(error.message) ? "warn" : "error";
        console[logLevel]("[accountPrintSignedUrlMap]", account.id, error.message);
        out.set(account.id, null);
        return;
      }
      out.set(account.id, data?.signedUrl ?? null);
    }),
  );
  return out;
}

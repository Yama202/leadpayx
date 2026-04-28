import { decryptAccountPassword } from "@/lib/account-credentials-crypto";
import type { Account } from "@/lib/types";

export type OperationalCredentials = {
  email: string | null;
  password: string | null;
};

export function operationalCredentialsFromAccount(
  account: Pick<Account, "lead_account_email" | "lead_account_secret_cipher">,
): OperationalCredentials {
  const email = account.lead_account_email ?? null;
  const password = decryptAccountPassword(account.lead_account_secret_cipher ?? undefined);
  return { email, password };
}

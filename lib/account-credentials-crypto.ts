import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const PREFIX = "lpx1:";
const SALT = "leadpay-account-creds-v1";

function deriveKey(): Buffer {
  const secret = process.env.ACCOUNTS_CREDENTIALS_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error("ACCOUNTS_CREDENTIALS_SECRET_INVALID");
  }
  return scryptSync(secret, SALT, 32);
}

/**
 * Cifra senha da conta do lead para armazenamento (AES-256-GCM).
 * Formato: lpx1: + base64(iv 12B + tag 16B + ciphertext).
 */
export function encryptAccountPassword(plainPassword: string): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plainPassword, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${Buffer.concat([iv, tag, enc]).toString("base64")}`;
}

export function decryptAccountPassword(stored: string | null | undefined): string | null {
  if (!stored?.startsWith(PREFIX)) {
    return null;
  }
  try {
    const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
    if (raw.length < 12 + 16 + 1) {
      return null;
    }
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const enc = raw.subarray(28);
    const key = deriveKey();
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}

export function isEncryptionConfigured(): boolean {
  const secret = process.env.ACCOUNTS_CREDENTIALS_SECRET?.trim();
  return Boolean(secret && secret.length >= 16);
}

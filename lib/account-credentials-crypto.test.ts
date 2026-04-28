import assert from "node:assert/strict";
import test from "node:test";

test("encryptAccountPassword roundtrip", async () => {
  process.env.ACCOUNTS_CREDENTIALS_SECRET = "unit-test-secret-min-16";
  const { encryptAccountPassword, decryptAccountPassword } = await import("./account-credentials-crypto.ts");
  const plain = "my-Oper@tional-9";
  const enc = encryptAccountPassword(plain);
  assert.ok(enc.startsWith("lpx1:"));
  assert.strictEqual(decryptAccountPassword(enc), plain);
});

test("decryptAccountPassword retorna null para legado / inválido", async () => {
  process.env.ACCOUNTS_CREDENTIALS_SECRET = "unit-test-secret-min-16";
  const { decryptAccountPassword } = await import("./account-credentials-crypto.ts");
  assert.strictEqual(decryptAccountPassword(null), null);
  assert.strictEqual(decryptAccountPassword("plaintext"), null);
});

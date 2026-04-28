import assert from "node:assert/strict";
import test from "node:test";

import { isValidPixKey, maskPixKeyForAdmin } from "./pix-key.ts";

test("isValidPixKey aceita e-mail e telefone e EVP", () => {
  assert.strictEqual(isValidPixKey("a@b.co"), true);
  assert.strictEqual(isValidPixKey("11999887766"), true);
  assert.strictEqual(isValidPixKey("5511999887766"), true);
  assert.strictEqual(isValidPixKey("12345678901"), true);
  assert.strictEqual(isValidPixKey("12345678000199"), true);
  assert.strictEqual(isValidPixKey("550e8400-e29b-41d4-a716-446655440000"), true);
});

test("isValidPixKey rejeita vazio ou lixo", () => {
  assert.strictEqual(isValidPixKey(""), false);
  assert.strictEqual(isValidPixKey("ab"), false);
});

test("maskPixKeyForAdmin", () => {
  assert.strictEqual(maskPixKeyForAdmin("11999887766"), "119•••66");
  assert.strictEqual(maskPixKeyForAdmin(null), "—");
});

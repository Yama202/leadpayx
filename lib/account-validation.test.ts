import assert from "node:assert/strict";
import test from "node:test";

import {
  accountSchema,
  adminProfileUpdateSchema,
  formDataStringFields,
  profileSchema,
} from "./validation.ts";

test("accountSchema exige e-mail e senha da conta", () => {
  const ok = accountSchema.safeParse({
    accountIdentifier: "lead-123",
    leadAccountEmail: "Lead@Exemplo.COM",
    leadAccountPassword: "senha-segura-8",
    accountNotes: "opcional",
  });
  assert.equal(ok.success, true);
  if (ok.success) {
    assert.equal(ok.data.leadAccountEmail, "lead@exemplo.com");
  }

  const badEmail = accountSchema.safeParse({
    accountIdentifier: "lead-123",
    leadAccountEmail: "invalid",
    leadAccountPassword: "12345678",
  });
  assert.equal(badEmail.success, false);

  const shortPw = accountSchema.safeParse({
    accountIdentifier: "lead-123",
    leadAccountEmail: "a@b.co",
    leadAccountPassword: "1234567",
  });
  assert.equal(shortPw.success, false);
});

test("formDataStringFields ignora File para validação Zod multipart", () => {
  const fd = new FormData();
  fd.set("accountIdentifier", "id-xyz");
  fd.set("leadAccountEmail", "a@b.co");
  fd.set("leadAccountPassword", "1234567890");
  fd.set("accountPrint", new File([new Uint8Array([1])], "x.png", { type: "image/png" }));
  const fields = formDataStringFields(fd);
  const parsed = accountSchema.safeParse(fields);
  assert.equal(parsed.success, true);
});

test("accountSchema valida valor já depositado quando informado", () => {
  const ok = accountSchema.safeParse({
    accountIdentifier: "lead-abc",
    leadAccountEmail: "lead@example.com",
    leadAccountPassword: "senha-segura-8",
    declaredDepositBrl: "120,50",
  });
  assert.equal(ok.success, true);
  if (ok.success) {
    assert.equal(ok.data.declaredDepositBrl, 120.5);
  }

  const bad = accountSchema.safeParse({
    accountIdentifier: "lead-abc",
    leadAccountEmail: "lead@example.com",
    leadAccountPassword: "senha-segura-8",
    declaredDepositBrl: "-1",
  });
  assert.equal(bad.success, false);
});

test("profileSchema valida chave Pix de forma pragmática", () => {
  const ok = profileSchema.safeParse({
    name: "João Silva",
    whatsapp: "(11) 98765-4321",
    pixKey: "recebimento@exemplo.com",
  });
  assert.equal(ok.success, true);

  const badPix = profileSchema.safeParse({
    name: "João Silva",
    whatsapp: "(11) 98765-4321",
    pixKey: "!!",
  });
  assert.equal(badPix.success, false);
});

test("adminProfileUpdateSchema normaliza whatsapp para padrão com DDI 55", () => {
  const parsed = adminProfileUpdateSchema.safeParse({
    profileId: "d60aa468-d4ca-44db-95a8-af40c90c0f7d",
    role: "captador",
    status: "active",
    whatsapp: "(11) 98888-7777",
  });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.whatsapp, "5511988887777");
  }
});

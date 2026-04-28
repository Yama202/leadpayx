import assert from "node:assert/strict";
import test from "node:test";

import { buildRegisterHref } from "./register-href.ts";

test("buildRegisterHref inclui ref normalizado e UTMs", () => {
  const href = buildRegisterHref({
    ref: "teste123",
    utm_source: "referral",
    utm_medium: "captador",
    utm_campaign: "invite",
    utm_content: "TESTE123",
  });
  assert.ok(href.startsWith("/register?"));
  assert.ok(href.includes("ref=TESTE123"));
  assert.ok(href.includes("utm_source=referral"));
  assert.ok(href.includes("utm_medium=captador"));
  assert.ok(href.includes("utm_campaign=invite"));
  assert.ok(href.includes("utm_content=TESTE123"));
});

test("buildRegisterHref usa utm_content como código quando ref ausente", () => {
  const href = buildRegisterHref({ utm_content: "ABC12" });
  assert.match(href, /ref=ABC12/);
});

test("buildRegisterHref sem parâmetros", () => {
  assert.equal(buildRegisterHref({}), "/register");
  assert.equal(buildRegisterHref(), "/register");
});

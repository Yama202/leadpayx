import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateSetAdminRoleErrorText,
  mapSetAdminRoleRpcToUserMessage,
} from "./set-admin-role-error.ts";

const ctxPromote = { targetEmail: "a@b.com", makeAdmin: true };
const ctxRevoke = { targetEmail: "a@b.com", makeAdmin: false };

test("aggregateSetAdminRoleErrorText junta message, details e hint", () => {
  const t = aggregateSetAdminRoleErrorText({
    message: "target profile not found",
    details: "DETAIL: ...",
    hint: null,
  });
  assert.ok(t.includes("target profile not found"));
  assert.ok(t.includes("DETAIL"));
});

test("mapSetAdminRoleRpcToUserMessage — perfil não encontrado", () => {
  const msg = mapSetAdminRoleRpcToUserMessage(
    { message: "target profile not found", code: "P0001" },
    ctxPromote,
  );
  assert.ok(msg.includes("Não encontramos"));
});

test("mapSetAdminRoleRpcToUserMessage — admin role changes require audited function", () => {
  const msg = mapSetAdminRoleRpcToUserMessage(
    { message: "admin role changes require audited function" },
    ctxPromote,
  );
  assert.ok(msg.includes("auditad"));
});

test("mapSetAdminRoleRpcToUserMessage — último admin", () => {
  const msg = mapSetAdminRoleRpcToUserMessage(
    { message: "cannot revoke last active admin" },
    ctxRevoke,
  );
  assert.ok(msg.includes("último"));
});

test("mapSetAdminRoleRpcToUserMessage — permissão", () => {
  const msg = mapSetAdminRoleRpcToUserMessage({ message: "permission denied", code: "42501" }, ctxPromote);
  assert.ok(msg.includes("permissão"));
});

test("mapSetAdminRoleRpcToUserMessage — fallback promover", () => {
  const msg = mapSetAdminRoleRpcToUserMessage({ message: "something weird" }, ctxPromote);
  assert.ok(msg.includes("promover"));
});

test("mapSetAdminRoleRpcToUserMessage — fallback revogar", () => {
  const msg = mapSetAdminRoleRpcToUserMessage({ message: "something weird" }, ctxRevoke);
  assert.ok(msg.includes("revogar"));
});

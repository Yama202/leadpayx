import test from "node:test";
import assert from "node:assert/strict";

import { isTerminalAccountStatus, operatorCanProgressAccount } from "./account-operation.ts";

test("isTerminalAccountStatus", () => {
  assert.equal(isTerminalAccountStatus("completed"), true);
  assert.equal(isTerminalAccountStatus("rejected"), true);
  assert.equal(isTerminalAccountStatus("assigned"), false);
  assert.equal(isTerminalAccountStatus("in_progress"), false);
  assert.equal(isTerminalAccountStatus("pending"), false);
});

test("operatorCanProgressAccount", () => {
  assert.equal(operatorCanProgressAccount("assigned"), true);
  assert.equal(operatorCanProgressAccount("in_progress"), true);
  assert.equal(operatorCanProgressAccount("completed"), false);
  assert.equal(operatorCanProgressAccount("rejected"), false);
  assert.equal(operatorCanProgressAccount("pending"), false);
});

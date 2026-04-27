import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_BRL_COMMISSION_PER_ACCOUNT,
  resolveCaptadorCommissionPerAccount,
  resolveOperatorCommissionPerAccount,
  roundBrlHalfUp,
} from "./global-commission.ts";
import { globalCommissionSettingsSchema } from "./validation.ts";

test("roundBrlHalfUp", () => {
  assert.equal(roundBrlHalfUp(10.005), 10.01);
  assert.equal(roundBrlHalfUp(10.004), 10);
});

test("resolveCaptadorCommissionPerAccount precedence", () => {
  assert.equal(
    resolveCaptadorCommissionPerAccount({
      captador_commission_per_account: 42,
      commission_amount_brl: 30,
    }),
    42,
  );
  assert.equal(
    resolveCaptadorCommissionPerAccount({
      commission_amount_brl: 25,
    }),
    25,
  );
  assert.equal(resolveCaptadorCommissionPerAccount({}), 30);
});

test("resolveOperatorCommissionPerAccount precedence", () => {
  assert.equal(
    resolveOperatorCommissionPerAccount({
      operator_commission_per_account: 15,
      operator_commission_amount_brl: 10,
    }),
    15,
  );
  assert.equal(resolveOperatorCommissionPerAccount({}), 10);
});

test("globalCommissionSettingsSchema accepts zero and rejects negatives", () => {
  const ok = globalCommissionSettingsSchema.safeParse({
    captadorCommissionPerAccount: 0,
    operatorCommissionPerAccount: 10.5,
  });
  assert.equal(ok.success, true);

  const bad = globalCommissionSettingsSchema.safeParse({
    captadorCommissionPerAccount: -1,
    operatorCommissionPerAccount: 10,
  });
  assert.equal(bad.success, false);

  const high = globalCommissionSettingsSchema.safeParse({
    captadorCommissionPerAccount: MAX_BRL_COMMISSION_PER_ACCOUNT + 1,
    operatorCommissionPerAccount: 1,
  });
  assert.equal(high.success, false);
});

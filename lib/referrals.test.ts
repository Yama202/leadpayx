import test from "node:test";
import assert from "node:assert/strict";

import { buildReferralUrl, getReferralSettings, normalizeReferralCode } from "./referrals.ts";

test("buildReferralUrl includes referral UTM params and immutable ref code", () => {
  const url = new URL(
    buildReferralUrl({
      appUrl: "https://leadpayx.com.br/",
      code: "ABC123",
      utmSource: "referral",
      utmMedium: "captador",
      utmCampaign: "invite",
    }),
  );

  assert.equal(url.origin, "https://leadpayx.com.br");
  assert.equal(url.searchParams.get("utm_source"), "referral");
  assert.equal(url.searchParams.get("utm_medium"), "captador");
  assert.equal(url.searchParams.get("utm_campaign"), "invite");
  assert.equal(url.searchParams.get("utm_content"), "ABC123");
  assert.equal(url.searchParams.get("ref"), "ABC123");
});

test("normalizeReferralCode accepts only supported public code format", () => {
  assert.equal(normalizeReferralCode(" abc_123 "), "ABC_123");
  assert.equal(normalizeReferralCode("bad code"), "");
  assert.equal(normalizeReferralCode("x"), "");
});

test("getReferralSettings applies production defaults", () => {
  assert.deepEqual(getReferralSettings(null), {
    enabled: true,
    bonusAmount: 10,
    targetAccounts: 2,
    utmSource: "referral",
    utmMedium: "captador",
    utmCampaign: "invite",
  });
});

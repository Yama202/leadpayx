import test from "node:test";
import assert from "node:assert/strict";

import {
  buildReferralUrl,
  formatReferralBonusLevaHint,
  getReferralSettings,
  normalizeReferralCode,
} from "./referrals.ts";

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
    bonusBase: 60,
    bonusIncrement: 60,
    bonusAmount: 60,
    targetAccounts: 2,
    utmSource: "referral",
    utmMedium: "captador",
    utmCampaign: "invite",
  });
});

test("formatReferralBonusLevaHint reflete base e incremento distintos", () => {
  const s = getReferralSettings([
    { key: "referral_bonus_base_brl", value: 50 },
    { key: "referral_bonus_increment_brl", value: 20 },
    { key: "referral_completed_accounts_target", value: 3 },
  ]);
  const h = formatReferralBonusLevaHint(s);
  assert.ok(h.includes("50"));
  assert.ok(h.includes("20"));
  assert.ok(h.includes("3"));
});

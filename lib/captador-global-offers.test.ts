import test from "node:test";
import assert from "node:assert/strict";

import { buildCaptadorGlobalOfferUrl, slugifyCaptadorOfferName } from "./captador-global-offers.ts";

test("slugifyCaptadorOfferName", () => {
  assert.equal(slugifyCaptadorOfferName("Jonbet RF"), "jonbet-rf");
  assert.equal(slugifyCaptadorOfferName("  Br Sporting Bet  "), "br-sporting-bet");
});

test("buildCaptadorGlobalOfferUrl sem query na base", () => {
  const out = buildCaptadorGlobalOfferUrl(
    "https://brsportingbet.net/registro14317",
    "Br Sporting Bet",
    "ABC12",
  );
  const u = new URL(out);
  assert.equal(u.origin + u.pathname, "https://brsportingbet.net/registro14317");
  assert.equal(u.searchParams.get("utm_source"), "leadpayx");
  assert.equal(u.searchParams.get("utm_medium"), "captador");
  assert.equal(u.searchParams.get("utm_campaign"), "br-sporting-bet");
  assert.equal(u.searchParams.get("utm_content"), "ABC12");
});

test("buildCaptadorGlobalOfferUrl preserva query não-utm e substitui utm", () => {
  const out = buildCaptadorGlobalOfferUrl(
    "https://jonbet.cxclick.com/visit/?bta=77042&nci=5421&utm_campaign=RF1002",
    "Jonbet RF",
    "user-uuid-1",
  );
  const u = new URL(out);
  assert.equal(u.searchParams.get("bta"), "77042");
  assert.equal(u.searchParams.get("nci"), "5421");
  assert.equal(u.searchParams.get("utm_campaign"), "jonbet-rf");
  assert.equal(u.searchParams.get("utm_source"), "leadpayx");
  assert.equal(u.searchParams.get("utm_medium"), "captador");
  assert.equal(u.searchParams.get("utm_content"), "user-uuid-1");
});

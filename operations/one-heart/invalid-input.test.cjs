"use strict";
const assert = require("node:assert/strict");
const {test} = require("node:test");
const {quote, postalCode} = require("./quote-preview.cjs");
const shippingQuote = {
  verified: true, country: "CA", postalCode: "T0E 2A0",
  chargeCents: 1600, includedAllowanceCents: 1600,
  serviceClass: "standard", expiresAt: "2099-01-01T00:00:00Z"
};
test("malformed inputs fail closed without throwing", () => {
  for (const input of [null, undefined, 0, "bad", [], true]) {
    assert.deepEqual(quote(input), {status: "unavailable", reason: "input"});
  }
});
test("fictional valid quote remains preview only", () => {
  assert.equal(postalCode("t0e2a0"), "T0E 2A0");
  const result = quote({product: "standard", country: "CA", postal: "T0E2A0", shippingQuote, taxCents: 0});
  assert.equal(result.status, "preview_only");
  assert.equal(result.checkoutEnabled, false);
  assert.equal(result.totalCents, 7499);
});
test("unverified shipping never produces a quote", () => {
  const result = quote({product: "standard", country: "CA", postal: "T0E2A0", shippingQuote: {...shippingQuote, verified: false}, taxCents: 0});
  assert.equal(result.status, "quote_required");
});

test("invalid destinations and expired shipping quotes fail closed", () => {
  const base = {product: "premium", country: "CA", postal: "T0E2A0", shippingQuote, taxCents: 0};
  assert.equal(quote({...base, country: "US"}).status, "quote_required");
  assert.equal(quote({...base, shippingQuote: {...shippingQuote, expiresAt: "2000-01-01T00:00:00Z"}}).status, "quote_required");
  assert.equal(quote({...base, shippingQuote: {...shippingQuote, postalCode: "T0E 2A1"}}).status, "quote_required");
});
test("size and tax requirements preserve preview-only behavior", () => {
  const base = {product: "premium", country: "CA", postal: "T0E2A0", shippingQuote, taxCents: 0};
  assert.equal(quote({...base, size: "3XL"}).status, "unavailable");
  assert.equal(quote({...base, taxCents: -1}).status, "quote_required");
  const result = quote({...base, size: "2XL+"});
  assert.equal(result.totalCents, 8849);
  assert.equal(result.checkoutEnabled, false);
});

test("malformed carrier expiry values cannot crash pricing preview", () => {
  const base = {product: "standard", country: "CA", postal: "T0E2A0", shippingQuote, taxCents: 0};
  for (const expiresAt of [null, 0, {}, [], Symbol("bad")]) {
    assert.doesNotThrow(() => quote({...base, shippingQuote: {...shippingQuote, expiresAt}}));
    assert.equal(quote({...base, shippingQuote: {...shippingQuote, expiresAt}}).status, "quote_required");
  }
});

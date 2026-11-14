import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockAccount, createMockCart, addMockCartLine } from './mock-customer-cart.mjs';
import {
  sessionForFixture, checkFixtureAccess, saveFictionalCart,
  restoreFictionalCart, previewFictionalJourney
} from './mock-customer-flow.mjs';

const now = 200000;
const account = () => createMockAccount({ accountId: 'buyer_fixture' });
const session = () => sessionForFixture({
  account: account(), sessionId: 'fixture_session', now, expiresAt: now + 60000
});
const item = () => ({
  productId: 'fictional_shirt', quantity: 2, unitPriceMinor: 1500,
  vendor: { status: 'approved' },
  product: {
    status: 'approved', mediaRights: true, resaleAuthorized: true,
    territories: ['CA'], stock: 3, inventoryUpdatedAt: new Date(now - 1000).toISOString()
  }
});
const cart = () => addMockCartLine(createMockCart({ ownerId: 'buyer_fixture' }), item());
const opts = () => ({ session: session(), account: account(), cart: cart(), now });

test('session is only a bounded fictional fixture, never real authentication', () => {
  const s = session();
  assert.equal(s.authenticated, false);
  assert.equal(s.grantsRealAccess, false);
  assert.ok(Object.isFrozen(s));
  assert.equal(checkFixtureAccess(opts()), true);
});
test('rejects expired, forged, mismatched and suspended fictional sessions', () => {
  assert.throws(() => sessionForFixture({
    account: account(), sessionId: 'fixture', now, expiresAt: now + 86400001
  }));
  assert.throws(() => checkFixtureAccess({ ...opts(), now: now + 60000 }));
  assert.throws(() => checkFixtureAccess({
    ...opts(), session: { ...session(), authenticated: true }
  }));
  assert.throws(() => checkFixtureAccess({
    ...opts(), account: createMockAccount({ accountId: 'other_fixture' })
  }));
  assert.throws(() => checkFixtureAccess({
    ...opts(), account: createMockAccount({ accountId: 'buyer_fixture', state: 'suspended' })
  }));
  assert.throws(() => checkFixtureAccess({
    ...opts(), cart: createMockCart({ ownerId: 'other_fixture' })
  }));
});
test('snapshot recovers an immutable fictional cart, not personal details', () => {
  const serialized = saveFictionalCart(opts());
  const recovered = restoreFictionalCart({ serialized, session: session(), account: account(), now });
  assert.equal(recovered.lines[0].quantity, 2);
  assert.ok(Object.isFrozen(recovered.lines));
  assert.equal(serialized.includes('authenticated'), false);
  assert.equal(serialized.includes('address'), false);
});
test('snapshot rejects mismatched customer and session and expired recovery', () => {
  const serialized = saveFictionalCart(opts());
  assert.throws(() => restoreFictionalCart({
    serialized, account: createMockAccount({ accountId: 'different' }), session: session(), now
  }));
  assert.throws(() => restoreFictionalCart({
    serialized, account: account(), session: { ...session(), sessionId: 'other' }, now
  }));
  assert.throws(() => restoreFictionalCart({
    serialized, account: account(), session: session(), now: now + 60000
  }));
});
test('snapshot rejects malicious, invalid, oversized and duplicate cart data', () => {
  const serialized = saveFictionalCart(opts());
  const saved = JSON.parse(serialized);
  const recovery = payload => restoreFictionalCart({
    serialized: payload, session: session(), account: account(), now
  });
  for (const payload of ['{oops', 'x'.repeat(100001), 'null']) assert.throws(() => recovery(payload));
  assert.throws(() => recovery(JSON.stringify({ ...saved, version: 2 })));
  assert.throws(() => recovery(JSON.stringify({ ...saved, lines: [...saved.lines, saved.lines[0]] })));
  assert.throws(() => recovery(JSON.stringify({
    ...saved, lines: [{ ...saved.lines[0], productId: '__proto__', quantity: -1 }]
  })));
});
test('fictional journey restores and quotes without real payment or delivery', () => {
  const journey = previewFictionalJourney({
    ...opts(), country: 'CA', fixture: { mode: 'fictional', ratesMinor: { CA: 500 } },
    orderId: 'fictional_order', idempotencyKey: 'fixture_key'
  });
  assert.equal(journey.restoredLineCount, 1);
  assert.equal(journey.preview.checkout.order.state, 'draft');
  assert.equal(journey.preview.mockTotalBeforeTaxMinor, 3500);
  assert.equal(journey.paymentEnabled, false);
  assert.equal(journey.orderSubmitted, false);
  assert.equal(journey.shipmentBooked, false);
  assert.equal(journey.authenticated, false);
});
test('journey fails closed for unsupported shipping and stale stock', () => {
  const fixture = { mode: 'fictional', ratesMinor: { CA: 500 } };
  const common = {
    ...opts(), orderId: 'fictional_order', idempotencyKey: 'fixture_key'
  };
  assert.throws(() => previewFictionalJourney({ ...common, fixture, country: 'US' }));
  assert.throws(() => previewFictionalJourney({
    ...common, fixture, country: 'CA', maxInventoryAgeMs: 500
  }));
  assert.throws(() => previewFictionalJourney({ ...common, country: 'CA' }));
});

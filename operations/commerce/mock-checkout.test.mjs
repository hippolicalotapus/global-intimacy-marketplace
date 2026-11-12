import test from 'node:test';
import assert from 'node:assert/strict';
import { makeVendorApplication, reviewVendor } from './vendor-domain.mjs';
import { createMockCheckout, simulatePayment } from './mock-checkout.mjs';
const vendor = reviewVendor(makeVendorApplication({ displayName: 'Test Vendor', slug: 'test-vendor', country: 'CA' }), 'approved', 'test-admin');
const product = { status: 'approved', mediaRights: true, resaleAuthorized: true, territories: ['CA'], stock: 2, inventoryUpdatedAt: new Date(100000).toISOString() };
const options = () => ({ id: 'order-1', idempotencyKey: 'checkout-key-123', currency: 'CAD', country: 'CA', now: 110000, lines: [{ vendor, product, productId: 'sku-1', quantity: 2, unitPriceMinor: 1200 }] });
test('mock checkout calculates immutable subtotal without claiming a final quote', () => {
  const c = createMockCheckout(options());
  assert.equal(c.order.totalMinor, 2400);
  assert.equal(c.order.state, 'draft');
  assert.equal(c.totalsExcludeTaxAndShipping, true);
  assert.ok(Object.isFrozen(c.lines));
});
test('simulation cannot trigger a real payment or supplier submission', () => {
  const c = simulatePayment(createMockCheckout(options()), 'payment-event-1');
  assert.equal(c.order.state, 'paid');
  assert.equal(c.simulatedPayment, true);
  assert.throws(() => simulatePayment(c, 'payment-event-2'));
});
test('reject unauthorized, unavailable, duplicate and unsafe merchandise', () => {
  const c = options(); c.lines[0].quantity = 3;
  assert.throws(() => createMockCheckout(c));
  const d = options(); d.lines.push({ ...d.lines[0] });
  assert.throws(() => createMockCheckout(d));
  const e = options(); e.lines[0].unitPriceMinor = Number.MAX_SAFE_INTEGER;
  assert.throws(() => createMockCheckout(e));
  const f = options(); f.country = 'US';
  assert.throws(() => createMockCheckout(f));
  const g = options(); g.lines[0].product = { ...product, mediaRights: false };
  assert.throws(() => createMockCheckout(g));
});

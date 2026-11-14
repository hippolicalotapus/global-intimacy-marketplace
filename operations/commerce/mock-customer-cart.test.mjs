import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMockAccount, createMockCart, addMockCartLine, setMockCartQuantity,
  previewMockShipping, previewMockCustomerCheckout
} from './mock-customer-cart.mjs';

const now = 110000;
const vendor = { status: 'approved' };
const product = () => ({
  status: 'approved', mediaRights: true, resaleAuthorized: true,
  territories: ['CA'], stock: 4, inventoryUpdatedAt: new Date(100000).toISOString()
});
const account = () => createMockAccount({ accountId: 'fictional_buyer' });
const cart = () => createMockCart({ ownerId: 'fictional_buyer', currency: 'CAD' });
const line = () => ({
  vendor, product: product(), productId: 'fictional_sku',
  quantity: 2, unitPriceMinor: 1200
});
const filled = () => addMockCartLine(cart(), line());
const fixture = () => ({ mode: 'fictional', ratesMinor: { CA: 450 } });
const checkout = (overrides = {}) => ({
  account: account(), cart: filled(), country: 'CA', fixture: fixture(),
  orderId: 'mock_order_1', idempotencyKey: 'mock_checkout_123', now, ...overrides
});

test('fictional account never claims authentication or stores personal information', () => {
  const a = account();
  assert.equal(a.kind, 'fictional_account');
  assert.equal(a.authenticated, false);
  assert.equal(a.storesPersonalInformation, false);
  assert.ok(Object.isFrozen(a));
});
test('fictional account rejects invalid identifiers and unsupported status', () => {
  for (const accountId of ['', '../secret', 'a'.repeat(101), null]) {
    assert.throws(() => createMockAccount({ accountId }));
  }
  assert.throws(() => createMockAccount({ accountId: 'user', state: 'verified' }));
});
test('cart is fictional and immutable', () => {
  const c = filled();
  assert.equal(c.mockOnly, true);
  assert.equal(c.lines.length, 1);
  assert.equal(c.lines[0].quantity, 2);
  assert.ok(Object.isFrozen(c.lines[0].product.territories));
  assert.ok(Object.isFrozen(c.lines));
  assert.equal(cart().lines.length, 0);
});
test('cart copies product eligibility evidence before caller mutation', () => {
  const source = line();
  const c = addMockCartLine(cart(), source);
  source.product.stock = 10000;
  source.product.territories.push('US');
  source.vendor.status = 'suspended';
  assert.equal(c.lines[0].product.stock, 4);
  assert.deepEqual(c.lines[0].product.territories, ['CA']);
  assert.equal(c.lines[0].vendor.status, 'approved');
});
test('cart rejects duplicate IDs, unsafe prices and quantities', () => {
  assert.throws(() => addMockCartLine(filled(), line()), /Duplicate/);
  for (const quantity of [0, 101, -1, 1.5]) {
    assert.throws(() => addMockCartLine(cart(), { ...line(), quantity }));
  }
  for (const unitPriceMinor of [-1, 1.5, Infinity]) {
    assert.throws(() => addMockCartLine(cart(), { ...line(), unitPriceMinor }));
  }
  assert.throws(() => addMockCartLine(cart(), { ...line(), productId: '../unsafe' }));
});
test('cart quantity updates and zero removes without mutating the prior cart', () => {
  const a = filled();
  const b = setMockCartQuantity(a, 'fictional_sku', 3);
  assert.equal(a.lines[0].quantity, 2);
  assert.equal(b.lines[0].quantity, 3);
  const c = setMockCartQuantity(b, 'fictional_sku', 0);
  assert.equal(c.lines.length, 0);
  assert.equal(b.lines.length, 1);
});
test('cart quantity update rejects missing product or out-of-range quantity', () => {
  assert.throws(() => setMockCartQuantity(filled(), 'missing', 1));
  assert.throws(() => setMockCartQuantity(filled(), 'fictional_sku', 101));
  assert.throws(() => setMockCartQuantity(filled(), 'fictional_sku', 1.5));
});
test('mock shipping does not infer delivery eligibility without a fictional rate', () => {
  const q = previewMockShipping({ cart: filled(), country: 'CA', now });
  assert.equal(q.status, 'unknown');
  assert.equal(q.shippingMinor, null);
  assert.equal(q.deliveryConfirmed, false);
});
test('fictional rate makes an explicitly simulated quote, not a real promise', () => {
  const q = previewMockShipping({ cart: filled(), country: 'CA', fixture: fixture(), now });
  assert.equal(q.status, 'fictional_quote');
  assert.equal(q.shippingMinor, 450);
  assert.equal(q.deliveryConfirmed, false);
  assert.equal(q.shipmentBooked, false);
});
test('stale inventory, insufficient stock and unauthorized territories block shipping quote', () => {
  for (const altered of [
    { inventoryUpdatedAt: new Date(1000).toISOString() },
    { stock: 1 }, { territories: ['US'] },
    { mediaRights: false }, { resaleAuthorized: false }
  ]) {
    const c = addMockCartLine(cart(), { ...line(), product: { ...product(), ...altered } });
    assert.equal(previewMockShipping({ cart: c, country: 'CA', fixture: fixture(), now }).status, 'unavailable');
  }
});
test('shipping rejects unsafe fictional rate and invalid country input', () => {
  for (const rate of [-1, 1.5, Infinity]) {
    assert.throws(() => previewMockShipping({
      cart: filled(), country: 'CA',
      fixture: { mode: 'fictional', ratesMinor: { CA: rate } }, now
    }));
  }
  assert.throws(() => previewMockShipping({ cart: filled(), country: 'Worldwide', now }));
});
test('shipping never accepts non-fictional data as a confirmed quote', () => {
  const q = previewMockShipping({
    cart: filled(), country: 'CA',
    fixture: { mode: 'production', ratesMinor: { CA: 450 } }, now
  });
  assert.equal(q.status, 'unknown');
  assert.equal(q.deliveryConfirmed, false);
});
test('account-bound mock checkout calculates fictional shipping without enabling payment', () => {
  const result = previewMockCustomerCheckout(checkout());
  assert.equal(result.checkout.order.totalMinor, 2400);
  assert.equal(result.checkout.order.state, 'draft');
  assert.equal(result.mockTotalBeforeTaxMinor, 2850);
  assert.equal(result.taxNotCalculated, true);
  assert.equal(result.finalPriceAvailable, false);
  assert.equal(result.paymentEnabled, false);
  assert.equal(result.customerAuthenticated, false);
  assert.equal(result.orderSubmitted, false);
  assert.equal(result.requiresServerRevalidation, true);
});
test('checkout refuses another customer and suspended fictional accounts', () => {
  assert.throws(() => previewMockCustomerCheckout(checkout({
    account: createMockAccount({ accountId: 'another_buyer' })
  })));
  assert.throws(() => previewMockCustomerCheckout(checkout({
    account: createMockAccount({ accountId: 'fictional_buyer', state: 'suspended' })
  })));
});
test('checkout refuses missing shipping quote and empty cart', () => {
  assert.throws(() => previewMockCustomerCheckout(checkout({ fixture: undefined })));
  assert.throws(() => previewMockCustomerCheckout(checkout({ cart: cart() })));
});
test('checkout refuses overflow from fictional shipping even if merchandise fits', () => {
  assert.throws(() => previewMockCustomerCheckout(checkout({
    fixture: { mode: 'fictional', ratesMinor: { CA: Number.MAX_SAFE_INTEGER } }
  })), RangeError);
});
test('checkout does not reserve stock or create a shipment', () => {
  const result = previewMockCustomerCheckout(checkout());
  assert.equal(result.inventoryReserved, false);
  assert.equal(result.shipmentBooked, false);
  assert.equal(result.shipping.shipmentBooked, false);
});

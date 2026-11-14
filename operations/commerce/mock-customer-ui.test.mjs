import test from 'node:test';
import assert from 'node:assert/strict';
import {
  catalog, createDemoCustomer, changeDemoQuantity, changeDemoCountry,
  saveDemoCart, restoreDemoCart, previewDemo
} from './mock-customer-ui.mjs';

test('returning shopper gets a fictional cart with no authenticated account', () => {
  const state = createDemoCustomer();
  assert.equal(state.cart.lines.length, 1);
  assert.equal(state.account.authenticated, false);
  assert.equal(state.session.grantsRealAccess, false);
  assert.equal(state.mockOnly, true);
});
test('guest starts with an empty cart and checkout fails closed', () => {
  const state = createDemoCustomer({ shopper: 'guest' });
  assert.equal(state.cart.lines.length, 0);
  assert.equal(previewDemo(state).shipping.status, 'unavailable');
  assert.equal(previewDemo(state).paymentEnabled, false);
});
test('shopper adds item and adjusts quantities without mutating previous state', () => {
  const a = createDemoCustomer({ shopper: 'guest' });
  const b = changeDemoQuantity(a, catalog.hoodie.productId, 2);
  const c = changeDemoQuantity(b, catalog.hoodie.productId, 3);
  assert.equal(a.cart.lines.length, 0);
  assert.equal(b.cart.lines[0].quantity, 2);
  assert.equal(c.cart.lines[0].quantity, 3);
  assert.ok(Object.isFrozen(c.cart.lines));
});
test('zero removes product and invalid edits fail closed', () => {
  const a = createDemoCustomer();
  const b = changeDemoQuantity(a, catalog.tee.productId, 0);
  assert.equal(b.cart.lines.length, 0);
  assert.throws(() => changeDemoQuantity(a, catalog.tee.productId, 11));
  assert.throws(() => changeDemoQuantity(a, 'unknown', 1));
  assert.throws(() => changeDemoQuantity(a, catalog.tee.productId, 1.5));
});
test('switching country adjusts fictional shipping without booking delivery', () => {
  const a = createDemoCustomer();
  const canada = previewDemo(a);
  const usa = previewDemo(changeDemoCountry(a, 'US'));
  assert.equal(canada.shipping.shippingMinor, 450);
  assert.equal(usa.shipping.shippingMinor, 750);
  assert.equal(usa.checkout.shipping.shipmentBooked, false);
  assert.equal(a.country, 'CA');
});
test('fictional unsupported destination fails closed, never quotes delivery', () => {
  const result = previewDemo(changeDemoCountry(createDemoCustomer(), 'GB'));
  assert.equal(result.checkout, null);
  assert.equal(result.paymentEnabled, false);
  assert.equal(result.shipping.status, 'unknown');
  assert.throws(() => changeDemoCountry(createDemoCustomer(), 'ZZ'));
});
test('returning shopper recovers cart snapshot and resumes fictional draft', () => {
  const original = createDemoCustomer();
  const changed = changeDemoQuantity(original, catalog.hoodie.productId, 2);
  const snapshot = saveDemoCart(changed);
  const recovered = restoreDemoCart(original, snapshot);
  assert.equal(recovered.cart.lines.length, 2);
  assert.equal(previewDemo(recovered).checkout.checkout.order.state, 'draft');
  assert.equal(previewDemo(recovered).checkout.paymentEnabled, false);
  assert.equal(previewDemo(recovered).checkout.orderSubmitted, false);
});
test('other fictional shopper cannot recover cart snapshot', () => {
  const snapshot = saveDemoCart(createDemoCustomer());
  assert.throws(() => restoreDemoCart(createDemoCustomer({ shopper: 'guest' }), snapshot));
});
test('prototype never submits, reserves, authenticates or processes payment', () => {
  const result = previewDemo(createDemoCustomer());
  assert.equal(result.checkout.customerAuthenticated, false);
  assert.equal(result.checkout.orderSubmitted, false);
  assert.equal(result.checkout.inventoryReserved, false);
  assert.equal(result.checkout.shipmentBooked, false);
  assert.equal(result.checkout.taxNotCalculated, true);
  assert.equal(result.paymentEnabled, false);
});

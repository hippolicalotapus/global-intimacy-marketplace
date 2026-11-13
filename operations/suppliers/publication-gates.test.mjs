import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateProductReadiness } from './publication-gates.mjs';
test('unknown suppliers and products are blocked', () => {
  const result = evaluateProductReadiness();
  assert.equal(result.publishable, false);
  assert.equal(result.orderable, false);
  assert.ok(result.publicationReasons.includes('media_license_missing'));
});
test('publication requires every explicit authorization', () => {
  const supplier = { resellerApproved: true, fulfillmentApproved: false };
  const product = { resellerApproved: true, commercialPhotoPermission: true,
    territoryApproved: true, identityVerified: true, priceApproved: true,
    ownerApproved: true };
  const result = evaluateProductReadiness(product, supplier);
  assert.equal(result.publishable, true);
  assert.equal(result.orderable, false);
});
test('orders require separate fulfillment, payment and shipping gates', () => {
  const supplier = { resellerApproved: true, fulfillmentApproved: true };
  const product = { resellerApproved: true, commercialPhotoPermission: true,
    territoryApproved: true, identityVerified: true, priceApproved: true,
    ownerApproved: true, inventoryFresh: true, shippingVerified: true,
    returnsVerified: true, paymentApproved: true };
  assert.equal(evaluateProductReadiness(product, supplier).orderable, true);
  product.inventoryFresh = false;
  assert.equal(evaluateProductReadiness(product, supplier).orderable, false);
});

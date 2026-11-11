import test from 'node:test';
import assert from 'node:assert/strict';
import { makeVendorApplication, reviewVendor, suspendVendor, canPublishProduct } from './vendor-domain.mjs';

const application = () => makeVendorApplication({ displayName: 'Sample Vendor', slug: 'sample-vendor', country: 'ca' });
const approved = () => reviewVendor(application(), 'approved', 'admin-1');
const product = (overrides = {}) => ({ status: 'approved', mediaRights: true, resaleAuthorized: true, territories: ['CA'], stock: 4, inventoryUpdatedAt: new Date(100000).toISOString(), ...overrides });
const eligible = (overrides = {}) => ({ vendor: approved(), product: product(), country: 'CA', now: 110000, ...overrides });

test('new vendors remain pending and are immutable', () => {
  const v = application();
  assert.equal(v.status, 'pending');
  assert.ok(Object.isFrozen(v));
});
test('invalid applications are rejected', () => {
  assert.throws(() => makeVendorApplication({ displayName: 'X', slug: '../x', country: 'CA' }));
  assert.throws(() => makeVendorApplication({ displayName: 'X', slug: 'x', country: 'CAN' }));
});
test('only pending vendors can be reviewed; suspended vendors cannot publish', () => {
  const v = approved();
  assert.throws(() => reviewVendor(v, 'approved', 'admin'));
  assert.equal(canPublishProduct(eligible({ vendor: suspendVendor(v, 'admin') })), false);
  assert.equal(canPublishProduct(eligible({ vendor: application() })), false);
  assert.equal(reviewVendor(application(), 'rejected', 'admin').status, 'rejected');
});
test('publication requires rights, territory, approved status and fresh positive stock', () => {
  assert.equal(canPublishProduct(eligible()), true);
  for (const change of [
    { status: 'draft' }, { mediaRights: false }, { resaleAuthorized: false },
    { territories: ['US'] }, { stock: 0 }, { stock: -1 }, { stock: 1.5 },
    { inventoryUpdatedAt: 'bad-date' }, { inventoryUpdatedAt: new Date(110001).toISOString() },
    { inventoryUpdatedAt: new Date(0).toISOString() }
  ]) assert.equal(canPublishProduct(eligible({ product: product(change) })), false, JSON.stringify(change));
});
test('unknown or invalid publication inputs fail closed', () => {
  assert.equal(canPublishProduct(), false);
  assert.equal(canPublishProduct(eligible({ country: 'US' })), false);
  assert.equal(canPublishProduct(eligible({ now: NaN })), false);
  assert.equal(canPublishProduct(eligible({ maxInventoryAgeMs: -1 })), false);
});

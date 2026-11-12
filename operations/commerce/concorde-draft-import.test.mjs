import test from 'node:test';
import assert from 'node:assert/strict';
import { draftConcordeProduct, draftConcordeCatalogue } from './concorde-draft-import.mjs';
const sample = (overrides = {}) => ({
  sku: 'DEMO-001', title: 'Fictional sample product',
  imageUrl: 'https://example.invalid/photos/demo-001.jpg',
  wholesaleCents: 1234, currency: 'CAD', stock: 3, ...overrides
});
test('Concorde fixture imports only as unpublished draft', () => {
  const p = draftConcordeProduct(sample());
  assert.equal(p.supplier, 'concorde');
  assert.equal(p.status, 'draft');
  assert.equal(p.published, false);
  assert.equal(p.fulfillmentVerified, false);
  assert.deepEqual(p.territories, []);
  assert.equal(p.inventoryUpdatedAt, null);
  assert.equal(p.imageUrl, sample().imageUrl);
  assert.ok(Object.isFrozen(p));
});
test('invalid and unsafe catalogue records fail closed', () => {
  for (const change of [
    { sku: '../bad' }, { sku: '' }, { title: '' },
    { imageUrl: 'http://example.invalid/image.jpg' },
    { imageUrl: 'https://user:pass@example.invalid/img' },
    { wholesaleCents: -1 }, { wholesaleCents: 1.5 },
    { stock: -1 }, { currency: 'DOLLARS' }
  ]) assert.throws(() => draftConcordeProduct(sample(change)), JSON.stringify(change));
});
test('duplicate SKUs are rejected without altering inputs', () => {
  const first = sample();
  const second = sample({ sku: 'demo-001' });
  assert.throws(() => draftConcordeCatalogue([first, second]), /Duplicate/);
  assert.equal(first.sku, 'DEMO-001');
});
test('batch drafts remain isolated from source and contain no public listing flag', () => {
  const input = [sample(), sample({ sku: 'DEMO-002', stock: null })];
  const result = draftConcordeCatalogue(input);
  assert.equal(result.length, 2);
  assert.ok(Object.isFrozen(result));
  assert.equal(result[1].stock, null);
  assert.equal(result[1].published, false);
  assert.equal(input[1].status, undefined);
});

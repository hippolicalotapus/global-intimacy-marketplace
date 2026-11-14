import test from 'node:test';
import assert from 'node:assert/strict';
import { auditResearchCandidates } from './research-readiness.mjs';
const registry = { suppliers: [{id: 'concorde-pro', resellerApproved: false, canPublish: false, canAcceptOrders: false}] };
const product = () => ({
  storeResearchId: 74, brand: 'Example', storePreviewName: 'Research item',
  supplierReference: 'ABC-123', ean: '6959532363807',
  sourceUrl: 'https://www.concordepro.com/product/example.html',
  verifiedStock: false, verifiedWholesalePrice: false, photoLicense: false,
  resaleTerritoriesApproved: [], dropshipAuthorized: false, canPublishAsPurchasable: false
});
const batch = (items = [product()]) => ({ supplierId: 'concorde-pro', sourceCount: items.length, items });
const audit = (items, destination = 'CA') => auditResearchCandidates(registry, batch(items), destination);

test('clean source research is not treated as authorized stock, shipping or a listing', () => {
  const r = audit([product()]);
  assert.equal(r.invalidCount, 0);
  assert.equal(r.reviewCount, 0);
  assert.equal(r.shippingEligible, 0);
  assert.equal(r.shippingUnverified, 1);
  assert.equal(r.publicationEligible, 0);
  assert.equal(r.conclusion, 'RESEARCH_ONLY_NOT_FOR_SALE');
});
test('international destination remains unverified; never worldwide by inference', () => {
  const r = audit([product()], 'GB');
  assert.equal(r.destinationCountry, 'GB');
  assert.equal(r.shippingEligible, 0);
  assert.throws(() => audit([product()], 'WORLDWIDE'), /destination country/);
});
test('unknown supplier and batch count drift fail the integrity check', () => {
  const b = batch(); b.supplierId = 'unknown'; b.sourceCount = 2;
  const r = auditResearchCandidates(registry, b);
  assert.deepEqual(r.problems.map(x => x.code), ['unknown_supplier','source_count_mismatch','unexpected_public_source_batch']);
});
test('duplicate research IDs and official URLs are rejected', () => {
  const r = audit([product(), {...product(),ean: null}]);
  assert.ok(r.problems.some(x => x.code === 'duplicate_research_id'));
  assert.ok(r.problems.some(x => x.code === 'duplicate_source_url'));
});
test('duplicate valid EANs are rejected with distinct research IDs', () => {
  const next = {...product(), storeResearchId: 75, sourceUrl: 'https://concordepro.com/product/next'};
  assert.ok(audit([product(), next]).problems.some(x => x.code === 'duplicate_ean13'));
});
test('malformed EAN-13 and non-official source fail closed', () => {
  const p = {...product(),ean:'6959532363808', sourceUrl: 'https://concordepro.com.attacker.example/p'};
  const codes = audit([p]).problems.map(x => x.code);
  assert.ok(codes.includes('invalid_ean13'));
  assert.ok(codes.includes('non_official_source_url'));
});
test('missing supplier identifiers need manual review, never an invented SKU', () => {
  const p = {...product(), supplierReference:null,ean:null};
  const r = audit([p]);
  assert.equal(r.invalidCount, 0);
  assert.deepEqual(r.review.map(x=>x.code), ['missing_supplier_identifier']);
  assert.equal(r.shippingEligible, 0);
});
test('stock, photo, trade, territory and sale claims need independent evidence', () => {
  for(const [key,value] of [
    ['verifiedStock',true],['verifiedWholesalePrice',true],['photoLicense',true],
    ['dropshipAuthorized',true],['canPublishAsPurchasable',true],
    ['resaleTerritoriesApproved',['CA']]
  ]) {
    const r = audit([{...product(), [key]:value}]);
    assert.ok(r.problems.some(x=>x.code==='research_candidate_has_unverified_commercial_claim'),key);
    assert.equal(r.shippingEligible,0);
  }
});
test('malformed input cannot accidentally pass', () => {
  assert.throws(()=>auditResearchCandidates(null,batch()),/required/);
  assert.throws(()=>auditResearchCandidates(registry,{items:null}),/required/);
  assert.ok(audit([null]).problems.some(x=>x.code==='malformed_candidate'));
});

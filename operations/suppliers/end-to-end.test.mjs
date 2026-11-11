import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, stageSupplierRows } from './import-feed.mjs';
import { reviewStagedProduct } from './review-queue.mjs';

test('end-to-end: untrusted CSV -> quarantine -> private review -> blocked checkout', () => {
  const csv = 'SKU,Name,Stock,Wholesale Price,Image URL,Owner Approved\\n' +
    'SAFE-1,"Sample, One",18,12.50,https://example.org/a.jpg,true\\n' +
    'SAFE-1,Duplicate,8,11.00,https://example.org/b.jpg,true\\n' +
    'SAFE-2,Second,unknown,14.50,javascript:alert(1),true\\n';
  const rows = parseCSV(csv);
  const batch = stageSupplierRows('concorde-pro', rows, '2026-11-11T00:00:00Z');
  assert.deepEqual(batch.metrics, { rows:3, staged:2, quarantined:1 });
  assert.equal(batch.allowPublicExport, false);
  assert.equal(batch.allowOrders, false);
  assert.equal(batch.products[0].flags.ownerApproved, false);
  assert.equal(batch.products[1].privateSupplierData.sourceImageUrl, '');
  for (const item of batch.products) {
    const reviewed = reviewStagedProduct(item, {resellerApproved:false});
    assert.equal(reviewed.status, 'blocked_pending_evidence');
    assert.equal(reviewed.readiness.publishable, false);
    assert.equal(reviewed.readiness.orderable, false);
    assert.equal(reviewed.publicExportPerformed, false);
    assert.equal(reviewed.orderPlaced, false);
    assert.equal(JSON.stringify(reviewed).includes('12.50'), false);
  }
});
test('end-to-end: publication readiness never implies checkout readiness', () => {
  const batch=stageSupplierRows('concorde-pro',[{sku:'P-1',name:'Approved example',stock:'2'}]);
  const supplier={resellerApproved:true,fulfillmentApproved:false};
  const decisions={resellerApproved:true,commercialPhotoPermission:true,
    territoryApproved:true,identityVerified:true,priceApproved:true,ownerApproved:true};
  const reviewed=reviewStagedProduct(batch.products[0],supplier,decisions);
  assert.equal(reviewed.status,'reviewed_publication_ready');
  assert.equal(reviewed.readiness.publishable,true);
  assert.equal(reviewed.readiness.orderable,false);
  assert.ok(reviewed.readiness.orderReasons.includes('payment_provider_unapproved'));
});

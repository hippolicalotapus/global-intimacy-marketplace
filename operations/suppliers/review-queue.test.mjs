import test from 'node:test';
import assert from 'node:assert/strict';
import { stageSupplierRows } from './import-feed.mjs';
import { reviewStagedProduct } from './review-queue.mjs';
const item = () => stageSupplierRows('concorde-pro',[{sku:'T-1',name:'Demo',wholesale_price:'11.99',stock:'9'}]).products[0];
test('no decisions leaves item blocked and never exports supplier cost', () => {
  const result = reviewStagedProduct(item(), {});
  assert.equal(result.status, 'blocked_pending_evidence');
  assert.equal(result.publicExportPerformed, false);
  assert.equal(JSON.stringify(result).includes('11.99'), false);
});
test('unknown or nonboolean review decisions fail', () => {
  assert.throws(() => reviewStagedProduct(item(), {}, { bypass:true }), /Unknown review field/);
  assert.throws(() => reviewStagedProduct(item(), {}, { ownerApproved:'yes' }), /boolean/);
});
test('review queue requires independently supplied approvals', () => {
  const supplier={resellerApproved:true,fulfillmentApproved:false};
  const decisions={resellerApproved:true,commercialPhotoPermission:true,territoryApproved:true,
    identityVerified:true,priceApproved:true,ownerApproved:true};
  const result=reviewStagedProduct(item(),supplier,decisions);
  assert.equal(result.readiness.publishable,true);
  assert.equal(result.readiness.orderable,false);
  assert.equal(result.orderPlaced,false);
});
test('malformed staged product rejected', () => {
  assert.throws(() => reviewStagedProduct({status:'pending_review'},{}),/source identity/);
});

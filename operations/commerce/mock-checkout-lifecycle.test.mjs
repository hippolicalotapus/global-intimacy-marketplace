import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoCustomer,changeDemoCountry } from './mock-customer-ui.mjs';
import { beginFictionalJourney,progressFictionalJourney,describeFictionalJourney } from './mock-checkout-lifecycle.mjs';

test('fictional checkout starts as unpaid draft and never activates ordering',()=>{
  const j=beginFictionalJourney(createDemoCustomer());
  assert.equal(j.state,'draft');
  assert.equal(j.order.totalMinor,2500);
  assert.equal(j.orderSubmitted,false);
  assert.equal(j.realPaymentProcessed,false);
  assert.equal(j.paymentEnabled,false);
  assert.equal(j.shipmentBooked,false);
  assert.equal(j.receiptIssued,false);
  assert.match(describeFictionalJourney(j),/No real payment/);
});
test('simulated pending and confirmation transitions never create real orders or receipts',()=>{
  const draft=beginFictionalJourney(createDemoCustomer());
  const pending=progressFictionalJourney(draft,'pending');
  const confirmation=progressFictionalJourney(pending,'confirm');
  assert.equal(pending.state,'awaiting_payment');
  assert.equal(confirmation.state,'paid');
  assert.equal(confirmation.orderSubmitted,false);
  assert.equal(confirmation.realPaymentProcessed,false);
  assert.equal(confirmation.paymentEnabled,false);
  assert.equal(confirmation.receiptIssued,false);
  assert.equal(confirmation.shipmentBooked,false);
  assert.equal(draft.state,'draft');
  assert.match(describeFictionalJourney(confirmation),/Fictional payment confirmation/);
});
test('cancellation is allowed for fictional drafts or pending, not after confirmation',()=>{
  const draft=beginFictionalJourney(createDemoCustomer());
  assert.equal(progressFictionalJourney(draft,'cancel').state,'cancelled');
  const pending=progressFictionalJourney(draft,'pending');
  assert.equal(progressFictionalJourney(pending,'cancel').state,'cancelled');
  assert.throws(()=>progressFictionalJourney(progressFictionalJourney(pending,'confirm'),'cancel'));
  assert.throws(()=>progressFictionalJourney(progressFictionalJourney(draft,'cancel'),'pending'));
});
test('invalid, out-of-order and duplicate transitions fail closed',()=>{
  const draft=beginFictionalJourney(createDemoCustomer());
  assert.throws(()=>progressFictionalJourney(draft,'confirm'));
  assert.throws(()=>progressFictionalJourney(draft,'unknown'));
  assert.throws(()=>progressFictionalJourney(progressFictionalJourney(draft,'pending'),'pending'));
  assert.throws(()=>progressFictionalJourney({...draft,paymentEnabled:true},'pending'));
});
test('empty cart and unsupported shipping block fictional journey start',()=>{
  assert.throws(()=>beginFictionalJourney(createDemoCustomer({shopper:'guest'})));
  assert.throws(()=>beginFictionalJourney(changeDemoCountry(createDemoCustomer(),'GB')));
});

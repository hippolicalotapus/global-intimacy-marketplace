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

test('each fictional action rejects replay without changing the original journey',()=>{
  const draft=beginFictionalJourney(createDemoCustomer());
  const pending=progressFictionalJourney(draft,'pending');
  const paid=progressFictionalJourney(pending,'confirm');
  const cancelled=progressFictionalJourney(draft,'cancel');
  for(const [journey,event] of [[pending,'pending'],[paid,'confirm'],[cancelled,'cancel']]) {
    const before=JSON.stringify(journey);
    assert.throws(()=>progressFictionalJourney(journey,event),/already applied/);
    assert.equal(JSON.stringify(journey),before);
    assert.equal(journey.paymentEnabled,false);
    assert.equal(journey.orderSubmitted,false);
  }
  assert.equal(draft.order.processedEvents.length,0);
  assert.equal(pending.order.processedEvents.length,1);
});


test('simulated payment decline is distinct from cancellation and never charges or submits',()=>{
  const draft=beginFictionalJourney(createDemoCustomer());
  const pending=progressFictionalJourney(draft,'pending');
  const declined=progressFictionalJourney(pending,'decline');
  assert.equal(declined.state,'cancelled');
  assert.equal(declined.outcome,'declined');
  assert.match(describeFictionalJourney(declined),/payment declined \(no charge\)/);
  for(const key of ['orderSubmitted','paymentEnabled','realPaymentProcessed','shipmentBooked','receiptIssued'])assert.equal(declined[key],false);
  assert.equal(pending.state,'awaiting_payment');
  assert.throws(()=>progressFictionalJourney(draft,'decline'),/requires fictional payment pending/);
  assert.throws(()=>progressFictionalJourney(declined,'decline'));
  assert.throws(()=>progressFictionalJourney(declined,'confirm'));
  const cancelled=progressFictionalJourney(pending,'cancel');
  assert.equal(cancelled.outcome,'cancelled');
  assert.doesNotMatch(describeFictionalJourney(cancelled),/declined/);
});

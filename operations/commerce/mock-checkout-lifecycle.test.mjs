import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoCustomer,changeDemoCountry,changeDemoQuantity } from './mock-customer-ui.mjs';
import { beginFictionalJourney,progressFictionalJourney,retryDeclinedFictionalJourney,describeFictionalJourney } from './mock-checkout-lifecycle.mjs';

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

test('decline retry opens fresh fictional draft and is bounded to three attempts',()=>{
  let j=beginFictionalJourney(createDemoCustomer());
  for(let attempt=1;attempt<=3;attempt++){
    assert.equal(j.attemptNumber,attempt);
    const pending=progressFictionalJourney(j,'pending');
    const declined=progressFictionalJourney(pending,'decline');
    assert.equal(declined.state,'cancelled');
    assert.equal(declined.outcome,'declined');
    assert.equal(declined.orderSubmitted,false);
    assert.equal(declined.realPaymentProcessed,false);
    assert.equal(declined.paymentEnabled,false);
    if(attempt<3){
      j=retryDeclinedFictionalJourney(declined,createDemoCustomer());
      assert.equal(j.state,'draft');
      assert.equal(j.order.processedEvents.length,0);
      assert.match(describeFictionalJourney(j),new RegExp('Attempt '+(attempt+1)+' of 3'));
    }else{
      assert.throws(()=>retryDeclinedFictionalJourney(declined,createDemoCustomer()),/retry limit/);
    }
  }
});
test('only same fictional shopper cart and shipping may retry declined scenario',()=>{
  const declined=progressFictionalJourney(progressFictionalJourney(beginFictionalJourney(createDemoCustomer()),'pending'),'decline');
  assert.throws(()=>retryDeclinedFictionalJourney(declined,createDemoCustomer({shopper:'guest'})));
  assert.throws(()=>retryDeclinedFictionalJourney(declined,changeDemoCountry(createDemoCustomer(),'US')));
  assert.throws(()=>retryDeclinedFictionalJourney(beginFictionalJourney(createDemoCustomer()),createDemoCustomer()));
  assert.equal(declined.state,'cancelled');
});

test('cancelled fictional checkout can restart as a clean new review, without reusing prior events',()=>{
  const state=createDemoCustomer();
  const cancelled=progressFictionalJourney(progressFictionalJourney(beginFictionalJourney(state),'pending'),'cancel');
  assert.throws(()=>retryDeclinedFictionalJourney(cancelled,state),/Only a declined/);
  const fresh=beginFictionalJourney(state);
  assert.equal(fresh.state,'draft');
  assert.equal(fresh.attemptNumber,1);
  assert.deepEqual(fresh.order.processedEvents,[]);
  assert.equal(cancelled.state,'cancelled');
  for(const key of ['paymentEnabled','realPaymentProcessed','orderSubmitted','shipmentBooked'])assert.equal(fresh[key],false);
});
test('cart and shipping edits require new fictional review rather than retrying a stale decline',()=>{
  const state=createDemoCustomer();
  const declined=progressFictionalJourney(progressFictionalJourney(beginFictionalJourney(state),'pending'),'decline');
  const edited=changeDemoQuantity(state,'fictional_tee',2);
  assert.throws(()=>retryDeclinedFictionalJourney(declined,edited),/cart or shopper changed/);
  const moved=changeDemoCountry(state,'US');
  assert.throws(()=>retryDeclinedFictionalJourney(declined,moved),/cart or shopper changed/);
  assert.throws(()=>retryDeclinedFictionalJourney(declined,changeDemoCountry(state,'GB')));
  const fresh=beginFictionalJourney(edited);
  assert.equal(fresh.attemptNumber,1);
  assert.equal(fresh.review.itemCount,2);
  assert.equal(fresh.paymentEnabled,false);
  assert.equal(declined.attemptNumber,1);
});

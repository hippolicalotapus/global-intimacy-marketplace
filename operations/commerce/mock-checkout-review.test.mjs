import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoCustomer, changeDemoCountry, changeDemoQuantity, catalog } from './mock-customer-ui.mjs';
import { assessFictionalCheckout } from './mock-checkout-review.mjs';

test('returning fictional shopper gets an itemized review without order capability', () => {
  const result=assessFictionalCheckout(createDemoCustomer());
  assert.equal(result.itemCount,1);
  assert.equal(result.subtotalMinor,2500);
  assert.equal(result.shippingMinor,450);
  assert.equal(result.totalBeforeTaxMinor,2950);
  assert.equal(result.requirements.length,6);
  assert.equal(result.requirements.filter(x=>x.ready).length,2);
  assert.equal(result.checkoutEnabled,false);
  assert.equal(result.canPlaceOrder,false);
  assert.equal(result.paymentEnabled,false);
  assert.equal(result.orderSubmitted,false);
  assert.equal(result.taxCalculated,false);
});
test('multi-item fictional cart review reflects actual quantities',()=>{
  let state=createDemoCustomer();
  state=changeDemoQuantity(state,catalog.tee.productId,3);
  state=changeDemoQuantity(state,catalog.hoodie.productId,2);
  const review=assessFictionalCheckout(state);
  assert.equal(review.itemCount,5);
  assert.equal(review.cartLines.length,2);
  assert.equal(review.subtotalMinor,17300);
  assert.equal(review.totalBeforeTaxMinor,17750);
  assert.ok(Object.isFrozen(review.requirements));
});
test('unsupported fictional shipping and empty cart fail closed',()=>{
  const unsupported=assessFictionalCheckout(changeDemoCountry(createDemoCustomer(),'GB'));
  assert.equal(unsupported.shippingMinor,null);
  assert.equal(unsupported.totalBeforeTaxMinor,null);
  assert.equal(unsupported.requirements[1].ready,false);
  const empty=assessFictionalCheckout(createDemoCustomer({shopper:'guest'}));
  assert.equal(empty.itemCount,0);
  assert.equal(empty.shippingMinor,null);
  assert.equal(empty.canPlaceOrder,false);
});
test('simulated country switching updates estimates but never enables live checkout',()=>{
  const ca=assessFictionalCheckout(createDemoCustomer());
  const us=assessFictionalCheckout(changeDemoCountry(createDemoCustomer(),'US'));
  assert.equal(us.shippingMinor,750);
  assert.equal(us.totalBeforeTaxMinor,3250);
  assert.equal(ca.country,'CA');
  assert.equal(us.country,'US');
  assert.equal(us.paymentEnabled,false);
});
test('review refuses non-fictional or purportedly authenticated state',()=>{
  const state=createDemoCustomer();
  assert.throws(()=>assessFictionalCheckout({...state,mockOnly:false}));
  assert.throws(()=>assessFictionalCheckout({...state,account:{...state.account,authenticated:true}}));
  assert.throws(()=>assessFictionalCheckout({...state,session:{...state.session,grantsRealAccess:true}}));
});

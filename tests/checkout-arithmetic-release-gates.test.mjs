import test from 'node:test';
import assert from 'node:assert/strict';
import {makeVendorApplication,reviewVendor} from '../operations/commerce/vendor-domain.mjs';
import {createMockCheckout,simulatePayment} from '../operations/commerce/mock-checkout.mjs';

const vendor=reviewVendor(makeVendorApplication({displayName:'Fictional Vendor',slug:'fictional-vendor',country:'CA'}),'approved','fictional-reviewer');
const product={status:'approved',mediaRights:true,resaleAuthorized:true,territories:['CA'],stock:100,inventoryUpdatedAt:new Date(100000).toISOString()};
const input=()=>({id:'fictional-order',idempotencyKey:'fictional-idempotency',currency:'CAD',country:'CA',now:110000,lines:[{vendor,product,productId:'fictional-sku',quantity:1,unitPriceMinor:1500}]});

test('checkout cannot exceed safe integer subtotal',()=>{
 const args=input();args.lines[0].quantity=100;args.lines[0].unitPriceMinor=Number.MAX_SAFE_INTEGER;
 assert.throws(()=>createMockCheckout(args),RangeError);
});
test('checkout rejects zero and fractional quantities',()=>{
 for(const quantity of [0,-1,1.5,101]){
  const args=input();args.lines[0].quantity=quantity;
  assert.throws(()=>createMockCheckout(args));
 }
});
test('checkout snapshot is immutable and only a merchandise estimate',()=>{
 const checkout=createMockCheckout(input());
 assert.equal(checkout.simulationOnly,true);
 assert.equal(checkout.totalsExcludeTaxAndShipping,true);
 assert.ok(Object.isFrozen(checkout.lines));
 assert.ok(Object.isFrozen(checkout.lines[0]));
});
test('mock payment cannot be repeated',()=>{
 const paid=simulatePayment(createMockCheckout(input()),'fictional-event');
 assert.equal(paid.simulatedPayment,true);
 assert.throws(()=>simulatePayment(paid,'second-event'));
});

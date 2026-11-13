import test from 'node:test';
import assert from 'node:assert/strict';
import { makeVendorApplication, reviewVendor } from '../operations/commerce/vendor-domain.mjs';
import { createMockCheckout, simulatePayment } from '../operations/commerce/mock-checkout.mjs';

const vendor=reviewVendor(makeVendorApplication({displayName:'Fictional Supplier',slug:'fictional-supplier',country:'CA'}),'approved','fictional-admin');
const product={status:'approved',mediaRights:true,resaleAuthorized:true,territories:['CA'],stock:3,inventoryUpdatedAt:new Date(100000).toISOString()};
const input=()=>({id:'fictional-order',idempotencyKey:'fictional-checkout-key',currency:'CAD',country:'CA',now:110000,lines:[{vendor,product,productId:'fictional-sku',quantity:1,unitPriceMinor:1250}]});

test('checkout preview stays draft and excludes taxes and shipping',()=>{
 const preview=createMockCheckout(input());
 assert.equal(preview.order.state,'draft');
 assert.equal(preview.totalsExcludeTaxAndShipping,true);
 assert.equal(preview.order.totalMinor,1250);
 assert.equal(preview.simulatedPayment,undefined);
});
test('simulation is explicitly marked and cannot be replayed as payment',()=>{
 const draft=createMockCheckout(input());
 const simulated=simulatePayment(draft,'fictional-event');
 assert.equal(simulated.simulatedPayment,true);
 assert.throws(()=>simulatePayment(simulated,'fictional-event-again'));
});
test('checkout refuses missing media rights and unauthorized resale',()=>{
 for(const change of [{mediaRights:false},{resaleAuthorized:false}]){
  const args=input();args.lines[0].product={...product,...change};
  assert.throws(()=>createMockCheckout(args));
 }
});
test('checkout refuses unsupported country and overselling',()=>{
 const country=input();country.country='US';assert.throws(()=>createMockCheckout(country));
 const stock=input();stock.lines[0].quantity=4;assert.throws(()=>createMockCheckout(stock));
});
test('checkout refuses duplicate line entries',()=>{
 const args=input();args.lines.push({...args.lines[0]});
 assert.throws(()=>createMockCheckout(args));
});

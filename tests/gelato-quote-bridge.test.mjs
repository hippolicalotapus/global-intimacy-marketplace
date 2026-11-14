import test from 'node:test';
import assert from 'node:assert/strict';
import { previewFictionalApparelWorkflow } from '../operations/gelato/quote-bridge.mjs';
const quoteInput={product:'standard',country:'CA',postal:'T0E 2A0',taxCents:0,taxFictional:true,shippingQuote:{fictional:true,verified:true,country:'CA',postalCode:'T0E 2A0',chargeCents:1600,includedAllowanceCents:1600,serviceClass:'standard',expiresAt:'2099-01-01T00:00:00Z'}};
const input={fictional:true,paymentStatus:'simulated',orderId:'DEMO-BRIDGE-001',quantity:1,shippingVerified:true,shippingCountry:'US',shippingMethod:'express',shippingQuoteFictional:true,quoteInput};
test('bridges only fictional previews, not comparable quotes or real orders',()=>{const r=previewFictionalApparelWorkflow(input);assert.equal(r.checkoutEnabled,false);assert.equal(r.orderSubmitted,false);assert.equal(r.quote.currency,'CAD');assert.equal(r.supplier.payload.currency,'USD');assert.equal(r.comparisonAvailable,false);});
test('fails closed on missing or unverified Canadian quote',()=>{for(const patch of [{quoteInput:null},{quoteInput:{...quoteInput,taxFictional:false}},{quoteInput:{...quoteInput,shippingQuote:{...quoteInput.shippingQuote,verified:false}}}])assert.throws(()=>previewFictionalApparelWorkflow({...input,orderId:'DEMO-BRIDGE-002',...patch}));});
test('prevents repeated fictional submission',()=>{assert.throws(()=>previewFictionalApparelWorkflow(input),/Duplicate/);});

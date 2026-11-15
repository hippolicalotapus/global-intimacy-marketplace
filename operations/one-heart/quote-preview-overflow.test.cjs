'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {quote}=require('./quote-preview.cjs');
const valid={product:'standard',country:'CA',postal:'T0E 2A0',shippingQuote:{verified:true,postalCode:'T0E 2A0',country:'CA',chargeCents:1600,includedAllowanceCents:1600,serviceClass:'standard',expiresAt:'2099-01-01'},taxCents:0};
test('valid fictional quote remains preview-only',()=>{const result=quote(valid);assert.equal(result.status,'preview_only');assert.equal(result.checkoutEnabled,false);assert.equal(result.totalCents,7499)});
test('oversized carrier amounts cannot produce unsafe total',()=>assert.deepEqual(quote({...valid,shippingQuote:{...valid.shippingQuote,chargeCents:Number.MAX_SAFE_INTEGER}}),{status:'quote_required',reason:'amount_overflow'}));
test('oversized verified tax cannot produce unsafe total',()=>assert.deepEqual(quote({...valid,taxCents:Number.MAX_SAFE_INTEGER}),{status:'quote_required',reason:'amount_overflow'}));
test('unverified shipping cannot produce a quote',()=>assert.equal(quote({...valid,shippingQuote:{...valid.shippingQuote,verified:false}}).reason,'verified_shipping'));

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {quote}=require('./quote-preview.cjs');
const valid={product:'standard',country:'CA',postal:'T0E 2A0',shippingQuote:{verified:true,postalCode:'T0E 2A0',country:'CA',chargeCents:1600,includedAllowanceCents:1600,serviceClass:'standard',expiresAt:'2099-01-01'},taxCents:0};
test('valid fictional quote remains preview-only',()=>{const result=quote(valid);assert.equal(result.status,'preview_only');assert.equal(result.checkoutEnabled,false);assert.equal(result.totalCents,7499)});
test('oversized carrier amounts cannot produce unsafe total',()=>assert.deepEqual(quote({...valid,shippingQuote:{...valid.shippingQuote,chargeCents:Number.MAX_SAFE_INTEGER}}),{status:'quote_required',reason:'amount_overflow'}));
test('oversized verified tax cannot produce unsafe total',()=>assert.deepEqual(quote({...valid,taxCents:Number.MAX_SAFE_INTEGER}),{status:'quote_required',reason:'amount_overflow'}));
test('unverified shipping cannot produce a quote',()=>assert.equal(quote({...valid,shippingQuote:{...valid.shippingQuote,verified:false}}).reason,'verified_shipping'));

test('premium 2XL remote shipping surcharge is included in preview',()=>{const result=quote({...valid,product:'premium',size:'2XL+',shippingQuote:{...valid.shippingQuote,chargeCents:2300,serviceClass:'remote'}});assert.equal(result.status,'preview_only');assert.equal(result.totalCents,9549);assert.equal(result.checkoutEnabled,false)});
test('expired shipping quote is rejected',()=>assert.equal(quote({...valid,shippingQuote:{...valid.shippingQuote,expiresAt:'2000-01-01'}}).reason,'verified_shipping'));
test('non-Canadian destination and invalid postal code are rejected',()=>{assert.equal(quote({...valid,country:'US'}).reason,'destination');assert.equal(quote({...valid,postal:'not valid'}).reason,'postal_code')});
test('missing verified tax blocks preview',()=>assert.equal(quote({...valid,taxCents:undefined}).reason,'tax'));

import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const {postalCode,quote}=createRequire(import.meta.url)("../operations/one-heart/quote-preview.cjs");
const destination="T0E 2A0";
const carrier=()=>({verified:true,country:"CA",postalCode:destination,chargeCents:1600,includedAllowanceCents:1600,serviceClass:"standard",expiresAt:"2099-01-01T00:00:00Z"});
test("normalizes Canadian postal codes without inventing delivery eligibility",()=>{
 assert.equal(postalCode("t0e2a0"),destination);
 for(const p of ["12345","D0E 2A0","T0E 2A","",null]) assert.equal(postalCode(p),null);
});
test("standard and premium preview prices include verified standard shipping",()=>{
 for(const [product,price] of [["standard",7499],["premium",8499]]){
  const q=quote({product,country:"CA",postal:destination,shippingQuote:carrier(),taxCents:0});
  assert.equal(q.status,"preview_only");assert.equal(q.totalCents,price);
  assert.equal(q.shippingCents,0);assert.equal(q.checkoutEnabled,false);
 }
});
test("remote and PO box excess shipping is disclosed, and larger size added",()=>{
 for(const serviceClass of ["remote","po_box"]){
  const q=quote({product:"standard",country:"CA",postal:destination,size:"2XL+",shippingQuote:{...carrier(),chargeCents:2300,serviceClass},taxCents:400});
  assert.equal(q.shippingCents,700);assert.equal(q.sizeCents,350);assert.equal(q.totalCents,8949);
 }
});
test("missing, expired, mismatched, negative, or unverified carrier quotes fail closed",()=>{
 const bad=[undefined,{...carrier(),verified:false},{...carrier(),postalCode:"T5J 0N3"},{...carrier(),chargeCents:-1},{...carrier(),expiresAt:"2020-01-01"}];
 for(const shippingQuote of bad) assert.equal(quote({product:"standard",country:"CA",postal:destination,shippingQuote,taxCents:0}).status,"quote_required");
});
test("tax, destination, size and product validation never permit payment",()=>{
 assert.equal(quote({product:"standard",country:"US",postal:destination,shippingQuote:carrier(),taxCents:0}).status,"quote_required");
 assert.equal(quote({product:"standard",country:"CA",postal:destination,shippingQuote:carrier()}).status,"quote_required");
 assert.equal(quote({product:"standard",country:"CA",postal:destination,size:"invalid",shippingQuote:carrier(),taxCents:0}).status,"unavailable");
 assert.equal(quote({product:"unknown",country:"CA",postal:destination,shippingQuote:carrier(),taxCents:0}).status,"unavailable");
});

test("unsafe monetary totals never become an actionable quote",()=>{
 const max=Number.MAX_SAFE_INTEGER;
 const cases=[
  {shippingQuote:{...carrier(),chargeCents:max,includedAllowanceCents:0},taxCents:0},
  {shippingQuote:{...carrier(),chargeCents:max,includedAllowanceCents:0},taxCents:max}
 ];
 for(const input of cases){
  const result=quote({product:"standard",country:"CA",postal:destination,...input});
  assert.equal(result.status,"quote_required");
  assert.equal(result.totalCents,undefined);
  assert.notEqual(result.checkoutEnabled,true);
 }
});

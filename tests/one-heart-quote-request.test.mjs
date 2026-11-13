import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const {prepare}=createRequire(import.meta.url)("../operations/one-heart/quote-request.cjs");
test("valid request is nonbinding and never claims shipping or taxes",()=>{
 const r=prepare({style:"standard",colour:"ruby",placement:"front",text:"One Heart"});
 assert.equal(r.ok,true);assert.equal(r.request.baseCents,7499);assert.equal(r.checkoutEnabled,false);assert.equal(r.request.finalPriceKnown,false);assert.equal(r.request.shippingVerified,false);
});
test("rejects unknown options, overlong and control-character text",()=>{
 const base={style:"premium",colour:"ivory",placement:"back",text:""};
 for(const v of [{...base,style:"free"},{...base,colour:"unknown"},{...base,placement:"both"},{...base,text:"x".repeat(25)},{...base,text:"hello\nworld"}])assert.equal(prepare(v).ok,false);
});

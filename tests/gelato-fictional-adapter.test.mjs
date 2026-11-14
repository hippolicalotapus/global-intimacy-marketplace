import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFictionalGelatoPreview } from '../operations/gelato/fictional-adapter.mjs';
const valid = {fictional:true,paymentStatus:'simulated',orderId:'DEMO-GIM-001',quantity:1};
test('builds offline Gelato-compatible fictional payload',()=>{
 const result=buildFictionalGelatoPreview(valid);
 assert.equal(result.networkAllowed,false);
 assert.equal(result.payload.orderReferenceId,'DEMO-GIM-001');
 assert.equal(result.payload.items[0].quantity,1);
 assert.equal(result.payload.shippingAddress.country,'US');
});
test('rejects real or unconfirmed payments',()=>{
 for (const paymentStatus of ['paid','pending',undefined]) assert.throws(()=>buildFictionalGelatoPreview({...valid,paymentStatus}));
 assert.throws(()=>buildFictionalGelatoPreview({...valid,fictional:false}));
});
test('rejects non-demo identifiers and unexpected artwork or SKUs',()=>{
 for(const patch of [{orderId:'REAL-123'},{artworkUrl:'https://example.com/private.png'},{productUid:'unknown'},{quantity:0},{quantity:11},{quantity:1.5}]) assert.throws(()=>buildFictionalGelatoPreview({...valid,...patch}));
});

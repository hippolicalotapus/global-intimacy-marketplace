import test from 'node:test';
import assert from 'node:assert/strict';
import {makeVendorApplication,reviewVendor} from './vendor-domain.mjs';
import {previewInventoryReservations} from './inventory-preview.mjs';
const vendor=reviewVendor(makeVendorApplication({displayName:'Fictional Supplier',slug:'fictional-supplier',country:'CA'}),'approved','fictional-reviewer');
const product={status:'approved',mediaRights:true,resaleAuthorized:true,territories:['CA'],stock:3,inventoryUpdatedAt:new Date(100000).toISOString()};
const args=()=>({id:'fictional-inventory-order',idempotencyKey:'fictional-inventory-key',currency:'CAD',country:'CA',now:110000,lines:[{vendor,product,productId:'sku-1',quantity:2,unitPriceMinor:1000}]});
test('inventory preview never reserves stock or charges a payment',()=>{
 const result=previewInventoryReservations(args());
 assert.equal(result.inventoryModified,false);
 assert.equal(result.paymentCollected,false);
 assert.equal(result.requiresServerRevalidation,true);
 assert.deepEqual(result.reservations,[{productId:'sku-1',quantity:2,status:'not_reserved'}]);
 assert.equal(product.stock,3);
 assert.ok(Object.isFrozen(result.reservations));
});
test('inventory preview rejects unavailable or unapproved stock',()=>{
 const request=args();request.lines[0].quantity=4;
 assert.throws(()=>previewInventoryReservations(request));
 const invalid=args();invalid.lines[0].product={...product,mediaRights:false};
 assert.throws(()=>previewInventoryReservations(invalid));
});

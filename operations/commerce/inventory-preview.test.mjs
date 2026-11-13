import test from 'node:test';
import assert from 'node:assert/strict';
import {makeVendorApplication,reviewVendor} from './vendor-domain.mjs';
import {previewInventoryReservations,revalidateInventoryPreview} from './inventory-preview.mjs';
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

test('fresh stock snapshot flags shortages without changing either snapshot',()=>{
 const preview=previewInventoryReservations(args());
 const stock={'sku-1':1};
 const result=revalidateInventoryPreview(preview,stock);
 assert.equal(result.canProceedToServerCheckout,false);
 assert.deepEqual(result.issues,[{productId:'sku-1',required:2,available:1}]);
 assert.equal(stock['sku-1'],1);
 assert.equal(result.paymentCollected,false);
});
test('sufficient fresh stock permits only a server-side next step',()=>{
 const result=revalidateInventoryPreview(previewInventoryReservations(args()),{'sku-1':3});
 assert.equal(result.canProceedToServerCheckout,true);
 assert.equal(result.requiresServerRevalidation,true);
 assert.deepEqual(result.issues,[]);
});

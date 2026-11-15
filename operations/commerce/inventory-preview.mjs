// Offline, immutable inventory reservation preview. Does not reserve stock or charge money.
import {createMockCheckout} from './mock-checkout.mjs';
export function previewInventoryReservations(checkoutArgs){
 const checkout=createMockCheckout(checkoutArgs);
 const reservations=checkout.lines.map(line=>Object.freeze({productId:line.productId,quantity:line.quantity,status:'not_reserved'}));
 return Object.freeze({checkout,reservations:Object.freeze(reservations),inventoryModified:false,paymentCollected:false,requiresServerRevalidation:true});
}

// Reconcile a preview against a fresh stock snapshot; never mutate the snapshot.
export function revalidateInventoryPreview(preview, stockByProductId){
 if(!preview||!Array.isArray(preview.reservations)||!stockByProductId||typeof stockByProductId!=='object')throw new TypeError('Invalid inventory revalidation input');
 const issues=[];
 for(const row of preview.reservations){
  const available=stockByProductId[row.productId];
  if(!Number.isSafeInteger(available)||available<row.quantity)issues.push(Object.freeze({productId:row.productId,required:row.quantity,available:Number.isSafeInteger(available)?available:null}));
 }
 return Object.freeze({canProceedToServerCheckout:issues.length===0,issues:Object.freeze(issues),inventoryModified:false,paymentCollected:false,requiresServerRevalidation:true});
}

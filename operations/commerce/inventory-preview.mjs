// Offline, immutable inventory reservation preview. Does not reserve stock or charge money.
import {createMockCheckout} from './mock-checkout.mjs';
export function previewInventoryReservations(checkoutArgs){
 const checkout=createMockCheckout(checkoutArgs);
 const reservations=checkout.lines.map(line=>Object.freeze({productId:line.productId,quantity:line.quantity,status:'not_reserved'}));
 return Object.freeze({checkout,reservations:Object.freeze(reservations),inventoryModified:false,paymentCollected:false,requiresServerRevalidation:true});
}

import {prepareFictionalDesign} from './design-preview.mjs';
// Internal printable proof specification only: never creates an order or sends artwork.
export function prepareFictionalProof(input){
 const d=prepareFictionalDesign(input);
 return Object.freeze({reference:d.orderId,brand:d.brand,garment:d.garment,color:d.color,size:d.size,placement:d.placement,personalization:d.text,watermark:'FICTIONAL PREVIEW - NOT FOR PRODUCTION',requiresArtworkApproval:true,requiresSupplierSkuMapping:true,requiresPriceVerification:true,requiresShippingVerification:true,checkoutEnabled:false,submitToSupplier:false});
}

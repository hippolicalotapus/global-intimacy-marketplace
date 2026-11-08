// GIM marketplace core: pure domain rules; no network calls or credentials.
// Not a deployed API. Checkout and payouts remain disabled until underwriting.
'use strict';
const VENDOR_STATUSES = Object.freeze(['pending','review','approved','suspended','rejected']);
const PRODUCT_STATUSES = Object.freeze(['draft','review','approved','suspended']);
const ORDER_TRANSITIONS = Object.freeze({
 pending:['authorized','cancelled'], authorized:['paid','cancelled'],
 paid:['routing','refunded','disputed'], routing:['fulfilled','refunded','disputed'],
 fulfilled:['refunded','disputed'], cancelled:[], refunded:[], disputed:['refunded']
});
function requireApprovedVendor(v) {
 if (!v || v.status !== 'approved' || v.legal_verified !== true || v.processor_approved !== true)
   throw new Error('VENDOR_NOT_APPROVED');
}
function canListProduct(v,p,destination) {
 if (!v || !p || !destination) return false;
 if (v.status !== 'approved' || !v.legal_verified || !v.processor_approved) return false;
 if (p.vendor_id !== v.id || p.status !== 'approved') return false;
 if (!p.resale_rights_verified || !p.media_rights_verified || !p.territory_reviewed) return false;
 if (!Number.isSafeInteger(p.price_minor) || p.price_minor < 0 || !Number.isSafeInteger(p.inventory_count) || p.inventory_count < 1) return false;
 return Array.isArray(p.allowed_shipping_countries) && p.allowed_shipping_countries.includes(destination);
}
function transitionOrder(current,next) {
 if (!Object.hasOwn(ORDER_TRANSITIONS,current) || !ORDER_TRANSITIONS[current].includes(next))
   throw new Error('INVALID_ORDER_TRANSITION');
 return next;
}
function eligibleForSupplierRouting(order,items) {
 return !!order && order.status === 'paid' && !!order.processor_payment_id &&
   Array.isArray(items) && items.length > 0 &&
   items.every(i=>i.fulfillment_status==='held' && i.vendor_approved===true &&
     i.supplier_approved===true && i.shipping_allowed===true &&
     Number.isSafeInteger(i.quantity) && i.quantity>0);
}
function moneyMinor(amount,currency) {
 if (!/^[A-Z]{3}$/.test(currency) || !Number.isSafeInteger(amount) || amount<0)
   throw new Error('INVALID_MONEY');
 return {amount,currency};
}
module.exports={VENDOR_STATUSES,PRODUCT_STATUSES,ORDER_TRANSITIONS,requireApprovedVendor,canListProduct,transitionOrder,eligibleForSupplierRouting,moneyMinor};

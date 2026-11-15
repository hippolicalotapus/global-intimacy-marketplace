'use strict';
const VALID_CURRENCIES = new Set(['CAD','USD']);
function validateCart(items, catalogue) {
  if (!Array.isArray(items) || !items.length || !Array.isArray(catalogue)) return {ready:false,reason:'empty_or_invalid_cart'};
  const products = new Map();
  for (const p of catalogue) {
    if (!p || typeof p.id !== 'string' || !p.id.trim() || p.id !== p.id.trim() || products.has(p.id)) return {ready:false,reason:'invalid_catalogue'};
    products.set(p.id,p);
  }
  let currency = null;
  let subtotalCents = 0;
  const lines=[];
  const seen=new Set();
  for (const item of items) {
    if (!item || typeof item.id !== 'string' || !item.id.trim() || item.id !== item.id.trim() || seen.has(item.id) || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) return {ready:false,reason:'invalid_cart_line'};
    seen.add(item.id);
    const p=products.get(item.id);
    if (!p || p.saleApproved !== true || p.priceVerified !== true || p.stockVerified !== true || p.shippingApproved !== true || typeof p.supplierPermissionRef !== 'string' || !p.supplierPermissionRef.trim() || !Number.isSafeInteger(p.priceCents) || p.priceCents <= 0 || !VALID_CURRENCIES.has(p.currency)) return {ready:false,reason:'unverified_product'};
    if (currency && currency !== p.currency) return {ready:false,reason:'mixed_currency'};
    currency=p.currency;
    const lineCents=p.priceCents*item.quantity;
    if (!Number.isSafeInteger(lineCents) || !Number.isSafeInteger(subtotalCents+lineCents)) return {ready:false,reason:'amount_overflow'};
    subtotalCents+=lineCents;
    lines.push({id:item.id,quantity:item.quantity,lineCents});
  }
  return {ready:true,checkoutEnabled:false,reason:'shipping_tax_payment_verification_required',currency,subtotalCents,lines};
}
module.exports={validateCart};

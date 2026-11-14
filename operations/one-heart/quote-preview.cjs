"use strict";
// Internal quote prototype. Not imported by the public site and NEVER authorizes checkout.
// Monetary amounts are integer cents. Caller must provide a verified carrier quote.
function postalCode(value) {
  if (typeof value !== "string") return null;
  const compact = value.trim().toUpperCase().replace(/\s/g, "");
  if (!/^[ABCEGHJ-NPRSTVXY][0-9][ABCEGHJ-NPRSTV-Z][0-9][ABCEGHJ-NPRSTV-Z][0-9]$/.test(compact)) return null;
  return compact.slice(0, 3) + " " + compact.slice(3);
}
const PRODUCTS = Object.freeze({
  standard: Object.freeze({price: 7499}),
  premium: Object.freeze({price: 8499})
});
function quote(input) {
  // Reject malformed calls without throwing; checkout remains disabled.
  if (!input || typeof input !== "object" || Array.isArray(input)) return {status: "unavailable", reason: "input"};
  const {product, country, postal, size = "regular", shippingQuote, taxCents} = input;
  if (!Object.hasOwn(PRODUCTS, product)) return {status: "unavailable", reason: "product"};
  if (country !== "CA") return {status: "quote_required", reason: "destination"};
  const normalized = postalCode(postal);
  if (!normalized) return {status: "quote_required", reason: "postal_code"};
  // Postal code alone cannot prove PO box, remote service area, or carrier eligibility.
  // The supplier/carrier must verify the destination and its actual shipping charge.
  if (!shippingQuote || shippingQuote.verified !== true ||
      shippingQuote.postalCode !== normalized ||
      shippingQuote.country !== "CA" ||
      !Number.isSafeInteger(shippingQuote.chargeCents) || shippingQuote.chargeCents < 0 ||
      !Number.isSafeInteger(shippingQuote.includedAllowanceCents) ||
      shippingQuote.includedAllowanceCents < 0 ||
      !["standard", "remote", "po_box"].includes(shippingQuote.serviceClass) ||
      typeof shippingQuote.expiresAt !== "string" ||
      !Number.isFinite(Date.parse(shippingQuote.expiresAt)) ||
      Date.parse(shippingQuote.expiresAt) <= Date.now()) {
    return {status: "quote_required", reason: "verified_shipping"};
  }
  if (!["regular", "2XL+"].includes(size)) return {status: "unavailable", reason: "size"};
  // Tax is deliberately required from a separately verified tax calculation.
  if (!Number.isSafeInteger(taxCents) || taxCents < 0) return {status: "quote_required", reason: "tax"};
  const baseCents = PRODUCTS[product].price;
  const sizeCents = size === "2XL+" ? 350 : 0;
  // Refuse overflow rather than presenting an inaccurate monetary total.
  const excessShipping = shippingQuote.chargeCents - shippingQuote.includedAllowanceCents;
  if (!Number.isSafeInteger(excessShipping)) return {status: "quote_required", reason: "shipping_amount"};
  const shippingCents = Math.max(0, excessShipping);
  const totalCents = baseCents + sizeCents + shippingCents + taxCents;
  if (!Number.isSafeInteger(totalCents)) return {status: "quote_required", reason: "amount_overflow"};
  return Object.freeze({
    status: "preview_only",
    checkoutEnabled: false,
    currency: "CAD",
    postalCode: normalized,
    serviceClass: shippingQuote.serviceClass,
    baseCents, sizeCents, shippingCents, taxCents,
    totalCents
  });
}
module.exports = {postalCode, quote};

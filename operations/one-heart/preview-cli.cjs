"use strict";
// Offline demonstration only. Uses fictional verified carrier/tax inputs, never a live rate.
const {quote}=require("./quote-preview.cjs");
const example=Object.freeze({
 product:"standard", country:"CA", postal:"T0E 2A0", size:"regular",
 shippingQuote:{verified:true,country:"CA",postalCode:"T0E 2A0",chargeCents:1600,
 includedAllowanceCents:1600,serviceClass:"standard",expiresAt:"2099-01-01T00:00:00Z"},
 taxCents:0
});
const result=quote(example);
console.log("ONE HEART — OFFLINE FICTIONAL QUOTE PREVIEW (NOT A LIVE OFFER)");
console.log(JSON.stringify(result,null,2));
console.log("Carrier quote and tax are demonstration inputs. No payment or order is possible.");

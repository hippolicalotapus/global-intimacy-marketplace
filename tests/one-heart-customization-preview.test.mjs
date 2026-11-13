import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../site/one-heart-customization-preview.html",import.meta.url),"utf8");
test("customization preview has offline quote action and no transaction channel",()=>{
 for(const text of ["Prepare quote request (offline)","requestOutput","checkoutEnabled:false","orderCreated:false","finalPriceKnown:false","noindex,nofollow"])assert.ok(html.includes(text),text);
 for(const re of [/<form\b/i,/fetch\s*\(/i,/XMLHttpRequest/i,/localStorage/i,/sessionStorage/i,/stripe/i,/paypal/i])assert.doesNotMatch(html,re);
});
test("preview does not expose wholesale prices or request customer identifiers",()=>{
 for(const text of ["37.90","43.52","G&L Printing","credit card","email address","phone number"])assert.ok(!html.includes(text),text);
});
test("browser preview validates controls with printable regex escapes",()=>{
 assert.ok(html.includes(String.raw`/[\x00-\x1f\x7f]/`));
 assert.ok(html.includes("v.text.length<=24"));
});

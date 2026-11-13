import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../site/one-heart-price-preview.html",import.meta.url),"utf8");
test("ONE HEART price preview remains nontransactional and self-contained",()=>{
 for(const term of ["Standard hoodie","Premium heavyweight","Shipping quote unavailable","Final payable total: not available","noindex,nofollow"])assert.ok(html.includes(term),term);
 for(const forbidden of [/<form\b/i,/fetch\s*\(/i,/XMLHttpRequest/i,/localStorage/i,/sessionStorage/i,/stripe/i,/paypal/i,/checkoutEnabled\s*:\s*true/i])assert.doesNotMatch(html,forbidden);
});
test("preview does not leak supplier costs or pretend carrier verification",()=>{
 for(const term of ["37.90","43.52","G&L Printing","supplier wholesale","verified:true"])assert.ok(!html.includes(term),term);
 assert.ok(html.includes("Carrier verification required"));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../operations/gelato/internal-customization-preview.html',import.meta.url),'utf8');
test('internal preview uses shared fictional adapter and supports both garments',()=>{
 for(const value of ["./design-preview.mjs","prepareFictionalDesign","value=\"tee\"","value=\"hoodie\"","Sarcastabastard","ONE HEART"])assert.ok(html.includes(value),value);
});
test('internal preview does not provide network, payment, or customer data inputs',()=>{
 for(const forbidden of [/<form\b/i,/fetch\s*\(/i,/XMLHttpRequest/i,/localStorage/i,/sessionStorage/i,/stripe/i,/paypal/i,/type="file"/i,/type="email"/i])assert.doesNotMatch(html,forbidden);
});
test('editing selections invalidates prior preview and controls limit text',()=>{
 assert.ok(html.includes("Selections changed. Prepare a new fictional preview."));
 assert.ok(html.includes('maxlength="24"'));
 assert.ok(html.includes('noindex,nofollow'));
});

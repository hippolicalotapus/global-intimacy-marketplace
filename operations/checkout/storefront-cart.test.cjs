'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const site=path.resolve(__dirname,'../../site');
test('storefront links to actual safe cart page',()=>{
 const home=fs.readFileSync(path.join(site,'index.html'),'utf8');
 const cart=fs.readFileSync(path.join(site,'cart.html'),'utf8');
 assert.match(home,/<a[^>]*href="cart\.html"[^>]*>Cart · Preview<\/a>/);
 assert.match(cart,/<button[^>]*disabled[^>]*>Checkout unavailable<\/button>/);
 assert.match(cart,/No approved products have been loaded/);
 assert.match(cart,/href="\.\/index\.html"/);
 assert.doesNotMatch(cart,/<form\b|<script\b|paymentIntent|checkout\.stripe\.com/i);
});

"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const site=path.resolve(__dirname,"../site"),context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(site,"catalog.js"),"utf8"),context,{timeout:1000});
vm.runInNewContext(fs.readFileSync(path.join(site,"apparel.js"),"utf8"),context,{timeout:1000});
vm.runInNewContext(fs.readFileSync(path.join(site,"product-drawings.js"),"utf8"),context,{timeout:1000});
const products=Array.from(context.window.GIM_PRODUCTS||[]);
test("catalogue has unique valid IDs and no purchasable research candidates",()=>{
 assert.ok(products.length>=100);
 const ids=products.map(p=>String(p.id));assert.equal(new Set(ids).size,ids.length);
 for(const p of products){assert.ok(p.name&&p.brand);assert.notEqual(p.resellerApproved,true);assert.notEqual(p.canAcceptOrders,true)}
});
test("all referenced local preview and detail images exist",()=>{
 for(const p of products)for(const field of ["previewImage","detailImage"]){const src=p[field];if(!src)continue;assert.ok(!/^https?:/.test(src),p.name+" external "+field);assert.ok(!src.includes(".."),p.name+" unsafe "+field);assert.ok(fs.existsSync(path.join(site,src)),p.name+" missing "+src)}
});
test("catalogue preserves approved slogan and retired concepts remain excluded",()=>{
 const sb=products.find(p=>p.designId==="SB-T01");assert.ok(sb);
 assert.ok(!products.some(p=>/neon rave|cosmic vibes|royal paisley/i.test(p.name)));
});

test("catalogue cards link to a noncommercial cart preview with valid product IDs",()=>{
 const app=fs.readFileSync(path.join(site,"app.js"),"utf8");
 const cart=fs.readFileSync(path.join(site,"cart-preview.js"),"utf8");
 const html=fs.readFileSync(path.join(site,"cart-preview.html"),"utf8");
 assert.match(app,/cart-preview\.html\?preview=/);
 assert.match(app,/encodeURIComponent\(String\(p\.id\)\)/);
 assert.match(cart,/URLSearchParams\(window\.location\.search\)/);
 assert.match(cart,/byId\.has\(previewId\)/);
 assert.match(html,/Checkout unavailable/);
 assert.doesNotMatch(html,/<button[^>]*>Pay now<\/button>/i);
});
test("mobile viewport metadata and fluid card layout exist",()=>{
 const html=fs.readFileSync(path.join(site,"index.html"),"utf8");
 assert.match(html,/name="viewport"[^>]*width=device-width/);
 assert.match(html,/productGrid/);
 const css=fs.readFileSync(path.join(site,"product-drawings.css"),"utf8");
 assert.match(css,/product-visual/);
});

test("all 110 catalogue entries have individual drawing references",()=>{
 assert.equal(products.length,110);
 for(const p of products){assert.ok(p.previewImage,p.id+" missing drawing");assert.equal(p.temporaryIllustration,true,p.id+" not marked temporary");assert.equal(p.exactLikenessVerified,false,p.id+" misleading likeness status");}
 assert.equal(new Set(products.map(p=>p.previewImage)).size,110,"drawings must not be reused between distinct listings");
});
test("hoodie front and back views have complete crop coordinates",()=>{
 const hoodies=products.filter(p=>p.category==="ONE HEART Hoodies");
 assert.ok(hoodies.length>0);
 for(const p of hoodies){assert.equal(p.detailViews.length,2,p.id+" missing front/back");for(const view of p.detailViews){assert.ok(view.box.every(Number.isFinite));assert.ok(view.box[0]>=0&&view.box[1]>=0&&view.box[0]+view.box[2]<=p.detailImageWidth&&view.box[1]+view.box[3]<=p.detailImageHeight,p.id+" crop outside image");}}
});

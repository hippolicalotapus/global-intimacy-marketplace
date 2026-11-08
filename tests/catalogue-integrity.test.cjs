"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const site=path.resolve(__dirname,"../site"),context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(site,"catalog.js"),"utf8"),context,{timeout:1000});
vm.runInNewContext(fs.readFileSync(path.join(site,"apparel.js"),"utf8"),context,{timeout:1000});
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

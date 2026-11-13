'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createServer}=require('../demo/server.cjs');
test('isolated demo API prevents vendor cross-access and public listing',async()=>{
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const call=async(token,path,method='GET',body)=>{const r=await fetch(base+path,{method,headers:{'x-demo-vendor-token':token,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};};
 try{
  assert.equal((await call('demo-alpha','/vendors','POST',{display_name:'Alpha Vendor',country_code:'CA'})).status,201);
  assert.equal((await call('demo-beta','/vendors','POST',{display_name:'Beta Vendor',country_code:'US'})).status,201);
  const created=await call('demo-alpha','/products','POST',{title:'Test garment',sku:'SKU-1',price_minor:1599,inventory_count:4});
  assert.equal(created.status,201);assert.equal(created.data.status,'draft');
  const a=await call('demo-alpha','/products'),b=await call('demo-beta','/products');
  assert.equal(a.data.length,1);assert.equal(b.data.length,0);
  assert.deepEqual((await call('demo-alpha','/catalog')).data,[]);
  assert.equal((await call('bad','/products')).status,401);
  assert.equal((await call('demo-beta','/products','POST',{title:'Other garment',sku:'SKU-1',price_minor:900,inventory_count:1})).status,201);
  assert.equal((await call('demo-alpha','/products','POST',{title:'Duplicate',sku:'SKU-1',price_minor:900,inventory_count:1})).status,409);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

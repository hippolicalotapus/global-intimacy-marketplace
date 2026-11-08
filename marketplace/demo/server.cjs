'use strict';
// Isolated, in-memory test backend. Not production auth or storage.
// Runs locally with Node 22; binds loopback only. No payments or real supplier calls.
const http=require('node:http');
const {randomUUID}=require('node:crypto');
const {URL}=require('node:url');
const {canListProduct}=require('../core/rules.cjs');
const vendors=new Map(),products=new Map();
const MAX_BODY=16_384;
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
async function readJSON(req){let size=0,chunks=[];for await(const c of req){size+=c.length;if(size>MAX_BODY)throw Object.assign(new Error('BODY_TOO_LARGE'),{status:413});chunks.push(c);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Object.assign(new Error('INVALID_JSON'),{status:400});}}
function createServer(){
 return http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost');
   if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{status:'demo',checkoutEnabled:false});
   // Demo token is a test fixture; do not expose this service to the internet.
   const token=req.headers['x-demo-vendor-token'];
   if(typeof token!=='string'||!/^demo-[a-z0-9-]{3,40}$/.test(token))return json(res,401,{error:'DEMO_TOKEN_REQUIRED'});
   if(req.method==='POST'&&url.pathname==='/vendors'){
    const b=await readJSON(req),name=String(b.display_name||'').trim();
    if(name.length<2||name.length>160||!/^[A-Z]{2}$/.test(String(b.country_code||'')))return json(res,400,{error:'INVALID_VENDOR'});
    if(vendors.has(token))return json(res,409,{error:'VENDOR_EXISTS'});
    const v={id:randomUUID(),display_name:name,country_code:b.country_code,status:'pending',legal_verified:false,processor_approved:false};
    vendors.set(token,v);return json(res,201,v);
   }
   const vendor=vendors.get(token);if(!vendor)return json(res,403,{error:'VENDOR_NOT_FOUND'});
   if(req.method==='GET'&&url.pathname==='/vendors/me')return json(res,200,vendor);
   if(req.method==='GET'&&url.pathname==='/products')return json(res,200,[...products.values()].filter(p=>p.vendor_id===vendor.id));
   if(req.method==='POST'&&url.pathname==='/products'){
    const b=await readJSON(req),title=String(b.title||'').trim(),sku=String(b.sku||'').trim();
    if(!title||title.length>250||!/^[A-Za-z0-9_-]{1,40}$/.test(sku)||!Number.isSafeInteger(b.price_minor)||b.price_minor<0||!Number.isSafeInteger(b.inventory_count)||b.inventory_count<0||b.inventory_count>1000000)return json(res,400,{error:'INVALID_PRODUCT'});
    if([...products.values()].some(p=>p.vendor_id===vendor.id&&p.sku===sku))return json(res,409,{error:'DUPLICATE_SKU'});
    const p={id:randomUUID(),vendor_id:vendor.id,sku,title,price_minor:b.price_minor,inventory_count:b.inventory_count,currency:'CAD',status:'draft',resale_rights_verified:false,media_rights_verified:false,territory_reviewed:false,allowed_shipping_countries:[]};
    products.set(p.id,p);return json(res,201,p);
   }
   if(req.method==='GET'&&url.pathname==='/catalog')return json(res,200,[...products.values()].filter(p=>canListProduct(vendor,p,'CA')));
   return json(res,404,{error:'NOT_FOUND'});
  }catch(e){return json(res,e.status||500,{error:e.status?e.message:'INTERNAL_ERROR'});}
 });
}
if(require.main===module){createServer().listen(8787,'127.0.0.1',()=>console.log('GIM isolated demo backend on localhost:8787'));}
module.exports={createServer};

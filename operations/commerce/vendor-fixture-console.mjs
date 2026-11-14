// Offline fixture-only interface projection. Never attach this to production routes.
// Builds read-only panels from trusted, already-moderated data; no authentication or writes.
import {publicStorefront} from './vendor-storefront.mjs';
const fail=(ok,msg)=>{if(!ok)throw new Error(msg)};
const slug=x=>typeof x==='string'&&x.length<=64&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x);
const id=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{3,80}$/.test(x);
const text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=600&&!/[<>\x00-\x1f\x7f]/.test(x);
const copy=x=>JSON.parse(JSON.stringify(x));
function buildFixtureVendorConsole({vendor,profile=null,listings=[],events=[],country='CA',now}={}){
  fail(slug(vendor?.slug)&&['pending','approved','rejected','suspended'].includes(vendor.status)&&
    id(vendor.ownerId)&&text(vendor.displayName),'Invalid fixture vendor');
  fail(Array.isArray(listings)&&listings.length<=1000&&Array.isArray(events)&&events.length<=10000,
    'Invalid fixture collections');
  fail(typeof country==='string'&&/^[A-Z]{2}$/.test(country)&&Number.isFinite(now),
    'Explicit valid preview context required');
  const all=new Set();
  const queue=[];
  for(const item of listings){
    fail(item&&slug(item.vendorSlug)&&item.vendorSlug===vendor.slug&&id(item.id)&&!all.has(item.id)&&
      ['pending','approved','rejected'].includes(item.status)&&text(item.title)&&text(item.category),
      'Untrusted or duplicate listing in fixture');
    all.add(item.id);
    // Internal panel only exposes safe listing fields, never wholesale price, rights proofs or tokens.
    queue.push(Object.freeze({id:item.id,title:item.title,category:item.category,status:item.status}));
  }
  // Events are trusted fixtures but must be tenant-scoped and shape-checked before projection.
  const recent=[];
  let previous=0;
  for(const event of events){
    fail(event&&event.vendorSlug===vendor.slug&&Number.isSafeInteger(event.sequence)&&
      event.sequence>previous&&typeof event.type==='string'&&
      /^(vendor|storefront|listing)-(submitted|approved|rejected)$/.test(event.type)&&
      id(event.actorId)&&id(event.recordId),'Invalid or cross-vendor audit event');
    previous=event.sequence;
    recent.push(Object.freeze({sequence:event.sequence,type:event.type,recordId:event.recordId}));
  }
  const preview=profile===null?null:publicStorefront(vendor,profile,listings,country,now);
  const result={
    kind:'gim-fixture-vendor-console-v1',
    mode:'offline-read-only',
    vendor:{slug:vendor.slug,name:vendor.displayName,status:vendor.status},
    onboarding:{status:vendor.status,requiresModerator:vendor.status==='pending'},
    storefront:{status:profile?.status??'not-submitted',previewAvailable:preview!==null},
    listings:queue,
    preview:preview===null?null:copy(preview),
    audit:{count:recent.length,events:recent}
  };
  return Object.freeze(copy(result));
}
export {buildFixtureVendorConsole};

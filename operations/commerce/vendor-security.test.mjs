import test from 'node:test';
import assert from 'node:assert/strict';
import {applyVendor,moderateVendor,draftStorefront,moderateStorefront,submitListing,moderateListing,publicStorefront} from './vendor-storefront.mjs';

const actor={id:'owner_001',active:true};
const reviewer={id:'review_001',role:'platform_moderator',active:true};
const vendor=moderateVendor(applyVendor({ownerId:'owner_001',displayName:'Real Vendor',slug:'real-vendor',country:'CA'}),reviewer,'approved',{legalEntity:true,eligibility:true,terms:true});
const membership={active:true,userId:actor.id,vendorSlug:vendor.slug,role:'owner'};
const profile=moderateStorefront(vendor,draftStorefront(vendor,actor,membership,'Legitimate fixture'),reviewer,'approved');
const input={id:'sku_001',title:'Normal title',category:'Apparel',territories:['CA']};
const listing=moderateListing(vendor,submitListing(vendor,actor,membership,input),reviewer,'approved',{mediaRights:true,resaleRights:true,compliance:true,territories:['CA']});
const stocked={...listing,stock:4,inventoryUpdatedAt:new Date(2000000).toISOString()};

test('public response must reject injected profile text and vendor name',()=>{
  assert.equal(publicStorefront(vendor,{...profile,name:'<script>alert(1)</script>'},[stocked],'CA',2000000),null);
  assert.equal(publicStorefront(vendor,{...profile,description:'<img src=x onerror=1>'},[stocked],'CA',2000000),null);
});
test('public response must reject malformed vendor slug',()=>{
  assert.equal(publicStorefront({...vendor,slug:'../forged'}, {...profile,vendorSlug:'../forged'},[{...stocked,vendorSlug:'../forged'}],'CA',2000000),null);
});
test('public response never emits unapproved listings even if stock appears fresh',()=>{
  assert.equal(publicStorefront(vendor,profile,[{...stocked,status:'pending'}],'CA',2000000).products.length,0);
});
test('moderation rejects malicious user-facing titles and categories',()=>{
  assert.throws(()=>submitListing(vendor,actor,membership,{...input,title:'Bad\u0000Title'}));
  assert.throws(()=>submitListing(vendor,actor,membership,{...input,category:'<b>unsafe</b>'}));
});

test('storefront reviewer rejects forged draft fields before approval',()=>{
  const draft=draftStorefront(vendor,actor,membership,'Legitimate fixture');
  assert.throws(()=>moderateStorefront(vendor,{...draft,name:'<script>'},reviewer,'approved'));
  assert.throws(()=>moderateStorefront(vendor,{...draft,description:'<img>'},reviewer,'approved'));
  assert.throws(()=>moderateStorefront(vendor,{...draft,submittedBy:'../other'},reviewer,'approved'));
  assert.throws(()=>moderateStorefront(vendor,{...draft,name:'Other Vendor'},reviewer,'approved'));
});

test('listing reviewer rejects forged metadata and requested territories',()=>{
  const draft=submitListing(vendor,actor,membership,input);
  const evidence={mediaRights:true,resaleRights:true,compliance:true,territories:['CA']};
  for (const change of [
    {title:'<script>'}, {category:'<img>'}, {id:'../escape'},
    {submittedBy:'../other'}, {requestedTerritories:['ca']},
    {requestedTerritories:['CA','CA']}, {requestedTerritories:[]},
    {requestedTerritories:null}
  ]) assert.throws(()=>moderateListing(vendor,{...draft,...change},reviewer,'approved',evidence));
});

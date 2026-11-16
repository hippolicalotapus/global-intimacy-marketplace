import test from 'node:test';
import assert from 'node:assert/strict';
import {applyVendor,moderateVendor,draftStorefront,moderateStorefront,submitListing,moderateListing,publicStorefront} from './vendor-storefront.mjs';

const owner={id:'owner_001',active:true};
const manager={id:'manager_001',active:true};
const moderator={id:'moderator_001',role:'platform_moderator',active:true};
const fixture=()=>applyVendor({ownerId:owner.id,displayName:'Fixture Vendor',slug:'fixture-vendor',country:'CA'});
const onboardingEvidence={legalEntity:true,eligibility:true,terms:true};
const vendor=()=>moderateVendor(fixture(),moderator,'approved',onboardingEvidence);
const member={userId:manager.id,vendorSlug:'fixture-vendor',role:'manager',active:true};
const listing=()=>submitListing(vendor(),manager,member,{id:'item_001',title:'Test garment',category:'Apparel',territories:['CA','US']});
const rights={mediaRights:true,resaleRights:true,compliance:true,territories:['CA']};

test('onboarding is pending and approval requires independent reviewer and evidence',()=>{
  const application=fixture();
  assert.equal(application.status,'pending');
  assert.throws(()=>moderateVendor(application,owner,'approved',onboardingEvidence));
  assert.throws(()=>moderateVendor(application,moderator,'approved',{}));
  assert.equal(vendor().status,'approved');
  assert.equal(moderateVendor(application,moderator,'rejected').status,'rejected');
});
test('rejected, suspended and cross-tenant editors are blocked',()=>{
  assert.throws(()=>draftStorefront(fixture(),manager,member,'Demo'));
  assert.throws(()=>draftStorefront(vendor(),manager,{...member,vendorSlug:'other'},'Demo'));
  assert.throws(()=>draftStorefront(vendor(),manager,{...member,active:false},'Demo'));
  assert.throws(()=>submitListing(vendor(),manager,{...member,role:'viewer'},{id:'item_001',title:'Test',category:'Apparel',territories:['CA']}));
});
test('storefront descriptions require approval by a distinct moderator',()=>{
  const draft=draftStorefront(vendor(),manager,member,'Fixture shop description');
  assert.equal(draft.status,'draft');
  assert.throws(()=>moderateStorefront(vendor(),draft,manager,'approved'));
  assert.equal(moderateStorefront(vendor(),draft,moderator,'approved').status,'approved');
});
test('listing moderation begins unavailable and requires evidence',()=>{
  const draft=listing();
  assert.equal(draft.status,'pending');
  assert.equal(draft.stock,0);
  assert.throws(()=>moderateListing(vendor(),draft,moderator,'approved',{}));
  assert.throws(()=>moderateListing(vendor(),draft,moderator,'approved',{...rights,territories:['GB']}));
  assert.equal(moderateListing(vendor(),draft,moderator,'approved',rights).status,'approved');
});
test('unknown or unsafe listing fields fail closed',()=>{
  const v=vendor();
  for(const data of [
    {id:'../oops',title:'Safe',category:'Apparel',territories:['CA']},
    {id:'item_003',title:'<script>',category:'Apparel',territories:['CA']},
    {id:'item_004',title:'Safe',category:'Apparel',territories:['ca']},
    {id:'item_005',title:'Safe',category:'Apparel',territories:['CA','CA']}
  ]) assert.throws(()=>submitListing(v,manager,member,data));
});
test('public view is tenant-scoped, redacted and stock freshness gated',()=>{
  const v=vendor();
  const profile=moderateStorefront(v,draftStorefront(v,manager,member,'Fixture shop'),moderator,'approved');
  const approved=moderateListing(v,listing(),moderator,'approved',rights);
  assert.equal(publicStorefront(v,profile,[approved],'CA',2_000_000).products.length,0);
  const stocked={...approved,stock:3,inventoryUpdatedAt:new Date(1_990_000).toISOString(),wholesaleCost:9999,secret:'hidden'};
  const publicView=publicStorefront(v,profile,[stocked,stocked,{...stocked,vendorSlug:'other'}],'CA',2_000_000);
  assert.equal(publicView.products.length,1);
  assert.deepEqual(Object.keys(publicView.products[0]).sort(),['category','id','title']);
  assert.equal(JSON.stringify(publicView).includes('wholesaleCost'),false);
  assert.equal(publicStorefront(v,profile,[stocked],'US',2_000_000).products.length,0);
  assert.equal(publicStorefront(fixture(),profile,[stocked],'CA',2_000_000),null);
});

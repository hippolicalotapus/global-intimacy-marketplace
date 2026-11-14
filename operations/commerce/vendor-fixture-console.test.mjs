import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFixtureVendorConsole} from './vendor-fixture-console.mjs';
import {applyVendor,moderateVendor,draftStorefront,moderateStorefront,
  submitListing,moderateListing} from './vendor-storefront.mjs';

const owner={id:'owner_demo',role:'user',active:true};
const manager={id:'manager_demo',role:'user',active:true};
const moderator={id:'moderator_demo',role:'platform_moderator',active:true};
const membership={userId:manager.id,vendorSlug:'demo-vendor',role:'manager',active:true};
const application=()=>applyVendor({ownerId:owner.id,displayName:'Demo Vendor',slug:'demo-vendor',country:'CA'});
const approved=()=>moderateVendor(application(),moderator,'approved',{legalEntity:true,eligibility:true,terms:true});
const profile=(vendor)=>moderateStorefront(vendor,draftStorefront(vendor,manager,membership,
  'Fictional shop only'),moderator,'approved');
const listing=(vendor)=>moderateListing(vendor,submitListing(vendor,manager,membership,{
  id:'test_garment',title:'Demo shirt',category:'Apparel',territories:['CA']
}),moderator,'approved',{mediaRights:true,resaleRights:true,compliance:true,territories:['CA']});
const context={country:'CA',now:2_000_000};
const events=[
  {sequence:1,vendorSlug:'demo-vendor',type:'vendor-submitted',recordId:'demo-vendor',actorId:'owner_demo'},
  {sequence:2,vendorSlug:'demo-vendor',type:'vendor-approved',recordId:'demo-vendor',actorId:'moderator_demo'}
];

test('pending onboarding shows pending queue without public storefront',()=>{
  const model=buildFixtureVendorConsole({vendor:application(),events:events.slice(0,1),...context});
  assert.equal(model.onboarding.status,'pending');
  assert.equal(model.onboarding.requiresModerator,true);
  assert.equal(model.preview,null);
  assert.equal(model.storefront.previewAvailable,false);
});
test('approved storefront projects sanitized preview and moderation queue',()=>{
  const vendor=approved(),record=listing(vendor);
  const stocked={...record,stock:4,inventoryUpdatedAt:new Date(1_990_000).toISOString(),
    wholesaleCost:12345,privateToken:'do-not-leak'};
  const model=buildFixtureVendorConsole({vendor,profile:profile(vendor),listings:[stocked],events,...context});
  assert.equal(model.preview.products.length,1);
  assert.deepEqual(model.listings,[{id:'test_garment',title:'Demo shirt',category:'Apparel',status:'approved'}]);
  assert.deepEqual(model.audit.events,[{sequence:1,type:'vendor-submitted',recordId:'demo-vendor'},
    {sequence:2,type:'vendor-approved',recordId:'demo-vendor'}]);
  assert.equal(JSON.stringify(model).includes('privateToken'),false);
  assert.equal(JSON.stringify(model).includes('wholesaleCost'),false);
  assert.equal(JSON.stringify(model).includes('moderator_demo'),false);
});
test('unstocked approved listing remains in moderation queue but not preview',()=>{
  const vendor=approved();
  const model=buildFixtureVendorConsole({vendor,profile:profile(vendor),listings:[listing(vendor)],...context});
  assert.equal(model.listings.length,1);
  assert.deepEqual(model.preview.products,[]);
});
test('cross-tenant listing and audit events are rejected without data exposure',()=>{
  const vendor=approved();
  assert.throws(()=>buildFixtureVendorConsole({vendor,listings:[{id:'other_item',
    vendorSlug:'other-vendor',status:'pending',title:'Other',category:'Apparel'}],...context}));
  assert.throws(()=>buildFixtureVendorConsole({vendor,events:[{...events[0],vendorSlug:'other-vendor'}],...context}));
});
test('duplicate listing IDs and nonmonotonic audit sequences fail closed',()=>{
  const vendor=approved(),item=listing(vendor);
  assert.throws(()=>buildFixtureVendorConsole({vendor,listings:[item,item],...context}));
  assert.throws(()=>buildFixtureVendorConsole({vendor,events:[events[1],events[0]],...context}));
});
test('missing explicit preview time or invalid country rejects projection',()=>{
  const vendor=approved();
  assert.throws(()=>buildFixtureVendorConsole({vendor,country:'CA'}));
  assert.throws(()=>buildFixtureVendorConsole({vendor,country:'ca',now:2_000_000}));
});

// Offline adversarial regression tests: fictional vendors and sessions only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyVendor, moderateVendor, draftStorefront, moderateStorefront,
  submitListing, moderateListing, publicStorefront
} from './vendor-storefront.mjs';

const owner={id:'owner_fixture',active:true,role:'user'};
const manager={id:'manager_fixture',active:true,role:'user'};
const outsider={id:'outsider_fixture',active:true,role:'user'};
const moderator={id:'mod_fixture',active:true,role:'platform_moderator'};
const evidence={legalEntity:true,eligibility:true,terms:true};
const rights={mediaRights:true,resaleRights:true,compliance:true,territories:['CA']};
const applicant=(slug,who=owner)=>applyVendor({ownerId:who.id,displayName:'Fictional Shop',slug,country:'CA'});
const approved=(slug,who=owner)=>moderateVendor(applicant(slug,who),moderator,'approved',evidence);
const membership=(slug,who=manager)=>({vendorSlug:slug,userId:who.id,role:'manager',active:true});
const approvedProfile=(vendor)=>moderateStorefront(vendor,
  draftStorefront(vendor,manager,membership(vendor.slug),'Fictional inventory'),
  moderator,'approved');
const approvedListing=(vendor,id='fictional_001')=>moderateListing(vendor,
  submitListing(vendor,manager,membership(vendor.slug),
    {id,title:'Sample shirt',category:'Apparel',territories:['CA']}),
  moderator,'approved',rights);
const stocked=(record)=>({...record,stock:2,inventoryUpdatedAt:new Date(1_990_000).toISOString()});

test('fixture vendor owner cannot self-approve by claiming moderator role',()=>{
  assert.throws(()=>moderateVendor(applicant('fixture-a'),{...owner,role:'platform_moderator'},'approved',evidence));
});
test('inactive and vendor-associated moderators cannot approve storefront',()=>{
  const vendor=approved('fixture-b');
  const draft=draftStorefront(vendor,manager,membership(vendor.slug),'Test');
  assert.throws(()=>moderateStorefront(vendor,draft,{...moderator,active:false},'approved'));
  assert.throws(()=>moderateStorefront(vendor,draft,{...owner,role:'platform_moderator'},'approved'));
  assert.throws(()=>moderateStorefront(vendor,draft,{...manager,role:'platform_moderator'},'approved'));
});
test('listing approval cannot exceed requested countries or accept duplicate rights scope',()=>{
  const vendor=approved('fixture-c');
  const draft=submitListing(vendor,manager,membership(vendor.slug),
    {id:'listing_c',title:'Sample',category:'Clothing',territories:['CA']});
  assert.throws(()=>moderateListing(vendor,draft,moderator,'approved',{...rights,territories:['CA','US']}));
  assert.throws(()=>moderateListing(vendor,draft,moderator,'approved',{...rights,territories:['CA','CA']}));
});
test('cross-vendor and nonapproved inventory never appears in fixture preview',()=>{
  const first=approved('fixture-d');
  const second=approved('fixture-e',outsider);
  const profile=approvedProfile(first);
  const own=stocked(approvedListing(first,'listing_d'));
  const another={...own,vendorSlug:second.slug,id:'listing_e'};
  const pending={...own,id:'listing_pending',status:'pending'};
  const view=publicStorefront(first,profile,[another,pending,own],'CA',2_000_000);
  assert.deepEqual(view.products,[{id:'listing_d',title:'Sample shirt',category:'Apparel'}]);
});
test('public preview excludes internal commercial and identity fields',()=>{
  const vendor=approved('fixture-f');
  const profile={...approvedProfile(vendor),privateNotes:'sensitive-demo'};
  const product={...stocked(approvedListing(vendor,'listing_f')),wholesaleCost:12345,
    supplierToken:'test-secret',internalReviewNotes:'hidden'};
  const result=publicStorefront(vendor,profile,[product],'CA',2_000_000);
  assert.deepEqual(Object.keys(result).sort(),['country','description','name','products','slug']);
  assert.deepEqual(Object.keys(result.products[0]).sort(),['category','id','title']);
  assert.equal(JSON.stringify(result).includes('test-secret'),false);
  assert.equal(JSON.stringify(result).includes('sensitive-demo'),false);
});
test('stale stock, future inventory updates and foreign territory fail closed',()=>{
  const vendor=approved('fixture-g');
  const profile=approvedProfile(vendor);
  const listing=approvedListing(vendor,'listing_g');
  for(const item of [
    {...stocked(listing),stock:0},
    {...stocked(listing),inventoryUpdatedAt:new Date(1).toISOString()},
    {...stocked(listing),inventoryUpdatedAt:new Date(2_000_001).toISOString()}
  ]) assert.equal(publicStorefront(vendor,profile,[item],'CA',2_000_000).products.length,0);
  assert.equal(publicStorefront(vendor,profile,[stocked(listing)],'US',2_000_000).products.length,0);
});

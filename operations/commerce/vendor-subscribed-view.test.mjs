import test from 'node:test';
import assert from 'node:assert/strict';
import {createFixtureSubscriptions} from './vendor-subscriptions-fixture.mjs';
import {applyVendor,moderateVendor,draftStorefront,moderateStorefront,submitListing,moderateListing} from './vendor-storefront.mjs';
import {buildSubscribedFixtureView,renderSubscribedFixtureDashboard} from './vendor-subscribed-view.mjs';

const now=2000000,month=30*24*60*60*1000;
const owner={id:'owner_001',role:'user',active:true};
const otherOwner={id:'owner_002',role:'user',active:true};
const manager={id:'manager_001',role:'user',active:true};
const moderator={id:'moderator_001',role:'platform_moderator',active:true};
const session='session_owner';
const evidence={mediaRights:true,resaleRights:true,compliance:true,territories:['CA']};
const access=()=>({
 vendors:[{slug:'first-vendor',ownerId:owner.id,status:'approved'},
          {slug:'other-vendor',ownerId:otherOwner.id,status:'approved'}],
 memberships:[{vendorSlug:'first-vendor',userId:owner.id,role:'owner',active:true},
              {vendorSlug:'first-vendor',userId:manager.id,role:'manager',active:true},
              {vendorSlug:'other-vendor',userId:otherOwner.id,role:'owner',active:true}],
 sessions:[{id:session,userId:owner.id,active:true},
           {id:'session_manager',userId:manager.id,active:true},
           {id:'session_other',userId:otherOwner.id,active:true},
           {id:'session_inactive',userId:owner.id,active:false}]
});
function vendorFixture(slug='first-vendor',who=owner){
 const application=applyVendor({ownerId:who.id,displayName:'Fictional Apparel',slug,country:'CA'});
 const vendor=moderateVendor(application,moderator,'approved',{legalEntity:true,eligibility:true,terms:true});
 const membership={vendorSlug:slug,userId:manager.id,role:'manager',active:true};
 const draft=draftStorefront(vendor,manager,membership,'Original demo garments');
 const profile=moderateStorefront(vendor,draft,moderator,'approved');
 const submitted=submitListing(vendor,manager,membership,{
   id:'item_001',title:'Fictional shirt',category:'Apparel',territories:['CA']
 });
 const product=moderateListing(vendor,submitted,moderator,'approved',evidence);
 const stocked={...product,stock:2,inventoryUpdatedAt:new Date(now-1000).toISOString()};
 return {vendor,profile,stocked};
}
const select=(store,plan='starter')=>store.transition({
 key:'select_one',vendorSlug:'first-vendor',sessionId:session,action:'select',plan,now
});
const activate=store=>store.transition({
 key:'activate_one',vendorSlug:'first-vendor',sessionId:session,action:'activate',now,
 evidence:{fixtureApproval:true}
});
const view=(store,fixture=vendorFixture(),overrides={})=>buildSubscribedFixtureView({
 subscriptions:store,sessionId:session,country:'CA',now,...fixture,
 listings:[fixture.stocked],...overrides
});

test('subscription not selected or selected-only blocks otherwise approved storefront and dashboard',()=>{
 const store=createFixtureSubscriptions(access());
 for(const current of [view(store),(select(store),view(store))]){
  assert.equal(current.subscription.publishEligible,false);
  assert.equal(current.preview,null);
  assert.equal(current.storefront.previewAvailable,false);
  assert.match(renderSubscribedFixtureDashboard(current,{tab:'storefront'}),/No approved storefront preview available/);
 }
});
test('approved active subscription makes eligible stocked listing visible and projected in dashboard',()=>{
 const store=createFixtureSubscriptions(access());select(store);activate(store);
 const projection=view(store);
 assert.equal(projection.subscription.plan,'starter');
 assert.equal(projection.subscription.listingLimit,5);
 assert.equal(projection.subscription.publishEligible,true);
 assert.deepEqual(projection.preview.products,[{id:'item_001',title:'Fictional shirt',category:'Apparel'}]);
 assert.match(renderSubscribedFixtureDashboard(projection,{tab:'storefront'}),/Fictional shirt/);
 assert.equal(JSON.stringify(projection).includes('session_owner'),false);
 assert.equal(JSON.stringify(projection).includes('fixtureApproval'),false);
});
test('end-of-period cancellation is eligible until expiry and then hides all products',()=>{
 const store=createFixtureSubscriptions(access());select(store);activate(store);
 store.transition({key:'cancel_later',vendorSlug:'first-vendor',sessionId:session,action:'cancel',now});
 assert.equal(view(store).subscription.status,'cancelling');
 assert.equal(view(store).preview.products.length,1);
 const later=view(store,vendorFixture(),{now:now+month});
 assert.equal(later.subscription.status,'expired');
 assert.equal(later.preview,null);
});
test('immediate cancellation blocks storefront preview and does not delete moderated listing queue',()=>{
 const store=createFixtureSubscriptions(access());select(store);activate(store);
 store.transition({key:'cancel_now',vendorSlug:'first-vendor',sessionId:session,action:'cancel',now,immediate:true});
 const projection=view(store);
 assert.equal(projection.subscription.status,'cancelled');
 assert.equal(projection.preview,null);
 assert.equal(projection.listings.length,1);
 assert.equal(projection.listings[0].status,'approved');
});
test('listing quota derives from actual approved listing records rather than caller supplied count',()=>{
 const store=createFixtureSubscriptions(access());select(store);activate(store);
 const fixture=vendorFixture();
 const five=Array.from({length:5},(_,i)=>({...fixture.stocked,id:'item_'+String(i+1).padStart(3,'0')}));
 assert.equal(view(store,fixture,{listings:five,approvedListings:0}).subscription.publishEligible,true);
 const six=[...five,{...fixture.stocked,id:'item_006'}];
 assert.equal(view(store,fixture,{listings:six,approvedListings:0}).subscription.publishEligible,false);
 assert.equal(view(store,fixture,{listings:six}).preview,null);
});
test('inventory and territorial restrictions still apply under an active subscription',()=>{
 const store=createFixtureSubscriptions(access());select(store);activate(store);
 const fixture=vendorFixture();
 for(const product of [
  {...fixture.stocked,stock:0},
  {...fixture.stocked,inventoryUpdatedAt:new Date(1).toISOString()},
  {...fixture.stocked,inventoryUpdatedAt:new Date(now+100).toISOString()}
 ]){
  assert.deepEqual(view(store,fixture,{listings:[product]}).preview.products,[]);
 }
 assert.deepEqual(view(store,fixture,{country:'US'}).preview.products,[]);
});
test('cross-tenant listings and unauthorized sessions cannot create subscribed projections',()=>{
 const store=createFixtureSubscriptions(access());select(store);activate(store);
 const fixture=vendorFixture();
 assert.throws(()=>view(store,fixture,{listings:[{...fixture.stocked,vendorSlug:'other-vendor'}]}));
 for(const sessionId of ['session_other','session_inactive']){
  assert.throws(()=>view(store,fixture,{sessionId}));
 }
});
test('idempotent activation replay does not alter subscribed storefront entitlement',()=>{
 const store=createFixtureSubscriptions(access());select(store);
 const request={key:'activate_one',vendorSlug:'first-vendor',sessionId:session,action:'activate',now,
 evidence:{fixtureApproval:true}};
 const first=store.transition(request),before=store.snapshot();
 assert.equal(store.transition(request).replayed,true);
 assert.deepEqual(store.snapshot(),before);
 assert.equal(first.status,'active');
 assert.equal(view(store).subscription.publishEligible,true);
 assert.throws(()=>store.transition({...request,evidence:{fixtureApproval:false}}));
});
test('unapproved storefront or vendor status cannot bypass subscription entitlement gate',()=>{
 const store=createFixtureSubscriptions(access());select(store);activate(store);
 const fixture=vendorFixture();
 assert.equal(view(store,fixture,{profile:{...fixture.profile,status:'draft'}}).preview,null);
 const pending={...fixture.vendor,status:'pending'};
 const denied=view(store,fixture,{vendor:pending});
 assert.equal(denied.subscription.publishEligible,false);
 assert.equal(denied.preview,null);
});
test('dashboard projection hides supplier internals and cross-tenant audit events',()=>{
 const store=createFixtureSubscriptions(access());select(store);activate(store);
 const fixture=vendorFixture();
 const product={...fixture.stocked,supplierToken:'private-fixture-key',wholesaleCost:999};
 const projection=view(store,fixture,{listings:[product]});
 const html=renderSubscribedFixtureDashboard(projection,{tab:'storefront'});
 assert.equal(html.includes('private-fixture-key'),false);
 assert.equal(html.includes('wholesaleCost'),false);
 assert.throws(()=>view(store,fixture,{events:[{vendorSlug:'other-vendor',sequence:1,
  type:'listing-approved',recordId:'foreign_item',actorId:'moderator_001'}]}));
});

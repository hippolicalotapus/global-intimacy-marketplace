import test from 'node:test';
import assert from 'node:assert/strict';
import {createFixtureSubscriptions} from './vendor-subscriptions-fixture.mjs';
const clock=2000000, month=30*24*60*60*1000;
const fixtures=()=>({
 vendors:[{slug:'first-vendor',ownerId:'owner_001',status:'approved'},
  {slug:'other-vendor',ownerId:'owner_002',status:'approved'},
  {slug:'pending-vendor',ownerId:'owner_003',status:'pending'}],
 memberships:[{vendorSlug:'first-vendor',userId:'owner_001',role:'owner',active:true},
  {vendorSlug:'first-vendor',userId:'manager_001',role:'manager',active:true},
  {vendorSlug:'first-vendor',userId:'viewer_001',role:'viewer',active:true},
  {vendorSlug:'other-vendor',userId:'owner_002',role:'owner',active:true},
  {vendorSlug:'pending-vendor',userId:'owner_003',role:'owner',active:true}],
 sessions:[{id:'session_owner',userId:'owner_001',active:true},
  {id:'session_manager',userId:'manager_001',active:true},
  {id:'session_viewer',userId:'viewer_001',active:true},
  {id:'session_other',userId:'owner_002',active:true},
  {id:'session_pending',userId:'owner_003',active:true},
  {id:'session_inactive',userId:'owner_001',active:false}]
});
const request=(key,action,extra={})=>({key,action,vendorSlug:'first-vendor',sessionId:'session_owner',now:clock,...extra});
const activate=(store,plan='starter')=>{
 store.transition(request('select_one','select',{plan}));
 return store.transition(request('activate_one','activate',{evidence:{fixtureApproval:true}}));
};
test('plan selection and fictional activation gate storefront publication',()=>{
 const store=createFixtureSubscriptions(fixtures());
 assert.equal(store.entitlement({vendorSlug:'first-vendor',sessionId:'session_owner',now:clock,approvedStorefront:true}).canPublish,false);
 assert.equal(store.transition(request('select_one','select',{plan:'starter'})).status,'selected');
 assert.equal(store.entitlement({vendorSlug:'first-vendor',sessionId:'session_owner',now:clock,approvedStorefront:true}).canPublish,false);
 assert.throws(()=>store.transition(request('activate_fail','activate')));
 assert.equal(store.transition(request('activate_one','activate',{evidence:{fixtureApproval:true}})).status,'active');
 assert.equal(store.entitlement({vendorSlug:'first-vendor',sessionId:'session_owner',now:clock,approvedStorefront:true,approvedListings:5}).canPublish,true);
 assert.equal(store.entitlement({vendorSlug:'first-vendor',sessionId:'session_owner',now:clock,approvedStorefront:true,approvedListings:6}).canPublish,false);
 assert.equal(store.entitlement({vendorSlug:'first-vendor',sessionId:'session_owner',now:clock,approvedStorefront:false}).canPublish,false);
});
test('plans apply distinct listing limits without any payment side effects',()=>{
 for(const [plan,limit] of [['starter',5],['studio',50],['marketplace',500]]){
  const store=createFixtureSubscriptions(fixtures());activate(store,plan);
  assert.equal(store.entitlement({vendorSlug:'first-vendor',sessionId:'session_owner',now:clock,approvedStorefront:true,approvedListings:limit}).canPublish,true);
  assert.equal(store.entitlement({vendorSlug:'first-vendor',sessionId:'session_owner',now:clock,approvedStorefront:true,approvedListings:limit+1}).canPublish,false);
 }
});
test('renewal and expiration are determined by explicit fictional time',()=>{
 const store=createFixtureSubscriptions(fixtures());activate(store);
 assert.equal(store.transition(request('renew_one','renew',{now:clock+100,evidence:{fixtureApproval:true}})).status,'active');
 assert.equal(store.entitlement({vendorSlug:'first-vendor',sessionId:'session_owner',now:clock+month+100,approvedStorefront:true}).canPublish,true);
 assert.equal(store.entitlement({vendorSlug:'first-vendor',sessionId:'session_owner',now:clock+2*month,approvedStorefront:true}).canPublish,false);
 assert.equal(store.transition(request('expired','expire',{now:clock+2*month})).status,'expired');
 assert.throws(()=>store.transition(request('renew_late','renew',{now:clock+2*month,evidence:{fixtureApproval:true}})));
});
test('scheduled cancellation retains access only until paid fictional period ends',()=>{
 const store=createFixtureSubscriptions(fixtures());activate(store);
 assert.equal(store.transition(request('cancel_one','cancel',{now:clock+1})).status,'cancelling');
 assert.equal(store.entitlement({vendorSlug:'first-vendor',sessionId:'session_owner',now:clock+1,approvedStorefront:true}).canPublish,true);
 assert.equal(store.entitlement({vendorSlug:'first-vendor',sessionId:'session_owner',now:clock+month,approvedStorefront:true}).canPublish,false);
 assert.throws(()=>store.transition(request('renew_after_cancel','renew',{now:clock+2,evidence:{fixtureApproval:true}})));
});
test('immediate cancellation revokes publishing on the same fictional clock tick',()=>{
 const store=createFixtureSubscriptions(fixtures());activate(store);
 assert.equal(store.transition(request('cancel_now','cancel',{immediate:true})).status,'cancelled');
 assert.equal(store.entitlement({vendorSlug:'first-vendor',sessionId:'session_owner',now:clock,approvedStorefront:true}).canPublish,false);
 assert.throws(()=>store.transition(request('renew_cancelled','renew',{evidence:{fixtureApproval:true}})));
});
test('idempotent retries return unchanged receipt and reject conflicting key reuse',()=>{
 const store=createFixtureSubscriptions(fixtures());
 const first=store.transition(request('select_one','select',{plan:'studio'}));
 const before=store.snapshot();
 const repeated=store.transition(request('select_one','select',{plan:'studio'}));
 assert.equal(first.replayed,false);assert.equal(repeated.replayed,true);
 assert.deepEqual(store.snapshot(),before);
 assert.throws(()=>store.transition(request('select_one','select',{plan:'marketplace'})));
 assert.deepEqual(store.snapshot(),before);
});
test('cross-vendor and inactive sessions cannot inspect or change entitlements',()=>{
 const store=createFixtureSubscriptions(fixtures());
 for(const sessionId of ['session_other','session_viewer','session_inactive']){
  assert.throws(()=>store.transition(request('untrusted_'+sessionId,'select',{plan:'starter',sessionId})));
  assert.throws(()=>store.entitlement({vendorSlug:'first-vendor',sessionId,now:clock,approvedStorefront:true}));
 }
 assert.throws(()=>store.transition({key:'pending_select',vendorSlug:'pending-vendor',sessionId:'session_pending',action:'select',plan:'starter',now:clock}));
 assert.deepEqual(store.snapshot(),{subscriptions:[],receipts:[]});
});
test('same idempotency key cannot be repurposed for another tenant',()=>{
 const store=createFixtureSubscriptions(fixtures());store.transition(request('shared_key','select',{plan:'starter'}));
 const before=store.snapshot();
 assert.throws(()=>store.transition({key:'shared_key',vendorSlug:'other-vendor',sessionId:'session_other',action:'select',plan:'starter',now:clock}));
 assert.deepEqual(store.snapshot(),before);
});
test('unapproved vendors and invalid plans never become publishable',()=>{
 const store=createFixtureSubscriptions(fixtures());
 assert.throws(()=>store.transition(request('invalid_plan','select',{plan:'superadmin'})));
 assert.throws(()=>store.transition(request('invalid_time','select',{plan:'starter',now:-1})));
 assert.throws(()=>store.transition(request('invalid_key','select',{key:'../escape',plan:'starter'})));
 assert.deepEqual(store.snapshot(),{subscriptions:[],receipts:[]});
});
test('fixture publishing entitlement responds to each vendor independently',()=>{
 const store=createFixtureSubscriptions(fixtures());activate(store);
 store.transition({key:'other_select',vendorSlug:'other-vendor',sessionId:'session_other',action:'select',plan:'studio',now:clock});
 assert.equal(store.entitlement({vendorSlug:'first-vendor',sessionId:'session_owner',now:clock,approvedStorefront:true}).canPublish,true);
 assert.equal(store.entitlement({vendorSlug:'other-vendor',sessionId:'session_other',now:clock,approvedStorefront:true}).canPublish,false);
 store.transition({key:'other_activate',vendorSlug:'other-vendor',sessionId:'session_other',action:'activate',now:clock,evidence:{fixtureApproval:true}});
 assert.equal(store.entitlement({vendorSlug:'other-vendor',sessionId:'session_other',now:clock,approvedStorefront:true,approvedListings:50}).canPublish,true);
 assert.equal(store.snapshot().subscriptions.length,2);
});

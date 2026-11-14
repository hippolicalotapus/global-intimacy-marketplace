import test from 'node:test';
import assert from 'node:assert/strict';
import {createFixturePersistenceContract} from './vendor-persistence-fixture.mjs';

const fixture=()=>({
 users:[
  {id:'owner_001',role:'user',active:true},
  {id:'owner_002',role:'user',active:true},
  {id:'editor_001',role:'user',active:true},
  {id:'reviewer_001',role:'platform_moderator',active:true},
  {id:'reviewer_002',role:'platform_moderator',active:true},
  {id:'outsider_001',role:'user',active:true}
 ],
 sessions:[
  {id:'session_owner',userId:'owner_001'},
  {id:'session_other',userId:'owner_002'},
  {id:'session_editor',userId:'editor_001'},
  {id:'session_mod1',userId:'reviewer_001'},
  {id:'session_mod2',userId:'reviewer_002'},
  {id:'session_outsider',userId:'outsider_001'}
 ],
 vendors:[
  {slug:'first-vendor',ownerId:'owner_001',status:'approved'},
  {slug:'other-vendor',ownerId:'owner_002',status:'approved'}
 ],
 memberships:[
  {userId:'owner_001',vendorSlug:'first-vendor',role:'owner',active:true},
  {userId:'editor_001',vendorSlug:'first-vendor',role:'manager',active:true},
  {userId:'owner_002',vendorSlug:'other-vendor',role:'owner',active:true}
 ]
});
const evidence={identityVerified:true,termsVerified:true,mediaRights:true,resaleRights:true,compliance:true};
const create=(store,id='item_001')=>store.submit({sessionId:'session_editor',vendorSlug:'first-vendor',id,type:'listing',title:'Fictional apparel'});

test('submissions start at version one and reviews require exact expected version',()=>{
 const store=createFixturePersistenceContract(fixture());
 assert.equal(create(store).version,1);
 assert.throws(()=>store.review({sessionId:'session_mod1',id:'item_001',expectedVersion:0,decision:'approved',evidence}));
 assert.equal(store.review({sessionId:'session_mod1',id:'item_001',expectedVersion:1,decision:'approved',evidence}).version,2);
 assert.throws(()=>store.review({sessionId:'session_mod2',id:'item_001',expectedVersion:1,decision:'rejected'}));
 assert.equal(store.snapshot().revision,2);
});

test('two competing fixture reviewers cannot both commit',async()=>{
 const store=createFixturePersistenceContract(fixture());
 create(store);
 const attempts=await Promise.allSettled([
  Promise.resolve().then(()=>store.review({sessionId:'session_mod1',id:'item_001',expectedVersion:1,decision:'approved',evidence})),
  Promise.resolve().then(()=>store.review({sessionId:'session_mod2',id:'item_001',expectedVersion:1,decision:'rejected'}))
 ]);
 assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(attempts.filter(x=>x.status==='rejected').length,1);
 assert.equal(store.snapshot().events.length,2);
});

test('failed review transaction leaves snapshot unchanged',()=>{
 const store=createFixturePersistenceContract(fixture());create(store);
 const before=store.snapshot();
 for (const attempt of [
  {sessionId:'session_editor',id:'item_001',expectedVersion:1,decision:'approved',evidence},
  {sessionId:'session_mod1',id:'item_001',expectedVersion:2,decision:'approved',evidence},
  {sessionId:'session_mod1',id:'item_001',expectedVersion:1,decision:'approved',evidence:{}},
  {sessionId:'session_mod1',id:'item_001',expectedVersion:1,decision:'invalid',evidence}
 ]) {
  assert.throws(()=>store.review(attempt));
  assert.deepEqual(store.snapshot(),before);
 }
});

test('tenant members cannot submit or read across vendor boundaries',()=>{
 const store=createFixturePersistenceContract(fixture());create(store);
 assert.throws(()=>store.read({sessionId:'session_other',id:'item_001'}));
 assert.throws(()=>store.read({sessionId:'session_outsider',id:'item_001'}));
 assert.throws(()=>store.submit({sessionId:'session_other',vendorSlug:'first-vendor',id:'item_002',type:'listing',title:'Fiction'}));
 assert.equal(store.read({sessionId:'session_owner',id:'item_001'}).id,'item_001');
 assert.equal(store.read({sessionId:'session_mod1',id:'item_001'}).id,'item_001');
});

test('global duplicate identifiers across fictional tenants are rejected',()=>{
 const store=createFixturePersistenceContract(fixture());create(store);
 const before=store.snapshot();
 assert.throws(()=>store.submit({sessionId:'session_other',vendorSlug:'other-vendor',id:'item_001',type:'listing',title:'Duplicate'}));
 assert.deepEqual(store.snapshot(),before);
 assert.equal(store.submit({sessionId:'session_other',vendorSlug:'other-vendor',id:'item_002',type:'listing',title:'Distinct'}).vendorSlug,'other-vendor');
});

test('trusted restored state resumes record versions and rejects stale revision floor',()=>{
 const first=createFixturePersistenceContract(fixture());create(first);
 first.review({sessionId:'session_mod1',id:'item_001',expectedVersion:1,decision:'approved',evidence});
 const state=first.snapshot();
 const second=createFixturePersistenceContract({...fixture(),savedState:state,minimumRevision:2});
 assert.deepEqual(second.snapshot(),state);
 assert.throws(()=>createFixturePersistenceContract({...fixture(),savedState:state,minimumRevision:3}));
 assert.throws(()=>second.review({sessionId:'session_mod2',id:'item_001',expectedVersion:1,decision:'rejected'}));
 assert.equal(create(second,'item_002').version,1);
 assert.equal(second.snapshot().revision,3);
});

test('restoration rejects forged review state and contradictory event history',()=>{
 const store=createFixturePersistenceContract(fixture());create(store);
 store.review({sessionId:'session_mod1',id:'item_001',expectedVersion:1,decision:'approved',evidence});
 const state=store.snapshot();
 const changes=[
  {...state,records:[{...state.records[0],version:1}]},
  {...state,records:[{...state.records[0],reviewedBy:'owner_001'}]},
  {...state,records:[{...state.records[0],status:'rejected'}]},
  {...state,events:[state.events[0],{...state.events[1],revision:1}]},
  {...state,events:[state.events[0],{...state.events[1],actorId:'owner_001'}]},
  {...state,events:[state.events[0]] ,revision:1},
  {...state,records:[]}
 ];
 for (const bad of changes) assert.throws(()=>createFixturePersistenceContract({...fixture(),savedState:bad}));
});

test('reject spoofed role and hostile text without mutation',()=>{
 const store=createFixturePersistenceContract(fixture());
 const before=store.snapshot();
 assert.throws(()=>store.submit({sessionId:'session_outsider',vendorSlug:'first-vendor',id:'item_001',type:'listing',title:'Fictional',role:'owner'}));
 assert.throws(()=>store.submit({sessionId:'session_editor',vendorSlug:'first-vendor',id:'../escape',type:'listing',title:'Fictional'}));
 assert.throws(()=>store.submit({sessionId:'session_editor',vendorSlug:'first-vendor',id:'item_001',type:'listing',title:'<script>'}));
 assert.deepEqual(store.snapshot(),before);
});

test('returned record and snapshot mutation cannot affect private fixture state',()=>{
 const store=createFixturePersistenceContract(fixture());
 const returned=create(store);
 returned.status='approved';
 const snapshot=store.snapshot();
 snapshot.records[0].status='rejected';
 assert.equal(store.read({sessionId:'session_owner',id:'item_001'}).status,'pending');
 assert.equal(store.snapshot().revision,1);
});

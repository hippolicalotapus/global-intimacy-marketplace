import test from 'node:test';
import assert from 'node:assert/strict';
import {createFixtureAuthorizationAdapter} from './vendor-authorization-fixture.mjs';
import {sealFixtureAudit,openFixtureAudit,restoreSealedFixtureAuthorization,sealAuthorizationFixture} from './vendor-audit-envelope.mjs';

const key='fixture-key-one-32-bytes-long-only-for-testing';
const wrong='fixture-key-two-32-bytes-long-only-for-testing';
const fixtures=()=>({
 users:[
  {id:'owner_001',role:'user',active:true},
  {id:'owner_002',role:'user',active:true},
  {id:'manager_001',role:'user',active:true},
  {id:'moderator_001',role:'platform_moderator',active:true},
  {id:'moderator_002',role:'platform_moderator',active:true}
 ],
 sessions:[
  {id:'session_owner',userId:'owner_001'},
  {id:'session_other',userId:'owner_002'},
  {id:'session_manager',userId:'manager_001'},
  {id:'session_mod1',userId:'moderator_001'},
  {id:'session_mod2',userId:'moderator_002'}
 ],
 vendors:[
  {slug:'first-vendor',ownerId:'owner_001',status:'approved'},
  {slug:'other-vendor',ownerId:'owner_002',status:'approved'}
 ],
 memberships:[
  {userId:'owner_001',vendorSlug:'first-vendor',role:'owner',active:true},
  {userId:'manager_001',vendorSlug:'first-vendor',role:'manager',active:true},
  {userId:'owner_002',vendorSlug:'other-vendor',role:'owner',active:true}
 ]
});
const evidence={identityVerified:true,termsVerified:true,mediaRights:true,resaleRights:true,compliance:true};
const createDraft=(store,id='entry_001',sessionId='session_manager',vendorSlug='first-vendor')=>
 store.submit({sessionId,vendorSlug,id,type:'listing',title:'Fictional garment'});
const setup=()=>{
 const store=createFixtureAuthorizationAdapter(fixtures());
 createDraft(store);
 store.review({sessionId:'session_mod1',id:'entry_001',decision:'approved',evidence});
 return store;
};

test('HMAC envelope restores valid fixture review history with trusted key',()=>{
 const original=setup();
 const sealed=sealAuthorizationFixture(original,key);
 assert.deepEqual(Object.keys(sealed).sort(),['mac','payload','version']);
 assert.equal(sealed.version,1);
 const restored=restoreSealedFixtureAuthorization(fixtures(),sealed,key);
 assert.deepEqual(restored.snapshot(),original.snapshot());
 assert.equal(restored.recordFor({sessionId:'session_owner',id:'entry_001'}).status,'approved');
 assert.throws(()=>restored.review({sessionId:'session_mod2',id:'entry_001',decision:'rejected'}));
});
test('altered payload, forged MAC, incorrect key and invalid version fail closed',()=>{
 const sealed=sealAuthorizationFixture(setup(),key);
 const changes=[
  {...sealed,payload:sealed.payload.slice(0,-1)+(sealed.payload.endsWith('A')?'B':'A')},
  {...sealed,mac:'0'.repeat(64)},
  {...sealed,version:2},
  {...sealed,extra:'unexpected'},
  {...sealed,payload:'*invalid*'}
 ];
 for(const altered of changes){
  assert.throws(()=>openFixtureAudit(altered,key));
  assert.throws(()=>restoreSealedFixtureAuthorization(fixtures(),altered,key));
 }
 assert.throws(()=>openFixtureAudit(sealed,wrong));
 assert.throws(()=>restoreSealedFixtureAuthorization(fixtures(),sealed,wrong));
});
test('reject missing or weak key and block untrusted savedState mix-in',()=>{
 const sealed=sealAuthorizationFixture(setup(),key);
 assert.throws(()=>sealAuthorizationFixture(setup(),'short-key'));
 assert.throws(()=>openFixtureAudit(sealed,'short-key'));
 assert.throws(()=>restoreSealedFixtureAuthorization({...fixtures(),savedState:{}},sealed,key));
 assert.throws(()=>restoreSealedFixtureAuthorization({...fixtures(),savedEnvelope:{}},sealed,key));
});
test('validly sealed but internally inconsistent audits still fail restoration',()=>{
 const original=setup().snapshot();
 const altered={
  ...original,
  history:[original.history[0]],
  sequence:1
 };
 const sealed=sealFixtureAudit(altered,key);
 assert.deepEqual(openFixtureAudit(sealed,key),altered);
 assert.throws(()=>restoreSealedFixtureAuthorization(fixtures(),sealed,key));
});
test('restored tenant isolation remains enforced and duplicate IDs are rejected',()=>{
 const restored=restoreSealedFixtureAuthorization(fixtures(),sealAuthorizationFixture(setup(),key),key);
 assert.throws(()=>restored.recordFor({sessionId:'session_other',id:'entry_001'}));
 assert.throws(()=>createDraft(restored,'entry_001','session_other','other-vendor'));
 assert.equal(createDraft(restored,'entry_002','session_other','other-vendor').vendorSlug,'other-vendor');
 assert.equal(restored.snapshot().sequence,3);
});
test('two near-simultaneous moderator reviews allow exactly one durable fixture transition',async()=>{
 const store=createFixtureAuthorizationAdapter(fixtures());
 createDraft(store);
 const attempts=await Promise.allSettled([
  Promise.resolve().then(()=>store.review({sessionId:'session_mod1',id:'entry_001',decision:'approved',evidence})),
  Promise.resolve().then(()=>store.review({sessionId:'session_mod2',id:'entry_001',decision:'rejected'}))
 ]);
 assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(attempts.filter(x=>x.status==='rejected').length,1);
 assert.equal(store.snapshot().history.length,2);
 assert.equal(store.snapshot().sequence,2);
 const restored=restoreSealedFixtureAuthorization(fixtures(),sealAuthorizationFixture(store,key),key);
 assert.deepEqual(restored.snapshot(),store.snapshot());
});
test('returned envelope payload cannot modify state and replay cannot reapprove',()=>{
 const original=setup();
 const sealed=sealAuthorizationFixture(original,key);
 const decoded=openFixtureAudit(sealed,key);
 decoded.records[0].status='pending';
 assert.equal(original.recordFor({sessionId:'session_owner',id:'entry_001'}).status,'approved');
 const restored=restoreSealedFixtureAuthorization(fixtures(),sealed,key);
 assert.equal(restored.recordFor({sessionId:'session_owner',id:'entry_001'}).status,'approved');
 assert.throws(()=>restored.review({sessionId:'session_mod2',id:'entry_001',decision:'approved',evidence}));
});

test('trusted minimum audit sequence rejects a correctly signed stale replay',()=>{
 const store=setup();
 const stale=sealAuthorizationFixture(store,key);
 createDraft(store,'entry_002','session_other','other-vendor');
 const floor=store.snapshot().sequence;
 assert.equal(floor,3);
 assert.throws(()=>restoreSealedFixtureAuthorization(fixtures(),stale,key,{minimumSequence:floor}));
 const current=sealAuthorizationFixture(store,key);
 assert.deepEqual(restoreSealedFixtureAuthorization(fixtures(),current,key,{minimumSequence:floor}).snapshot(),store.snapshot());
});
test('restore rejects invalid trusted sequence floors',()=>{
 const sealed=sealAuthorizationFixture(setup(),key);
 for(const floor of [-1,1.5,NaN,Infinity,'2',null]) {
  assert.throws(()=>restoreSealedFixtureAuthorization(fixtures(),sealed,key,{minimumSequence:floor}));
 }
});
test('audit envelopes reject oversized fictional payloads',()=>{
 assert.throws(()=>sealFixtureAudit({padding:'x'.repeat(1024*1024)},key));
 const valid=sealAuthorizationFixture(setup(),key);
 assert.throws(()=>openFixtureAudit({...valid,payload:'A'.repeat(1400000)},key));
});
test('failed rollback and invalid restore attempts do not affect existing tenant records',()=>{
 const store=setup();
 const initial=store.snapshot();
 const stale=sealAuthorizationFixture(store,key);
 assert.throws(()=>restoreSealedFixtureAuthorization(fixtures(),stale,key,{minimumSequence:initial.sequence+1}));
 assert.throws(()=>restoreSealedFixtureAuthorization(fixtures(),{...stale,mac:'0'.repeat(64)},key));
 assert.deepEqual(store.snapshot(),initial);
 assert.throws(()=>store.recordFor({sessionId:'session_other',id:'entry_001'}));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createFixtureTransactionStore} from './vendor-transactions-fixture.mjs';
import {createFixtureKeyring} from './vendor-rotation-fixture.mjs';
const secretA='this-is-a-fictional-signing-key-alpha-123456';
const secretB='this-is-a-fictional-signing-key-bravo-123456';
const fixtures=()=>({
 users:[{id:'owner_001',role:'user',active:true},{id:'owner_002',role:'user',active:true},
        {id:'manager_001',role:'user',active:true},{id:'outsider_001',role:'user',active:true},
        {id:'moderator_001',role:'platform_moderator',active:true}],
 sessions:[{id:'session_manager',userId:'manager_001'},{id:'session_owner',userId:'owner_001'},
           {id:'session_other',userId:'owner_002'},{id:'session_mod',userId:'moderator_001'}],
 vendors:[{slug:'first-vendor',ownerId:'owner_001',status:'approved'},
          {slug:'other-vendor',ownerId:'owner_002',status:'approved'}],
 memberships:[{userId:'owner_001',vendorSlug:'first-vendor',role:'owner',active:true},
             {userId:'manager_001',vendorSlug:'first-vendor',role:'manager',active:true},
             {userId:'owner_002',vendorSlug:'other-vendor',role:'owner',active:true}]
});
const request={key:'request_001',expectedRevision:0,operations:[{type:'submit',sessionId:'session_manager',vendorSlug:'first-vendor',id:'listing_001',recordType:'listing',title:'Fixture garment'}]};
const made=()=>{const store=createFixtureTransactionStore(fixtures());store.batch(request);return store;};
const ring=(statusA='verify-only')=>createFixtureKeyring({
 keys:[{id:'key_alpha',secret:secretA,status:statusA},{id:'key_bravo',secret:secretB,status:'active'}],
 activeKeyId:'key_bravo'
});

test('key rotation accepts earlier verify-only signatures and issues new active signatures',()=>{
 const old=createFixtureKeyring({keys:[{id:'key_alpha',secret:secretA,status:'active'}],activeKeyId:'key_alpha'});
 const original=made(),oldSigned=old.seal(original);
 const rotated=ring();
 assert.deepEqual(rotated.restore(fixtures(),oldSigned,{minimumRevision:1}).snapshot(),original.snapshot());
 const newSigned=rotated.seal(original);
 assert.equal(newSigned.keyId,'key_bravo');
 assert.deepEqual(rotated.restore(fixtures(),newSigned,{minimumRevision:1}).snapshot(),original.snapshot());
 assert.throws(()=>old.restore(fixtures(),newSigned));
});
test('revoked key cannot restore older fixture snapshot',()=>{
 const legacy=createFixtureKeyring({keys:[{id:'key_alpha',secret:secretA,status:'active'}],activeKeyId:'key_alpha'}).seal(made());
 assert.throws(()=>ring('revoked').restore(fixtures(),legacy,{minimumRevision:1}));
});
test('key identifier swap and foreign or tampered signed envelopes fail',()=>{
 const sealed=ring().seal(made());
 assert.throws(()=>ring().restore(fixtures(),{...sealed,keyId:'key_alpha'}));
 assert.throws(()=>ring().restore(fixtures(),{...sealed,envelope:{...sealed.envelope,mac:'0'.repeat(64)}}));
 assert.throws(()=>ring().restore(fixtures(),{...sealed,envelope:{...sealed.envelope,payload:'bad'}}));
 assert.throws(()=>ring().restore(fixtures(),{...sealed,keyId:'unknown'}));
});
test('independent revision floor rejects replayed valid snapshot after recovery',()=>{
 const store=made(),earlier=ring().seal(store);
 store.batch({key:'request_002',expectedRevision:1,operations:[{
  type:'submit',sessionId:'session_other',vendorSlug:'other-vendor',
  id:'listing_002',recordType:'listing',title:'Other fixture'
 }]});
 assert.throws(()=>ring().restore(fixtures(),earlier,{minimumRevision:2}));
 assert.equal(ring().restore(fixtures(),ring().seal(store),{minimumRevision:2}).snapshot().state.revision,2);
});
test('failed batch before snapshot does not appear after simulated crash/restart',()=>{
 const store=made(),before=store.snapshot();
 assert.throws(()=>store.batch({key:'request_bad',expectedRevision:1,operations:[
  {type:'submit',sessionId:'session_manager',vendorSlug:'first-vendor',id:'listing_003',recordType:'listing',title:'First valid'},
  {type:'submit',sessionId:'session_manager',vendorSlug:'other-vendor',id:'listing_004',recordType:'listing',title:'Unauthorized'}
 ]}));
 assert.deepEqual(store.snapshot(),before);
 const restored=ring().restore(fixtures(),ring().seal(store),{minimumRevision:1});
 assert.deepEqual(restored.snapshot(),before);
 assert.throws(()=>restored.read({sessionId:'session_owner',id:'listing_003'}));
});
test('restored receipt replay is authorized against current tenant membership',()=>{
 const store=made(),snapshot=store.snapshot();
 const changed=fixtures();
 changed.sessions=changed.sessions.map(x=>x.id==='session_manager'?{...x,userId:'outsider_001'}:x);
 const restored=createFixtureTransactionStore({...changed,savedState:snapshot,minimumRevision:1});
 assert.throws(()=>restored.batch(request));
 assert.deepEqual(restored.snapshot(),snapshot);
});
test('same idempotency key cannot be repurposed across vendors',()=>{
 const store=made(),before=store.snapshot();
 assert.throws(()=>store.batch({key:'request_001',expectedRevision:1,operations:[{
  type:'submit',sessionId:'session_other',vendorSlug:'other-vendor',
  id:'other_001',recordType:'listing',title:'Other product'
 }]}));
 assert.deepEqual(store.snapshot(),before);
});
test('restore rejects invalid keyring and invalid revision floors',()=>{
 assert.throws(()=>createFixtureKeyring({keys:[{id:'weak',secret:'short',status:'active'}],activeKeyId:'weak'}));
 const sealed=ring().seal(made());
 for(const floor of [-1,1.5,NaN,'1',null])assert.throws(()=>ring().restore(fixtures(),sealed,{minimumRevision:floor}));
});

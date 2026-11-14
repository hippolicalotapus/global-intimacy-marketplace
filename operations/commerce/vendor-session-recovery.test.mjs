import test from 'node:test';
import assert from 'node:assert/strict';
import {createFixtureTransactionStore} from './vendor-transactions-fixture.mjs';
import {createFixtureKeyring} from './vendor-rotation-fixture.mjs';

const firstSecret='fictional-alpha-key-for-rotation-00000000001';
const nextSecret='fictional-bravo-key-for-rotation-00000000002';
const fixtures=()=>({
 users:[{id:'owner_001',role:'user',active:true},{id:'owner_002',role:'user',active:true},
  {id:'editor_001',role:'user',active:true},{id:'mod_001',role:'platform_moderator',active:true}],
 sessions:[{id:'session_editor',userId:'editor_001'},{id:'session_owner',userId:'owner_001'},
  {id:'session_other',userId:'owner_002'},{id:'session_mod',userId:'mod_001'}],
 vendors:[{slug:'first-vendor',ownerId:'owner_001',status:'approved'},
  {slug:'second-vendor',ownerId:'owner_002',status:'approved'}],
 memberships:[{vendorSlug:'first-vendor',userId:'owner_001',role:'owner',active:true},
  {vendorSlug:'first-vendor',userId:'editor_001',role:'manager',active:true},
  {vendorSlug:'second-vendor',userId:'owner_002',role:'owner',active:true}]
});
const submit=(id,slug='first-vendor',sessionId='session_editor')=>({
 type:'submit',id,vendorSlug:slug,sessionId,recordType:'listing',title:'Fictional product'
});
const ring=(alpha='verify-only')=>createFixtureKeyring({
 keys:[{id:'key_alpha',status:alpha,secret:firstSecret},{id:'key_bravo',status:'active',secret:nextSecret}],
 activeKeyId:'key_bravo'
});
const initial=()=>{
 const store=createFixtureTransactionStore(fixtures());
 store.batch({key:'request_first',expectedRevision:0,operations:[submit('item_001')]});
 return store;
};

test('revoked fixture session cannot read or replay receipts after signed recovery',()=>{
 const store=initial();
 const sealed=ring().seal(store);
 const recovered=ring().restore({...fixtures(),revokedSessionIds:['session_editor']},sealed,{minimumRevision:1});
 assert.deepEqual(recovered.snapshot(),store.snapshot());
 assert.throws(()=>recovered.read({sessionId:'session_editor',id:'item_001'}));
 assert.throws(()=>recovered.batch({key:'request_first',expectedRevision:0,operations:[submit('item_001')]}));
 assert.equal(recovered.read({sessionId:'session_owner',id:'item_001'}).status,'pending');
});
test('revoked session cannot add new vendor data, and unrelated tenant remains operational',()=>{
 const store=createFixtureTransactionStore({...fixtures(),revokedSessionIds:['session_editor']});
 assert.throws(()=>store.batch({key:'request_revoked',expectedRevision:0,operations:[submit('item_002')]}));
 const result=store.batch({key:'request_other',expectedRevision:0,operations:[submit('other_001','second-vendor','session_other')]});
 assert.equal(result.revision,1);
 assert.throws(()=>store.read({sessionId:'session_owner',id:'other_001'}));
});
test('invalid revocation policies are rejected before opening transaction store',()=>{
 for(const revokedSessionIds of [['unknown_id'],['session_editor','session_editor'],['../bad'],null,'session_editor']){
  assert.throws(()=>createFixtureTransactionStore({...fixtures(),revokedSessionIds}));
 }
});
test('mutable buffer signing key cannot be altered after keyring construction',()=>{
 const key=Buffer.from(nextSecret);
 const keys=createFixtureKeyring({keys:[{id:'key_bravo',status:'active',secret:key}],activeKeyId:'key_bravo'});
 const store=initial(),signed=keys.seal(store);
 key.fill(0);
 assert.deepEqual(keys.restore(fixtures(),signed,{minimumRevision:1}).snapshot(),store.snapshot());
});
test('rotation accepts verify-only prior key but revoked prior key rejects recovery',()=>{
 const old=createFixtureKeyring({keys:[{id:'key_alpha',status:'active',secret:firstSecret}],activeKeyId:'key_alpha'});
 const sealed=old.seal(initial());
 assert.equal(ring().restore(fixtures(),sealed,{minimumRevision:1}).snapshot().state.revision,1);
 assert.throws(()=>ring('revoked').restore(fixtures(),sealed,{minimumRevision:1}));
});
test('twenty-five-operation multi-vendor batch is isolated, recoverable and idempotent',()=>{
 const store=createFixtureTransactionStore(fixtures());
 const operations=Array.from({length:25},(_,index)=>{
  const id='stress_'+String(index).padStart(3,'0');
  return index%2===0?submit(id):submit(id,'second-vendor','session_other');
 });
 const request={key:'request_stress',expectedRevision:0,operations};
 assert.equal(store.batch(request).revision,25);
 assert.equal(store.snapshot().state.records.length,25);
 const restored=ring().restore(fixtures(),ring().seal(store),{minimumRevision:25});
 assert.equal(restored.batch(request).replayed,true);
 assert.equal(restored.snapshot().state.revision,25);
 assert.throws(()=>restored.read({sessionId:'session_owner',id:'stress_001'}));
 assert.throws(()=>restored.read({sessionId:'session_other',id:'stress_000'}));
});
test('one invalid cross-tenant action rolls back a near-limit multi-vendor batch',()=>{
 const store=createFixtureTransactionStore(fixtures());
 const operations=Array.from({length:24},(_,index)=>submit('bulk_'+String(index).padStart(3,'0')));
 operations.push(submit('bulk_bad','second-vendor','session_editor'));
 const before=store.snapshot();
 assert.throws(()=>store.batch({key:'request_invalid',expectedRevision:0,operations}));
 assert.deepEqual(store.snapshot(),before);
 const success=store.batch({key:'request_success',expectedRevision:0,operations:operations.slice(0,24)});
 assert.equal(success.revision,24);
});

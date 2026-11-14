import test from 'node:test';
import assert from 'node:assert/strict';
import {createFixtureTransactionStore} from './vendor-transactions-fixture.mjs';
import {sealTransactionFixture,restoreSealedTransactionFixture} from './vendor-transaction-seal.mjs';
import {sealFixtureAudit} from './vendor-audit-envelope.mjs';

const key='fake-test-key-for-gim-transactions-123456789';
const wrongKey='different-fake-test-key-gim-1234567890';
const fixtures=()=>({
 users:[
  {id:'owner_001',role:'user',active:true},
  {id:'owner_002',role:'user',active:true},
  {id:'manager_001',role:'user',active:true},
  {id:'mod_001',role:'platform_moderator',active:true}
 ],
 sessions:[
  {id:'session_owner',userId:'owner_001'},
  {id:'session_other',userId:'owner_002'},
  {id:'session_manager',userId:'manager_001'},
  {id:'session_mod',userId:'mod_001'}
 ],
 vendors:[
  {slug:'vendor-first',ownerId:'owner_001',status:'approved'},
  {slug:'vendor-other',ownerId:'owner_002',status:'approved'}
 ],
 memberships:[
  {userId:'owner_001',vendorSlug:'vendor-first',role:'owner',active:true},
  {userId:'manager_001',vendorSlug:'vendor-first',role:'manager',active:true},
  {userId:'owner_002',vendorSlug:'vendor-other',role:'owner',active:true}
 ]
});
const request=(key='request_001',id='item_001')=>({
 key,expectedRevision:0,
 operations:[{type:'submit',sessionId:'session_manager',vendorSlug:'vendor-first',
   id,recordType:'listing',title:'Fixture garment'}]
});
const make=()=>{
 const store=createFixtureTransactionStore(fixtures());
 store.batch(request());
 return store;
};
test('sealed transaction snapshot restores record and receipt without duplicate execution',()=>{
 const first=make(),envelope=sealTransactionFixture(first,key);
 const restored=restoreSealedTransactionFixture(fixtures(),envelope,key,{minimumRevision:1});
 assert.deepEqual(restored.snapshot(),first.snapshot());
 const replay=restored.batch(request());
 assert.equal(replay.replayed,true);
 assert.equal(restored.snapshot().state.revision,1);
 assert.equal(restored.snapshot().receipts.length,1);
});
test('tampering, wrong key, missing key and unexpected envelope kind reject restoration',()=>{
 const envelope=sealTransactionFixture(make(),key);
 for(const corrupt of [
  {...envelope,payload:envelope.payload.slice(0,-1)+(envelope.payload.endsWith('A')?'B':'A')},
  {...envelope,mac:'0'.repeat(64)},
  {...envelope,version:2}
 ]) assert.throws(()=>restoreSealedTransactionFixture(fixtures(),corrupt,key));
 assert.throws(()=>restoreSealedTransactionFixture(fixtures(),envelope,wrongKey));
 assert.throws(()=>restoreSealedTransactionFixture(fixtures(),envelope,'short'));
 const foreign=sealFixtureAudit({kind:'another-component',snapshot:make().snapshot()},key);
 assert.throws(()=>restoreSealedTransactionFixture(fixtures(),foreign,key));
});
test('independently maintained revision floor rejects old valid signed snapshot',()=>{
 const original=make(),old=sealTransactionFixture(original,key);
 original.batch({key:'request_002',expectedRevision:1,operations:[
  {type:'submit',sessionId:'session_other',vendorSlug:'vendor-other',
   id:'item_002',recordType:'listing',title:'Other vendor garment'}
 ]});
 assert.equal(original.snapshot().state.revision,2);
 assert.throws(()=>restoreSealedTransactionFixture(fixtures(),old,key,{minimumRevision:2}));
 const current=sealTransactionFixture(original,key);
 assert.equal(restoreSealedTransactionFixture(fixtures(),current,key,{minimumRevision:2}).snapshot().state.revision,2);
});
test('restored access boundaries prevent other vendor from reading saved listing',()=>{
 const restored=restoreSealedTransactionFixture(fixtures(),sealTransactionFixture(make(),key),key,{minimumRevision:1});
 assert.throws(()=>restored.read({sessionId:'session_other',id:'item_001'}));
 assert.equal(restored.read({sessionId:'session_owner',id:'item_001'}).status,'pending');
 assert.throws(()=>restored.batch({key:'request_003',expectedRevision:1,operations:[
  {type:'submit',sessionId:'session_other',vendorSlug:'vendor-first',
   id:'item_003',recordType:'listing',title:'Unauthorized'}
 ]}));
 assert.equal(restored.snapshot().state.revision,1);
});
test('signed but inconsistent receipt snapshot fails validated restoration',()=>{
 const store=make(),state=store.snapshot();
 state.receipts[0].result[0].id='forged_001';
 const signedInvalid=sealFixtureAudit({kind:'gim-transaction-fixture-v1',snapshot:state},key);
 assert.throws(()=>restoreSealedTransactionFixture(fixtures(),signedInvalid,key,{minimumRevision:1}));
});
test('invalid revision floor and restoration config cannot bypass trusted boundary',()=>{
 const envelope=sealTransactionFixture(make(),key);
 for(const floor of [-1,1.2,NaN,null,'1']) {
  assert.throws(()=>restoreSealedTransactionFixture(fixtures(),envelope,key,{minimumRevision:floor}));
 }
 assert.throws(()=>restoreSealedTransactionFixture({...fixtures(),savedState:make().snapshot()},envelope,key));
 assert.throws(()=>restoreSealedTransactionFixture({...fixtures(),minimumRevision:0},envelope,key));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createFixtureAccessLedger} from './vendor-access-ledger.mjs';
import {sealAccessLedger} from './vendor-access-chain.mjs';
import {sealFixtureAudit} from './vendor-audit-envelope.mjs';
import {checkpointAccessLedger,restoreCheckpointedAccessLedger} from './vendor-access-checkpoint.mjs';

const key='fixture-only-checkpoint-key-with-adequate-length-0001';
const fixtures=()=>({
 users:[{id:'owner_001',role:'user',active:true},
  {id:'owner_002',role:'user',active:true},
  {id:'manager_001',role:'user',active:true},
  {id:'mod_001',role:'platform_moderator',active:true}],
 sessions:[{id:'session_owner',userId:'owner_001'},
  {id:'session_other',userId:'owner_002'},
  {id:'session_manager',userId:'manager_001'},
  {id:'session_mod',userId:'mod_001'}],
 vendors:[{slug:'first-vendor',ownerId:'owner_001',status:'approved'},
  {slug:'other-vendor',ownerId:'owner_002',status:'approved'}],
 memberships:[{userId:'owner_001',vendorSlug:'first-vendor',role:'owner',active:true},
  {userId:'manager_001',vendorSlug:'first-vendor',role:'manager',active:true},
  {userId:'owner_002',vendorSlug:'other-vendor',role:'owner',active:true}]
});
const submit=(keyId,id,sessionId='session_manager',vendorSlug='first-vendor',expectedRevision=0)=>({
 key:keyId,expectedRevision,operations:[{type:'submit',id,sessionId,vendorSlug,
 recordType:'listing',title:'Fictional merchandise'}]
});
const change=(action,approvalEvidence=false)=>({
 sessionId:'session_mod',targetId:'manager_001',action,
 vendorSlug:['suspend','reactivate'].includes(action)?null:'first-vendor',
 approvalEvidence
});
const ready=()=>{
 const store=createFixtureAccessLedger(fixtures());
 store.batch(submit('batch_001','item_001'));
 store.change(change('demote'));
 return store;
};

test('independent policy and transaction checkpoint restores valid signed fixture',()=>{
 const store=ready(),checkpoint=checkpointAccessLedger(store),signed=sealAccessLedger(store,key);
 const restored=restoreCheckpointedAccessLedger(fixtures(),signed,key,checkpoint);
 assert.deepEqual(restored.snapshot(),store.snapshot());
 assert.throws(()=>restored.read({sessionId:'session_manager',id:'item_001'}));
 assert.equal(restored.read({sessionId:'session_owner',id:'item_001'}).vendorSlug,'first-vendor');
});
test('correctly signed stale snapshot is rejected by newer transaction checkpoint',()=>{
 const store=ready(),old=sealAccessLedger(store,key);
 store.batch(submit('batch_002','item_002','session_other','other-vendor',1));
 const checkpoint=checkpointAccessLedger(store);
 assert.throws(()=>restoreCheckpointedAccessLedger(fixtures(),old,key,checkpoint));
 assert.deepEqual(restoreCheckpointedAccessLedger(fixtures(),sealAccessLedger(store,key),key,checkpoint).snapshot(),store.snapshot());
});
test('policy-only privilege restoration changes trusted policy head',()=>{
 const store=ready(),old=sealAccessLedger(store,key);
 store.change(change('restore-manager',true));
 const checkpoint=checkpointAccessLedger(store);
 assert.throws(()=>restoreCheckpointedAccessLedger(fixtures(),old,key,checkpoint));
 const result=restoreCheckpointedAccessLedger(fixtures(),sealAccessLedger(store,key),key,checkpoint);
 assert.equal(result.snapshot().version,2);
});
test('re-signed forged transaction receipt fails independent digest check',()=>{
 const store=ready(),state=store.snapshot(),checkpoint=checkpointAccessLedger(store);
 state.transactions.receipts[0].result[0].title='Forged title';
 const forged=sealFixtureAudit({
  kind:'gim-access-ledger-chain-v1',snapshot:state,
  chain:{events:[],head:'0'.repeat(64)}
 },key);
 assert.throws(()=>restoreCheckpointedAccessLedger(fixtures(),forged,key,checkpoint));
});
test('checkpoint fields cannot be omitted, malformed, or changed without rejection',()=>{
 const store=ready(),checkpoint=checkpointAccessLedger(store),signed=sealAccessLedger(store,key);
 for(const altered of [
  {...checkpoint,transactionDigest:'0'.repeat(64)},
  {...checkpoint,policyHead:'0'.repeat(64)},
  {...checkpoint,baselineHash:'0'.repeat(64)},
  {...checkpoint,transactionRevision:checkpoint.transactionRevision+1},
  {...checkpoint,policyVersion:checkpoint.policyVersion+1},
  {...checkpoint,extra:'unexpected'},
  {...checkpoint,transactionDigest:'bad'}
 ]) assert.throws(()=>restoreCheckpointedAccessLedger(fixtures(),signed,key,altered));
});
test('checkpointed recovery still forbids cross-vendor reads and submissions',()=>{
 const store=ready();
 const restored=restoreCheckpointedAccessLedger(fixtures(),
  sealAccessLedger(store,key),key,checkpointAccessLedger(store));
 assert.throws(()=>restored.read({sessionId:'session_other',id:'item_001'}));
 assert.throws(()=>restored.batch(submit('batch_002','item_002','session_other','first-vendor',1)));
 assert.equal(restored.batch(submit('batch_003','item_003','session_other','other-vendor',1)).revision,2);
});

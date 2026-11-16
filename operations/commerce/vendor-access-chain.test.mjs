import test from 'node:test';
import assert from 'node:assert/strict';
import {createFixtureAccessLedger} from './vendor-access-ledger.mjs';
import {chainPolicyEvents,sealAccessLedger,restoreSealedAccessLedger} from './vendor-access-chain.mjs';
import {sealFixtureAudit,openFixtureAudit} from './vendor-audit-envelope.mjs';

const key='test-only-fake-signing-key-for-policy-chain-001';
const otherKey='test-only-fake-signing-key-for-policy-chain-002';
const fixtures=()=>({
 users:[{id:'owner_001',role:'user',active:true},
  {id:'owner_002',role:'user',active:true},{id:'manager_001',role:'user',active:true},
  {id:'moderator_001',role:'platform_moderator',active:true}],
 sessions:[{id:'session_owner',userId:'owner_001'},{id:'session_other',userId:'owner_002'},
  {id:'session_manager',userId:'manager_001'},{id:'session_mod',userId:'moderator_001'}],
 vendors:[{slug:'vendor-first',ownerId:'owner_001',status:'approved'},
  {slug:'vendor-other',ownerId:'owner_002',status:'approved'}],
 memberships:[{userId:'owner_001',vendorSlug:'vendor-first',role:'owner',active:true},
  {userId:'manager_001',vendorSlug:'vendor-first',role:'manager',active:true},
  {userId:'owner_002',vendorSlug:'vendor-other',role:'owner',active:true}]
});
const policy=(action,approved=false)=>({
 sessionId:'session_mod',action,targetId:'manager_001',
 vendorSlug:['suspend','reactivate'].includes(action)?null:'vendor-first',approvalEvidence:approved
});
const submit=(keyId,id,sessionId='session_manager',vendorSlug='vendor-first',expectedRevision=0)=>({
 key:keyId,expectedRevision,operations:[{type:'submit',id,vendorSlug,sessionId,
  recordType:'listing',title:'Fictional merchandise'}]
});
const ready=()=>{
 const ledger=createFixtureAccessLedger(fixtures());
 ledger.batch(submit('batch_001','item_001'));
 ledger.change(policy('demote'));
 ledger.change(policy('restore-manager',true));
 return ledger;
};

test('signed chained policy history restores unchanged authorized records',()=>{
 const original=ready();
 const signed=sealAccessLedger(original,key);
 const head=chainPolicyEvents(original.snapshot()).head;
 const restored=restoreSealedAccessLedger(fixtures(),signed,key,{
  expectedHead:head,minimumPolicyVersion:2,minimumTransactionRevision:1
 });
 assert.deepEqual(restored.snapshot(),original.snapshot());
 assert.equal(restored.read({sessionId:'session_owner',id:'item_001'}).status,'pending');
 assert.equal(restored.batch(submit('batch_001','item_001')).replayed,true);
});
test('chain sequence records previous hash and changes on privilege transitions',()=>{
 const ledger=createFixtureAccessLedger(fixtures());
 const genesis=chainPolicyEvents(ledger.snapshot());
 ledger.change(policy('demote'));
 const once=chainPolicyEvents(ledger.snapshot());
 ledger.change(policy('restore-manager',true));
 const twice=chainPolicyEvents(ledger.snapshot());
 assert.notEqual(genesis.head,once.head);
 assert.notEqual(once.head,twice.head);
 assert.equal(twice.events[1].previous,twice.events[0].hash);
 assert.equal(twice.head,twice.events[1].hash);
});
test('altered signed payload and incorrect signing key reject recovery',()=>{
 const signed=sealAccessLedger(ready(),key);
 assert.throws(()=>restoreSealedAccessLedger(fixtures(),signed,otherKey));
 assert.throws(()=>restoreSealedAccessLedger(fixtures(),{
  ...signed,mac:'0'.repeat(64)
 },key));
 assert.throws(()=>restoreSealedAccessLedger(fixtures(),{
  ...signed,version:2
 },key));
});
test('re-signed but mismatched event-chain metadata is rejected',()=>{
 const signed=sealAccessLedger(ready(),key);
 const decoded=openFixtureAudit(signed,key);
 for(const corrupted of [
  {...decoded,chain:{...decoded.chain,head:'0'.repeat(64)}},
  {...decoded,chain:{...decoded.chain,events:[...decoded.chain.events].reverse()}},
  {...decoded,chain:{...decoded.chain,events:decoded.chain.events.slice(0,1)}}
 ]){
  assert.throws(()=>restoreSealedAccessLedger(fixtures(),sealFixtureAudit(corrupted,key),key));
 }
});
test('fraudulent restored manager privileges cannot bypass full signed history validation',()=>{
 const state=ready().snapshot();
 const altered=structuredClone(state);
 altered.memberships=altered.memberships.map(m=>m.userId==='manager_001'?{...m,role:'owner'}:m);
 const signed=sealFixtureAudit({kind:'gim-access-ledger-chain-v1',snapshot:altered,chain:chainPolicyEvents(altered)},key);
 assert.throws(()=>restoreSealedAccessLedger(fixtures(),signed,key));
});
test('forged restoration event cannot create privilege escalation',()=>{
 const altered=ready().snapshot();
 altered.history[1].moderatorId='owner_001';
 const signed=sealFixtureAudit({kind:'gim-access-ledger-chain-v1',snapshot:altered,chain:chainPolicyEvents(altered)},key);
 assert.throws(()=>restoreSealedAccessLedger(fixtures(),signed,key));
});
test('trusted policy head and revision floors stop old signed rollback',()=>{
 const ledger=ready();
 const before=sealAccessLedger(ledger,key);
 ledger.change(policy('suspend'));
 const now=ledger.snapshot(),head=chainPolicyEvents(now).head;
 assert.throws(()=>restoreSealedAccessLedger(fixtures(),before,key,{expectedHead:head}));
 assert.throws(()=>restoreSealedAccessLedger(fixtures(),before,key,{minimumPolicyVersion:3}));
 assert.deepEqual(restoreSealedAccessLedger(fixtures(),sealAccessLedger(ledger,key),key,{
  expectedHead:head,minimumPolicyVersion:3,minimumTransactionRevision:1
 }).snapshot(),now);
});
test('signed restoration preserves tenant isolation after membership revocation',()=>{
 const ledger=ready();
 ledger.change(policy('revoke-membership'));
 const saved=sealAccessLedger(ledger,key);
 const restored=restoreSealedAccessLedger(fixtures(),saved,key,{minimumPolicyVersion:3,minimumTransactionRevision:1});
 assert.throws(()=>restored.read({sessionId:'session_manager',id:'item_001'}));
 assert.throws(()=>restored.batch(submit('batch_001','item_001')));
 assert.equal(restored.batch(submit('other_batch','item_002','session_other','vendor-other',1)).revision,2);
 assert.throws(()=>restored.read({sessionId:'session_owner',id:'item_002'}));
});
test('unauthorized multi-vendor update never mutates the signed policy or transaction history',()=>{
 const ledger=ready(),before=ledger.snapshot();
 assert.throws(()=>ledger.batch({key:'bad_batch',expectedRevision:1,operations:[
  submit('unused','item_003','session_other','vendor-other').operations[0],
  submit('unused','item_004','session_manager','vendor-other').operations[0]
 ]}));
 assert.deepEqual(ledger.snapshot(),before);
 const signed=sealAccessLedger(ledger,key);
 assert.deepEqual(restoreSealedAccessLedger(fixtures(),signed,key,{minimumPolicyVersion:2,minimumTransactionRevision:1}).snapshot(),before);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createFixtureAccessLedger} from './vendor-access-ledger.mjs';
import {sealAccessLedger} from './vendor-access-chain.mjs';
import {createFixtureCheckpointJournal} from './vendor-checkpoint-journal.mjs';
import {pinJournal,openPinnedJournal,appendPinnedCheckpoint,recoverPinnedLedger} from './vendor-journal-pin.mjs';
const secret='fictional-journal-pinning-key-1234567890';
const fixtures=()=>({
 users:[{id:'owner_001',role:'user',active:true},{id:'owner_002',role:'user',active:true},
  {id:'manager_001',role:'user',active:true},{id:'moderator_001',role:'platform_moderator',active:true}],
 sessions:[{id:'session_owner',userId:'owner_001'},{id:'session_other',userId:'owner_002'},
  {id:'session_manager',userId:'manager_001'},{id:'session_mod',userId:'moderator_001'}],
 vendors:[{slug:'first-vendor',ownerId:'owner_001',status:'approved'},
  {slug:'other-vendor',ownerId:'owner_002',status:'approved'}],
 memberships:[{userId:'owner_001',vendorSlug:'first-vendor',role:'owner',active:true},
  {userId:'manager_001',vendorSlug:'first-vendor',role:'manager',active:true},
  {userId:'owner_002',vendorSlug:'other-vendor',role:'owner',active:true}]
});
const submit=(key,id,sessionId='session_manager',vendorSlug='first-vendor',revision=0)=>({
 key,expectedRevision:revision,operations:[{type:'submit',sessionId,vendorSlug,
  id,recordType:'listing',title:'Fictional stock'}]
});
const policy=action=>({sessionId:'session_mod',action,targetId:'manager_001',vendorSlug:'first-vendor'});
const initial=()=>{
 const ledger=createFixtureAccessLedger(fixtures());
 ledger.batch(submit('first_batch','listing_001'));
 return ledger;
};
test('pinned journal reopens unchanged after simulated restart and recovers exact state',()=>{
 const ledger=initial(),journal=createFixtureCheckpointJournal();
 journal.append(ledger);
 const saved=journal.snapshot(),pin=pinJournal(journal);
 assert.deepEqual(openPinnedJournal(saved,pin).snapshot(),saved);
 assert.deepEqual(recoverPinnedLedger(fixtures(),sealAccessLedger(ledger,secret),secret,saved,pin).snapshot(),ledger.snapshot());
});
test('policy-only advancement can extend the independently pinned journal',()=>{
 const ledger=initial(),journal=createFixtureCheckpointJournal();journal.append(ledger);
 const pin=pinJournal(journal),saved=journal.snapshot();
 ledger.change(policy('demote'));
 const next=appendPinnedCheckpoint(saved,pin,ledger);
 assert.equal(next.pin.policyVersion,pin.policyVersion+1);
 assert.equal(next.pin.transactionRevision,pin.transactionRevision);
 assert.equal(next.pin.index,pin.index+1);
 assert.equal(openPinnedJournal(next.journal,next.pin).head(),next.pin.head);
 assert.throws(()=>openPinnedJournal(next.journal,pin));
});
test('transaction-only advancement can extend the independently pinned journal',()=>{
 const ledger=initial(),journal=createFixtureCheckpointJournal();journal.append(ledger);
 const pin=pinJournal(journal),saved=journal.snapshot();
 ledger.batch(submit('second_batch','listing_002','session_other','other-vendor',1));
 const next=appendPinnedCheckpoint(saved,pin,ledger);
 assert.equal(next.pin.policyVersion,pin.policyVersion);
 assert.equal(next.pin.transactionRevision,pin.transactionRevision+1);
 assert.notEqual(next.pin.head,pin.head);
});
test('forked authorization histories cannot replace a pinned journal even if their chain validates',()=>{
 const ledger=initial(),journal=createFixtureCheckpointJournal();journal.append(ledger);
 const original=journal.snapshot(),pin=pinJournal(journal);
 ledger.change(policy('demote'));journal.append(ledger);
 const fork=createFixtureCheckpointJournal({savedJournal:original});
 const other=initial();
 other.change(policy('revoke-membership'));fork.append(other);
 assert.notEqual(fork.head(),journal.head());
 assert.throws(()=>openPinnedJournal(fork.snapshot(),pinJournal(journal)));
 assert.equal(openPinnedJournal(journal.snapshot(),pinJournal(journal)).head(),journal.head());
});
test('old saved history cannot replace later independent pin',()=>{
 const ledger=initial(),journal=createFixtureCheckpointJournal();journal.append(ledger);
 const stale=journal.snapshot();
 ledger.change(policy('demote'));journal.append(ledger);
 assert.throws(()=>openPinnedJournal(stale,pinJournal(journal)));
 assert.throws(()=>recoverPinnedLedger(fixtures(),sealAccessLedger(ledger,secret),secret,stale,pinJournal(journal)));
});
test('a stale trusted pin cannot append over a newer persisted journal',()=>{
 const ledger=initial(),journal=createFixtureCheckpointJournal();journal.append(ledger);
 const old=pinJournal(journal);
 ledger.change(policy('demote'));journal.append(ledger);
 const before=journal.snapshot();
 assert.throws(()=>appendPinnedCheckpoint(before,old,ledger));
 assert.deepEqual(journal.snapshot(),before);
});
test('forged or malformed pins fail without revealing tenant data',()=>{
 const ledger=initial(),journal=createFixtureCheckpointJournal();journal.append(ledger);
 const saved=journal.snapshot(),pin=pinJournal(journal);
 for(const bad of [
  {...pin,head:'0'.repeat(64)}, {...pin,baselineHash:'0'.repeat(64)},
  {...pin,index:0}, {...pin,policyVersion:999}, {...pin,transactionRevision:999},
  {...pin,head:'bad'}, {...pin,unexpected:true},null
 ]) assert.throws(()=>openPinnedJournal(saved,bad));
});
test('pinned recovery enforces tenant boundaries after independent policy and transaction advances',()=>{
 const ledger=initial(),journal=createFixtureCheckpointJournal();journal.append(ledger);
 let state=appendPinnedCheckpoint(journal.snapshot(),pinJournal(journal),
  (ledger.change(policy('revoke-membership')),ledger));
 ledger.batch(submit('other_batch','listing_002','session_other','other-vendor',1));
 state=appendPinnedCheckpoint(state.journal,state.pin,ledger);
 const recovered=recoverPinnedLedger(fixtures(),sealAccessLedger(ledger,secret),secret,state.journal,state.pin);
 assert.throws(()=>recovered.read({sessionId:'session_manager',id:'listing_001'}));
 assert.throws(()=>recovered.read({sessionId:'session_owner',id:'listing_002'}));
 assert.equal(recovered.read({sessionId:'session_other',id:'listing_002'}).vendorSlug,'other-vendor');
});

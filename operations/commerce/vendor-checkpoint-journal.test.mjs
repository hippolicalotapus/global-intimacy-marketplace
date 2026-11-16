import test from 'node:test';
import assert from 'node:assert/strict';
import {createFixtureAccessLedger} from './vendor-access-ledger.mjs';
import {sealAccessLedger} from './vendor-access-chain.mjs';
import {createFixtureCheckpointJournal} from './vendor-checkpoint-journal.mjs';
const secret='fictional-journal-key-12345678901234567890';
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
const policy=(action,approved=false)=>({sessionId:'session_mod',action,targetId:'manager_001',
 vendorSlug:['suspend','reactivate'].includes(action)?null:'first-vendor',approvalEvidence:approved});
const submit=(key,id,sessionId='session_manager',vendorSlug='first-vendor',revision=0)=>({
 key,expectedRevision:revision,operations:[{type:'submit',sessionId,vendorSlug,id,recordType:'listing',title:'Fictional apparel'}]
});
const initial=()=>{const l=createFixtureAccessLedger(fixtures());l.batch(submit('batch_one','listing_001'));return l;};

test('journal retains versioned policy and transaction checkpoints and recovers latest',()=>{
 const ledger=initial(),journal=createFixtureCheckpointJournal();
 const first=journal.append(ledger,{expectedHead:journal.head()});
 ledger.change(policy('demote'));
 const second=journal.append(ledger,{expectedHead:first.hash});
 ledger.batch(submit('batch_two','listing_002','session_other','other-vendor',1));
 const third=journal.append(ledger,{expectedHead:second.hash});
 assert.equal(third.index,3);
 assert.equal(third.previous,second.hash);
 const restored=createFixtureCheckpointJournal({savedJournal:journal.snapshot()});
 assert.equal(restored.head(),third.hash);
 assert.deepEqual(restored.recover(fixtures(),sealAccessLedger(ledger,secret),secret).snapshot(),ledger.snapshot());
});
test('journal rejects rollback even when old signed snapshot remains valid',()=>{
 const ledger=initial(),journal=createFixtureCheckpointJournal();
 journal.append(ledger);
 const old=sealAccessLedger(ledger,secret);
 ledger.change(policy('demote'));
 journal.append(ledger);
 assert.throws(()=>journal.recover(fixtures(),old,secret));
 assert.equal(journal.recover(fixtures(),sealAccessLedger(ledger,secret),secret).snapshot().version,1);
});
test('competing writers with a stale journal head cannot both append',()=>{
 const ledger=initial(),journal=createFixtureCheckpointJournal(),old=journal.head();
 journal.append(ledger,{expectedHead:old});
 ledger.change(policy('demote'));
 const before=journal.snapshot();
 assert.throws(()=>journal.append(ledger,{expectedHead:old}));
 assert.deepEqual(journal.snapshot(),before);
 assert.equal(journal.append(ledger,{expectedHead:journal.head()}).index,2);
});
test('repeated checkpoint with no state advancement is rejected',()=>{
 const ledger=initial(),journal=createFixtureCheckpointJournal();
 journal.append(ledger);
 const before=journal.snapshot();
 assert.throws(()=>journal.append(ledger));
 assert.deepEqual(journal.snapshot(),before);
});
test('conflicting restored policy heads for same policy version are rejected',()=>{
 const ledger=initial(),journal=createFixtureCheckpointJournal();
 journal.append(ledger);
 const altered=journal.snapshot();
 altered[0].checkpoint.policyHead='0'.repeat(64);
 assert.throws(()=>createFixtureCheckpointJournal({savedJournal:altered}));
});
test('reordering, deletion and tampering in saved checkpoint history fail validation',()=>{
 const ledger=initial(),journal=createFixtureCheckpointJournal();
 journal.append(ledger);
 ledger.change(policy('demote'));
 journal.append(ledger);
 const saved=journal.snapshot();
 for(const altered of [
  [saved[1],saved[0]],
  [{...saved[0],hash:'0'.repeat(64)},saved[1]],
  [saved[0],{...saved[1],previous:'0'.repeat(64)}],
  [saved[0],{...saved[1],index:1}],
  [saved[0],{...saved[1],checkpoint:{...saved[1].checkpoint,transactionRevision:0}}],
  [saved[0],{...saved[1],checkpoint:{...saved[1].checkpoint,baselineHash:'0'.repeat(64)}}]
 ]) assert.throws(()=>createFixtureCheckpointJournal({savedJournal:altered}));
});
test('recovered multi-vendor records remain isolated after policy transition',()=>{
 const ledger=initial(),journal=createFixtureCheckpointJournal();
 journal.append(ledger);
 ledger.change(policy('revoke-membership'));
 ledger.batch(submit('other_batch','listing_002','session_other','other-vendor',1));
 journal.append(ledger);
 const recovered=journal.recover(fixtures(),sealAccessLedger(ledger,secret),secret);
 assert.throws(()=>recovered.read({sessionId:'session_manager',id:'listing_001'}));
 assert.throws(()=>recovered.read({sessionId:'session_owner',id:'listing_002'}));
 assert.equal(recovered.read({sessionId:'session_other',id:'listing_002'}).vendorSlug,'other-vendor');
});
test('checkpoint input mutation cannot alter committed journal',()=>{
 const ledger=initial(),journal=createFixtureCheckpointJournal();
 const entry=journal.append(ledger);
 entry.checkpoint.policyVersion=999;
 const snapshot=journal.snapshot();
 assert.equal(snapshot[0].checkpoint.policyVersion,0);
 snapshot[0].checkpoint.policyVersion=1000;
 assert.equal(journal.snapshot()[0].checkpoint.policyVersion,0);
});

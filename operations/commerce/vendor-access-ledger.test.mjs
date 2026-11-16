import test from 'node:test';
import assert from 'node:assert/strict';
import {createFixtureAccessLedger} from './vendor-access-ledger.mjs';

const config=()=>({
 users:[{id:'owner_001',role:'user',active:true},
  {id:'owner_002',role:'user',active:true},
  {id:'manager_001',role:'user',active:true},
  {id:'moderator_001',role:'platform_moderator',active:true},
  {id:'outsider_001',role:'user',active:true}],
 sessions:[{id:'session_owner',userId:'owner_001'},
  {id:'session_other',userId:'owner_002'},
  {id:'session_manager',userId:'manager_001'},
  {id:'session_moderator',userId:'moderator_001'},
  {id:'session_outsider',userId:'outsider_001'}],
 vendors:[{slug:'first-vendor',ownerId:'owner_001',status:'approved'},
  {slug:'second-vendor',ownerId:'owner_002',status:'approved'}],
 memberships:[{userId:'owner_001',vendorSlug:'first-vendor',role:'owner',active:true},
  {userId:'manager_001',vendorSlug:'first-vendor',role:'manager',active:true},
  {userId:'owner_002',vendorSlug:'second-vendor',role:'owner',active:true}]
});
const submit=(key='batch_001',id='listing_001',sessionId='session_manager',vendorSlug='first-vendor',rev=0)=>({
 key,expectedRevision:rev,operations:[{type:'submit',sessionId,vendorSlug,
 id,recordType:'listing',title:'Fictional catalog item'}]
});
const policy=(action,approvalEvidence=false)=>({
 sessionId:'session_moderator',action,targetId:'manager_001',
 vendorSlug:action==='suspend'||action==='reactivate'?null:'first-vendor',approvalEvidence
});
const start=()=>{
 const ledger=createFixtureAccessLedger(config());
 ledger.batch(submit());
 return ledger;
};

test('suspended account loses access while historical submission provenance remains',()=>{
 const ledger=start();
 const before=ledger.snapshot().transactions;
 const event=ledger.change(policy('suspend'));
 assert.equal(event.moderatorId,'moderator_001');
 assert.deepEqual(event.before,{active:true});
 assert.deepEqual(event.after,{active:false});
 assert.deepEqual(ledger.snapshot().transactions,before);
 assert.throws(()=>ledger.read({sessionId:'session_manager',id:'listing_001'}));
 assert.throws(()=>ledger.batch(submit()));
 assert.equal(ledger.read({sessionId:'session_owner',id:'listing_001'}).submittedBy,'manager_001');
});
test('account reactivation requires explicit approval and records both transitions',()=>{
 const ledger=start();
 ledger.change(policy('suspend'));
 const prior=ledger.snapshot();
 assert.throws(()=>ledger.change(policy('reactivate')));
 assert.deepEqual(ledger.snapshot(),prior);
 ledger.change(policy('reactivate',true));
 assert.equal(ledger.snapshot().version,2);
 assert.deepEqual(ledger.snapshot().history.map(e=>e.action),['suspend','reactivate']);
 assert.equal(ledger.batch(submit()).replayed,true);
 assert.equal(ledger.batch(submit('batch_002','listing_002','session_manager','first-vendor',1)).revision,2);
});
test('revoked membership cannot read, replay or submit but another tenant remains active',()=>{
 const ledger=start();
 ledger.change(policy('revoke-membership'));
 assert.throws(()=>ledger.batch(submit()));
 assert.throws(()=>ledger.read({sessionId:'session_manager',id:'listing_001'}));
 assert.equal(ledger.batch(submit('other_001','other_item','session_other','second-vendor',1)).revision,2);
 assert.throws(()=>ledger.read({sessionId:'session_owner',id:'other_item'}));
});
test('role demotion and approved restoration produce auditable permission transitions',()=>{
 const ledger=start();
 ledger.change(policy('demote'));
 assert.throws(()=>ledger.batch(submit()));
 assert.throws(()=>ledger.change(policy('restore-manager')));
 ledger.change(policy('restore-manager',true));
 assert.equal(ledger.snapshot().version,2);
 assert.equal(ledger.batch(submit()).replayed,true);
 assert.deepEqual(ledger.snapshot().history.map(x=>x.action),['demote','restore-manager']);
});
test('forged moderator and unauthorized member changes fail with no events',()=>{
 const ledger=createFixtureAccessLedger(config());
 const initial=ledger.snapshot();
 for(const req of [
  {...policy('suspend'),sessionId:'session_owner'},
  {...policy('suspend'),sessionId:'session_outsider'},
  {...policy('demote'),targetId:'owner_001'},
  {...policy('demote'),vendorSlug:'second-vendor'},
  {...policy('restore-manager',true),targetId:'outsider_001'},
  {...policy('unsupported')},
  {...policy('suspend'),targetId:'moderator_001'}
 ]) assert.throws(()=>ledger.change(req));
 assert.deepEqual(ledger.snapshot(),initial);
});
test('restoration replays historical policy provenance without granting new privileges',()=>{
 const ledger=start();
 ledger.change(policy('demote'));
 ledger.change(policy('restore-manager',true));
 ledger.change(policy('suspend'));
 const snapshot=ledger.snapshot();
 const restored=createFixtureAccessLedger({...config(),savedState:snapshot,
  minimumPolicyVersion:3,minimumTransactionRevision:1});
 assert.deepEqual(restored.snapshot(),snapshot);
 assert.throws(()=>restored.batch(submit()));
 assert.throws(()=>restored.read({sessionId:'session_manager',id:'listing_001'}));
 assert.equal(restored.read({sessionId:'session_owner',id:'listing_001'}).status,'pending');
});
test('restoration rejects forged policy identities, missing events and unauthorized escalation',()=>{
 const ledger=start();
 ledger.change(policy('demote'));
 ledger.change(policy('restore-manager',true));
 const state=ledger.snapshot();
 const invalid=[
  {...state,history:state.history.slice(0,1),version:1},
  {...state,history:state.history.map((e,i)=>i===1?{...e,moderatorId:'owner_001'}:e)},
  {...state,history:state.history.map((e,i)=>i===1?{...e,approved:false}:e)},
  {...state,history:state.history.map((e,i)=>i===1?{...e,version:1}:e)},
  {...state,memberships:state.memberships.map(m=>m.userId==='manager_001'?{...m,role:'owner'}:m)},
  {...state,accounts:state.accounts.map(a=>a.id==='manager_001'?{...a,role:'platform_moderator'}:a)},
  {...state,baselineHash:'0'.repeat(64)}
 ];
 for(const savedState of invalid)assert.throws(()=>createFixtureAccessLedger({...config(),savedState}));
});
test('trusted version and transaction floors block stale replay after recovery',()=>{
 const ledger=start();
 const old=ledger.snapshot();
 ledger.change(policy('suspend'));
 const current=ledger.snapshot();
 assert.throws(()=>createFixtureAccessLedger({...config(),savedState:old,minimumPolicyVersion:1}));
 assert.deepEqual(createFixtureAccessLedger({...config(),savedState:current,
  minimumPolicyVersion:1,minimumTransactionRevision:1}).snapshot(),current);
 assert.throws(()=>createFixtureAccessLedger({...config(),savedState:current,minimumTransactionRevision:2}));
});
test('failed mixed-vendor transaction is atomic during changed permissions',()=>{
 const ledger=start();
 ledger.change(policy('revoke-membership'));
 const before=ledger.snapshot();
 assert.throws(()=>ledger.batch({key:'batch_002',expectedRevision:1,operations:[
  submit('unused','listing_002','session_other','second-vendor').operations[0],
  submit('unused','listing_003','session_manager','first-vendor').operations[0]
 ]}));
 assert.deepEqual(ledger.snapshot(),before);
});

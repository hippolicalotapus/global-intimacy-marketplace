import test from 'node:test';
import assert from 'node:assert/strict';
import {createFixtureTransactionStore} from './vendor-transactions-fixture.mjs';
const fixtures=()=>({
 users:[
  {id:'owner_001',role:'user',active:true},
  {id:'owner_002',role:'user',active:true},
  {id:'manager_001',role:'user',active:true},
  {id:'mod_001',role:'platform_moderator',active:true},
  {id:'mod_002',role:'platform_moderator',active:true},
  {id:'outsider_001',role:'user',active:true}
 ],
 sessions:[
  {id:'token_owner',userId:'owner_001'},
  {id:'token_other',userId:'owner_002'},
  {id:'token_manager',userId:'manager_001'},
  {id:'token_mod1',userId:'mod_001'},
  {id:'token_mod2',userId:'mod_002'},
  {id:'token_outsider',userId:'outsider_001'}
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
const submit=(id='item_001',vendorSlug='first-vendor',sessionId='token_manager')=>({
 type:'submit',sessionId,vendorSlug,id,recordType:'listing',title:'Fictional garment'
});
const evidence={identityVerified:true,termsVerified:true,mediaRights:true,resaleRights:true,compliance:true};
const review=(id='item_001',sessionId='token_mod1',expectedVersion=1)=>({
 type:'review',sessionId,id,expectedVersion,decision:'approved',evidence
});

test('atomic batch submits and reviews with one consistent audit revision',()=>{
 const store=createFixtureTransactionStore(fixtures());
 const result=store.batch({key:'batch_001',expectedRevision:0,operations:[submit(),review()]});
 assert.equal(result.replayed,false);
 assert.equal(result.revision,2);
 assert.deepEqual(result.results.map(x=>x.status),['pending','approved']);
 assert.equal(store.read({sessionId:'token_owner',id:'item_001'}).status,'approved');
 assert.equal(store.snapshot().state.events.length,2);
});
test('a later failure rolls back earlier operations and leaves no receipt',()=>{
 const store=createFixtureTransactionStore(fixtures());
 const before=store.snapshot();
 assert.throws(()=>store.batch({key:'batch_002',expectedRevision:0,operations:[
  submit('item_002'),submit('item_002')
 ]}));
 assert.deepEqual(store.snapshot(),before);
 const success=store.batch({key:'batch_002',expectedRevision:0,operations:[submit('item_002')]});
 assert.equal(success.replayed,false);
 assert.equal(success.revision,1);
});
test('repeated matching idempotency request returns existing result without new commits',()=>{
 const store=createFixtureTransactionStore(fixtures());
 const request={key:'batch_003',expectedRevision:0,operations:[submit('item_003')]};
 const first=store.batch(request);
 const before=store.snapshot();
 const second=store.batch(request);
 assert.equal(second.replayed,true);
 assert.equal(second.revision,first.revision);
 assert.deepEqual(second.results,first.results);
 assert.deepEqual(store.snapshot(),before);
});
test('idempotency key with a different request fails closed',()=>{
 const store=createFixtureTransactionStore(fixtures());
 store.batch({key:'batch_004',expectedRevision:0,operations:[submit('item_004')]});
 const before=store.snapshot();
 assert.throws(()=>store.batch({key:'batch_004',expectedRevision:1,operations:[submit('item_005')]}));
 assert.deepEqual(store.snapshot(),before);
});
test('stale expected revision prevents competing batch overwrites',async()=>{
 const store=createFixtureTransactionStore(fixtures());
 const attempts=await Promise.allSettled([
  Promise.resolve().then(()=>store.batch({key:'batch_005',expectedRevision:0,operations:[submit('item_005')]})),
  Promise.resolve().then(()=>store.batch({key:'batch_006',expectedRevision:0,operations:[submit('item_006')]}))
 ]);
 assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(attempts.filter(x=>x.status==='rejected').length,1);
 assert.equal(store.snapshot().state.revision,1);
 assert.equal(store.snapshot().receipts.length,1);
});
test('cross-tenant submission attempt rolls back valid earlier operation',()=>{
 const store=createFixtureTransactionStore(fixtures());
 const before=store.snapshot();
 assert.throws(()=>store.batch({key:'batch_007',expectedRevision:0,operations:[
  submit('item_007'),
  submit('item_008','other-vendor','token_manager')
 ]}));
 assert.deepEqual(store.snapshot(),before);
 assert.throws(()=>store.read({sessionId:'token_other',id:'item_007'}));
});
test('restoration preserves idempotent receipts and rejects state rollback floor',()=>{
 const store=createFixtureTransactionStore(fixtures());
 const request={key:'batch_008',expectedRevision:0,operations:[submit('item_008'),review('item_008')]};
 const first=store.batch(request);
 const persisted=store.snapshot();
 const restored=createFixtureTransactionStore({...fixtures(),savedState:persisted,minimumRevision:2});
 assert.deepEqual(restored.snapshot(),persisted);
 assert.deepEqual(restored.batch(request).results,first.results);
 assert.equal(restored.snapshot().state.revision,2);
 assert.throws(()=>createFixtureTransactionStore({...fixtures(),savedState:persisted,minimumRevision:3}));
});
test('restored records retain tenant access boundaries and reject duplicate IDs',()=>{
 const store=createFixtureTransactionStore(fixtures());
 store.batch({key:'batch_009',expectedRevision:0,operations:[submit('item_009')]});
 const restarted=createFixtureTransactionStore({...fixtures(),savedState:store.snapshot(),minimumRevision:1});
 assert.throws(()=>restarted.read({sessionId:'token_other',id:'item_009'}));
 assert.throws(()=>restarted.batch({key:'batch_010',expectedRevision:1,operations:[submit('item_009','other-vendor','token_other')]}));
 assert.equal(restarted.snapshot().state.revision,1);
});
test('malformed batches and failed reviews cannot mutate the transaction store',()=>{
 const store=createFixtureTransactionStore(fixtures());
 const before=store.snapshot();
 for(const req of [
  {key:'../escape',expectedRevision:0,operations:[submit()]},
  {key:'batch_011',expectedRevision:0,operations:[]},
  {key:'batch_011',expectedRevision:0,operations:[{type:'delete'}]},
  {key:'batch_011',expectedRevision:0,operations:[submit(),review('item_001','token_owner')]},
  {key:'batch_011',expectedRevision:0,operations:[submit(),review('item_001','token_mod1',2)]},
  {key:'batch_011',expectedRevision:1,operations:[submit()]}
 ]) assert.throws(()=>store.batch(req));
 assert.deepEqual(store.snapshot(),before);
});

test('forged restored receipt results cannot rewrite status or review identity',()=>{
 const store=createFixtureTransactionStore(fixtures());
 store.batch({key:'receipt_001',expectedRevision:0,operations:[submit('receipt_item'),review('receipt_item')]});
 const saved=store.snapshot();
 const corruptions=[
  receipt=>{receipt.result[0].status='approved';},
  receipt=>{receipt.result[1].reviewedBy='owner_001';},
  receipt=>{receipt.result[1].id='other_item';},
  receipt=>{receipt.result[0].title='Altered garment';},
  receipt=>{receipt.result[1].version=1;}
 ];
 for(const corrupt of corruptions){
  const changed=structuredClone(saved);
  corrupt(changed.receipts[0]);
  assert.throws(()=>createFixtureTransactionStore({...fixtures(),savedState:changed,minimumRevision:2}));
 }
});
test('missing overlapping or forged receipt audit coverage fails restoration',()=>{
 const store=createFixtureTransactionStore(fixtures());
 store.batch({key:'receipt_002',expectedRevision:0,operations:[submit('receipt_two')]});
 store.batch({key:'receipt_003',expectedRevision:1,operations:[submit('receipt_three')]});
 const saved=store.snapshot();
 const invalid=[
  {...saved,receipts:[saved.receipts[0]]},
  {...saved,receipts:[saved.receipts[0],{...saved.receipts[0],key:'other_receipt'}]},
  {...saved,receipts:saved.receipts.map((r,i)=>i===1?{...r,revision:1}:r)},
  {...saved,receipts:saved.receipts.map((r,i)=>i===1?{...r,result:[]}:r)}
 ];
 for(const changed of invalid) assert.throws(()=>createFixtureTransactionStore({...fixtures(),savedState:changed,minimumRevision:2}));
});
test('valid restored receipts still replay without additional state changes',()=>{
 const store=createFixtureTransactionStore(fixtures());
 const request={key:'receipt_004',expectedRevision:0,operations:[submit('receipt_four'),review('receipt_four')]};
 store.batch(request);
 const saved=store.snapshot();
 const restarted=createFixtureTransactionStore({...fixtures(),savedState:saved,minimumRevision:2});
 assert.deepEqual(restarted.snapshot(),saved);
 assert.equal(restarted.batch(request).replayed,true);
 assert.deepEqual(restarted.snapshot(),saved);
 assert.throws(()=>restarted.read({sessionId:'token_other',id:'receipt_four'}));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createFixtureTransactionStore} from './vendor-transactions-fixture.mjs';
import {createFixtureKeyring} from './vendor-rotation-fixture.mjs';

const fixtures=()=>({
  users:[
    {id:'owner_001',role:'user',active:true},
    {id:'manager_001',role:'user',active:true},
    {id:'owner_002',role:'user',active:true},
    {id:'mod_001',role:'platform_moderator',active:true}
  ],
  sessions:[
    {id:'session_owner',userId:'owner_001'},
    {id:'session_manager',userId:'manager_001'},
    {id:'session_other',userId:'owner_002'},
    {id:'session_mod',userId:'mod_001'}
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
const submit=(id='listing_001',vendorSlug='first-vendor',sessionId='session_manager')=>({
  type:'submit',sessionId,vendorSlug,id,recordType:'listing',title:'Fictional apparel'
});
const evidence={identityVerified:true,termsVerified:true,mediaRights:true,resaleRights:true,compliance:true};
const review=(id='listing_001')=>({
  type:'review',sessionId:'session_mod',id,expectedVersion:1,decision:'approved',evidence
});
const draft=()=>{
  const store=createFixtureTransactionStore(fixtures());
  const request={key:'first_request',expectedRevision:0,operations:[submit()]};
  store.batch(request);
  return {store,request};
};
const keyring=()=>createFixtureKeyring({
  keys:[{id:'key_test',status:'active',secret:'fictional-key-only-for-access-change-tests-0001'}],
  activeKeyId:'key_test'
});
const restore=(saved,updated)=>createFixtureTransactionStore({...updated,savedState:saved,minimumRevision:saved.state.revision});

test('deactivated manager keeps historical record intact but cannot read, replay or submit',()=>{
  const {store,request}=draft(),previous=store.snapshot();
  const updated=fixtures();
  updated.users=updated.users.map(u=>u.id==='manager_001'?{...u,active:false}:u);
  const recovered=restore(previous,updated);
  assert.deepEqual(recovered.snapshot(),previous);
  assert.throws(()=>recovered.read({sessionId:'session_manager',id:'listing_001'}));
  assert.throws(()=>recovered.batch(request));
  assert.throws(()=>recovered.batch({key:'second_request',expectedRevision:1,operations:[submit('listing_002')]}));
  assert.equal(recovered.read({sessionId:'session_owner',id:'listing_001'}).status,'pending');
});

test('revoked membership preserves historical submissions while forbidding fresh actions and receipt replay',()=>{
  const {store,request}=draft(),previous=store.snapshot();
  const updated=fixtures();
  updated.memberships=updated.memberships.map(m=>m.userId==='manager_001'?{...m,active:false}:m);
  const recovered=restore(previous,updated);
  assert.deepEqual(recovered.snapshot(),previous);
  assert.throws(()=>recovered.batch(request));
  assert.throws(()=>recovered.read({sessionId:'session_manager',id:'listing_001'}));
  assert.throws(()=>recovered.batch({key:'second_request',expectedRevision:1,operations:[submit('listing_002')]}));
  assert.equal(recovered.read({sessionId:'session_owner',id:'listing_001'}).submittedBy,'manager_001');
});

test('manager demotion to viewer cannot resurrect old permissions after restart',()=>{
  const {store,request}=draft(),previous=store.snapshot();
  const updated=fixtures();
  updated.memberships=updated.memberships.map(m=>m.userId==='manager_001'?{...m,role:'viewer'}:m);
  const recovered=restore(previous,updated);
  assert.throws(()=>recovered.batch(request));
  assert.throws(()=>recovered.read({sessionId:'session_manager',id:'listing_001'}));
  assert.throws(()=>recovered.batch({key:'second_request',expectedRevision:1,operations:[submit('listing_002')]}));
  assert.equal(recovered.read({sessionId:'session_owner',id:'listing_001'}).status,'pending');
});

test('deactivated reviewer cannot replay prior approval receipt or authorize new review',()=>{
  const {store}=draft();
  const first={key:'review_request',expectedRevision:1,operations:[review()]};
  store.batch(first);
  const updated=fixtures();
  updated.users=updated.users.map(u=>u.id==='mod_001'?{...u,active:false}:u);
  const recovered=restore(store.snapshot(),updated);
  const before=recovered.snapshot();
  assert.throws(()=>recovered.batch(first));
  assert.throws(()=>recovered.batch({key:'new_review',expectedRevision:2,operations:[review()]}));
  assert.deepEqual(recovered.snapshot(),before);
});

test('revocation after signed recovery maintains other tenant operations',()=>{
  const {store}=draft();
  const updated=fixtures();
  updated.memberships=updated.memberships.map(m=>m.userId==='manager_001'?{...m,active:false}:m);
  const ring=keyring();
  const recovered=ring.restore(updated,ring.seal(store),{minimumRevision:1});
  assert.throws(()=>recovered.read({sessionId:'session_manager',id:'listing_001'}));
  const second={key:'other_request',expectedRevision:1,operations:[submit('listing_002','other-vendor','session_other')]};
  assert.equal(recovered.batch(second).revision,2);
  assert.throws(()=>recovered.read({sessionId:'session_owner',id:'listing_002'}));
  assert.equal(recovered.read({sessionId:'session_other',id:'listing_002'}).vendorSlug,'other-vendor');
});

test('external mutation of fixture objects cannot silently elevate authorization',()=>{
  const initial=fixtures();
  initial.memberships[1].role='viewer';
  const store=createFixtureTransactionStore(initial);
  initial.memberships[1].role='manager';
  initial.users[1].role='platform_moderator';
  initial.sessions[1].userId='owner_001';
  assert.throws(()=>store.batch({key:'stolen_request',expectedRevision:0,operations:[submit()]}));
  assert.deepEqual(store.snapshot(),{state:{revision:0,records:[],events:[]},receipts:[]});
});

test('failed mixed-tenant batch after membership revocation leaves no partial records',()=>{
  const {store}=draft(),prior=store.snapshot();
  const updated=fixtures();
  updated.memberships=updated.memberships.map(m=>m.userId==='manager_001'?{...m,active:false}:m);
  const recovered=restore(prior,updated),before=recovered.snapshot();
  assert.throws(()=>recovered.batch({key:'mixed_request',expectedRevision:1,operations:[
    submit('listing_003','other-vendor','session_other'),
    submit('listing_004','first-vendor','session_manager')
  ]}));
  assert.deepEqual(recovered.snapshot(),before);
  assert.throws(()=>recovered.read({sessionId:'session_other',id:'listing_003'}));
});

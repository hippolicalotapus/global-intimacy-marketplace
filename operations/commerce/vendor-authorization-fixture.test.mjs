import test from 'node:test';
import assert from 'node:assert/strict';
import {createFixtureAuthorizationAdapter} from './vendor-authorization-fixture.mjs';

const config=()=>({
  users:[
    {id:'owner_001',role:'user',active:true},
    {id:'manager_001',role:'user',active:true},
    {id:'owner_002',role:'user',active:true},
    {id:'moderator_001',role:'platform_moderator',active:true},
    {id:'moderator_002',role:'platform_moderator',active:false},
    {id:'outsider_001',role:'user',active:true}
  ],
  sessions:[
    {id:'session_owner',userId:'owner_001'},
    {id:'session_manager',userId:'manager_001'},
    {id:'session_other',userId:'owner_002'},
    {id:'session_mod',userId:'moderator_001'},
    {id:'session_inactive',userId:'moderator_002'},
    {id:'session_outsider',userId:'outsider_001'}
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
const evidence={identityVerified:true,termsVerified:true,mediaRights:true,resaleRights:true,compliance:true};
const draft=(store,id='entry_001',sessionId='session_manager')=>store.submit({sessionId,vendorSlug:'first-vendor',id,type:'listing',title:'Fixture garment'});

test('private session mapping ignores actor role and user spoof fields in requests',()=>{
  const store=createFixtureAuthorizationAdapter(config());
  assert.throws(()=>store.submit({sessionId:'session_outsider',vendorSlug:'first-vendor',id:'entry_001',type:'listing',title:'Fixture',role:'owner',userId:'owner_001'}));
  assert.throws(()=>store.review({sessionId:'session_owner',id:'entry_001',decision:'approved',evidence,role:'platform_moderator'}));
  assert.throws(()=>store.submit({sessionId:'forged_token',vendorSlug:'first-vendor',id:'entry_002',type:'listing',title:'Fixture'}));
  assert.throws(()=>store.submit({sessionId:'session_inactive',vendorSlug:'first-vendor',id:'entry_003',type:'listing',title:'Fixture'}));
});
test('tenant-scoped reads and edits reject unrelated user and vendor membership',()=>{
  const store=createFixtureAuthorizationAdapter(config());
  const entry=draft(store);
  assert.equal(entry.status,'pending');
  assert.throws(()=>store.recordFor({sessionId:'session_other',id:entry.id}));
  assert.throws(()=>store.recordFor({sessionId:'session_outsider',id:entry.id}));
  assert.throws(()=>store.submit({sessionId:'session_other',vendorSlug:'first-vendor',id:'entry_002',type:'listing',title:'Fixture'}));
  assert.equal(store.recordFor({sessionId:'session_owner',id:entry.id}).id,entry.id);
});
test('only an independent active moderator may approve with evidence',()=>{
  const store=createFixtureAuthorizationAdapter(config());
  const entry=draft(store);
  assert.throws(()=>store.review({sessionId:'session_owner',id:entry.id,decision:'approved',evidence}));
  assert.throws(()=>store.review({sessionId:'session_inactive',id:entry.id,decision:'approved',evidence}));
  assert.throws(()=>store.review({sessionId:'session_mod',id:entry.id,decision:'approved',evidence:{identityVerified:true,termsVerified:true}}));
  assert.equal(store.review({sessionId:'session_mod',id:entry.id,decision:'approved',evidence}).status,'approved');
});
test('review state transitions cannot be replayed or reversed',()=>{
  const store=createFixtureAuthorizationAdapter(config());
  const entry=draft(store);
  const approved=store.review({sessionId:'session_mod',id:entry.id,decision:'approved',evidence});
  assert.equal(approved.reviewedBy,'moderator_001');
  assert.throws(()=>store.review({sessionId:'session_mod',id:entry.id,decision:'rejected'}));
  assert.throws(()=>store.review({sessionId:'session_mod',id:entry.id,decision:'approved',evidence}));
  const rejected=draft(store,'entry_002');
  assert.equal(store.review({sessionId:'session_mod',id:rejected.id,decision:'rejected'}).status,'rejected');
  assert.throws(()=>store.review({sessionId:'session_mod',id:rejected.id,decision:'approved',evidence}));
});
test('audit snapshot can restore fictional records and retains review sequence',()=>{
  const store=createFixtureAuthorizationAdapter(config());
  draft(store);
  store.review({sessionId:'session_mod',id:'entry_001',decision:'approved',evidence});
  const before=store.snapshot();
  assert.equal(before.sequence,2);
  assert.deepEqual(before.history.map(e=>e.action),['submitted','approved']);
  const restored=createFixtureAuthorizationAdapter({...config(),savedState:before});
  assert.deepEqual(restored.snapshot(),before);
  assert.throws(()=>restored.review({sessionId:'session_mod',id:'entry_001',decision:'approved',evidence}));
  const more=draft(restored,'entry_002');
  assert.equal(more.status,'pending');
  assert.equal(restored.snapshot().sequence,3);
  before.records[0].title='Tampered outside';
  assert.notEqual(restored.recordFor({sessionId:'session_owner',id:'entry_001'}).title,'Tampered outside');
});
test('reject malicious titles, duplicate identities and malformed snapshots',()=>{
  const store=createFixtureAuthorizationAdapter(config());
  assert.throws(()=>store.submit({sessionId:'session_manager',vendorSlug:'first-vendor',id:'../escape',type:'listing',title:'Safe'}));
  assert.throws(()=>store.submit({sessionId:'session_manager',vendorSlug:'first-vendor',id:'entry_001',type:'listing',title:'<script>'}));
  draft(store);
  assert.throws(()=>draft(store));
  const bad=config();bad.sessions.push({id:'session_owner',userId:'owner_002'});
  assert.throws(()=>createFixtureAuthorizationAdapter(bad));
  assert.throws(()=>createFixtureAuthorizationAdapter({...config(),savedState:{sequence:999,records:[],history:[]}}));
});
test('returned records cannot mutate trusted fixture state',()=>{
  const store=createFixtureAuthorizationAdapter(config());
  const copy=draft(store);
  copy.status='approved';
  copy.reviewedBy='owner_001';
  assert.equal(store.recordFor({sessionId:'session_owner',id:copy.id}).status,'pending');
  assert.equal(store.snapshot().history.length,1);
});

test('restoration rejects missing audit transitions and forged approvals',()=>{
  const store=createFixtureAuthorizationAdapter(config());
  draft(store);
  store.review({sessionId:'session_mod',id:'entry_001',decision:'approved',evidence});
  const original=store.snapshot();
  for(const mutated of [
    {...original,history:original.history.slice(0,1),sequence:1},
    {...original,history:[original.history[1],original.history[0]]},
    {...original,records:[{...original.records[0],status:'rejected'}]},
    {...original,records:[{...original.records[0],reviewedBy:'owner_001'}]},
    {...original,history:[original.history[0],{...original.history[1],actorId:'owner_001'}]},
    {...original,history:[original.history[0],{...original.history[1],action:'rejected'}]},
    {...original,history:[original.history[0],{...original.history[1],sequence:1}]}
  ]) assert.throws(()=>createFixtureAuthorizationAdapter({...config(),savedState:mutated}));
});
test('restoration rejects duplicate, missing and unrelated audit entries',()=>{
  const store=createFixtureAuthorizationAdapter(config());
  draft(store);
  const original=store.snapshot();
  for(const mutated of [
    {...original,records:[]},
    {...original,records:[original.records[0],original.records[0]]},
    {...original,history:[{...original.history[0],recordId:'other_001'}]},
    {...original,history:[{...original.history[0],actorId:'owner_002'}]},
    {...original,history:[{...original.history[0],action:'approved'}]},
    {...original,history:[{...original.history[0],sequence:2}]}
  ]) assert.throws(()=>createFixtureAuthorizationAdapter({...config(),savedState:mutated}));
});
test('failed review does not append an audit event or consume a transition',()=>{
  const store=createFixtureAuthorizationAdapter(config());
  draft(store);
  const before=store.snapshot();
  assert.throws(()=>store.review({sessionId:'session_mod',id:'entry_001',decision:'approved',evidence:{identityVerified:true}}));
  assert.throws(()=>store.review({sessionId:'session_owner',id:'entry_001',decision:'approved',evidence}));
  assert.deepEqual(store.snapshot(),before);
  assert.equal(store.review({sessionId:'session_mod',id:'entry_001',decision:'approved',evidence}).status,'approved');
  assert.equal(store.snapshot().sequence,before.sequence+1);
});
test('duplicate submissions across tenants fail without altering recorded history',()=>{
  const store=createFixtureAuthorizationAdapter(config());
  draft(store,'entry_001');
  const before=store.snapshot();
  assert.throws(()=>store.submit({sessionId:'session_other',vendorSlug:'other-vendor',id:'entry_001',type:'listing',title:'Different tenant item'}));
  assert.deepEqual(store.snapshot(),before);
  assert.equal(store.submit({sessionId:'session_other',vendorSlug:'other-vendor',id:'entry_002',type:'listing',title:'Different tenant item'}).vendorSlug,'other-vendor');
});

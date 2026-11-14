// End-to-end integration of EXISTING offline GIM fixtures; no accounts, payments, network or deploy.
import test from 'node:test';
import assert from 'node:assert/strict';
import {applyVendor,moderateVendor,draftStorefront,moderateStorefront,submitListing,moderateListing,publicStorefront} from './vendor-storefront.mjs';
import {createFixtureAccessLedger} from './vendor-access-ledger.mjs';
import {createFixtureCheckpointJournal} from './vendor-checkpoint-journal.mjs';
import {sealAccessLedger} from './vendor-access-chain.mjs';
import {buildFixtureVendorConsole} from './vendor-fixture-console.mjs';
const key='fictional-lifecycle-signature-key-123456789';
const now=2000000;
const owner={id:'owner_001',role:'user',active:true};
const otherOwner={id:'owner_002',role:'user',active:true};
const manager={id:'manager_001',role:'user',active:true};
const reviewer={id:'moderator_001',role:'platform_moderator',active:true};
const rights={mediaRights:true,resaleRights:true,compliance:true,territories:['CA']};
const config=()=>({
 users:[owner,otherOwner,manager,reviewer],
 sessions:[{id:'session_owner',userId:owner.id},{id:'session_other',userId:otherOwner.id},
   {id:'session_manager',userId:manager.id},{id:'session_mod',userId:reviewer.id}],
 vendors:[{slug:'first-vendor',ownerId:owner.id,status:'approved'},
  {slug:'second-vendor',ownerId:otherOwner.id,status:'approved'}],
 memberships:[{vendorSlug:'first-vendor',userId:owner.id,role:'owner',active:true},
  {vendorSlug:'first-vendor',userId:manager.id,role:'manager',active:true},
  {vendorSlug:'second-vendor',userId:otherOwner.id,role:'owner',active:true}]
});
const membership={userId:manager.id,vendorSlug:'first-vendor',role:'manager',active:true};
function lifecycle(){
 const application=applyVendor({ownerId:owner.id,displayName:'Fictional Apparel',slug:'first-vendor',country:'CA'});
 const vendor=moderateVendor(application,reviewer,'approved',{legalEntity:true,eligibility:true,terms:true});
 const draft=draftStorefront(vendor,manager,membership,'Original fictional garments');
 const profile=moderateStorefront(vendor,draft,reviewer,'approved');
 const submitted=submitListing(vendor,manager,membership,{id:'listing_001',
   title:'Fictional shirt',category:'Apparel',territories:['CA']});
 const product=moderateListing(vendor,submitted,reviewer,'approved',rights);
 const stocked=Object.freeze({...product,stock:3,inventoryUpdatedAt:new Date(now-1000).toISOString()});
 return {application,vendor,draft,profile,submitted,product,stocked};
}
const submit=(keyId,id,sessionId='session_manager',vendorSlug='first-vendor',revision=0)=>({
 key:keyId,expectedRevision:revision,operations:[{type:'submit',sessionId,vendorSlug,id,
  recordType:'listing',title:'Fictional shirt'}]
});
const policy=action=>({sessionId:'session_mod',action,targetId:'manager_001',vendorSlug:'first-vendor'});
const secured=()=>{
 const ledger=createFixtureAccessLedger(config());
 ledger.batch(submit('batch_first','listing_001'));
 const journal=createFixtureCheckpointJournal();
 journal.append(ledger);
 return {ledger,journal};
};

test('complete fictional vendor application, independent approvals, listing and stocked preview',()=>{
 const s=lifecycle();
 assert.equal(s.application.status,'pending');
 assert.equal(s.vendor.status,'approved');
 assert.equal(s.profile.status,'approved');
 assert.equal(s.product.status,'approved');
 assert.equal(s.product.stock,0);
 const before=publicStorefront(s.vendor,s.profile,[s.product],'CA',now);
 assert.deepEqual(before.products,[]);
 const visible=publicStorefront(s.vendor,s.profile,[s.stocked],'CA',now);
 assert.deepEqual(visible.products,[{id:'listing_001',title:'Fictional shirt',category:'Apparel'}]);
 assert.equal(visible.country,'CA');
});
test('separate independent moderator is required at every approval stage',()=>{
 const application=applyVendor({ownerId:owner.id,displayName:'Fictional Apparel',slug:'first-vendor',country:'CA'});
 assert.throws(()=>moderateVendor(application,{...owner,role:'platform_moderator'},'approved',{legalEntity:true,eligibility:true,terms:true}));
 const s=lifecycle();
 assert.throws(()=>moderateStorefront(s.vendor,s.draft,{...manager,role:'platform_moderator'},'approved'));
 assert.throws(()=>moderateListing(s.vendor,s.submitted,{...owner,role:'platform_moderator'},'approved',rights));
 assert.throws(()=>moderateListing(s.vendor,s.submitted,reviewer,'approved',{...rights,mediaRights:false}));
});
test('expired inventory, out-of-stock items and foreign territory remain hidden',()=>{
 const s=lifecycle();
 const listed=[{...s.stocked,stock:0},{...s.stocked,inventoryUpdatedAt:new Date(1).toISOString()},
  {...s.stocked,inventoryUpdatedAt:new Date(now+1).toISOString()}];
 for(const item of listed)assert.equal(publicStorefront(s.vendor,s.profile,[item],'CA',now).products.length,0);
 assert.equal(publicStorefront(s.vendor,s.profile,[s.stocked],'US',now).products.length,0);
});
test('vendor fixture console shows safe public projection and excludes internal supplier fields',()=>{
 const s=lifecycle();
 const listing={...s.stocked,supplierToken:'fictional-secret',wholesaleCost:999};
 const view=buildFixtureVendorConsole({vendor:s.vendor,profile:s.profile,listings:[listing],country:'CA',now});
 assert.equal(view.preview.products.length,1);
 assert.equal(view.mode,'offline-read-only');
 assert.equal(JSON.stringify(view).includes('fictional-secret'),false);
 assert.equal(JSON.stringify(view).includes('wholesaleCost'),false);
});
test('cross-tenant listing and inventory cannot enter an unrelated public storefront',()=>{
 const s=lifecycle();
 const unrelated={...s.stocked,id:'other_001',vendorSlug:'second-vendor'};
 assert.equal(publicStorefront(s.vendor,s.profile,[unrelated],'CA',now).products.length,0);
 assert.deepEqual(publicStorefront(s.vendor,s.profile,[s.stocked,unrelated],'CA',now).products.map(p=>p.id),['listing_001']);
 assert.throws(()=>buildFixtureVendorConsole({vendor:s.vendor,profile:s.profile,listings:[unrelated],country:'CA',now}));
});
test('membership revocation blocks new submissions and cached receipts after checkpoint recovery',()=>{
 const {ledger,journal}=secured();
 ledger.change(policy('revoke-membership'));
 journal.append(ledger);
 const signed=sealAccessLedger(ledger,key);
 const recovered=createFixtureCheckpointJournal({savedJournal:journal.snapshot()}).recover(config(),signed,key);
 assert.throws(()=>recovered.batch(submit('batch_first','listing_001')));
 assert.throws(()=>recovered.batch(submit('new_batch','listing_002','session_manager','first-vendor',1)));
 assert.throws(()=>recovered.read({sessionId:'session_manager',id:'listing_001'}));
 assert.equal(recovered.read({sessionId:'session_owner',id:'listing_001'}).status,'pending');
});
test('signed snapshot rollback fails once later vendor transaction is checkpointed',()=>{
 const {ledger,journal}=secured();
 const stale=sealAccessLedger(ledger,key);
 ledger.batch(submit('other_batch','listing_002','session_other','second-vendor',1));
 journal.append(ledger);
 const restarted=createFixtureCheckpointJournal({savedJournal:journal.snapshot()});
 assert.throws(()=>restarted.recover(config(),stale,key));
 assert.equal(restarted.recover(config(),sealAccessLedger(ledger,key),key).snapshot().transactions.state.revision,2);
});
test('invalid cross-tenant batch is atomic across signed recovery and audit history',()=>{
 const {ledger,journal}=secured();
 const before=ledger.snapshot();
 assert.throws(()=>ledger.batch({key:'invalid_batch',expectedRevision:1,operations:[
  submit('unused','listing_002','session_other','second-vendor').operations[0],
  submit('unused','listing_003','session_manager','second-vendor').operations[0]
 ]}));
 assert.deepEqual(ledger.snapshot(),before);
 const recovery=journal.recover(config(),sealAccessLedger(ledger,key),key);
 assert.deepEqual(recovery.snapshot(),before);
});

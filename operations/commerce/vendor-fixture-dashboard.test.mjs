import test from 'node:test';
import assert from 'node:assert/strict';
import {renderFixtureDashboard,mountFixtureDashboard} from './vendor-fixture-dashboard.mjs';
import {buildFixtureVendorConsole} from './vendor-fixture-console.mjs';
const vendor={slug:'demo-shop',displayName:'Demo Shop',ownerId:'owner_demo',status:'pending'};
const now=2_000_000;
const model=()=>buildFixtureVendorConsole({vendor,now,events:[
  {vendorSlug:'demo-shop',sequence:1,type:'vendor-submitted',actorId:'owner_demo',recordId:'demo-shop'}
]});
test('dashboard labels offline fictional state and defaults to onboarding',()=>{
  const html=renderFixtureDashboard(model());
  assert.match(html,/OFFLINE DEMO/);
  assert.match(html,/Vendor onboarding/);
  assert.match(html,/Independent moderator required/);
  assert.match(html,/aria-pressed="true"/);
  assert.doesNotMatch(html,/type="submit"/);
});
test('mod queue filters pending and excludes approved entries',()=>{
  const ready={...model(),listings:[
    {id:'pending_001',title:'Pending Shirt',category:'Apparel',status:'pending'},
    {id:'approved_001',title:'Approved Hoodie',category:'Apparel',status:'approved'}
  ]};
  const html=renderFixtureDashboard(ready,{tab:'moderation',filter:'pending'});
  assert.match(html,/Pending Shirt/);
  assert.doesNotMatch(html,/Approved Hoodie/);
  assert.match(html,/1 fictional listing/);
  assert.match(html,/Filter listing status/);
});
test('audit tab renders only redacted event fields',()=>{
  const html=renderFixtureDashboard(model(),{tab:'audit'});
  assert.match(html,/vendor-submitted/);
  assert.match(html,/demo-shop/);
  assert.doesNotMatch(html,/owner_demo/);
});
test('storefront unavailable state never guesses public inventory',()=>{
  const html=renderFixtureDashboard(model(),{tab:'storefront'});
  assert.match(html,/No approved storefront preview available/);
  assert.doesNotMatch(html,/Buy now|Add to cart|Checkout/);
});
test('all text fields are encoded for HTML, including untrusted projections',()=>{
  const payload={...model(),vendor:{...model().vendor,name:'Shop & <img src=x onerror=alert(1)>'}};
  const html=renderFixtureDashboard(payload);
  assert.match(html,/Shop &amp; &lt;img/);
  assert.doesNotMatch(html,/<img/);
  const malicious={...model(),listings:[{id:'x',title:'<script>alert(1)</script>',category:'Apparel',status:'pending'}]};
  const listingHtml=renderFixtureDashboard(malicious,{tab:'moderation'});
  assert.match(listingHtml,/&lt;script&gt;/);
  assert.doesNotMatch(listingHtml,/<script>/);
});
test('invalid tab, filter and wrong projection fail before rendering',()=>{
  assert.throws(()=>renderFixtureDashboard(model(),{tab:'payments'}));
  assert.throws(()=>renderFixtureDashboard(model(),{tab:'moderation',filter:'unknown'}));
  assert.throws(()=>renderFixtureDashboard({kind:'other',mode:'offline-read-only'}));
});
test('interactive navigation changes tabs and filters, and disposer removes listener',()=>{
  const listeners=new Map();
  const root={
    innerHTML:'',addEventListener:(name,fn)=>listeners.set(name,fn),
    removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name)},
    contains:()=>true
  };
  const ready={...model(),listings:[
    {id:'pending_001',title:'Pending Shirt',category:'Apparel',status:'pending'},
    {id:'approved_001',title:'Approved Hoodie',category:'Apparel',status:'approved'}
  ]};
  const dispose=mountFixtureDashboard(root,ready);
  assert.match(root.innerHTML,/Vendor onboarding/);
  const fire=(attr,value)=>listeners.get('click')({target:{closest:()=>({
    getAttribute:name=>name===attr?value:null
  })}});
  fire('data-tab','moderation');
  assert.match(root.innerHTML,/Listing review queue/);
  fire('data-filter','pending');
  assert.match(root.innerHTML,/Pending Shirt/);
  assert.doesNotMatch(root.innerHTML,/Approved Hoodie/);
  fire('data-tab','audit');
  assert.match(root.innerHTML,/Audit history/);
  dispose();
  assert.equal(listeners.has('click'),false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';

const require = createRequire(import.meta.url);
const shipping = require('../site/shipping.js');
const script = readFileSync(new URL('../site/destination.js', import.meta.url), 'utf8');

function fixture(products, saved = 'CA') {
  const nodes = new Map();
  class Element {
    constructor(id) { this.id = id; this.value = ''; this.textContent = ''; this.innerHTML = ''; this.hidden = false; this.checked = false; this.disabled = false; this.listeners = {}; }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    dispatch(type, value) { if (value !== undefined) this.value = value; for (const fn of this.listeners[type] || []) fn({target:this,preventDefault(){}}); }
    focus() {}
  }
  const element = id => nodes.get(id) || (nodes.set(id, new Element(id)), nodes.get(id));
  const document = {readyState:'complete', activeElement:element('origin'), getElementById:element};
  const storage = new Map(saved ? [['gim:country', saved]] : []);
  const localStorage = {getItem:key=>storage.get(key)||null,setItem:(key,v)=>storage.set(key,v)};
  const window = {GIM_COUNTRIES:[{code:'CA',name:'Canada'},{code:'US',name:'United States'}],GIM_WORLD:{features:[]},
    GIMShipping:shipping,GIM_PRODUCTS:products,GIMGlobe3D:{create:()=>null},GIMGlobeSoftware:{create:()=>null},dispatchEvent(){},scrollTo(){}};
  runInNewContext(script, {window,document,localStorage,location:{hash:''},CustomEvent:class{constructor(type){this.type=type;}},requestAnimationFrame:()=>1,console:{warn(){}}}, {timeout:1500});
  return {destination:window.GIMDestination,element,localStorage};
}
function allowed(id, country='CA') { return {id,resellerApproved:true,stockVerified:true,canAcceptOrders:true,
  deliveryRules:[{productId:id,country,status:'allowed',verified:true,countrywide:true,resaleTerritoryApproved:true,
    importReviewed:true,fulfillmentConfirmed:true,checkedAt:'2020-01-01',validUntil:'2099-01-01'}]}; }

test('Malformed shipping data remains preview-only and never counts as confirmed country stock',()=>{
  const malformed = allowed(1);malformed.deliveryRules.push(null);
  const app = fixture([malformed]);
  assert.equal(shipping.status(malformed,'CA'),'unknown');
  assert.equal(app.destination.include(malformed),false);
  assert.match(app.element('destinationNote').textContent,/No purchasable products are confirmed/);
  app.element('previewMode').checked = true;
  app.element('previewMode').dispatch('change');
  assert.equal(app.destination.include(malformed),true);
  assert.match(app.destination.label(malformed),/not confirmed/);
});

test('An authoritative country block stays blocked even in research-preview mode',()=>{
  const p = allowed(2);p.deliveryRules.push(null,{country:'CA',status:'blocked'});
  const app = fixture([p]);
  app.element('previewMode').checked = true;
  app.element('previewMode').dispatch('change');
  assert.equal(shipping.status(p,'CA'),'blocked');
  assert.equal(app.destination.include(p),false);
  assert.match(app.destination.label(p),/Not available/);
});

test('Changing destination revokes preview opt-in and prevents cross-country authorization',()=>{
  const p = allowed(3);
  const app = fixture([p]);
  assert.equal(app.destination.include(p),true);
  app.element('previewMode').checked = true;
  app.element('previewMode').dispatch('change');
  assert.equal(app.destination.enter('US'),true);
  assert.equal(app.destination.previews(),false);
  assert.equal(app.destination.include(p),false);
  assert.equal(app.element('previewMode').checked,false);
  assert.equal(app.localStorage.getItem('gim:country'),'US');
});

test('Malformed exclusion lists never cause a confirmed destination count',()=>{
  const p = allowed(4);p.deliveryRules[0].excludedRegions = {};
  const app = fixture([p]);
  assert.equal(shipping.status(p,'CA'),'unknown');
  assert.equal(app.destination.include(p),false);
  assert.match(app.element('destinationNote').textContent,/No purchasable products are confirmed/);
});

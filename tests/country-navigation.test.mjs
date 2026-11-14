import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {runInNewContext} from "node:vm";

const require = createRequire(import.meta.url);
const shipping = require("../site/shipping.js");
const script = readFileSync(new URL("../site/destination.js", import.meta.url), "utf8");

function fixture({saved = "CA", products = []} = {}) {
  const nodes = new Map();
  class Element {
    constructor(id) {
      this.id = id; this.value = ""; this.textContent = ""; this.innerHTML = "";
      this.hidden = false; this.checked = false; this.disabled = false; this.listeners = {};
    }
    addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
    dispatch(type, value) {
      if (value !== undefined) this.value = value;
      for (const fn of this.listeners[type] || []) fn({target:this, preventDefault(){}});
    }
    focus() {}
  }
  const element = id => nodes.get(id) || (nodes.set(id, new Element(id)), nodes.get(id));
  const document = {readyState:"complete", activeElement:element("origin"),
    getElementById:element};
  const store = new Map(saved ? [["gim:country",saved]] : []);
  const localStorage = {getItem:key=>store.get(key)||null, setItem:(key,v)=>store.set(key,v)};
  const window = {GIM_COUNTRIES:[{code:"CA",name:"Canada"},{code:"US",name:"United States"}],
    GIM_WORLD:{features:[]}, GIMShipping:shipping, GIM_PRODUCTS:products,
    GIMGlobe3D:{create:()=>null}, GIMGlobeSoftware:{create:()=>null},
    dispatchEvent(){},scrollTo(){}};
  const context = {window,document,localStorage,location:{hash:""},CustomEvent:class{constructor(type){this.type=type;}},
    requestAnimationFrame:()=>1,console:{warn(){}}};
  runInNewContext(script, context, {timeout:1500});
  return {window,nodes,element,localStorage};
}

test("Country search clears stale selection status when its option disappears",()=>{
  const app = fixture();
  app.element("countryCurrent").dispatch("click");
  assert.match(app.element("countryStatus").textContent,/Canada selected/);
  app.element("countrySearch").dispatch("input","United");
  assert.equal(app.element("countrySelect").value,"");
  assert.equal(app.element("enterCountry").disabled,true);
  assert.doesNotMatch(app.element("countryStatus").textContent,/Canada selected/);
  assert.match(app.element("countryMatchCount").textContent,/1 countries and regions/);
  assert.equal(app.window.GIMDestination.country(),"CA","saved country is not changed by searching");
});

test("Matching country searches keep the current selection valid",()=>{
  const app = fixture();
  app.element("countryCurrent").dispatch("click");
  app.element("countrySearch").dispatch("input","Can");
  assert.equal(app.element("countrySelect").value,"CA");
  assert.equal(app.element("enterCountry").disabled,false);
  assert.match(app.element("countryStatus").textContent,/Canada selected/);
});

test("Invalid country entry fails closed without changing the current country",()=>{
  const app = fixture({saved:null});
  assert.equal(app.window.GIMDestination.enter("EU"),false);
  assert.equal(app.window.GIMDestination.country(),"");
  assert.equal(app.element("storeShell").hidden,true);
  assert.equal(app.element("countryEntrance").hidden,false);
});

test("Changing countries revokes research-preview consent and blocks unapproved items",()=>{
  const pending = {id:101};
  const blocked = {id:102,deliveryRules:[{country:"CA",status:"blocked"}]};
  const approved = {id:103,resellerApproved:true,stockVerified:true,canAcceptOrders:true,
    deliveryRules:[{productId:103,country:"CA",status:"allowed",verified:true,
      countrywide:true,resaleTerritoryApproved:true,importReviewed:true,
      fulfillmentConfirmed:true,checkedAt:"2020-01-01",validUntil:"2099-01-01"}]};
  const app = fixture({products:[pending,blocked,approved]});
  const destination = app.window.GIMDestination;
  assert.equal(destination.previews(),false);
  assert.equal(destination.include(pending),false);
  assert.equal(destination.include(approved),true);
  app.element("previewMode").checked = true;
  app.element("previewMode").dispatch("change");
  assert.equal(destination.previews(),true);
  assert.equal(destination.include(pending),true);
  assert.equal(destination.include(blocked),false);
  assert.equal(destination.enter("US"),true);
  assert.equal(destination.previews(),false);
  assert.equal(app.element("previewMode").checked,false);
  assert.equal(destination.include(pending),false);
  assert.equal(destination.include(approved),false);
  assert.equal(app.localStorage.getItem("gim:country"),"US");
});

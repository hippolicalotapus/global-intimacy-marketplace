import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const shipping=createRequire(import.meta.url)("../site/shipping.js");
const now=Date.parse("2026-11-01T00:00:00Z");
const fixture=()=>({id:1,resellerApproved:true,stockVerified:true,canAcceptOrders:true,deliveryRules:[{productId:1,country:"CA",status:"allowed",verified:true,countrywide:true,resaleTerritoryApproved:true,importReviewed:true,fulfillmentConfirmed:true,checkedAt:"2026-10-30T00:00:00Z",validUntil:"2026-11-02T00:00:00Z"}]});
test("An exact, reviewed product-country rule admits only its approved country",()=>{
 assert.equal(shipping.status(fixture(),"CA",now),"eligible");
 for(const code of ["US","GB","EU","WORLDWIDE","*",null,"ca"])assert.equal(shipping.status(fixture(),code,now),"unknown");
});
test("Stale, future-dated, contradictory and missing evidence fails closed",()=>{
 for(const [key,value] of [["validUntil","2026-10-31"],["checkedAt","2026-11-02"],["checkedAt",null],["verified",false],["countrywide",false],["excludedRegions",["restricted-region"]],["excludedPostcodes",["restricted-postcode"]],["productId",2],["resaleTerritoryApproved",false],["importReviewed",false],["fulfillmentConfirmed",false]]){
  const p=fixture();p.deliveryRules[0][key]=value;assert.equal(shipping.status(p,"CA",now),"unknown",key);
 }
 const duplicate=fixture();duplicate.deliveryRules.push({...duplicate.deliveryRules[0]});assert.equal(shipping.status(duplicate,"CA",now),"unknown");
 const blocked=fixture();blocked.deliveryRules.push({country:"CA",status:"blocked"});assert.equal(shipping.status(blocked,"CA",now),"blocked");
});
test("Country eligibility cannot override unapproved resale, stock or order gates",()=>{
 for(const gate of ["resellerApproved","stockVerified","canAcceptOrders"]){const p=fixture();p[gate]=false;assert.equal(shipping.status(p,"CA",now),"unknown",gate);}
 assert.equal(shipping.status({id:1},"CA",now),"unknown");
});

test("Malformed supplier delivery evidence fails closed without throwing",()=>{
 assert.equal(shipping.status(null,"CA",now),"unknown");
 assert.equal(shipping.status(undefined,"CA",now),"unknown");
 const p=fixture();p.deliveryRules=[null,undefined,42];
 assert.equal(shipping.status(p,"CA",now),"unknown");
 const invalid=fixture();invalid.deliveryRules[0].checkedAt={toString(){throw Error("untrusted supplier field");}};
 assert.equal(shipping.status(invalid,"CA",now),"unknown");
});

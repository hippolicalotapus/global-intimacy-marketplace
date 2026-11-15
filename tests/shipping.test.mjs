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

test("Missing or malformed product records fail closed without throwing",()=>{
 for(const product of [null,undefined,false,0,"",[]]){
  assert.equal(shipping.status(product,"CA",now),"unknown");
 }
});

test("Malformed delivery rule entries fail closed without crashing the public preview",()=>{
 for(const bad of [null,undefined,0,false,"",[]]){
  const p=fixture();p.deliveryRules.push(bad);
  assert.equal(shipping.status(p,"CA",now),"unknown",String(bad));
 }
});
test("A country-level block remains authoritative even alongside corrupt delivery entries",()=>{
 const p=fixture();p.deliveryRules.push(null,{country:"CA",status:"blocked"});
 assert.equal(shipping.status(p,"CA",now),"blocked");
});
test("Malformed exclusion lists cannot authorize unreviewed delivery",()=>{
 for(const key of ["excludedRegions","excludedPostcodes"]){
  for(const bad of [null,{},true,0,""]){
   const p=fixture();p.deliveryRules[0][key]=bad;
   assert.equal(shipping.status(p,"CA",now),"unknown",key+":"+String(bad));
  }
 }
});


test("Supplier evidence must use valid date strings, never numeric or informal dates",()=>{
 const valid=fixture();
 assert.equal(shipping.status(valid,"CA",now),"eligible");
 for(const [field,bad] of [["checkedAt",0],["checkedAt",1],["checkedAt",null],["checkedAt","October 30 2026"],["validUntil",2099],["validUntil",true],["validUntil","sometime 2099"]]){
  const p=fixture();
  p.deliveryRules[0][field]=bad;
  assert.equal(shipping.status(p,"CA",now),"unknown",field+": "+String(bad));
 }
});


test("Impossible calendar dates cannot authorize delivery eligibility",()=>{
 const fixtureForDate=()=>{const p=fixture();p.deliveryRules[0].checkedAt="2026-03-01";p.deliveryRules[0].validUntil="2026-12-31";return p;};
 const comparisonTime=Date.parse("2026-03-05T00:00:00Z");
 assert.equal(shipping.status(fixtureForDate(),"CA",comparisonTime),"eligible");
 for(const date of ["2026-02-30","2026-04-31","2025-02-29","2026-00-15","2026-13-01","2026-02-30T00:00:00Z"]){
  const p=fixtureForDate();p.deliveryRules[0].checkedAt=date;
  assert.equal(shipping.status(p,"CA",comparisonTime),"unknown",date);
 }
 const leap=fixtureForDate();leap.deliveryRules[0].checkedAt="2024-02-29";
 assert.equal(shipping.status(leap,"CA",comparisonTime),"eligible","real leap-day evidence stays eligible");
});

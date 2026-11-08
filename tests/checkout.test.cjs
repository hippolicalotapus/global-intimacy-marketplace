"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),crypto=require("node:crypto");
const checkout=require("../netlify/functions/create-checkout-session");
const webhook=require("../netlify/functions/stripe-webhook");
test("checkout is off by default",async()=>{
 const old=process.env.GIM_CHECKOUT_ENABLED;delete process.env.GIM_CHECKOUT_ENABLED;
 try{const r=await checkout.handler({httpMethod:"POST",body:'{"items":[{"id":"x","quantity":1}]}'});
 assert.equal(r.statusCode,503);assert.match(r.body,/not yet available/)}
 finally{if(old===undefined)delete process.env.GIM_CHECKOUT_ENABLED;else process.env.GIM_CHECKOUT_ENABLED=old}
});
test("checkout refuses unsupported methods",async()=>{
 const r=await checkout.handler({httpMethod:"GET"});assert.equal(r.statusCode,405);
});
test("Stripe webhook verifies correct signatures and rejects tampering and replay",()=>{
 const secret="whsec_testsecret",payload='{"id":"evt_123","type":"checkout.session.completed","data":{"object":{"id":"cs_123"}}}',ts=1700000000;
 const sig=crypto.createHmac("sha256",secret).update(ts+"."+payload).digest("hex");
 assert.equal(webhook.verifyStripeSignature(payload,`t=${ts},v1=${sig}`,secret,ts),true);
 assert.equal(webhook.verifyStripeSignature(payload+"x",`t=${ts},v1=${sig}`,secret,ts),false);
 assert.equal(webhook.verifyStripeSignature(payload,`t=${ts},v1=${sig}`,secret,ts+301),false);
 assert.equal(webhook.verifyStripeSignature(payload,`t=${ts},v1=invalid`,secret,ts),false);
});
test("webhook does not acknowledge unpersisted events",async()=>{
 const oldEnabled=process.env.GIM_CHECKOUT_ENABLED,oldSecret=process.env.STRIPE_WEBHOOK_SECRET;
 process.env.GIM_CHECKOUT_ENABLED="true";process.env.STRIPE_WEBHOOK_SECRET="whsec_testsecret";
 const body='{"id":"evt_123","type":"checkout.session.completed","data":{"object":{"id":"cs_123"}}}',ts=Math.floor(Date.now()/1000);
 const sig=crypto.createHmac("sha256",process.env.STRIPE_WEBHOOK_SECRET).update(ts+"."+body).digest("hex");
 try{const r=await webhook.handler({httpMethod:"POST",body,headers:{"stripe-signature":`t=${ts},v1=${sig}`}});assert.equal(r.statusCode,503)}
 finally{if(oldEnabled===undefined)delete process.env.GIM_CHECKOUT_ENABLED;else process.env.GIM_CHECKOUT_ENABLED=oldEnabled;
 if(oldSecret===undefined)delete process.env.STRIPE_WEBHOOK_SECRET;else process.env.STRIPE_WEBHOOK_SECRET=oldSecret}
});

test("checkout fails closed when enabled without payment configuration",async()=>{
 const old={enabled:process.env.GIM_CHECKOUT_ENABLED,key:process.env.STRIPE_SECRET_KEY,origin:process.env.GIM_PUBLIC_ORIGIN};
 process.env.GIM_CHECKOUT_ENABLED="true";delete process.env.STRIPE_SECRET_KEY;delete process.env.GIM_PUBLIC_ORIGIN;
 try{const r=await checkout.handler({httpMethod:"POST",body:'{"items":[{"id":"1","quantity":1}]}'});
 assert.equal(r.statusCode,503);assert.match(r.body,/configuration incomplete/)}
 finally{for(const [k,v] of [["GIM_CHECKOUT_ENABLED",old.enabled],["STRIPE_SECRET_KEY",old.key],["GIM_PUBLIC_ORIGIN",old.origin]]){if(v===undefined)delete process.env[k];else process.env[k]=v}}
});
test("checkout rejects wrong origin and malformed carts before contacting provider",async()=>{
 const vars=["GIM_CHECKOUT_ENABLED","STRIPE_SECRET_KEY","GIM_PUBLIC_ORIGIN","GIM_APPROVED_CHECKOUT_ITEMS"];
 const saved=Object.fromEntries(vars.map(k=>[k,process.env[k]]));
 Object.assign(process.env,{GIM_CHECKOUT_ENABLED:"true",STRIPE_SECRET_KEY:"sk_test_fake",GIM_PUBLIC_ORIGIN:"https://example.test",GIM_APPROVED_CHECKOUT_ITEMS:"{}"});
 const invoke=(origin,body)=>checkout.handler({httpMethod:"POST",headers:{origin},body});
 try{
 assert.equal((await invoke("https://evil.test",'{"items":[{"id":"1","quantity":1}]}')).statusCode,403);
 assert.equal((await invoke("https://example.test","{")).statusCode,400);
 assert.equal((await invoke("https://example.test",'{"items":[]}')).statusCode,400);
 assert.equal((await invoke("https://example.test",'{"items":[{"id":"1","quantity":0}]}')).statusCode,400);
 assert.equal((await invoke("https://example.test",'{"items":[{"id":"1","quantity":11}]}')).statusCode,400);
 assert.equal((await invoke("https://example.test",'{"items":[{"id":"1","quantity":1}]}')).statusCode,409);
 assert.equal((await invoke("https://example.test",'{"items":[{"id":"1","quantity":6},{"id":"1","quantity":5}]}')).statusCode,400);
 }finally{for(const k of vars){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k]}}
});
test("webhook rejects unsigned and malformed events",async()=>{
 const vars=["GIM_CHECKOUT_ENABLED","STRIPE_WEBHOOK_SECRET"],saved=Object.fromEntries(vars.map(k=>[k,process.env[k]]));
 process.env.GIM_CHECKOUT_ENABLED="true";process.env.STRIPE_WEBHOOK_SECRET="whsec_testsecret";
 try{
 assert.equal((await webhook.handler({httpMethod:"POST",body:"{}",headers:{}})).statusCode,400);
 const body='{"id":"evt_123","type":"checkout.session.completed","data":{"object":{"id":"cs_123"}}}',ts=Math.floor(Date.now()/1000);
 const sig=crypto.createHmac("sha256",process.env.STRIPE_WEBHOOK_SECRET).update(ts+"."+body).digest("hex");
 assert.equal((await webhook.handler({httpMethod:"POST",body:body+"tamper",headers:{"stripe-signature":`t=${ts},v1=${sig}`}})).statusCode,400);
 }finally{for(const k of vars){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k]}}
});

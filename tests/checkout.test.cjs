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

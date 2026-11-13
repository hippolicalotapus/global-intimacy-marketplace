"use strict";
const crypto=require("node:crypto");
const reply=(statusCode,message)=>({statusCode,headers:{"content-type":"application/json","cache-control":"no-store"},body:JSON.stringify({message})});
function verifyStripeSignature(payload,header,secret,now=Math.floor(Date.now()/1000)){
  if(typeof payload!=="string" || typeof header!=="string" || !secret) return false;
  const pairs=header.split(",").map(x=>x.trim().split("="));
  const ts=pairs.find(x=>x[0]==="t")?.[1];
  const signatures=pairs.filter(x=>x[0]==="v1").map(x=>x[1]);
  if(!/^\d+$/.test(ts||"") || Math.abs(now-Number(ts))>300 || !signatures.length)return false;
  const expected=crypto.createHmac("sha256",secret).update(ts+"."+payload,"utf8").digest("hex");
  return signatures.some(sig=>{
    if(!/^[0-9a-f]{64}$/i.test(sig||""))return false;
    return crypto.timingSafeEqual(Buffer.from(expected,"hex"),Buffer.from(sig,"hex"));
  });
}
exports.verifyStripeSignature=verifyStripeSignature;
exports.handler=async function(event){
  if(event.httpMethod!=="POST")return reply(405,"Method not allowed");
  if(process.env.GIM_CHECKOUT_ENABLED!=="true")return reply(503,"Checkout not activated");
  const secret=process.env.STRIPE_WEBHOOK_SECRET;
  if(!secret)return reply(503,"Webhook not configured");
  const payload=event.isBase64Encoded?Buffer.from(event.body||"","base64").toString("utf8"):event.body||"";
  const signature=event.headers?.["stripe-signature"]||event.headers?.["Stripe-Signature"];
  if(!verifyStripeSignature(payload,signature,secret))return reply(400,"Invalid signature");
  let evt;
  try{evt=JSON.parse(payload);}catch(_){return reply(400,"Invalid payload")}
  if(!evt || typeof evt.id!=="string" || !evt.type || !evt.data?.object?.id)return reply(400,"Invalid event");
  // IMPORTANT: Never return success for an unpersisted payment event.
  // A durable idempotent event store + order state machine must be implemented
  // before webhook processing can acknowledge a real payment.
  return reply(503,"Order persistence not configured");
};

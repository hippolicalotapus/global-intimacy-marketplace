"use strict";
/**
 * Server-side Stripe Checkout session creation.
 * Intentionally disabled until merchant underwriting, supplier and product
 * authorizations, prices, inventory and fulfillment are verified.
 * Never use public catalogue prices or accept client-supplied price IDs.
 */
const crypto = require("node:crypto");
const respond = (statusCode, payload) => ({
  statusCode, headers: {"content-type":"application/json","cache-control":"no-store"},
  body: JSON.stringify(payload)
});
function catalog() {
  try {
    const raw = JSON.parse(process.env.GIM_APPROVED_CHECKOUT_ITEMS || "{}");
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  } catch (_) { return {}; }
}
exports.handler = async function(event) {
  if (event.httpMethod !== "POST") return respond(405,{error:"Method not allowed"});
  if (process.env.GIM_CHECKOUT_ENABLED !== "true") return respond(503,{error:"Checkout is not yet available."});
  const key=process.env.STRIPE_SECRET_KEY;
  const origin=process.env.GIM_PUBLIC_ORIGIN;
  if (!key || !/^https:\/\/[^/]+$/.test(origin || "")) return respond(503,{error:"Checkout configuration incomplete."});
  const requestOrigin=event.headers?.origin || event.headers?.Origin;
  if (requestOrigin !== origin) return respond(403,{error:"Origin not permitted"});
  let body;
  try { body=JSON.parse(event.body || "{}"); } catch (_) { return respond(400,{error:"Invalid JSON"}); }
  if (!Array.isArray(body.items) || !body.items.length || body.items.length>20) return respond(400,{error:"Invalid cart"});
  // Client generates one UUID per checkout attempt and reuses it on retries.
  if (typeof body.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId)) return respond(400,{error:"Invalid checkout request ID"});
  const approved=catalog(), counts=new Map();
  for(const item of body.items) {
    if (!item || typeof item.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.id) ||
        !Number.isInteger(item.quantity) || item.quantity<1 || item.quantity>10) return respond(400,{error:"Invalid item"});
    counts.set(item.id,(counts.get(item.id)||0)+item.quantity);
    if(counts.get(item.id)>10) return respond(400,{error:"Quantity limit exceeded"});
  }
  const line_items=[];
  for(const [id,quantity] of counts) {
    const item=approved[id];
    if (!item || item.saleApproved !== true || item.stockVerified !== true ||
        item.fulfillmentApproved !== true || item.processorApproved !== true ||
        typeof item.stripePriceId !== "string" || !/^price_[a-zA-Z0-9]+$/.test(item.stripePriceId))
      return respond(409,{error:"Item unavailable for checkout",itemId:id});
    line_items.push({price:item.stripePriceId,quantity});
  }
  const params=new URLSearchParams();
  params.set("mode","payment");
  params.set("success_url",origin+"/checkout-result.html?status=success&session_id={CHECKOUT_SESSION_ID}");
  params.set("cancel_url",origin+"/checkout-result.html?status=cancelled");
  params.set("billing_address_collection","required");
  params.set("shipping_address_collection[allowed_countries][0]","CA");
  line_items.forEach((item,i)=>{
    params.set(`line_items[${i}][price]`,item.price);
    params.set(`line_items[${i}][quantity]`,String(item.quantity));
  });
  // Stable for retries of the same checkout attempt; never derive from cart alone.
  // Durable order persistence is still required before accepting real payments.
  const idempotencyKey=crypto.createHash("sha256").update(body.requestId.toLowerCase()+"\\n"+JSON.stringify(line_items)).digest("hex");
  let result;
  try {
    result=await fetch("https://api.stripe.com/v1/checkout/sessions",{
      method:"POST",headers:{"authorization":`Bearer ${key}`,
      "content-type":"application/x-www-form-urlencoded","idempotency-key":idempotencyKey},
      body:params.toString(),signal:AbortSignal.timeout(12000)
    });
  } catch (_) {return respond(502,{error:"Payment provider unavailable"});}
  let session;
  try {session=await result.json();} catch (_) {return respond(502,{error:"Invalid payment provider response"});}
  if (!result.ok || !session || !/^https:\/\/checkout\.stripe\.com\//.test(session.url || ""))
    return respond(502,{error:"Unable to start checkout"});
  return respond(200,{url:session.url});
};

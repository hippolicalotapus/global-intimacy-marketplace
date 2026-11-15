// Offline-only integration of fictional subscription entitlements and read-only vendor previews.
// No real accounts, billing, network access, persisted data, or checkout.
import {buildFixtureVendorConsole} from './vendor-fixture-console.mjs';
import {renderFixtureDashboard} from './vendor-fixture-dashboard.mjs';
const fail=(condition,message)=>{if(!condition)throw new Error(message);};
const copy=value=>JSON.parse(JSON.stringify(value));
const safeSlug=value=>typeof value==='string'&&value.length<=64&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const safeTime=value=>Number.isSafeInteger(value)&&value>=0;

/**
 * Trusted server-side fixture data only. Caller cannot pass a synthetic approvedListings
 * or canPublish value; both derive from existing moderated product records and subscription.
 */
function buildSubscribedFixtureView({subscriptions,vendor,profile,listings=[],events=[],sessionId,country='CA',now}={}){
  fail(subscriptions&&typeof subscriptions.entitlement==='function'&&
    safeSlug(vendor?.slug)&&Array.isArray(listings)&&listings.length<=1000&&
    safeTime(now),'Validated fictional subscription and vendor context required');
  // Console validates every listing's tenant, unique ID and moderation shape before projection.
  const baseline=buildFixtureVendorConsole({vendor,profile,listings,events,country,now});
  const approvedListings=listings.filter(item=>item.status==='approved').length;
  const subscription=subscriptions.entitlement({
    vendorSlug:vendor.slug,sessionId,now,approvedStorefront:profile?.status==='approved',
    approvedListings
  });
  fail(subscription.vendorSlug===vendor.slug&&typeof subscription.canPublish==='boolean',
    'Cross-tenant subscription result rejected');
  const visible=subscription.canPublish?baseline.preview:null;
  const view={
    ...baseline,
    storefront:{...baseline.storefront,previewAvailable:visible!==null},
    preview:visible,
    subscription:{
      plan:subscription.plan,
      status:subscription.state,
      listingLimit:subscription.listingLimit,
      publishEligible:subscription.canPublish
    }
  };
  // Only non-sensitive projections are exposed. No receipts, session IDs or billing evidence.
  return Object.freeze(copy(view));
}
function renderSubscribedFixtureDashboard(view,options={}){
  fail(view?.kind==='gim-fixture-vendor-console-v1'&&view.mode==='offline-read-only'&&
    view.subscription&&typeof view.subscription.publishEligible==='boolean',
    'Validated fictional subscription view required');
  return renderFixtureDashboard(view,options);
}
export {buildSubscribedFixtureView,renderSubscribedFixtureDashboard};

// Offline fixture-only vendor workflow. No auth service, database, checkout or network.
import { makeVendorApplication, reviewVendor, canPublishProduct } from './vendor-domain.mjs';
const safeId = x => typeof x === 'string' && /^[A-Za-z0-9_-]{3,80}$/.test(x);
const safeText = x => typeof x === 'string' && x.trim().length > 0 && x.length <= 600 && !/[<>\x00-\x1f\x7f]/.test(x);
const assert = (ok, why) => { if (!ok) throw new Error(why); };
function applyVendor(input) {
  assert(safeId(input?.ownerId), 'Owner ID required');
  assert(safeText(input?.displayName) && input.displayName.length <= 160, 'Unsafe vendor name');
  return Object.freeze({...makeVendorApplication(input), ownerId: input.ownerId});
}
function moderateVendor(application, actor, decision, evidence={}) {
  assert(application?.status === 'pending', 'Application not pending');
  assert(actor?.role === 'platform_moderator' && actor.active === true && safeId(actor.id) && actor.id !== application.ownerId, 'Independent active moderator required');
  if (decision === 'approved') assert(evidence.legalEntity === true && evidence.eligibility === true && evidence.terms === true, 'Verified onboarding evidence required');
  return reviewVendor(application, decision, actor.id);
}
function requireVendorEditor(vendor, actor, membership) {
  assert(vendor?.status === 'approved' && safeId(actor?.id) && actor.active === true &&
    membership?.active === true && membership.userId === actor.id && membership.vendorSlug === vendor.slug &&
    ['owner','manager'].includes(membership.role), 'Active vendor membership required');
}
function draftStorefront(vendor, actor, membership, description) {
  requireVendorEditor(vendor, actor, membership);
  assert(safeText(description) && safeText(vendor.displayName), 'Invalid storefront description or name');
  return Object.freeze({ vendorSlug:vendor.slug, name:vendor.displayName, description:description.trim(), submittedBy:actor.id, status:'draft' });
}
function moderateStorefront(vendor, draft, actor, decision) {
  assert(vendor?.status === 'approved' && draft?.vendorSlug === vendor.slug && draft.status === 'draft', 'Invalid storefront');
  assert(actor?.role === 'platform_moderator' && actor.active === true && safeId(actor.id) && actor.id !== draft.submittedBy, 'Independent moderator required');
  assert(['approved','rejected'].includes(decision), 'Invalid decision');
  return Object.freeze({...draft,status:decision});
}
function submitListing(vendor, actor, membership, input) {
  requireVendorEditor(vendor, actor, membership);
  assert(safeId(input?.id) && safeText(input?.title) && safeText(input?.category), 'Invalid listing');
  assert(Array.isArray(input.territories) && input.territories.length > 0 &&
    input.territories.length <= 30 && input.territories.every(x => typeof x === 'string' && /^[A-Z]{2}$/.test(x)) &&
    new Set(input.territories).size === input.territories.length, 'Invalid territories');
  return Object.freeze({id:input.id,title:input.title.trim(),category:input.category.trim(),vendorSlug:vendor.slug,
    requestedTerritories:Object.freeze([...input.territories]),submittedBy:actor.id,status:'pending',
    mediaRights:false,resaleAuthorized:false,territories:Object.freeze([]),stock:0,inventoryUpdatedAt:null});
}
function moderateListing(vendor, listing, actor, decision, evidence={}) {
  assert(vendor?.status === 'approved' && listing?.status === 'pending' && listing.vendorSlug === vendor.slug,'Invalid listing review');
  assert(actor?.role === 'platform_moderator' && actor.active === true && safeId(actor.id) && actor.id !== listing.submittedBy,'Independent moderator required');
  assert(['approved','rejected'].includes(decision),'Invalid decision');
  let territories=[];
  if (decision === 'approved') {
    assert(evidence.mediaRights === true && evidence.resaleRights === true && evidence.compliance === true,'Rights and compliance evidence required');
    territories=evidence.territories;
    assert(Array.isArray(territories) && territories.length > 0 && territories.every(x => listing.requestedTerritories.includes(x)) &&
      new Set(territories).size === territories.length,'Invalid approved territories');
  }
  return Object.freeze({...listing,status:decision,mediaRights:decision === 'approved',
    resaleAuthorized:decision === 'approved',territories:Object.freeze([...territories]),stock:0,inventoryUpdatedAt:null});
}
function publicStorefront(vendor, profile, listings, country, now) {
  if (vendor?.status !== 'approved' || profile?.status !== 'approved' || profile.vendorSlug !== vendor.slug ||
    !Array.isArray(listings) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(vendor.slug) ||
    !safeText(profile.name) || !safeText(profile.description) || profile.name !== vendor.displayName ||
    typeof country !== 'string' || !/^[A-Z]{2}$/.test(country)) return null;
  const products=[]; const ids=new Set();
  for (const item of listings) {
    if (item?.vendorSlug !== vendor.slug || ids.has(item.id) || !safeId(item.id) ||
      !safeText(item.title) || !safeText(item.category) || !canPublishProduct({vendor,product:item,country,now})) continue;
    ids.add(item.id);
    products.push(Object.freeze({id:item.id,title:item.title,category:item.category}));
  }
  return Object.freeze({slug:vendor.slug,name:profile.name,description:profile.description,country,products:Object.freeze(products)});
}
export {applyVendor,moderateVendor,draftStorefront,moderateStorefront,submitListing,moderateListing,publicStorefront};

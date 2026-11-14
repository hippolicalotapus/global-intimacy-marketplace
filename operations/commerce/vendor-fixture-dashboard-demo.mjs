// Fictional local-only data. No network, accounts, API access or persistent writes.
import {applyVendor,moderateVendor,draftStorefront,moderateStorefront,submitListing,moderateListing} from './vendor-storefront.mjs';
import {buildFixtureVendorConsole} from './vendor-fixture-console.mjs';
import {mountFixtureDashboard} from './vendor-fixture-dashboard.mjs';
const moderator={id:'fictional_reviewer',role:'platform_moderator',active:true};
const editor={id:'fictional_editor',role:'user',active:true};
const vendor=moderateVendor(
  applyVendor({ownerId:'fictional_owner',displayName:'Fictional GIM Apparel',slug:'fictional-apparel',country:'CA'}),
  moderator,'approved',{legalEntity:true,eligibility:true,terms:true}
);
const membership={vendorSlug:vendor.slug,userId:editor.id,role:'manager',active:true};
const profile=moderateStorefront(vendor,
  draftStorefront(vendor,editor,membership,'A fictional storefront for offline development demonstrations.'),
  moderator,'approved'
);
const requested=submitListing(vendor,editor,membership,{
  id:'fictional_shirt',title:'Sample printed shirt',category:'Apparel',territories:['CA']
});
const approved=moderateListing(vendor,requested,moderator,'approved',{
  mediaRights:true,resaleRights:true,compliance:true,territories:['CA']
});
const now=Date.now();
const listings=[
  {...approved,stock:3,inventoryUpdatedAt:new Date(now-60_000).toISOString()},
  submitListing(vendor,editor,membership,{
    id:'fictional_hoodie',title:'Sample hoodie awaiting review',category:'Apparel',territories:['CA']
  })
];
const events=[
  {sequence:1,vendorSlug:vendor.slug,type:'vendor-submitted',actorId:'fictional_owner',recordId:vendor.slug},
  {sequence:2,vendorSlug:vendor.slug,type:'vendor-approved',actorId:moderator.id,recordId:vendor.slug},
  {sequence:3,vendorSlug:vendor.slug,type:'storefront-approved',actorId:moderator.id,recordId:vendor.slug},
  {sequence:4,vendorSlug:vendor.slug,type:'listing-approved',actorId:moderator.id,recordId:'fictional_shirt'},
  {sequence:5,vendorSlug:vendor.slug,type:'listing-submitted',actorId:editor.id,recordId:'fictional_hoodie'}
];
const model=buildFixtureVendorConsole({vendor,profile,listings,events,country:'CA',now});
mountFixtureDashboard(document.getElementById('demo'),model);

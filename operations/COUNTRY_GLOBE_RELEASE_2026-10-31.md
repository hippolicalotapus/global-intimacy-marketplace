# Country-first 3D globe — private release candidate
Date: October 31, 2026 (Alberta)
Base: cc056f037a632dbce467c09cf34c15ec42af6370
Status: locally implemented and tested; not committed remotely, pushed, published or deployed.

## Scope
A giant interactive 3D globe before catalogue entry asks "Which country are you shopping from?" That choice supplies the default delivery country. Tapping land enters that country; dragging rotates the sphere. A searchable 250-country/region list and explicit Enter button cover small regions and keyboard users. The selection persists locally when browser storage works and remains changeable. No address/account is requested to browse.

The globe uses a real WebGL sphere mesh with perspective, directional light, water highlights and atmosphere. Browsers without WebGL use a perspective ray/sphere renderer with the same rotation/picking model; if canvas is also unavailable, the country list still works. All map data and rendering code are bundled locally. No map tiles, external API, geolocation, generated imagery or inference service.

The selected country filters catalogue/global search, categories, collections, community browse, saved-product results, wishlist picker and product details. Existing shared/saved wishlist entries are retained with their correct destination labels and disabled gifting/purchase. Unsupported-country rules never become orderable; country changes reset the explicit research-preview opt-in. Unknown, expired, conflicting, restricted-region or unapproved rules fail closed.

## Current data consequence
There are zero current SKU-country approvals satisfying the verified resale/fulfillment/import/stock/order gates. Therefore confirmed-delivery results are empty for every country. Clearly marked unconfirmed research previews remain available as a separate opt-in; the 103 existing previews and 16 ONE HEART concepts are preserved. No country-selection UI can establish supplier rights or fulfillment. Checkout and all purchases remain disabled.

## Verification
45 Node tests passed, including pre-existing search/wishlist/importer/feedback behavior and new eligibility, country-transition, synthetic approved-vs-blocked SKU and perspective picking checks. All 17 existing WebP assets match the base GitHub blob hashes.
Browser QA: globe selection, dragging without accidental entry, Canada country-list entry, ONE HEART search in preview mode, country persistence and change flow. A 390px iframe / 375px content viewport showed no horizontal overflow. This is not a physical Samsung-device test.
The cloud test browser has WebGL disabled, so the ray-rendered 3D fallback was visually verified. GPU shader execution remains unverified on a WebGL-capable device; initialization/context failure falls back safely. No Netlify live request was made.
Map: Natural Earth 1:110m admin-0 public-domain data. Source https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson ; terms https://www.naturalearthdata.com/about/terms-of-use/ . Small or omitted map polygons stay selectable from the public-domain tzdb country-code list, with CLDR English labels. Boundaries are navigation data, not delivery approvals.

## Approval gate and bounded publication proposal
The owner requested updating the site and specifically a 3D globe. The standing October 31 credit rule requires explicit approval of the consuming release batch before branch/PR/push/build/deploy actions. No such action was initiated in this preparation.
Propose one main update at expected base, one associated GitHub/Netlify build/production deployment, and bounded live QA of country entry/filtering/responsive rendering. No retries, AI-agent runs, paid credit purchase, plan/access change or checkout activation. Recheck main first and reconcile locally if it changed.
Netlify's current public credit-plan documentation says 15 credits per successful production deployment, plus request/bandwidth usage. Exact account plan, balance, GitHub build-minute impact and actual usage are unverified; stop for a different approval if account settings would cause a paid purchase or materially different usage.
Official source: https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/

Separate pending shirt-detail and direct-submit questionnaire candidates are not merged into this bounded globe release.


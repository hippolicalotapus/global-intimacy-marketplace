# Feature preservation and production activation — Global Intimacy Marketplace

This is the rebuilt version of our **existing business concept**, not a narrower creator-only store. Broad adult retail remains the primary marketplace, with creator gifting as a core independent feature.

## Visible and testable in the static GitHub beta

- Global Intimacy Marketplace name and approved artwork
- Adults 18+ self-attestation (not identity verification)
- Mobile-first navigation: Explore / Saved / Creators / Join; desktop responsive navigation
- 73 research candidates across connected-device, AI companion, adult-proportioned life-size doll and care categories (not approved inventory)
- Search, category and brand filtering, sort, product details
- Local-only favorites and a demo creator wishlist builder
- Public share-link demo with creator stage name and selected product IDs only; no addresses
- Separate local-only creator and shopper interest survey; clear disclosure that nothing is submitted
- Mission, privacy explanations, safe no-purchase/prelaunch wording
- Local product cards use abstract backgrounds instead of unauthorized manufacturer photography

## Built as an internal integration tool

- Eighteen supplier/manufacturer research records, including three new uncontacted companion/doll leads, with actual correspondence state
- Concorde Pro professional account confirmed and 30-minute supplier CSV refresh claim; custom-site fulfillment and product media authorization remain unverified
- Supplier CSV/JSON staging parser with SKU/GTIN, inventory, pricing and image URL normalization; duplicates quarantined
- Stock/wholesale and catalog data kept out of the publicly hosted folder
- Approval gates initialized false; no auto-publish or automatic ordering
- Hourly Gmail monitoring updated to prioritize the new private GitHub supplier registry rather than Replit
- GitHub validation workflow (execution results still need confirmation)

- New adult companion and doll research banner, separate category chips and placeholders; no doll imagery, real orders or product reservations\n\n## Not yet implemented or activated in the rebuilt beta

- Cloud-synced accounts, secure creator login and verification
- Private shipping addresses, secure gift purchase/reservation, fan payment checkout
- Actual authorized wholesale prices, supplier ordering, tracking and automated return workflows
- Certified/licensed model photographs and verified stock
- Authenticated database-backed admin and confidential supplier price dashboard
- Live e-mail collection, double opt-in, analytics and measured creator/buyer traction
- Regulatory and product-approval routing by jurisdiction, customs/duties or local currency prices
- Creator-platform SSO, platform-endorsed creator benefits or integrations (not approved)
- A publicly deployed and independently mobile-tested URL
- A purchased domain, merchant account or trademark registration

## Design principle for future services

Implement secure authenticated server-side endpoints behind the public storefront. Keep protected supplier pricing and customer/creator delivery records away from static assets. Public wishlist APIs must return ONLY stage name and selected approved public products—never hidden delivery, order tracking, return addresses or fan/creator private contact information. Age gate alone is not verification. Supplier CSV access does not authorize resale, commercial photography, connected-device advertising claims or order placement.

## Next launch milestones

1. Deploy `site/` only to a free compatible service (Netlify) and test 390px Android layout and full navigation.
2. Implement tested creator login and wishlist persistence using a suitable approved provider.
3. Obtain supplier onboarding, actual photo rights and a representative feed; test secure importer and stock snapshot expiry.
4. Implement privacy-protected gifting, payment-processing agreements and international shipping rules.
5. Measure beta creator interest from an actually consented opt-in service, not local-demo forms.
6. Add the official logo to every new outbound email as a hosted PNG or inline image attachment after the business email workflow is configured.

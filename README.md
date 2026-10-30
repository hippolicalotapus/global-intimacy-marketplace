# Global Intimacy Marketplace — rebuilt beta

**Status: pre-launch demonstration.** This is the new, independent, mobile-first Global Intimacy Marketplace storefront. It is not a checkout-enabled store. No live inventory, prices, commercial photo permission, confirmed resale-territory authorization, recurring marketing database, or customer orders are implied.

## What works in this beta

- 18+ self-attestation (session only)
- Photo-first home hero, early gallery of owner-supplied ONE HEART design previews, and image-first default catalogue sorting. Responsive discovery with functional Everyday, Premium, ULTRA and ONE HEART editorial collection filters, search, category and brand filters, sorting and detail panels
- Research catalogue with 103 previews (87 supplier research entries plus 16 owner-approved ONE HEART design concepts): original connected devices plus unapproved AI companion robots, adult-proportioned life-size silicone/TPE dolls, and care accessories. All entries are **unverified and not for sale**
- Local favorites and creator wishlist editor
- Discreet shareable public demo wishlist link based on the browser URL fragment (contains only creator stage name and selected item IDs)
- Guest wishlist preview and gift-interest demo without accepting payment
- Separate creator/fan interest-survey demo stored only in the current browser, not sent anywhere
- Accessible mobile bottom navigation and desktop top navigation
- Exact approved Global Intimacy Marketplace logo artwork, optimized for web and embedded in a local SVG wrapper (not redrawn)

## ONE HEART artwear previews and pre-order enquiries

The approved ONE HEART collection now includes five mountain hoodies (Rocky Mountains, Canadian Rockies, Purcell, Selkirk and Columbia Mountains) and eleven visionary art T-shirt concepts (Dimension One, Cosmic Fluidity, Sacred Forest, Stardust Unity, Realms Within, Melting Ruby Heart, Time Dissolves, Parallel Realms, Mind Expansion, Liquid Dimensions and Fractal Awakening). The branded artwork is shown using web-optimized reference crops derived from the owner's approved lookbook images, labelled as concept previews — not production-ready source files or manufactured-garment photography.

All 103 discovery entries offer a **nonbinding pre-order enquiry** link that opens the shopper's email app to contact globalintimacypartner@gmail.com. This does not collect, charge, reserve, confirm, authenticate, or promise a purchase. No prices, availability, ETA, stock, manufacturer agreement or supplier license should be implied. Store launch needs sample production, material/print approval, a compliant adult-friendly payment provider and explicit owner sign-off before paid pre-orders.

## What is intentionally not live

Real creator accounts, recipient identity/address storage, multi-device account sync, email/waitlist storage, payment processing, real product catalogues or prices, regional currency/tax quotes, actual stock, fulfillment automation, order tracking, private supplier/wholesale administration and AI email ingestion. These require authenticated server components and written supplier/payment/provider approval. Nothing is claimed as a real customer account or purchase.

## Free beta deployment

This is a **zero-build static beta**. The public deploy directory is only `site/`; the private supplier registry and import tools in `operations/` are excluded from public hosting. On Netlify, connect this private GitHub repository and select **Deploy with no build command**; publish directory is `site` (configured in `netlify.toml`). Netlify can create a free `*.netlify.app` preview URL. Do not publicize it until checking the site's content and adult-business hosting policy and running the beta checklist.

This project was rebuilt rather than exported from Replit. Do not delete Replit until backup of its database and object storage has been arranged. No private personal data from the old app is in this repository.

## Before production

1. Connect a suitable encrypted server database and authenticated creator accounts; enforce row-level access and test recipient-address privacy and gift fulfillment permissions.
2. Complete supplier onboarding, territory checks, exact SKU/media licensing and inventory/price feeds. Only publish authorized products.
3. Obtain a permitted adult-wellness payment processor, verify policies and implement compliant checkout, refunds and sales taxes.
4. Implement privacy/consent policy, data deletion, age-compliance, audit logging, abuse controls, security review and operational monitoring.
5. Implement consent-based early-access registration and real analytics with verified metrics; until then the survey here is only a local demonstration.
6. Supply a lawful business postal address and review CASL rules before bulk marketing emails.
7. Use the approved logo in branded emails with an actual hosted HTTPS image or approved inline attachment. Do not silently replace the approved mark.
8. Never expose supplier wholesale costs, secrets or real delivery information client-side.

## Concorde Pro catalogue staging\n\nOn Oct 28, 2026 our Concorde Pro professional account was activated and a confidential brand discount schedule delivered. The new 14 public-source research preview listings are staged privately with exact supplier page/EAN references under `operations/suppliers/concorde-public-candidates.json`. They are **not a live authorized feed, for sale, licensed photos, verified stock, retail prices or confirmed fulfillment**. The official CSV feed, media permissions, allowed custom-site resale countries and Canadian documentation equivalence remain to be confirmed with Céline Benitez. No €149 PrestaShop module or Shopify Matrixify purchase has been approved.\n\n## Source of product names

The original 66 research candidates came from the earlier `candidate_catalogue_66.csv` research file; seven companion/doll research-range entries and 14 Concorde Pro public catalogue research previews were added October 28, 2026. These names are **not claims of authorized dealership, availability, safety certification, current app support or pricing**. All photos use intentionally non-product abstract placeholders pending explicit commercial image rights.

## Brand

**Global Intimacy Marketplace** · `globalintimacypartner@gmail.com` · Official navy/teal/copper globe-and-connection logo. The source is owned by this GitHub account. No affiliation with OnlyFans, Stripchat, Chaturbate, Fansly or device manufacturers is claimed.

## Supplier compatibility

See `operations/suppliers/README.md` and the 18-contact/prospect status records in `operations/suppliers/supplier-registry.json`, including three uncontacted robotics/doll leads. See `operations/suppliers/COMPANION_ROBOTICS_AND_DOLL_SOURCING.md` for category-specific adult-proportion, manufacturer-permission, customs, app-privacy and shipping gates. The local importer stages approved-source CSV/JSON data without automatically accepting wholesale prices, posting live inventory, using media, or activating checkout. The Oct 26 Concorde Pro response is recorded accurately, including the CSV refresh statement and incompatibility of its PrestaShop-only paid module with this custom site.

## QA

GitHub Actions runs syntax checks and Node tests on updates; see `.github/workflows/beta-checks.yml`. Testing a deployed browser/mobile experience and backend integrations remains necessary before a public invitation.

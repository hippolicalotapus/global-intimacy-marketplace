# Global Intimacy Marketplace — rebuilt beta

**Status: pre-launch demonstration.** This is the new, independent, mobile-first Global Intimacy Marketplace storefront. It is not a checkout-enabled store. No live inventory, prices, supplier authorization, recurring marketing database, or customer orders are implied.

## What works in this beta

- 18+ self-attestation (session only)
- Responsive discovery with search, category and brand filters, sorting, detail panels
- Research catalogue derived from the October 2026 candidate-sourcing research; all entries are explicitly **unverified and not for sale**
- Local favorites and creator wishlist editor
- Discreet shareable public demo wishlist link based on the browser URL fragment (contains only creator stage name and selected item IDs)
- Guest wishlist preview and gift-interest demo without accepting payment
- Separate creator/fan interest-survey demo stored only in the current browser, not sent anywhere
- Accessible mobile bottom navigation and desktop top navigation
- Official approved Global Intimacy Marketplace wordmark/logo artwork (a resized copy, not a redesign)

## What is intentionally not live

Real creator accounts, recipient identity/address storage, multi-device account sync, email/waitlist storage, payment processing, real product catalogues or prices, regional currency/tax quotes, actual stock, fulfillment automation, order tracking, private supplier/wholesale administration and AI email ingestion. These require authenticated server components and written supplier/payment/provider approval. Nothing is claimed as a real customer account or purchase.

## Free beta deployment

This is a **zero-build static site**. On Netlify, connect this private GitHub repository and select **Deploy with no build command**; publish directory is the repository root `.`. Netlify can create a free `*.netlify.app` preview URL. Do not publicize it until checking the site's content and adult-business hosting policy and running the beta checklist.

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

## Source of product names

Research candidates came from the earlier `candidate_catalogue_66.csv` research file. These names are **not claims of authorized dealership, availability, safety certification, current app support or pricing**. All photos use intentionally non-product abstract placeholders pending explicit commercial image rights.

## Brand

**Global Intimacy Marketplace** · `globalintimacypartner@gmail.com` · Official navy/teal/copper globe-and-connection logo. The source is owned by this GitHub account. No affiliation with OnlyFans, Stripchat, Chaturbate, Fansly or device manufacturers is claimed.

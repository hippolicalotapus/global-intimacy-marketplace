# Private backend implementation plan (draft — not deployed)

Status: planning only. No provider contract, live account, personal data, payment integration, or production release authorized.

## Hosting decision
- Keep Netlify static beta at site/ unchanged.
- Preferred low-cost Canadian VPS candidate: OVHcloud VPS-1, conditional on written acceptable-use confirmation for lawful adult-wellness e-commerce and final pricing.
- Alternative: Web Hosting Canada VPS (published AUP permits legal adult content on VPS).
- Start with a single VPS for API and PostgreSQL; do not expose database port to the internet. Scale after measured sales/traffic. Self-management requires security maintenance and incident response.
- Require encrypted off-host backups with restore drills, automatic security updates, TLS, firewall, monitoring and MFA admin access before collecting real user data.

## Database boundaries
- PostgreSQL roles: public API, authenticated creator, fulfillment service, restricted supplier admin, migration operator; least privilege.
- Tables planned: accounts, creator_profiles, wishlists, wishlist_items, private_recipient_addresses, gift_intents, fulfillment_grants, suppliers, authorized_product_drafts, consent_events, deletion_requests, audit_events.
- Private address records must not be reachable by public wishlist queries or fan tokens. RLS deny by default; no direct client connection or service-role keys in browser.
- Fulfillment reads require scoped, time-limited server-side authorization and auditing; prohibit logging address contents.
- Only publish product records after documented territory, SKU, pricing, stock and media-rights approval.

## Required tests before launch
1. Anonymous, fan, creator A, creator B, and supplier cannot query or infer any private recipient address.
2. Creator A cannot modify creator B's wishlist or shipping data, including through altered IDs.
3. Fulfillment service can read only a specific authorized gift recipient, and grants expire/revoke.
4. API responses, errors, logs, analytics and frontend bundles contain no wholesale costs, secrets or recipient data.
5. Backups restore successfully; audit events cannot be modified by ordinary users.
6. Consent, deletion and retention controls pass tests; rate limits and anti-abuse protections operate.

## Gated milestones
1. Obtain written hosting AUP confirmation and owner's approval for server purchase.
2. Build backend and schema in an isolated development environment with synthetic data; run security tests.
3. Review privacy/age-compliance and Canadian/international data transfer requirements.
4. Obtain payment processor approval for exact product categories; configure tax/refunds only afterward.
5. Integrate authorized supplier feeds offline as drafts; separately approve media and channels.
6. Require explicit owner approval and production security review before collecting real accounts or enabling checkout.

## Never do automatically
Do not change site/, replace the approved logo, enable checkout, publish unapproved products, create provider accounts, accept contracts, send marketing, or upload confidential supplier data.

# GIM Vendor Marketplace — staged implementation plan
Updated: 2026-11-08
Status: PLANNING ONLY. No vendor subscription, commission, payout, application, or listing is live or approved.

## Strategy
GIM will combine its own authorized dropship catalogue with independently operated specialty vendor storefronts. Prioritize unusual, hard-to-find adult lifestyle goods and clothing. Support small makers, specialist boutiques, and larger distributors without misrepresenting supplier relationships.

## Commercial hypothesis (not an offer)
- Starter: free, proposed 10 listings, illustrative 12% commission.
- Boutique: illustrative CAD 29/month, proposed 100 listings, illustrative 9% commission.
- Professional: illustrative CAD 79/month, proposed 1,000 listings, illustrative 6% commission.
- Enterprise: negotiated.
All amounts, listing limits and rates are UNAPPROVED and require processor, legal, financial and competitive validation. No fees charged before verified merchant/vendor payout capability and demonstrable value.

## Stage gates
1. Research-only: supplier and vendor lead tracking; product categories and screening; no public applications promising sales or paid plans.
2. Closed vendor pilot: invite a handful of verified partners, confirm product legality, age gating, identity and beneficial ownership checks, resale rights, media rights, taxes, territory restrictions, return responsibilities, moderation and fulfillment SLAs. Use manual onboarding; no subscription fees.
3. Transaction pilot: only after processor explicitly underwrites adult merchandise, third-party marketplace funds flow, payouts and subscription billing; legal review of Canadian and destination-country requirements; durable orders, refunds, disputes, fraud controls, reconciliation, privacy and security testing.
4. Public marketplace: self-service vendor dashboards, product import, subscription tiers, payouts, inventory sync, moderation, reporting, vendor performance standards.

## Data records to define before implementation
Vendor: legal entity, jurisdiction, contact, identity verification status, adult product permissions, payout onboarding status, approved countries, policies, contract version, risk rating.
Product: vendor ID, SKU, category, title, age restrictions, source and media permission, size variants, landed cost, shipping countries, inventory, approval flags.
Order: immutable order ID, processor IDs, vendor allocation, taxes, shipping, fulfillment, refund and dispute events, reconciliation status.
Subscription: processor ID, plan/version, consent and disclosures, billing cycle, trial/cancellation/refund state.
Do not store government identity documents or payment credentials in repository.

## Approval controls
Default all vendor and product sale flags to false. No marketplace claims of approved affiliations without written confirmation. No payment activation, spending, mass outreach, or live publishing without authorization and documented eligibility. Protect the C$200 CAD initial test budget.

## Next execution queue
- Validate marketplace-capable payment processors that explicitly permit adult goods and split payouts in Canada.
- Compile and score independent vendor leads by unique inventory, shipping, media rights, reliability and commercial terms.
- Design invitation-only vendor intake questions and moderation checklist.
- Compare unit economics including fees, fraud, returns, taxes, and support.
- Build a separate testable onboarding prototype after payment feasibility is confirmed.

## Payment underwriting research and outreach — 2026-11-08
- Canadian regulatory consideration: Bank of Canada Retail Payment Activities Act guidance says marketplaces that receive customer funds and pay third-party vendors may perform regulated retail payment activities. Obtain qualified Canadian payments-law assessment of actual funds flow before launch; provider usage alone does not settle the issue.
- Verotel / Bitsafe platform payout eligibility enquiry sent to sales@verotel.com; Gmail message 1a1bb7f65bcd507b. Questions: Canadian legal entity, physical adult merchandise, direct third-party vendor payouts, subscriptions, fees, reserves and integration. Await written response; no eligibility established.
- Segpay enquiry sent to sales@segpay.com; Gmail message 1a1bb7f6be3f976d. Questions: Canadian eligibility, physical adult goods, third-party merchant vs affiliate payouts, subscriptions, fees and reserves. Await written response; no eligibility established.
- CCBill initial pre-application enquiry was previously sent; Gmail message 1a1bb0c088cfc745. Do not resend without checking replies.
- **BLOCKER for transactions:** no processor has provided written approval for Canadian physical adult goods + independent vendor payments. No subscription, marketplace checkout, vendor payout or merchant onboarding may be enabled.
- **Nonblocking work:** continue catalog taxonomy, unique product research, vendor onboarding form design and cost modeling without collecting sensitive data or promising live sales.

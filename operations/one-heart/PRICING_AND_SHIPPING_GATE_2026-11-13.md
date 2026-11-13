# ONE HEART — Canadian hoodie pricing and shipping gate (2026-11-13)

**Status:** Internal working policy only. Not approved for public display, live checkout, or unconditional shipping claims.

## Proposed customer prices (CAD)
- Standard SF500 DTG hoodie: **$74.99** including eligible standard Canadian shipping.
- Premium L00580 DTG hoodie: **$84.99** including eligible standard Canadian shipping.
- Build-your-own hoodie: quote separately after customization and fulfillment cost validation.
- Outside Canada: show destination-specific shipping before any purchase.
- Remote Canadian destinations / PO boxes: calculate and disclose any surcharge before payment. Never advertise unconditional free Canada-wide shipping.

## Supplier quote and cost assumptions
G&L Printing Services quote attached to Grace Rooney's November 13 email, `One Heart Product Pricing.xlsx`:
- Standard SF500 DTG front + back: **$37.90**.
- Premium L00580 DTG front + back: **$43.52**.
- POD fulfillment: **$3.50/order**.
- Shipping estimate for an Alberta hoodie: **$13–$16**; PO boxes **$20–$23**.
- 2XL and larger: **+$3.50**.
- One-time setup: **$35/design/print method**.
- Quoted amounts may be subject to HST/tax. Confirm actual tax treatment before taking payment.
- No supplier API specifications or production-ready art/sample approval yet.

## Illustrative contribution at $16 shipping and a *hypothetical* 3% processor fee
These are **not** net profit or guaranteed margins. Exclude tax, ad spend, returns, setup amortization, support, and overhead.

| Product | Price | Print | Fulfillment | Shipping | Hypothetical fee | Contribution |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Standard | $74.99 | $37.90 | $3.50 | $16.00 | $2.25 | **$15.34** |
| Premium | $84.99 | $43.52 | $3.50 | $16.00 | $2.55 | **$19.42** |

## Checkout acceptance criteria (future implementation)
1. Canadian eligible postal codes show the inclusive price and $0 standard shipping.
2. Remote/PO box postal codes get a real carrier/supplier quote; if a surcharge applies, show it before payment and never silently charge it.
3. Outside Canada gets a destination-based quote; unsupported destinations cannot pay.
4. Unavailable shipping quotes fail closed; never silently assume $0.
5. Size upcharges, taxes, customization, and final payable total are itemized before payment.
6. Supplier costs and margins are not exposed in public client files.
7. No checkout, publishing, deployment, live order, or paid commitment until owner approval.

## Launch blockers
Verify actual G&L shipping rates by postal code and PO box; supplier integration and fulfillment terms; sample quality and original production-ready art; legal tax treatment; returns policy; payment provider eligibility; product labeling; privacy/security; and written owner approval.

This document intentionally lives under `operations/`, outside Netlify's `site/` publish directory.

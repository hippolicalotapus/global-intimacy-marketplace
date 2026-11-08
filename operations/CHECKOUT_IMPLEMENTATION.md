# Secure checkout foundation (NOT LIVE)

Netlify function: `/.netlify/functions/create-checkout-session`. It creates a Stripe-hosted Checkout Session using server-only approved Stripe Price IDs. It **cannot** charge anyone in its default configuration.

## Activation gates

1. Obtain **written Stripe approval for the exact adult marketplace business and categories**. Stripe may decline this model. Do not misclassify the business or route prohibited items through Stripe.
2. Obtain reseller, product, territory, stock, delivery, return, and fulfillment authorization for **each** sellable SKU. Supplier names in the preview are not partnerships.
3. Verify Canadian incorporation/merchant details, taxes, shipping costs, age restrictions, refund and privacy policies, and actual pricing.
4. Implement a durable server-side order database and a **signature-verified Stripe webhook** for `checkout.session.completed` and asynchronous payment events, with idempotent fulfillment. A browser redirect is never proof of payment.
5. Implement a live cart UI, payment state and order confirmation/status pages, reconciliation, refunds, and end-to-end test-mode purchases before production.
6. Use a processor approved for adult categories if Stripe declines. Never turn on checkout merely because an API key exists.

## Environment (server only)

- `GIM_CHECKOUT_ENABLED`: must be exactly `true` (default absent/disabled).
- `STRIPE_SECRET_KEY`: server secret; never in `site/` or git.
- `GIM_PUBLIC_ORIGIN`: exact HTTPS origin, e.g. `https://globalintimacymarketplace.netlify.app`.
- `GIM_APPROVED_CHECKOUT_ITEMS`: private JSON object keyed by internal SKU. Example (illustrative, **not approved**):

```json
{"sample_sku":{"stripePriceId":"price_EXAMPLE","saleApproved":false,"stockVerified":false,"fulfillmentApproved":false,"processorApproved":false}}
```

All four flags must be explicitly true for each item; the backend rejects everything else. Client-supplied prices are ignored. The function currently restricts shipping to Canada as a conservative initial default, **not** a claim that any supplier ships there.

## Security / incomplete items

- The function uses Stripe-hosted payment fields; it never handles card numbers.
- A fixed Origin check is a defense-in-depth browser constraint, **not authentication or bot prevention**. Add rate limiting/abuse controls before activation.
- No real cart is connected, no live prices exist, and no webhook/order persistence exists yet.
- The result page referenced by the session URL must be created before activation.
- Never expose private supplier feed prices, secret keys, customer addresses, or identity documents in public assets.

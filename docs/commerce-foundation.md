# Commerce foundation milestone — private development branch

Current status: static pre-launch beta; no live checkout, vendor accounts, inventory, supplier fulfillment or subscriptions. This file is a development contract, not proof those capabilities exist.

## Safety and release boundaries
- Preserve the approved Ruby Heart welcome, catalogue illustrations, existing design decisions and current static storefront.
- Netlify publishes only `site/`. Keep private supplier records, wholesale pricing, credentials and customer addresses outside it.
- Never turn research catalogue entries into saleable products without verified supplier/channel/territory and commercial-media rights.
- Never activate checkout until a provider explicitly approves the business and relevant product categories.
- No automatic production deployment or paid service from this branch.

## Future backend model
- vendors: ID, public slug, legal entity, status, approval timestamp.
- vendor_memberships: user, vendor, role, revocation; unique user/vendor.
- products: vendor, supplier SKU, territory, image-rights evidence, approval status.
- inventory_snapshots: product, source, supplier timestamp, received timestamp, quantity.
- orders: buyer, currency, total in minor units, status, payment reference, unique idempotency key.
- order_lines and fulfillment_jobs: line state, supplier submission key, external reference and reconciliation state.
- vendor_subscriptions: plan, provider reference, status, billing period.
- audit_events: actor, action, entity, request ID, timestamp; no sensitive payload.
- recipient_addresses: encrypted and server-restricted; never expose to wishlist fans.

## Non-negotiable behavior
1. Server-side access checks for every vendor and customer read/write.
2. Server-side totals, shipping, tax, territory and inventory eligibility.
3. Signed payment webhooks and deduplicated events before fulfillment.
4. Idempotent payment and supplier submission to prevent double charges/orders.
5. Block stale or unknown stock; quarantine ambiguous supplier responses.
6. Never expose wholesale costs, supplier credentials or recipient addresses publicly.
7. Vendor subscriptions, commissions and refunds remain disabled until terms and billing are approved.

## Next implementation order
1. Select backend and permitted data region; add migrations and automated access-control tests.
2. Vendor application/review with pending status by default.
3. Rights-controlled catalogue and freshness-checked inventory.
4. Mock-only order state machine and supplier adapter with replay/failure tests.
5. Integrate approved payment and supplier services after contracts.
6. Mobile end-to-end tests, security review, privacy compliance and explicit launch approval.

No main-branch merge or Netlify publication is part of this milestone.

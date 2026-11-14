# GIM custom apparel — internal fulfillment gates

Current implementation is fictional/offline only. The internal garment preview is outside the Netlify `site/` publish directory.

1. Keep ONE HEART and Sarcastabastard approvals distinct. Existing visual concepts are not automatically rights-cleared or print-ready.
2. Require explicit approval for each garment SKU, size, colour, print area and sample proof.
3. Verify destination-specific shipping, tax, supplier price, returns, and landed margin before presenting any payable total.
4. Use durable atomic idempotency for real orders; the existing in-memory demo reservation is not production protection.
5. Store API credentials server-side only. Never send a real Gelato request from the static site.
6. Verify customer artwork rights and content moderation; never treat demonstration artwork as a production asset.
7. Test checkout, refund, webhook replay and failed fulfillment using synthetic data before requesting a separate release decision.

No real orders, payments, deployment, publication or spending are authorized.

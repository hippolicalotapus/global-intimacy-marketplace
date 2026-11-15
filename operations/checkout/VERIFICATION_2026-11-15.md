# Storefront cart integration — private development checkpoint

Base: `631497c9400f32eded5cc6600fc0eab6aff9ce91` (`automation/gim-shipping-navigation-verified-20261114`).
Imported the safe cart navigation and private cart-readiness validator from `0f1cb44b55b00db8b601198a2d281aafbfc2c2c0` (`automation/gim-offline-checkout-verification-20261114`). Retained the newer shipping, country navigation, Ruby Heart, approved artwork and storefront tests from the base.

The storefront now links to an actual cart document. The cart uses the approved logo, the existing typography and palette, an explicit empty state, disabled checkout, and collection return links. It has no script, form, payment integration or personal-data fields. Private cart validation calculates only verified fixture subtotals and never enables checkout. No product approvals or stock claims changed.

The previous cart draft used inline styling, which conflicts with the production `style-src 'self'` policy. Styling is now in `site/cart.css`, and a regression asserts that the cart has no inline styles. Header actions wrap at smaller widths to accommodate the new cart link without removing early access.

## Verification

- Exact Git blob retrieval restored the complete public assets, including all 110 drawing files. Unchanged source files were checked against base Git blob hashes; retrieval-added terminal newlines were removed.
- `node --test tests/*.test.mjs operations/suppliers/import-feed.test.mjs operations/checkout/*.test.cjs`: **109 passed, 0 failed**.
- The cart navigation regression initially failed because the cart document was absent from this branch; it passes after integration.
- An optional Playwright regression is prepared in `storefront-cart.browser.cjs` for 1440, 1024, 768, 375 and 320 pixel widths. It serves the actual production CSP and checks navigation, visible cart target, disabled checkout, loaded external styling, overflow, country preservation, Ruby Heart replay and absence of mutation requests.
- Actual browser verification is **blocked** in this environment. Chromium exits before loading a page: `process_singleton_posix.cc: socket() failed: Operation not permitted`. No screenshot or browser layout verification is claimed. Run `node --test operations/checkout/storefront-cart.browser.cjs` where Playwright and Chromium are available; set `CHROMIUM_PATH` if needed.

Prepared on a development branch only. No Actions, deployment, public publication, payment, external communication or account changes were triggered. The older Venice integration branch remains separate and unchanged; no unrelated private supplier operations were copied into the public site.

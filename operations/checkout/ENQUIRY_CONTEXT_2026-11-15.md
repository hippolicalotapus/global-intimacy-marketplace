# Product enquiry context checkpoint

Base: `44dd7842994a45cafa972e01dcd6b7fa53ac80a2` on `development/gim-safe-cart-design-20261115`.

Every product card and details enquiry previously produced a blank country line, even after the shopper explicitly selected a destination. Apparel enquiries also omitted the known design code. This discarded information needed to answer a product or fulfillment enquiry accurately.

The shared mailto builder now includes the selected country name and two-letter code, plus the apparel design code when the product has one. Changing countries regenerates the draft context through the existing destination-change render flow. Research items without a design code retain their preview ID and do not receive an invented code. Recipient, subject, optional quantity and all existing nonbinding/no-payment/no-reservation/no-delivery-promise wording remain unchanged. The link opens the shopper's own email app; nothing is sent automatically.

The initial real-script regression failed because the generated card mailto contained `Country / region: ` instead of `Country / region: Canada (CA)`. Tests now decode generated card and details URLs, check consistent context, change the destination to the United States, check that Canada is absent from the regenerated draft, and verify that research products without design codes remain accurately described.

`node --test tests/*.test.mjs operations/suppliers/import-feed.test.mjs operations/checkout/*.test.cjs` passed **114 tests, zero failures**. `node --check site/app.js` passed. Native browser inspection can verify the encoded links without clicking them or sending an enquiry.

Preview source copy list: `site/app.js` only. No artwork, brand text, stock flags, supplier permissions, delivery eligibility or checkout controls changed. No message, signup, payment, main update or deployment was performed in this checkpoint.

Resume verification: all 114 tests passed again. Native Chromium at 390px opened Three Sisters hoodie details and inspected the mailto without clicking or sending it: Canada (CA) and design OH-H01 were present. After changing to United States, explicitly re-enabling research previews and reopening details, the draft included United States (US), retained OH-H01 and contained no stale Canada (CA). Nothing was sent.

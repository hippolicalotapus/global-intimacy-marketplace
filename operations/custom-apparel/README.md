# Custom apparel - internal mock order experiment

This is an **internal, offline T-shirt/hoodie customization workflow**. Stored in `operations/custom-apparel/` outside Netlify's `site/` publish directory and not linked from the public storefront. Do not move it into `site/` or connect it to checkout without written owner approval.

Open `index.html` locally to select garment, size, colour, front/back text and front placement; preview two-sided illustrative shirt/hoodie silhouettes with garment colour and print positioning, then generate a **fictional mock receipt**. This prototype makes no network requests, stores no data, takes no money, and submits no real orders. New page loads reset the mock session. There is no supplier integration or stock validation.

Run `node --test tests/custom-apparel.test.mjs` from repository root. These are deterministic model/browser-stub tests, not photorealistic garment renders, verified print-zone measurements or proof of artwork print quality, accessibility on actual devices, shipping, supplier acceptance, permission to use user-uploaded artwork, or live purchase readiness.

Before launch: rights-cleared artwork uploads and moderation, print specification and supplier proofing, actual catalogues and cost validation, verified shipping/tax/returns, secure customer information handling, and separately approved payment and fulfilment integration. Approved ONE HEART/SARCASTABASTARD designs remain untouched.

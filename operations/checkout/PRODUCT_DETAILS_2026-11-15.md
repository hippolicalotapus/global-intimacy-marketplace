# Product-details mobile reading checkpoint

Base: `90182a6a5073ff9631a0693a9bfa0ebd3f5990f7` on `development/gim-safe-cart-design-20261115`.

Long hoodie front-and-back previews previously scrolled the complete dialog, including its absolutely positioned close button. Actual 320-pixel browser verification by the root agent confirmed that scrolling to the actions moved the close button outside the visible dialog (close top -1663 pixels). Product actions already wrapped without horizontal overflow, so their existing layout is preserved. The preview content now scrolls inside `modalBody`, keeping the sibling close control available. The close target is 44 pixels square. Approved artwork, product text and sales controls are unchanged.

Opening a new details modal resets both previous scroll containers to the top. Toggling Save inside an already open modal preserves the content reading position. A real-script regression was added before this reset and failed with the expected `600 !== 0` assertion. The full documented suite then passed **112 tests, zero failures**:

`node --test tests/*.test.mjs operations/suppliers/import-feed.test.mjs operations/checkout/*.test.cjs`

The optional Playwright regression now checks product 201 at all five existing viewport widths: scroll the content, retain a visible 44-pixel close target, fit action buttons inside the dialog without horizontal overflow, and close successfully. Shell Chromium was not retried. Real viewport rendering is being checked separately through the root agent's supported browser preview; this source checkpoint does not claim those browser results.

Preview source update list: `site/app.js` and `site/styles.css` only. No main update, deployment, outreach, purchase, supplier authorization, stock claim or artwork modification was performed by this checkpoint.

# Product-details mobile reading checkpoint

Base: `90182a6a5073ff9631a0693a9bfa0ebd3f5990f7` on `development/gim-safe-cart-design-20261115`.

Long hoodie front-and-back previews previously scrolled the complete dialog, including its absolutely positioned close button. Actual 320-pixel browser verification by the root agent confirmed that scrolling to the actions moved the close button outside the visible dialog (close top -1663 pixels). Product actions already wrapped without horizontal overflow, so their existing layout is preserved. The preview content now scrolls inside `modalBody`, keeping the sibling close control available. The close target is 44 pixels square. Approved artwork, product text and sales controls are unchanged.

Opening a new details modal resets both previous scroll containers to the top after `showModal()`. Native Chromium verification revealed that activation restored the old scroll position when the reset ran before `showModal()`; the DOM fixture now models that observed side effect. The corrected order failed against the prior implementation with the expected `600 !== 0` assertion and passed after the fix. Toggling Save inside an already open modal preserves the content reading position. The full documented suite passed **112 tests, zero failures**:

`node --test tests/*.test.mjs operations/suppliers/import-feed.test.mjs operations/checkout/*.test.cjs`

The optional Playwright regression now checks product 201 at all five existing viewport widths: scroll the content, retain a visible 44-pixel close target, fit action buttons inside the dialog without horizontal overflow, close successfully, and reopen at scroll position zero. Shell Chromium was not retried. The root agent's real 320-pixel browser preview confirmed the fixed close target at 44×44 pixels (top 84.4, bottom 128.4), entirely within the visible dialog; content scrolled to 1747 while the outer dialog remained at zero. Content width and scroll width were both 260 pixels. Keyboard Tab between the lower actions kept the close control visible. Final native verification closed the modal using keyboard Enter on the close button, then reopened product 201 and confirmed `modalBody.scrollTop === 0`.

Preview source update list: `site/app.js` and `site/styles.css` only. No main update, deployment, outreach, purchase, supplier authorization, stock claim or artwork modification was performed by this checkpoint.

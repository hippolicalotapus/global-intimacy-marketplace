# Header search focus — development checkpoint

Base: `f1b6e5b530ce72b5fbd06376713031a72b8facde`, branch `development/gim-safe-cart-design-20261115`.

The first character typed into header search changes the route to `#results`. Its hash-change handler previously focused the results heading, interrupting typing. Conversely, submitting a later search on the same route did not move focus to the results because no hash-change event occurred.

Live searching now preserves focus in the search input. Explicit search submission navigates and focuses the results heading even on the same route. Direct result routes and category navigation retain their existing focus behavior. The DOM fixture now normalizes assigned URL fragments with `#`, as browsers do, so these event regressions exercise the real scripts with realistic hash values.

Both new regressions were run against the original app script and failed with the expected focus-count assertions. After restoring the fix, `node --test tests/*.test.mjs operations/suppliers/import-feed.test.mjs operations/checkout/*.test.cjs` passed **111 tests, zero failures**. Chromium was not retried: actual browser verification remains blocked by the environment's socket permissions.

## Release mapping observed

- Repository default branch: `main`, observed at `c77b696652791432ad6030ba899fa8c8a1b24766`.
- Before this change, the development branch was 8 commits ahead and 0 behind main.
- Existing production host: `https://globalintimacymarketplace.netlify.app/`; `netlify.toml` publishes only `site/`, with no build command.
- Production `/app.js` was fetched read-only and its exact 33,551 bytes matched main's Git blob `301e08a3fcf14919fdfffa710236c826f8c3aacb`. This verifies that file's baseline; it does not establish the whole deployed commit or account's Netlify site ID.
- Main's existing GitHub `validate` check completed successfully on November 13. Combined commit statuses were empty; no Netlify deployment identity was exposed there.

No main update, deployment, purchase, publication or outreach was performed in this development checkpoint. Root release work must reconcile the complete public file manifest and verify the eventual live deployment. Supplier approvals, stock, delivery gates, disabled checkout, Ruby Heart and brand artwork remain unchanged.

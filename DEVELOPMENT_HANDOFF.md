# Development continuity — GIM / RDS / MMS

Last verified: 2026-11-18. This is a cross-project handoff, not a substitute for source control or CI results.

## GIM
- Repository: hippolicalotapus/global-intimacy-marketplace
- Development branch: development/country-restriction-overlay
- Verified branch HEAD before this handoff: 18708e5af334c6493a80caecac5bd953b395ab2d
- Change: site/destination.js persists research-preview browsing preference; country selection already persisted.
- Verification: 8/8 static source checks at implementation; browser reload and original Node suite NOT verified.
- Keep unverified checkout and real payments disabled. Confirm actual eligibility before selling.

## RDS
- Repository: hippolicalotapus/Oneheart_Sarcastabastard_store
- Verified integration commit: 97024bedecf0e254b823fbfa6159ea62f63998fa (do not assume default main matches).
- Source: app.js fetches catalogue/launch-27.json in init(). Failure sets status text and provides no retry. Event listeners are registered inside successful init(); retry must not register duplicate listeners.
- An isolated local 503-then-200 retry prototype reportedly passed 2/2 Node tests; NOT integrated into the full app, and original 77-test suite has NOT been rerun.
- Preserve exactly 27 sale-disabled products, approved art, small chest print, wishlist/studio safeguards.
- Next: recover full source in small GitHub connector batches without repeating blocked DNS clone; integrate retry; run original Node suite and Chromium 503 recovery; commit only verified passing changes.

## MMS / QuestForge
- Repository: hippolicalotapus/QuestForge
- Development branch: development/storage-reliability-20261118
- Verified HEAD: d3d6eb0a2474585a774b3935bfa3fa0e05bb0c7d
- Change: index.html handles localStorage save failures for character and campaign; existing JSON export retained.
- Verification: 8/8 static source checks; browser denied-storage and complete suite NOT verified.
- Next: browser-test save success, denied-storage messages, reload, and JSON export.

## Operating rules
1. Verify actual branch HEAD and source before editing; do not rebuild existing features.
2. Distinguish static checks, isolated tests, original suite, and Chromium runtime tests precisely.
3. Commit only tested improvements. Preserve approved artwork, data, and customer safeguards.
4. Update this handoff after meaningful commits and before recommending a new conversation.
5. Never enable unverified live payments; no spending without separate confirmation.

# YXROBOT reconciliation gate

Run locally with Node.js 20+ from the repository root:

```sh
node --test operations/commerce/yxrobot-draft-import.test.mjs
```

The live read on 2026-11-12 found 280 populated supplier rows across STPE (224), Silicone (21), Hybrid (9), AI Robot (2), and Anime (24). The row-by-row comparison against the then-current importer logic identified one duplicate key at STPE source row 222 and two nonnumeric body codes at STPE rows 48 (B15) and 145 (158S). The importer was subsequently changed to preserve these codes; those two rows should no longer be rejected solely for nonnumeric body size.

Acceptance gate for a complete import:
1. Re-read the five exact supplier tabs from the live source; confirm source revision and nonempty row totals.
2. Pass the Node test suite.
3. Feed all rows into `draftYXRobotCatalogue`; assert `drafts.length + rejected.length === 280`.
4. Review the rejected duplicate at STPE row 222, including whether it is truly redundant; preserve original row provenance.
5. Assert no records have `published === true`, media rights, wholesale price, or fulfillment verification inferred from catalogue access.
6. Save a private reconciliation report, not a public catalogue or deployable product feed.

**Status:** source inspection and adapter changes are complete. Full execution of tests and complete 280-row import have not been verified. This document is a gate, not a claim of passing tests.

# GIM supplier preview implementation contract — 2026-11-12

Status: implementation specification, not a completed import or deployed preview.

## Verified starting point
- Development branch: `development/commerce-foundation-20261111`.
- YXROBOT source reconciliation: 280 rows, 279 distinct draft candidates, one duplicate (STPE row 222).
- Preserve raw body codes B15 and 158S as strings.
- Existing static beta serves `site/` through Netlify; `operations/` remains outside the public deploy directory.
- Concorde Pro public research candidates are staged under `operations/suppliers/concorde-public-candidates.json`.
- Owner confirms supplier permissions for YXROBOT and Concorde; do not repeatedly ask. Confirm specific integration data only when technically necessary.

## Safe build sequence
1. Read the existing private importer and catalogue data model; do not duplicate the import mechanism.
2. Import YXROBOT records with stable source+SKU keys and duplicate/rejected-row provenance. Default every imported product to `draft`, `purchasable: false`, and `inventory_verified: false`.
3. Map preview-safe fields (title, supplier, category, images, description, variants) into a *separate* non-checkout preview data source. Never export confidential wholesale costs or credentials to `site/`.
4. Add source/category/search filters and mobile product detail views using existing storefront components, preserving current beta catalogue and owner art.
5. Integrate Concorde candidates using the same preview adapter, distinguishing research candidates from verified feed rows.
6. Test duplicate handling, missing images, nonnumeric size codes, mobile navigation, disabled checkout, and no private cost leakage.
7. Use an authorized preview build only after owner approval for any deployment or paid usage. A commit alone is not a deployed preview.

## Acceptance criteria
- Exactly 279 unique YXROBOT draft candidates when the full reconciled sheet is available and passes import validation; reject or report duplicates explicitly.
- Concorde and YXROBOT can be filtered separately, and missing data never appears as fabricated stock or prices.
- Preview-only products cannot enter paid checkout or create orders.
- Existing catalogue and site behavior remain regression-tested.
- Actual screenshots or Netlify URL must be verified before claiming the preview is visible.

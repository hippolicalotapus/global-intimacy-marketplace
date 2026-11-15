# Concorde supplier integration checkpoint — 2026-11-12

## Confirmed owner decisions
- Concorde is approved as a wholesale supplier for Global Intimacy Marketplace.
- The owner confirms permission to use Concorde's catalogue product photographs on the GIM website. Do not request supplier approval or photography permission again merely to repeat this decision.
- Preserve this confirmation as an owner-reported authorization. Retain any supplier-provided written terms or limitations when available; do not invent them.

## Integration requirements
- Use original Concorde catalogue photographs and product identifiers where available; avoid unnecessary replacement artwork.
- Import to **draft/unpublished** product records until catalogue source, pricing, stock, shipping/fulfillment, territories and any applicable terms are reconciled.
- Keep wholesale pricing, credentials and supplier operations outside the public Netlify `site/` directory.
- Map supplier SKU, product title, description, variants, media URL/source, inventory timestamp, wholesale cost, proposed retail price, shipping constraints, and publish eligibility.
- Do not assume a live inventory feed, order API, or payment integration exists. Confirm actual data formats before building a production adapter.
- Prevent duplicate products and duplicate supplier outreach.

## Release boundaries
- Work on the existing `development/commerce-foundation-20261111` branch / draft PR #18.
- No live publication, checkout activation, Netlify deployment, paid services or supplier contact without applicable approval.
- Keep existing storefront and approved designs intact.

## Next technical checkpoint
1. Fix the known stale-inventory test fixture and verify CI.
2. Inspect existing supplier import and catalogue architecture for reusable mapping logic.
3. Implement a fail-closed Concorde draft-import adapter with fixture tests, without inventing actual catalogue data.
4. Commit and verify tests before considering release.

This is a decision and implementation checkpoint, not proof that the catalogue has been imported.

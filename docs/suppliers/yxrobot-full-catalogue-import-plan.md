# YXROBOT full-catalogue coverage decision — 2026-11-12

## Owner direction
- Include **all available models and variants**, not a handpicked subset. Maximize customer choice subject to verified commercial eligibility.
- Do not confuse full *draft ingestion* with approval for public sale or media use.

## Verified source
- Supplier sheet: https://docs.google.com/spreadsheets/d/1Dslykb38lZqvd8TOiI7OJ-VRGJMQl46JS2LDhcK5G2I/edit
- Five tabs: STPE, Silicone, Hybrid, AI Robot, Anime.
- Observed columns include head sculpt identifier, body size, cup, product reference, and sometimes material. Some headings are Chinese.
- Supplier email from info@yxrobot.ai on November 12 offers high-resolution model-specific photos/videos after receiving model numbers. Do not assume a catalogue-wide media package has been delivered.
- Public website media permission, unit pricing, shipping, one-unit dropshipping and destination eligibility remain unverified.

## Importer contract
1. Read **every populated row** from all five tabs, paginating and recording tab + row provenance.
2. Normalize Chinese column labels, model codes, body height, material and variant attributes. Preserve original values and reference strings.
3. Generate deterministic supplier-scoped keys based on tab, head identifier, body size, material, cup and variant/reference; detect collisions rather than silently overwrite.
4. Distinguish model family from sellable variant; do not merge distinct size/material/head combinations.
5. Validate input types, URLs and image rights; retain missing values as missing, never synthesize wholesale costs, stock, delivery times or photos.
6. Store all imported records privately with status `draft`, source timestamp and row-level validation results.
7. Provide reconciliation counts: total source rows, imported variants, invalid rows, duplicate keys, missing pricing, missing shipping eligibility, missing media permission.
8. Publish eligibility requires explicit confirmed wholesale price/currency, retail pricing policy, availability, shipping/fulfillment region and website media rights where images are used.
9. Future source refreshes should upsert deterministically and flag removed source rows for review, not silently delete published records.
10. No deployment, paid service, supplier email or checkout activation without applicable approval.

## Next milestone
Implement the read-only all-tabs ingestion and normalization tests on the existing development branch, then verify actual row counts and import results before claiming completion.

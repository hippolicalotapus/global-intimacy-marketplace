# Supplier compatibility & launch gates

This is an **internal, private, approval-first integration layer** for Global Intimacy Marketplace. This is not yet an order connector or an approved dealer inventory system.

## What we've actually heard (October 26, 2026)

| Supplier | Reply / current status | Integration approach | Blocker |
|---|---|---|---|
| Concorde Pro (France) | Sales reply received | Supports URL-based CSV catalogue including EAN, photos, descriptions, MSRP and stock, refreshed by supplier every 30 minutes. Importer can stage a locally downloaded sample; *automated authenticated URL pulling is not yet implemented*. | Sign up at concordepro.com; receive dealer schedule, actual feed and channel permissions; confirm custom-order submission process. Their **€149 PrestaShop module is PrestaShop-only** and their Shopify Matrixify subscription is not needed for this custom website. |
| MSX Distribution (Italy) | Acknowledgement, ticket #39564 | Feed type not confirmed | No approved dropship relationship, product feed or territories |
| Satisfyer | Support acknowledgement | Product specs and models to verify against actual catalogue | No resale rights, photo permission or regional approval |
| Sexy Living / EP Products (Canada) | Emails sent | Adapt file/API/Shopify feeds if supplier authorizes custom website | Need exact API specs, fees, territory and licenses |
| Williams Trading / Eldorado (US) | Emails sent | US catalogue and feed adapter once accessible | Need approval, cross-border eligibility and access terms |
| Dreamlove (Spain) | Email sent | Supplier CSV/XML/API adapter once format confirmed | Need authentic file sample, EU/UK jurisdiction and returns terms |
| LELO, SVAKOM, Kiiroo, Good Clean Love | Brand outreach | Brand-origin/authorized distributor import, never guessed | Reseller approval/channel restrictions |
| Lovense, Lovehoney Group and The Handy | Formal B2B applications pending | Authorized partner/feed only | Applications, commercial image use, order flow |

For all actual individual statuses and source descriptions see `supplier-registry.json`.

## Our data pipeline

```text
Business Gmail + Spam (existing hourly watch)
                 |
       Verify sender, terms, attachments
                 |
      Secure supplier/admin staging queue
       /        |            \
  CSV/TSV     JSON         Future XML/API
     \         |            /
          Common SKU/EAN mapping
                  |
    Duplicate review, territory and licensing
                  |
       UNAPPROVED private product drafts
                  |
  Separate owner review / signed authorization
                  |
Verified saleable items in future secured database
                  |
       Public storefront / safe order router
```

**As built now:** Only a local/offline CSV or JSON `import-feed.mjs` staging adapter and the public **demo-only** storefront exist. Receiving a new email does not itself add products publicly.

## Private import example

Obtain a **supplier-provided permitted sample catalogue**. Save it locally outside this GitHub repository, then run:

```sh
node operations/suppliers/import-feed.mjs --supplier concorde-pro --file /path/to/authorized-catalogue.csv
node --test operations/suppliers/import-feed.test.mjs
```

The program writes `private_staging/{supplier}-{timestamp}.json`, ignored by Git and never deployed. It does not use credentials, scrape websites, contact supplier URLs, send orders, or make payment transactions. Source wholesale prices are kept under `privateSupplierData` and must never enter `site/`.

Input support today: supplier CSV, semicolon-delimited CSV, TSV and JSON. The field aliases are best-effort guesses; **the actual Concorde CSV schema is not yet received**, so a sample must be checked and an explicit mapping approved. Malformed/duplicate entries are quarantined. Products remain pending even when stock quantity appears greater than zero.

## Required security and compliance gates before an item can be live

- Signed/traceable authorization from manufacturer or authorized wholesale distributor for the **specific storefront, sales channel and country**.
- Correct GTIN/EAN, model, variant, electrical/Bluetooth radio labeling and applicable jurisdiction restrictions.
- Separate written rights to use the actual model's product photograph, marketing claims and trademarks.
- Real stock update status, refresh interval, wholesale cost, shipping fees, applicable taxes/duties, returns and warranty terms.
- A verified **custom-site fulfillment interface** or manual authorized business process with tracking. A Shopify/PrestaShop-only module is not automatically compatible.
- Retail prices approved after margin/MAP/MSRP reviews; **no supplier wholesale cost visible publicly**.
- Suitable approved adult-wellness payment processing and age/access policies.
- Owner approval of the first production supplier integration and launch.
- When true commerce goes live, secure creator addresses in restricted server-only records; fan gifting pages must never expose them (including network/API payloads, invoices and tracking).

## Inventory freshness and multi-supplier routing

Concorde's stated feed refresh is 30 minutes at **their end**, not proof of a live sync from our site. Configure a server-side scheduled poll after contract/access. Reject stale feeds and block ordering on missing stock confirmation. Deduplicate by supplier ID + supplier SKU internally; evaluate GTIN matches across suppliers with manual variant review before merging listings.

Order routing must be separate from product-import logic: a supplier's permission to supply CSV data does not grant permission or provide an API to place dropship orders.

## Future operational architecture

Use authenticated server/service components for supplier adapters, persistent product database, creator identities, private delivery records, verified media storage, payment webhook and merchant reconciliation, shipping status, access logs and e-mail triggers. The static free beta deploys only `site/`; the `operations/` folder is not published through Netlify. Do not call the beta a working marketplace checkout.

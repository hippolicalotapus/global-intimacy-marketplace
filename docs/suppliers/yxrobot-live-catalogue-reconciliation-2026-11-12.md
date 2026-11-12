# YXROBOT live catalogue read-only reconciliation — 2026-11-12

Source: https://docs.google.com/spreadsheets/d/1Dslykb38lZqvd8TOiI7OJ-VRGJMQl46JS2LDhcK5G2I/edit

Read-only connector inspection: exact tabs STPE, Silicone, Hybrid, AI Robot, Anime, bounded A1:F1000 each. Returned populated rows (excluding header): STPE 224, Silicone 21, Hybrid 9, AI Robot 2, Anime 24; total **280**.

This is **not** an import count or confirmed unique SKU count. The connector read does not constitute durable, private storage of all 280 rows in the repository, nor have automated tests been executed. The existing offline adapter assumes fixed column positions and requires head, height, cup and reference; verify real header positions and exception rows before using it on full source data. In particular, Silicone includes a genuine 85 cm entry; minimum height was reduced to 60 cm in commit 9adacc7. The source also includes nonstandard head codes and cup values; reconciliation must report rather than silently omit exceptions.

Next: create a bounded, read-only live-sheet ingestion pipeline or authorized snapshot input, reconcile all 280 source rows against imported/rejected/duplicates, test against fixtures, and retain drafts only. No public listing, media rights assumption, deployment, or spending.

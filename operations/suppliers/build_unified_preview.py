#!/usr/bin/env python3
"""Build a non-purchasable, allowlisted supplier review feed.

Input YXROBOT drafts are private. Output contains only display-safe fields.
Run locally after importing real CSV; never publish the private input manifest.
"""
import argparse
import json
from pathlib import Path

def make_preview(yx_manifest, concorde_manifest):
    rows, seen = [], set()
    for item in concorde_manifest.get("items", []):
        key = str(item.get("ean") or item.get("supplierReference") or item.get("storeResearchId") or "").strip()
        if not key:
            continue
        identity = ("concorde-pro", key.casefold())
        if identity in seen:
            continue
        seen.add(identity)
        rows.append({"id": "concorde-pro:" + key, "supplier": "Concorde Pro",
                     "name": str(item.get("storePreviewName") or "").strip(),
                     "brand": str(item.get("brand") or "").strip(),
                     "ean": str(item.get("ean") or ""), "status": "preview",
                     "purchasable": False})
    for item in yx_manifest.get("drafts", []):
        key = str(item.get("supplier_sku") or "").strip()
        name = str(item.get("name") or "").strip()
        if not key or not name:
            continue
        identity = ("yxrobot", key.casefold())
        if identity in seen:
            continue
        seen.add(identity)
        rows.append({"id": "yxrobot:" + key, "supplier": "YXROBOT", "name": name,
                     "brand": "YXROBOT", "ean": "", "status": "preview",
                     "purchasable": False})
    return {"schema_version": 1, "items": rows}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("private_yx_drafts", type=Path)
    parser.add_argument("concorde_candidates", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    source = json.loads(args.private_yx_drafts.read_text(encoding="utf-8"))
    concorde = json.loads(args.concorde_candidates.read_text(encoding="utf-8"))
    if source.get("supplier") != "yxrobot":
        parser.error("Expected a YXROBOT draft manifest")
    result = make_preview(source, concorde)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print("Review-only records:", len(result["items"]))

if __name__ == "__main__":
    main()

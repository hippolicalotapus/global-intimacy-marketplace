#!/usr/bin/env python3
"""Convert an exported YXROBOT CSV into a private, non-purchasable draft manifest.

Usage: python3 operations/suppliers/build_yxrobot_drafts.py input.csv output.json
Requires a local CSV export; does not access the supplier account or publish data.
"""
import argparse
import csv
import json
from pathlib import Path

def normalize(value):
    return str(value or "").strip()

def build(rows):
    drafts, rejected, seen = [], [], set()
    for line, row in enumerate(rows, start=2):
        clean = {normalize(k): normalize(v) for k, v in row.items() if k is not None}
        # Do not convert model/body codes to numbers; B15 and 158S are valid strings.
        code = next((clean.get(k, "") for k in ("SKU", "sku", "Model", "model", "Model No.", "Body Code", "body_code") if clean.get(k)), "")
        name = next((clean.get(k, "") for k in ("Product Name", "product_name", "Name", "name", "Product") if clean.get(k)), "")
        if not code or not name:
            rejected.append({"csv_line": line, "reason": "missing model/SKU or name", "row": clean})
            continue
        key = ("yxrobot", code.casefold())
        if key in seen:
            rejected.append({"csv_line": line, "reason": "duplicate supplier model/SKU", "row": clean})
            continue
        seen.add(key)
        drafts.append({"supplier": "yxrobot", "supplier_sku": code, "name": name,
                       "status": "draft", "purchasable": False, "inventory_verified": False,
                       "source_csv_line": line})
    return {"schema_version": 1, "supplier": "yxrobot", "drafts": drafts,
            "rejected": rejected, "counts": {"input": len(drafts)+len(rejected),
            "drafts": len(drafts), "rejected": len(rejected)}}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source_csv", type=Path)
    parser.add_argument("private_output_json", type=Path)
    args = parser.parse_args()
    if args.private_output_json.resolve().is_relative_to((Path(__file__).resolve().parents[2] / "site").resolve()):
        parser.error("Private supplier drafts must not be written into the public site/ directory")
    with args.source_csv.open(encoding="utf-8-sig", newline="") as stream:
        result = build(list(csv.DictReader(stream)))
    args.private_output_json.parent.mkdir(parents=True, exist_ok=True)
    args.private_output_json.write_text(json.dumps(result, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(json.dumps(result["counts"]))

if __name__ == "__main__":
    main()

"""Offline regression checks for the combined, non-purchasable supplier feed."""
import importlib.util
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
MODULE = ROOT / "operations" / "suppliers" / "build_unified_preview.py"
spec = importlib.util.spec_from_file_location("unified_preview", MODULE)
preview = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preview)


class UnifiedSupplierPreviewTests(unittest.TestCase):
    def test_deduplicates_per_supplier_without_cross_supplier_collision(self):
        concorde = {"items": [
            {"ean": "123", "storePreviewName": "First", "brand": "Brand", "wholesalePrice": 9},
            {"ean": "123", "storePreviewName": "Duplicate", "brand": "Brand"},
        ]}
        yx = {"drafts": [
            {"supplier_sku": "123", "name": "YX item", "cost": 3},
            {"supplier_sku": "123", "name": "Duplicate YX"},
            {"supplier_sku": "B15", "name": "Another"},
        ]}
        rows = preview.make_preview(yx, concorde)["items"]
        self.assertEqual(len(rows), 3)
        self.assertEqual({r["id"] for r in rows}, {"concorde-pro:123", "yxrobot:123", "yxrobot:B15"})
        for row in rows:
            self.assertEqual(row["status"], "preview")
            self.assertIs(row["purchasable"], False)
            self.assertFalse({"wholesalePrice", "cost", "supplierReference", "sourceUrl"} & row.keys())

    def test_rejects_incomplete_drafts(self):
        result = preview.make_preview(
            {"drafts": [{"supplier_sku": "", "name": "Missing code"},
                        {"supplier_sku": "A", "name": ""}]},
            {"items": [{}]},
        )
        self.assertEqual(result["items"], [])

    def test_preserves_model_codes_as_strings(self):
        rows = preview.make_preview(
            {"drafts": [{"supplier_sku": "158S", "name": "Sample"}]}, {"items": []}
        )["items"]
        self.assertEqual(rows[0]["id"], "yxrobot:158S")


if __name__ == "__main__":
    unittest.main()

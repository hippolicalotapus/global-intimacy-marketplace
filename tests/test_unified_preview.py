"""Offline checks for unified supplier review feed."""
import importlib.util
import unittest
from pathlib import Path

FILE = Path(__file__).resolve().parents[1] / "operations/suppliers/build_unified_preview.py"
spec = importlib.util.spec_from_file_location("unified_preview", FILE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class UnifiedPreviewTests(unittest.TestCase):
    def test_dedup_and_public_field_allowlist(self):
        yx = {"supplier": "yxrobot", "drafts": [
            {"supplier_sku": "B15", "name": "Sample A", "wholesale_cost": "SECRET"},
            {"supplier_sku": "b15", "name": "Duplicate"},
            {"supplier_sku": "158S", "name": "Sample B"}]}
        concorde = {"items": [{"ean": "123", "storePreviewName": "Sample C",
                                "brand": "Brand", "wholesaleCost": "SECRET"},
                               {"ean": "123", "storePreviewName": "Duplicate"}]}
        rows = module.make_preview(yx, concorde)["items"]
        self.assertEqual(len(rows), 3)
        self.assertEqual({r["supplier"] for r in rows}, {"Concorde Pro", "YXROBOT"})
        self.assertTrue(all(r["purchasable"] is False for r in rows))
        self.assertNotIn("SECRET", str(rows))
        self.assertTrue(all(set(r) <= {"id", "supplier", "name", "brand", "ean", "status", "purchasable"} for r in rows))

if __name__ == "__main__":
    unittest.main()

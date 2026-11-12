"""Offline checks for the private YXROBOT draft CSV converter."""
import importlib.util
import unittest
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[1] / "operations/suppliers/build_yxrobot_drafts.py"
spec = importlib.util.spec_from_file_location("yxrobot_drafts", SOURCE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class YxrobotDraftTests(unittest.TestCase):
    def test_duplicates_and_raw_codes(self):
        result = module.build([
            {"SKU": "B15", "Product Name": "First"},
            {"SKU": "B15", "Product Name": "Repeated"},
            {"SKU": "158S", "Product Name": "Second"},
            {"SKU": "", "Product Name": "Incomplete"},
        ])
        self.assertEqual(result["counts"], {"input": 4, "drafts": 2, "rejected": 2})
        self.assertEqual([x["supplier_sku"] for x in result["drafts"]], ["B15", "158S"])
        self.assertEqual(result["rejected"][0]["csv_line"], 3)
        self.assertTrue(all(x["status"] == "draft" and not x["purchasable"] for x in result["drafts"]))
        self.assertTrue(all(not x["inventory_verified"] for x in result["drafts"]))

if __name__ == "__main__":
    unittest.main()

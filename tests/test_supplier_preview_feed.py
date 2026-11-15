"""Validate the public-safe supplier preview JSON without network access."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEED = ROOT / "site" / "supplier-preview.json"

class SupplierPreviewFeedTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads(FEED.read_text(encoding="utf-8"))

    def test_schema_and_unique_ids(self):
        self.assertEqual(self.data["schema_version"], 1)
        items = self.data["items"]
        self.assertEqual(len({item["id"] for item in items}), len(items))
        self.assertGreater(len(items), 0)

    def test_no_purchasing_or_confidential_fields(self):
        allowed = {"id", "supplier", "name", "brand", "ean", "status", "purchasable"}
        for item in self.data["items"]:
            with self.subTest(id=item.get("id")):
                self.assertEqual(set(item), allowed)
                self.assertIn(item["supplier"], {"Concorde Pro", "YXROBOT"})
                self.assertTrue(item["name"].strip())
                self.assertEqual(item["status"], "preview")
                self.assertIs(item["purchasable"], False)

if __name__ == "__main__":
    unittest.main()

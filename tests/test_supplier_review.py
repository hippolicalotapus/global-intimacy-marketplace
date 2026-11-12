"""Offline regression checks for the Concorde preview fixture and static page.

Run: python3 -m unittest discover -s tests -p 'test_supplier_review.py'
No network, credentials, payments, or deployments required.
"""
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "site" / "supplier-review.html"
CANDIDATES = ROOT / "operations" / "suppliers" / "concorde-public-candidates.json"


class SupplierReviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.page = PAGE.read_text(encoding="utf-8")
        cls.source = json.loads(CANDIDATES.read_text(encoding="utf-8"))
        match = re.search(r"const items=(\[.*?\]);\s*const brand=", cls.page, re.S)
        if not match:
            raise AssertionError("Cannot find preview item fixture")
        cls.items = json.loads(match.group(1))

    def test_candidate_count_and_identity(self):
        self.assertEqual(len(self.items), len(self.source["items"]))
        self.assertEqual(len(self.items), 14)
        self.assertEqual(len({p["id"] for p in self.items}), len(self.items))

    def test_source_references_not_dropped(self):
        source = {(x.get("ean") or x.get("supplierReference") or str(x["storeResearchId"])): x for x in self.source["items"]}
        for item in self.items:
            with self.subTest(id=item["id"]):
                original = source[item["id"]]
                self.assertEqual(item["name"], original["storePreviewName"])
                self.assertEqual(item["sourceUrl"], original["sourceUrl"])
                self.assertEqual(item["brand"], original["brand"])

    def test_preview_is_non_purchasable(self):
        self.assertIn("Not available to purchase.", self.page)
        self.assertIn("No live stock, checkout, or prices.", self.page)
        self.assertIn('name="robots" content="noindex,nofollow"', self.page)
        self.assertNotIn("verifiedWholesalePrice", self.page)
        self.assertNotIn("wholesaleCost", self.page)

    def test_mobile_and_search(self):
        self.assertIn('name="viewport"', self.page)
        self.assertIn('id="q"', self.page)
        self.assertIn('id="brand"', self.page)
        self.assertIn('aria-live="polite"', self.page)
        self.assertIn("textContent", self.page)


if __name__ == "__main__":
    unittest.main()

"""Static regression checks for the supplier-review website wiring.

These checks do not require deployment, network access, or supplier credentials.
"""
from pathlib import Path
import unittest

PAGE = Path(__file__).resolve().parents[1] / "site" / "supplier-review.html"


class SupplierReviewPageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.page = PAGE.read_text(encoding="utf-8")

    def test_unified_feed_is_loaded(self):
        self.assertIn('fetch("./supplier-preview.json"', self.page)
        self.assertIn('Array.isArray(data.items)', self.page)

    def test_supplier_and_brand_filters_present(self):
        self.assertIn('id="supplier"', self.page)
        self.assertIn('id="brand"', self.page)
        self.assertIn('id="q"', self.page)
        self.assertIn('supplier.addEventListener("change"', self.page)

    def test_non_purchasable_feed_only(self):
        self.assertIn('x.purchasable===false', self.page)
        self.assertIn('x.status==="preview"', self.page)
        self.assertIn('["Concorde Pro","YXROBOT"].includes(x.supplier)', self.page)
        self.assertIn('Not available to purchase.', self.page)

    def test_fallback_and_privacy(self):
        self.assertIn('let items=[', self.page)
        self.assertIn('noindex,nofollow', self.page)
        self.assertNotIn('wholesalePrice', self.page)
        self.assertNotIn('addToCart(', self.page)


if __name__ == "__main__":
    unittest.main()

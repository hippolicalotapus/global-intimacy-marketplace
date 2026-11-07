"use strict";
// Original temporary drawings. Illustration coverage does not verify stock,
// manufacturer likeness, resale rights or delivery eligibility.
(function () {
  var extras = [
  {
    "id": 501,
    "brand": "SEI MIO",
    "name": "Eyes Wide Shut Velvet Blindfold",
    "sku": "CC-SM-031",
    "category": "Kink & Accessories",
    "collection": "Everyday",
    "researchType": "Padded blindfold research candidate",
    "researchFeature": "Supplier describes a padded, lined velvet blindfold with a thick elastic head strap. Exact fibre content, measurements and fit remain unverified.",
    "status": "Research preview — enquiry only",
    "previewImage": "assets/illustrations/blindfold.webp",
    "previewImageAlt": "Padded blindfold — representative AI illustration, not an exact product photo; appearance may vary",
    "temporaryIllustration": true,
    "imageApproved": false,
    "resellerApproved": false,
    "stockVerified": false,
    "priceVerified": false,
    "canAcceptOrders": false,
    "deliveryRules": [],
    "sourceUrl": "https://epproductscanada.com/products/sei-mio-eyes-wide-shut-velvet-blindfold",
    "imageDisclosure": "Representative AI illustration based on written product details. Actual product appearance may vary. Not a manufacturer-approved likeness or a product photograph.",
    "imageRights": "Original AI illustration generated for GIM; no supplier photo licence is implied."
  },
  {
    "id": 502,
    "brand": "XR LLC",
    "name": "Rainbow Shibari Rope — 16 ft",
    "sku": "XRAH714-16",
    "category": "Kink & Accessories",
    "collection": "Everyday",
    "researchType": "Rainbow rope research candidate",
    "researchFeature": "Supplier lists 16 ft length, 7.6 mm width, nylon construction and metal-capped ends. Illustration cannot establish strength, safe use or suitability for suspension.",
    "status": "Research preview — enquiry only",
    "previewImage": "assets/illustrations/rainbow-rope.webp",
    "previewImageAlt": "Rainbow rope — representative AI illustration, not an exact product photo; appearance may vary",
    "temporaryIllustration": true,
    "imageApproved": false,
    "resellerApproved": false,
    "stockVerified": false,
    "priceVerified": false,
    "canAcceptOrders": false,
    "deliveryRules": [],
    "sourceUrl": "https://epproductscanada.com/products/rainbow-shibari-rope-16ft",
    "imageDisclosure": "Representative AI illustration based on written product details. Actual product appearance may vary. Not a manufacturer-approved likeness or a product photograph.",
    "imageRights": "Original AI illustration generated for GIM; no supplier photo licence is implied."
  },
  {
    "id": 503,
    "brand": "SEI MIO",
    "name": "Cross Purposes Over-Wrap Cuffs",
    "sku": "CC-SM-025",
    "category": "Kink & Accessories",
    "collection": "Everyday",
    "researchType": "Wrap cuffs research candidate",
    "researchFeature": "Supplier describes hook-and-loop over-wrap cuffs. This image is a generic visual guide; the exact cut, padding, connection hardware, materials and fit require verification.",
    "status": "Research preview — enquiry only",
    "previewImage": "assets/illustrations/wrap-cuffs.webp",
    "previewImageAlt": "Wrap cuffs — representative AI illustration, not an exact product photo; appearance may vary",
    "temporaryIllustration": true,
    "imageApproved": false,
    "resellerApproved": false,
    "stockVerified": false,
    "priceVerified": false,
    "canAcceptOrders": false,
    "deliveryRules": [],
    "sourceUrl": "https://epproductscanada.com/products/sei-mio-cross-purposes-over-wrap-cuffs",
    "imageDisclosure": "Representative AI illustration based on written product details. Actual product appearance may vary. Not a manufacturer-approved likeness or a product photograph.",
    "imageRights": "Original AI illustration generated for GIM; no supplier photo licence is implied."
  },
  {
    "id": 504,
    "brand": "SEI MIO",
    "name": "Roundly Chastised Circle Paddle",
    "sku": "CC-SM-022",
    "category": "Kink & Accessories",
    "collection": "Everyday",
    "researchType": "Round paddle research candidate",
    "researchFeature": "Supplier describes a round faux-leather paddle with a wrist loop. Exact dimensions, seam construction, finish and care instructions remain unverified.",
    "status": "Research preview — enquiry only",
    "previewImage": "assets/illustrations/round-paddle.webp",
    "previewImageAlt": "Round paddle — representative AI illustration, not an exact product photo; appearance may vary",
    "temporaryIllustration": true,
    "imageApproved": false,
    "resellerApproved": false,
    "stockVerified": false,
    "priceVerified": false,
    "canAcceptOrders": false,
    "deliveryRules": [],
    "sourceUrl": "https://epproductscanada.com/products/sei-mio-roundly-chastised-circle-paddle",
    "imageDisclosure": "Representative AI illustration based on written product details. Actual product appearance may vary. Not a manufacturer-approved likeness or a product photograph.",
    "imageRights": "Original AI illustration generated for GIM; no supplier photo licence is implied."
  }
];
  var drawings = {
  "1": {
    "kind": "product",
    "path": "assets/drawings/p001.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.lovense.com/lush-4-best-bluetooth-remote-controlled-g-spot-vibrator",
    "exactLikenessVerified": false
  },
  "2": {
    "kind": "product",
    "path": "assets/drawings/p002.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.lovense.com/lush-mini-remote-control-g-spot-vibrator",
    "exactLikenessVerified": false
  },
  "3": {
    "kind": "product",
    "path": "assets/drawings/p003.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.lovense.com/public/store",
    "exactLikenessVerified": false
  },
  "4": {
    "kind": "product",
    "path": "assets/drawings/p004.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.lovense.com/public/store",
    "exactLikenessVerified": false
  },
  "5": {
    "kind": "product",
    "path": "assets/drawings/p005.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.lovense.com/magnetic-panty-vibrator",
    "exactLikenessVerified": false
  },
  "6": {
    "kind": "product",
    "path": "assets/drawings/p006.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.lovense.com/public/store",
    "exactLikenessVerified": false
  },
  "7": {
    "kind": "product",
    "path": "assets/drawings/p007.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.lovense.com/public/store",
    "exactLikenessVerified": false
  },
  "8": {
    "kind": "product",
    "path": "assets/drawings/p008.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.lovense.com/public/store",
    "exactLikenessVerified": false
  },
  "9": {
    "kind": "product",
    "path": "assets/drawings/p009.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.lovense.com/public/store",
    "exactLikenessVerified": false
  },
  "10": {
    "kind": "product",
    "path": "assets/drawings/p010.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.lovense.com/public/store",
    "exactLikenessVerified": false
  },
  "11": {
    "kind": "product",
    "path": "assets/drawings/p011.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.lovense.com/public/store",
    "exactLikenessVerified": false
  },
  "12": {
    "kind": "product",
    "path": "assets/drawings/p012.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.lovense.com/public/store",
    "exactLikenessVerified": false
  },
  "13": {
    "kind": "product",
    "path": "assets/drawings/p013.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.lovense.com/public/store",
    "exactLikenessVerified": false
  },
  "14": {
    "kind": "product",
    "path": "assets/drawings/p014.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.lovense.com/public/store",
    "exactLikenessVerified": false
  },
  "15": {
    "kind": "product",
    "path": "assets/drawings/p015.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.lovense.com/public/store",
    "exactLikenessVerified": false
  },
  "16": {
    "kind": "product",
    "path": "assets/drawings/p016.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.lovense.com/public/store",
    "exactLikenessVerified": false
  },
  "17": {
    "kind": "product",
    "path": "assets/drawings/p017.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.lovense.com/public/store",
    "exactLikenessVerified": false
  },
  "18": {
    "kind": "product",
    "path": "assets/drawings/p018.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.lovense.com/public/store",
    "exactLikenessVerified": false
  },
  "19": {
    "kind": "product",
    "path": "assets/drawings/p019.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.we-vibe.com/ca-en/chorus-pro",
    "exactLikenessVerified": false
  },
  "20": {
    "kind": "product",
    "path": "assets/drawings/p020.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.we-vibe.com/ca-en/all-products",
    "exactLikenessVerified": false
  },
  "21": {
    "kind": "product",
    "path": "assets/drawings/p021.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.we-vibe.com/ca-en/all-products",
    "exactLikenessVerified": false
  },
  "22": {
    "kind": "product",
    "path": "assets/drawings/p022.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.we-vibe.com/ca-en/all-products",
    "exactLikenessVerified": false
  },
  "23": {
    "kind": "product",
    "path": "assets/drawings/p023.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.we-vibe.com/ca-en/all-products",
    "exactLikenessVerified": false
  },
  "24": {
    "kind": "product",
    "path": "assets/drawings/p024.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.we-vibe.com/ca-en/all-products",
    "exactLikenessVerified": false
  },
  "25": {
    "kind": "product",
    "path": "assets/drawings/p025.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.we-vibe.com/ca-en/all-products",
    "exactLikenessVerified": false
  },
  "26": {
    "kind": "product",
    "path": "assets/drawings/p026.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.we-vibe.com/ca-en/all-products",
    "exactLikenessVerified": false
  },
  "27": {
    "kind": "product",
    "path": "assets/drawings/p027.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.we-vibe.com/ca-en/all-products",
    "exactLikenessVerified": false
  },
  "28": {
    "kind": "product",
    "path": "assets/drawings/p028.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.we-vibe.com/ca-en/all-products",
    "exactLikenessVerified": false
  },
  "29": {
    "kind": "product",
    "path": "assets/drawings/p029.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.we-vibe.com/ca-en/all-products",
    "exactLikenessVerified": false
  },
  "30": {
    "kind": "product",
    "path": "assets/drawings/p030.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.we-vibe.com/ca-en/all-products",
    "exactLikenessVerified": false
  },
  "31": {
    "kind": "product",
    "path": "assets/drawings/p031.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.we-vibe.com/ca-en/all-products",
    "exactLikenessVerified": false
  },
  "32": {
    "kind": "product",
    "path": "assets/drawings/p032.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.we-vibe.com/ca-en/all-products",
    "exactLikenessVerified": false
  },
  "33": {
    "kind": "product",
    "path": "assets/drawings/p033.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.we-vibe.com/ca-en/all-products",
    "exactLikenessVerified": false
  },
  "34": {
    "kind": "product",
    "path": "assets/drawings/p034.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.we-vibe.com/ca-en/all-products",
    "exactLikenessVerified": false
  },
  "35": {
    "kind": "product",
    "path": "assets/drawings/p035.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.we-vibe.com/ca-en/all-products",
    "exactLikenessVerified": false
  },
  "36": {
    "kind": "product",
    "path": "assets/drawings/p036.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.we-vibe.com/ca-en/all-products",
    "exactLikenessVerified": false
  },
  "37": {
    "kind": "product",
    "path": "assets/drawings/p037.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.we-vibe.com/ca-en/all-products",
    "exactLikenessVerified": false
  },
  "38": {
    "kind": "product",
    "path": "assets/drawings/p038.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.we-vibe.com/ca-en/all-products",
    "exactLikenessVerified": false
  },
  "39": {
    "kind": "product",
    "path": "assets/drawings/p039.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.kiiroo.com/pages/product-manuals",
    "exactLikenessVerified": false
  },
  "40": {
    "kind": "product",
    "path": "assets/drawings/p040.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.kiiroo.com/pages/product-manuals",
    "exactLikenessVerified": false
  },
  "41": {
    "kind": "product",
    "path": "assets/drawings/p041.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.kiiroo.com/pages/product-manuals",
    "exactLikenessVerified": false
  },
  "42": {
    "kind": "product",
    "path": "assets/drawings/p042.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.ohmibod.com/interactive/",
    "exactLikenessVerified": false
  },
  "43": {
    "kind": "product",
    "path": "assets/drawings/p043.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://ca.satisfyer.com/ca/manuals",
    "exactLikenessVerified": false
  },
  "44": {
    "kind": "product",
    "path": "assets/drawings/p044.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://ca.satisfyer.com/ca/manuals",
    "exactLikenessVerified": false
  },
  "45": {
    "kind": "product",
    "path": "assets/drawings/p045.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://ca.satisfyer.com/ca/manuals",
    "exactLikenessVerified": false
  },
  "46": {
    "kind": "product",
    "path": "assets/drawings/p046.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://ca.satisfyer.com/ca/manuals",
    "exactLikenessVerified": false
  },
  "47": {
    "kind": "product",
    "path": "assets/drawings/p047.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://ca.satisfyer.com/ca/manuals",
    "exactLikenessVerified": false
  },
  "48": {
    "kind": "product",
    "path": "assets/drawings/p048.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://ca.satisfyer.com/ca/manuals",
    "exactLikenessVerified": false
  },
  "49": {
    "kind": "product",
    "path": "assets/drawings/p049.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://ca.satisfyer.com/ca/manuals",
    "exactLikenessVerified": false
  },
  "50": {
    "kind": "product",
    "path": "assets/drawings/p050.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://ca.satisfyer.com/ca/manuals",
    "exactLikenessVerified": false
  },
  "51": {
    "kind": "product",
    "path": "assets/drawings/p051.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://ca.satisfyer.com/ca/manuals",
    "exactLikenessVerified": false
  },
  "52": {
    "kind": "product",
    "path": "assets/drawings/p052.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://ca.satisfyer.com/ca/manuals",
    "exactLikenessVerified": false
  },
  "53": {
    "kind": "product",
    "path": "assets/drawings/p053.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://ca.satisfyer.com/ca/manuals",
    "exactLikenessVerified": false
  },
  "54": {
    "kind": "product",
    "path": "assets/drawings/p054.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://ca.satisfyer.com/ca/manuals",
    "exactLikenessVerified": false
  },
  "55": {
    "kind": "product",
    "path": "assets/drawings/p055.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://ca.satisfyer.com/ca/manuals",
    "exactLikenessVerified": false
  },
  "56": {
    "kind": "product",
    "path": "assets/drawings/p056.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://ca.satisfyer.com/ca/manuals",
    "exactLikenessVerified": false
  },
  "57": {
    "kind": "product",
    "path": "assets/drawings/p057.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://ca.satisfyer.com/ca/manuals",
    "exactLikenessVerified": false
  },
  "58": {
    "kind": "product",
    "path": "assets/drawings/p058.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://ca.satisfyer.com/ca/manuals",
    "exactLikenessVerified": false
  },
  "59": {
    "kind": "product",
    "path": "assets/drawings/p059.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://ca.satisfyer.com/ca/manuals",
    "exactLikenessVerified": false
  },
  "60": {
    "kind": "product",
    "path": "assets/drawings/p060.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://ca.satisfyer.com/ca/manuals",
    "exactLikenessVerified": false
  },
  "61": {
    "kind": "product",
    "path": "assets/drawings/p061.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://ca.satisfyer.com/ca/manuals",
    "exactLikenessVerified": false
  },
  "62": {
    "kind": "product",
    "path": "assets/drawings/p062.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://ca.satisfyer.com/ca/manuals",
    "exactLikenessVerified": false
  },
  "63": {
    "kind": "product",
    "path": "assets/drawings/p063.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://ca.satisfyer.com/ca/manuals",
    "exactLikenessVerified": false
  },
  "64": {
    "kind": "product",
    "path": "assets/drawings/p064.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://ca.satisfyer.com/ca/manuals",
    "exactLikenessVerified": false
  },
  "65": {
    "kind": "product",
    "path": "assets/drawings/p065.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://ca.satisfyer.com/ca/manuals",
    "exactLikenessVerified": false
  },
  "66": {
    "kind": "product",
    "path": "assets/drawings/p066.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://ca.satisfyer.com/ca/manuals",
    "exactLikenessVerified": false
  },
  "67": {
    "kind": "range",
    "path": "assets/drawings/p067.webp",
    "disclosure": "Original range drawing. No specific model or configuration has been selected. Face, clothing, body form and accessories are illustrative, not a confirmed product or included kit.",
    "source": "https://www.realbotix.com/faq",
    "exactLikenessVerified": false
  },
  "68": {
    "kind": "range",
    "path": "assets/drawings/p068.webp",
    "disclosure": "Original range drawing. No specific model or configuration has been selected. Face, clothing, body form and accessories are illustrative, not a confirmed product or included kit.",
    "source": "https://www.realbotix.com/faq",
    "exactLikenessVerified": false
  },
  "69": {
    "kind": "range",
    "path": "assets/drawings/p069.webp",
    "disclosure": "Original range drawing. No specific model or configuration has been selected. Face, clothing, body form and accessories are illustrative, not a confirmed product or included kit.",
    "source": "https://www.realdoll.com/",
    "exactLikenessVerified": false
  },
  "70": {
    "kind": "range",
    "path": "assets/drawings/p070.webp",
    "disclosure": "Original range drawing. No specific model or configuration has been selected. Face, clothing, body form and accessories are illustrative, not a confirmed product or included kit.",
    "source": "https://www.realdoll.com/",
    "exactLikenessVerified": false
  },
  "71": {
    "kind": "range",
    "path": "assets/drawings/p071.webp",
    "disclosure": "Original range drawing. No specific model or configuration has been selected. Face, clothing, body form and accessories are illustrative, not a confirmed product or included kit.",
    "source": "https://wmdoll.com/",
    "exactLikenessVerified": false
  },
  "72": {
    "kind": "range",
    "path": "assets/drawings/p072.webp",
    "disclosure": "Original range drawing. No specific model or configuration has been selected. Face, clothing, body form and accessories are illustrative, not a confirmed product or included kit.",
    "source": "https://wmdoll.com/",
    "exactLikenessVerified": false
  },
  "73": {
    "kind": "range",
    "path": "assets/drawings/p073.webp",
    "disclosure": "Original range drawing. No specific model or configuration has been selected. Face, clothing, body form and accessories are illustrative, not a confirmed product or included kit.",
    "source": "https://wmdoll.com/",
    "exactLikenessVerified": false
  },
  "74": {
    "kind": "product",
    "path": "assets/drawings/p074.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.concordepro.com/44-sextoys-connectes",
    "exactLikenessVerified": false
  },
  "75": {
    "kind": "product",
    "path": "assets/drawings/p075.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.concordepro.com/44-sextoys-connectes",
    "exactLikenessVerified": false
  },
  "76": {
    "kind": "product",
    "path": "assets/drawings/p076.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.svakom.com/products/wearable-vibrator",
    "exactLikenessVerified": false
  },
  "77": {
    "kind": "packaging",
    "path": "assets/drawings/p077.webp",
    "disclosure": "Original generic packaging drawing. Actual bottle, dispenser, box, label and dimensions are unverified. This is not the manufacturer’s packaging design.",
    "source": "https://orgiecompany.com/collections/all",
    "exactLikenessVerified": false
  },
  "78": {
    "kind": "packaging",
    "path": "assets/drawings/p078.webp",
    "disclosure": "Original generic packaging drawing. Actual bottle, dispenser, box, label and dimensions are unverified. This is not the manufacturer’s packaging design.",
    "source": "https://www.concordelove.fr/marque/72-lubrix",
    "exactLikenessVerified": false
  },
  "79": {
    "kind": "packaging",
    "path": "assets/drawings/p079.webp",
    "disclosure": "Original generic packaging drawing. Actual bottle, dispenser, box, label and dimensions are unverified. This is not the manufacturer’s packaging design.",
    "source": "https://www.concordelove.fr/marque/72-lubrix",
    "exactLikenessVerified": false
  },
  "80": {
    "kind": "packaging",
    "path": "assets/drawings/p080.webp",
    "disclosure": "Original generic packaging drawing. Actual bottle, dispenser, box, label and dimensions are unverified. This is not the manufacturer’s packaging design.",
    "source": "https://www.concordelove.fr/58-nettoyants-sextoys",
    "exactLikenessVerified": false
  },
  "81": {
    "kind": "product",
    "path": "assets/drawings/p081.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.concordepro.com/",
    "exactLikenessVerified": false
  },
  "82": {
    "kind": "product",
    "path": "assets/drawings/p082.webp",
    "disclosure": "Original representative product drawing based on written descriptions. Exact shape, controls, colours and included components are unverified; appearance may vary. Graphite shading may be a drawing convention. This is not a manufacturer-approved likeness or a photograph.",
    "source": "https://www.concordepro.com/",
    "exactLikenessVerified": false
  },
  "83": {
    "kind": "packaging",
    "path": "assets/drawings/p083.webp",
    "disclosure": "Original generic packaging drawing. Actual bottle, dispenser, box, label and dimensions are unverified. This is not the manufacturer’s packaging design.",
    "source": "https://www.concordepro.com/",
    "exactLikenessVerified": false
  },
  "84": {
    "kind": "packaging",
    "path": "assets/drawings/p084.webp",
    "disclosure": "Original generic packaging drawing. Actual bottle, dispenser, box, label and dimensions are unverified. This is not the manufacturer’s packaging design.",
    "source": "https://orgiecompany.com/collections/all",
    "exactLikenessVerified": false
  },
  "85": {
    "kind": "packaging",
    "path": "assets/drawings/p085.webp",
    "disclosure": "Original generic packaging drawing. Actual bottle, dispenser, box, label and dimensions are unverified. This is not the manufacturer’s packaging design.",
    "source": "https://orgiecompany.com/collections/all",
    "exactLikenessVerified": false
  },
  "86": {
    "kind": "packaging",
    "path": "assets/drawings/p086.webp",
    "disclosure": "Original generic packaging drawing. Actual bottle, dispenser, box, label and dimensions are unverified. This is not the manufacturer’s packaging design.",
    "source": "https://www.pjur.com/",
    "exactLikenessVerified": false
  },
  "87": {
    "kind": "packaging",
    "path": "assets/drawings/p087.webp",
    "disclosure": "Original generic packaging drawing. Actual bottle, dispenser, box, label and dimensions are unverified. This is not the manufacturer’s packaging design.",
    "source": "https://www.pjur.com/",
    "exactLikenessVerified": false
  },
  "201": {
    "kind": "garment",
    "path": "assets/drawings/p201.webp",
    "disclosure": "Garment drawing with original approved artwork. Sample not produced; final garment and placement require verification.",
    "exactLikenessVerified": false
  },
  "202": {
    "kind": "garment",
    "path": "assets/drawings/p202.webp",
    "disclosure": "Garment drawing with original approved artwork. Sample not produced; final garment and placement require verification.",
    "exactLikenessVerified": false
  },
  "203": {
    "kind": "garment",
    "path": "assets/drawings/p203.webp",
    "disclosure": "Garment drawing with original approved artwork. Sample not produced; final garment and placement require verification.",
    "exactLikenessVerified": false
  },
  "204": {
    "kind": "garment",
    "path": "assets/drawings/p204.webp",
    "disclosure": "Garment drawing with original approved artwork. Sample not produced; final garment and placement require verification.",
    "exactLikenessVerified": false
  },
  "205": {
    "kind": "garment",
    "path": "assets/drawings/p205.webp",
    "disclosure": "Garment drawing with original approved artwork. Sample not produced; final garment and placement require verification.",
    "exactLikenessVerified": false
  },
  "206": {
    "kind": "garment",
    "path": "assets/drawings/p206.webp",
    "disclosure": "Garment drawing with original approved artwork. Sample not produced; final garment and placement require verification.",
    "exactLikenessVerified": false
  },
  "207": {
    "kind": "garment",
    "path": "assets/drawings/p207.webp",
    "disclosure": "Garment drawing with original approved artwork. Sample not produced; final garment and placement require verification.",
    "exactLikenessVerified": false
  },
  "208": {
    "kind": "garment",
    "path": "assets/drawings/p208.webp",
    "disclosure": "Garment drawing with original approved artwork. Sample not produced; final garment and placement require verification.",
    "exactLikenessVerified": false
  },
  "209": {
    "kind": "garment",
    "path": "assets/drawings/p209.webp",
    "disclosure": "Garment drawing with original approved artwork. Sample not produced; final garment and placement require verification.",
    "exactLikenessVerified": false
  },
  "88": {
    "kind": "garment",
    "path": "assets/apparel/cards/oh-a01.webp",
    "disclosure": "Owner-selected design drawing. Sample not produced; final fabric, fit, colours and print placement require verification.",
    "exactLikenessVerified": false
  },
  "89": {
    "kind": "garment",
    "path": "assets/apparel/cards/oh-a02.webp",
    "disclosure": "Owner-selected design drawing. Sample not produced; final fabric, fit, colours and print placement require verification.",
    "exactLikenessVerified": false
  },
  "90": {
    "kind": "garment",
    "path": "assets/apparel/cards/oh-a03.webp",
    "disclosure": "Owner-selected design drawing. Sample not produced; final fabric, fit, colours and print placement require verification.",
    "exactLikenessVerified": false
  },
  "91": {
    "kind": "garment",
    "path": "assets/apparel/cards/oh-a04.webp",
    "disclosure": "Owner-selected design drawing. Sample not produced; final fabric, fit, colours and print placement require verification.",
    "exactLikenessVerified": false
  },
  "92": {
    "kind": "garment",
    "path": "assets/apparel/cards/oh-a05.webp",
    "disclosure": "Owner-selected design drawing. Sample not produced; final fabric, fit, colours and print placement require verification.",
    "exactLikenessVerified": false
  },
  "93": {
    "kind": "garment",
    "path": "assets/apparel/cards/oh-a06.webp",
    "disclosure": "Owner-selected design drawing. Sample not produced; final fabric, fit, colours and print placement require verification.",
    "exactLikenessVerified": false
  },
  "301": {
    "kind": "garment",
    "path": "assets/apparel/cards/oh-p01.webp",
    "disclosure": "Owner-selected design drawing. Sample not produced; final fabric, fit, colours and print placement require verification.",
    "exactLikenessVerified": false
  },
  "302": {
    "kind": "garment",
    "path": "assets/apparel/cards/oh-p02.webp",
    "disclosure": "Owner-selected design drawing. Sample not produced; final fabric, fit, colours and print placement require verification.",
    "exactLikenessVerified": false
  },
  "303": {
    "kind": "garment",
    "path": "assets/apparel/cards/oh-p03.webp",
    "disclosure": "Owner-selected design drawing. Sample not produced; final fabric, fit, colours and print placement require verification.",
    "exactLikenessVerified": false
  },
  "401": {
    "kind": "garment",
    "path": "assets/apparel/cards/sb-t01.webp",
    "disclosure": "Owner-selected design drawing. Sample not produced; final fabric, fit, colours and print placement require verification.",
    "exactLikenessVerified": false
  },
  "501": {
    "kind": "product",
    "path": "assets/illustrations/blindfold.webp",
    "disclosure": "Representative AI illustration based on written product details. Actual product appearance may vary. Not a manufacturer-approved likeness or a product photograph.",
    "source": "https://epproductscanada.com/products/sei-mio-eyes-wide-shut-velvet-blindfold",
    "exactLikenessVerified": false
  },
  "502": {
    "kind": "product",
    "path": "assets/illustrations/rainbow-rope.webp",
    "disclosure": "Representative AI illustration based on written product details. Actual product appearance may vary. Not a manufacturer-approved likeness or a product photograph.",
    "source": "https://epproductscanada.com/products/rainbow-shibari-rope-16ft",
    "exactLikenessVerified": false
  },
  "503": {
    "kind": "product",
    "path": "assets/illustrations/wrap-cuffs.webp",
    "disclosure": "Representative AI illustration based on written product details. Actual product appearance may vary. Not a manufacturer-approved likeness or a product photograph.",
    "source": "https://epproductscanada.com/products/sei-mio-cross-purposes-over-wrap-cuffs",
    "exactLikenessVerified": false
  },
  "504": {
    "kind": "product",
    "path": "assets/illustrations/round-paddle.webp",
    "disclosure": "Representative AI illustration based on written product details. Actual product appearance may vary. Not a manufacturer-approved likeness or a product photograph.",
    "source": "https://epproductscanada.com/products/sei-mio-roundly-chastised-circle-paddle",
    "exactLikenessVerified": false
  }
};
  window.GIM_PRODUCTS = (window.GIM_PRODUCTS || []).concat(extras).map(function (p) {
    var d = drawings[p.id];
    if (!d) throw new Error("Missing product drawing: " + p.id);
    p.previewImage = d.path;
    p.previewImageAlt = p.brand + " " + p.name + " — representative drawing, not a photo; appearance unverified";
    p.temporaryIllustration = true;
    p.drawingKind = d.kind;
    p.imageDisclosure = d.disclosure;
    p.exactLikenessVerified = false;
    if (p.id >= 201 && p.id <= 209) {
      p.detailImage = p.previewImage;
      p.detailImageWidth = 1200; p.detailImageHeight = 900;
      p.detailViews = [{label:"Complete hoodie — front",box:[0,94,600,685]}, {label:"Complete hoodie — back",box:[600,94,600,685]}];
    }
    return p;
  });
})();

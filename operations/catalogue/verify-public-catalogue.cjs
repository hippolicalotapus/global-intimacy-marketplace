"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../../site");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const catalogSource = fs.readFileSync(path.join(root, "catalog.js"), "utf8");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const context = {window: {}};
vm.runInNewContext(catalogSource, context, {timeout: 2000, filename: "catalog.js"});
const products = context.window.GIM_PRODUCTS;
assert.ok(Array.isArray(products) && products.length >= 80, "Public catalogue unexpectedly empty or truncated");
const ids = new Set();
for (const product of products) {
  assert.ok(Number.isSafeInteger(product.id) && !ids.has(product.id), "Missing or duplicate product ID");
  ids.add(product.id);
  assert.ok(typeof product.name === "string" && product.name.trim(), "Product missing name");
  assert.ok(typeof product.brand === "string" && product.brand.trim(), "Product missing brand");
  assert.equal(product.resellerApproved, false, "Research item unexpectedly approved for resale");
  assert.equal(product.priceVerified, false, "Research item unexpectedly marked as price verified");
}
assert.match(html, /<script[^>]+src="catalog\.js"[^>]*>/, "Catalogue script not included in public page");
assert.match(html, /<script[^>]+src="app\.js"[^>]*>/, "Application script not included in public page");
assert.ok(html.indexOf('src="catalog.js"') < html.indexOf('src="app.js"'), "Catalogue must load before app");
assert.match(appSource, /window\.GIM_PRODUCTS/, "Application no longer reads public catalogue");
assert.match(html, /id="resultCount"/, "Catalogue results indicator missing");
console.log("PASS: public catalogue contains " + products.length + " unique research-only entries; scripts linked in correct order.");

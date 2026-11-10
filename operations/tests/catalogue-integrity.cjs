#!/usr/bin/env node
// Read-only catalogue integrity checks. Run: node operations/tests/catalogue-integrity.cjs
// Does not contact providers, modify source, deploy, or process orders.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const site = path.join(root, 'site');
const sandbox = {window: {}};
vm.createContext(sandbox);
for (const file of ['catalog.js', 'apparel.js']) {
  vm.runInContext(fs.readFileSync(path.join(site, file), 'utf8'), sandbox, {filename: file, timeout: 5000});
}
const products = sandbox.window.GIM_PRODUCTS;
assert.ok(Array.isArray(products) && products.length > 0, 'Catalogue must load');
const ids = new Set();
const designs = new Set();
for (const product of products) {
  assert.ok(Number.isInteger(product.id) && product.id > 0, 'Valid ID');
  assert.ok(!ids.has(product.id), 'Duplicate product ID: ' + product.id);
  ids.add(product.id);
  assert.ok(typeof product.brand === 'string' && product.brand.trim(), 'Missing brand');
  assert.ok(typeof product.name === 'string' && product.name.trim(), 'Missing product name');
  assert.ok(typeof product.category === 'string' && product.category.trim(), 'Missing category');
  assert.notEqual(product.canAcceptOrders, true, 'Research product cannot accept orders');
  assert.notEqual(product.resellerApproved, true, 'Reseller authorization must be verified independently');
  assert.notEqual(product.stockVerified, true, 'Stock must not be claimed verified');
  assert.notEqual(product.priceVerified, true, 'Price must not be claimed verified');
  if (product.designId) {
    assert.ok(!designs.has(product.designId), 'Duplicate design ID: ' + product.designId);
    designs.add(product.designId);
  }
  if (product.previewImage) {
    const relative = product.previewImage.replaceAll('\\', '/');
    assert.ok(!relative.startsWith('/') && !relative.includes('..'), 'Unsafe image path');
    assert.ok(fs.existsSync(path.join(site, relative)), 'Missing preview image: ' + relative);
  }
}
const html = fs.readFileSync(path.join(site, 'index.html'), 'utf8');
for (const file of ['catalog.js', 'apparel.js', 'app.js']) {
  assert.ok(html.includes('src="' + file + '"'), 'Missing script: ' + file);
}
assert.ok(html.indexOf('src="catalog.js"') < html.indexOf('src="apparel.js"'), 'Script load order');
assert.match(html, /noindex,nofollow/, 'Beta must remain noindex until launch approval');
console.log('PASS: ' + products.length + ' unique catalogue entries; ' + designs.size + ' design IDs; images, script order and no-order safety verified.');
console.log('NOTE: This is source integrity only. Browser country selection and live deployment need separate tests.');

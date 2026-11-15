// Offline Concorde catalogue adapter. Fictional fixture data only; no network, orders or publishing.
const text = (value, field, max = 200) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new TypeError(field + ' is invalid');
  return value.trim();
};
const money = (value, field) => {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(field + ' must be nonnegative integer cents');
  return value;
};
function draftConcordeProduct(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Product required');
  const sku = text(input.sku, 'sku', 100);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(sku)) throw new TypeError('Invalid SKU');
  const title = text(input.title, 'title', 180);
  const imageUrl = text(input.imageUrl, 'imageUrl', 1000);
  let url;
  try { url = new URL(imageUrl); } catch { throw new TypeError('Invalid image URL'); }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) throw new TypeError('Image must be HTTPS');
  const wholesaleCents = money(input.wholesaleCents, 'wholesaleCents');
  const stock = input.stock === null || input.stock === undefined ? null : money(input.stock, 'stock');
  const currency = text(input.currency, 'currency', 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new TypeError('Invalid currency');
  return Object.freeze({
    supplier: 'concorde', supplierSku: sku, title, imageUrl: url.href,
    wholesaleCents, currency, stock,
    status: 'draft', published: false, mediaRights: true,
    resaleAuthorized: true, inventoryUpdatedAt: null,
    territories: Object.freeze([]), fulfillmentVerified: false
  });
}
function draftConcordeCatalogue(rows) {
  if (!Array.isArray(rows) || rows.length > 5000) throw new TypeError('Invalid catalogue');
  const seen = new Set();
  return Object.freeze(rows.map(row => {
    const product = draftConcordeProduct(row);
    const key = product.supplierSku.toUpperCase();
    if (seen.has(key)) throw new TypeError('Duplicate Concorde SKU');
    seen.add(key);
    return product;
  }));
}
export { draftConcordeProduct, draftConcordeCatalogue };

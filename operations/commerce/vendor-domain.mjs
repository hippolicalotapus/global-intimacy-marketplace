// Offline commerce-domain prototype. No database, accounts, payments or network access.
const statuses = Object.freeze({ pending: 'pending', approved: 'approved', rejected: 'rejected', suspended: 'suspended' });
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function requireText(value, field, max = 160) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new TypeError(field + ' is invalid');
  return value.trim();
}
function makeVendorApplication(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('application required');
  const name = requireText(input.displayName, 'displayName');
  const slug = requireText(input.slug, 'slug', 64);
  if (!slugPattern.test(slug)) throw new TypeError('slug must be lowercase kebab-case');
  const country = requireText(input.country, 'country', 2).toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) throw new TypeError('ISO country code required');
  return Object.freeze({ displayName: name, slug, country, status: statuses.pending, reviewedAt: null });
}
function reviewVendor(vendor, decision, reviewer) {
  if (!vendor || vendor.status !== statuses.pending) throw new Error('Only pending vendors can be reviewed');
  requireText(reviewer, 'reviewer');
  if (!['approved', 'rejected'].includes(decision)) throw new TypeError('Invalid review decision');
  return Object.freeze({ ...vendor, status: decision, reviewedAt: new Date().toISOString(), reviewedBy: reviewer });
}
function suspendVendor(vendor, reviewer) {
  if (!vendor || vendor.status !== statuses.approved) throw new Error('Only approved vendors can be suspended');
  requireText(reviewer, 'reviewer');
  return Object.freeze({ ...vendor, status: statuses.suspended, reviewedBy: reviewer });
}
function canPublishProduct({ vendor, product, country, now = Date.now(), maxInventoryAgeMs = 30 * 60 * 1000 } = {}) {
  if (!vendor || vendor.status !== statuses.approved || !product || product.status !== 'approved') return false;
  if (product.mediaRights !== true || product.resaleAuthorized !== true) return false;
  if (!Array.isArray(product.territories) || !product.territories.includes(country)) return false;
  if (!Number.isSafeInteger(product.stock) || product.stock <= 0) return false;
  if (!Number.isFinite(now) || !Number.isFinite(maxInventoryAgeMs) || maxInventoryAgeMs <= 0) return false;
  const timestamp = Date.parse(product.inventoryUpdatedAt);
  if (!Number.isFinite(timestamp) || timestamp > now || now - timestamp > maxInventoryAgeMs) return false;
  return true;
}
export { makeVendorApplication, reviewVendor, suspendVendor, canPublishProduct };

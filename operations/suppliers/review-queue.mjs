// Private, offline review queue. A feed cannot authorize itself.
// No public export, order processing, network, or persistence here.
import { evaluateProductReadiness } from './publication-gates.mjs';

const REVIEW_FIELDS = [
  'resellerApproved','commercialPhotoPermission','territoryApproved',
  'identityVerified','priceApproved','ownerApproved','inventoryFresh',
  'shippingVerified','returnsVerified','paymentApproved'
];
export function reviewStagedProduct(stagedProduct, supplier, decisions = {}) {
  if (!stagedProduct || stagedProduct.status !== 'pending_review')
    throw new Error('Expected an unapproved staged product');
  if (!stagedProduct.source?.supplierId || !stagedProduct.source?.supplierSku)
    throw new Error('Missing source identity');
  if (decisions === null || typeof decisions !== 'object' || Array.isArray(decisions))
    throw new Error('Invalid review decisions');
  for (const key of Object.keys(decisions)) {
    if (!REVIEW_FIELDS.includes(key)) throw new Error('Unknown review field: ' + key);
    if (typeof decisions[key] !== 'boolean') throw new Error('Review fields must be boolean');
  }
  const product = Object.fromEntries(REVIEW_FIELDS.map(k => [k, decisions[k] === true]));
  const readiness = evaluateProductReadiness(product, supplier);
  return {
    source: { supplierId: stagedProduct.source.supplierId,
      supplierSku: stagedProduct.source.supplierSku,
      importHash: stagedProduct.source.importHash },
    status: readiness.orderable ? 'reviewed_order_ready' :
      readiness.publishable ? 'reviewed_publication_ready' : 'blocked_pending_evidence',
    readiness,
    // Deliberately no title, wholesale prices, supplier image URL or credentials.
    publicExportPerformed: false, orderPlaced: false
  };
}

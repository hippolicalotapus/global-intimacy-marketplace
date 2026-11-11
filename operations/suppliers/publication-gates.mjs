// Fail-closed supplier publication and order-readiness gates.
// This module never publishes listings or places orders.
export function evaluateProductReadiness(product = {}, supplier = {}) {
  const reasons = [];
  const requireFlag = (ok, reason) => { if (ok !== true) reasons.push(reason); };
  requireFlag(supplier.resellerApproved, 'supplier_resale_approval_missing');
  requireFlag(product.resellerApproved, 'sku_resale_approval_missing');
  requireFlag(product.commercialPhotoPermission, 'media_license_missing');
  requireFlag(product.territoryApproved, 'destination_territory_missing');
  requireFlag(product.identityVerified, 'sku_identity_unverified');
  requireFlag(product.priceApproved, 'retail_price_unapproved');
  requireFlag(product.ownerApproved, 'owner_approval_missing');
  const publishable = reasons.length === 0;
  const orderReasons = [...reasons];
  const orderFlag = (ok, reason) => { if (ok !== true) orderReasons.push(reason); };
  orderFlag(supplier.fulfillmentApproved, 'supplier_fulfillment_unapproved');
  orderFlag(product.inventoryFresh, 'inventory_stale_or_missing');
  orderFlag(product.shippingVerified, 'shipping_unverified');
  orderFlag(product.returnsVerified, 'returns_unverified');
  orderFlag(product.paymentApproved, 'payment_provider_unapproved');
  return { publication: publishable ? 'approved' : 'blocked', publishable,
    orderable: orderReasons.length === 0, publicationReasons: reasons,
    orderReasons };
}

// Offline-only Gelato payload preview. Never sends HTTP requests.
const PRODUCT_UID = 'apparel_product_gca_t-shirt_gsc_crewneck_gcu_unisex_gqa_classic_gsi_s_gco_white_gpr_4-4';
const SAMPLE_ART = 'https://cdn-origin.gelato-api-dashboard.ie.live.gelato.tech/docs/sample-print-files/logo.png';
export function buildFictionalGelatoPreview(input) {
  if (!input || input.fictional !== true || input.paymentStatus !== 'simulated') throw new Error('Fictional simulated orders only');
  if (!/^DEMO-[A-Z0-9-]{3,40}$/.test(input.orderId || '')) throw new Error('Demo order ID required');
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 10) throw new Error('Invalid demo quantity');
  if (input.productUid && input.productUid !== PRODUCT_UID) throw new Error('Only fixed sample SKU allowed');
  if (input.artworkUrl && input.artworkUrl !== SAMPLE_ART) throw new Error('Only public sample artwork allowed');
  return Object.freeze({
    mode: 'offline-preview',
    networkAllowed: false,
    endpointReference: 'POST https://order.gelatoapis.com/v4/orders',
    payload: {
      orderType: 'order', orderReferenceId: input.orderId, customerReferenceId: 'DEMO-CUSTOMER', currency: 'USD',
      items: [{ itemReferenceId: `${input.orderId}-ITEM-1`, productUid: PRODUCT_UID, files: [{ type: 'default', url: SAMPLE_ART }], quantity: input.quantity }],
      shipmentMethodUid: 'express',
      shippingAddress: { firstName: 'Demo', lastName: 'Recipient', addressLine1: '451 Clarkson Ave', city: 'New York', state: 'NY', postCode: '11203', country: 'US', email: 'apisupport@gelato.com', phone: '123456789' }
    }
  });
}

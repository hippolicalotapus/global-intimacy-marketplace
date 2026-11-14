// Pure fictional checkout-readiness assessment. No order, payment or supplier side effects.
import { previewDemo } from './mock-customer-ui.mjs';
function assessFictionalCheckout(state) {
  if (!state || state.mockOnly !== true || state.account?.authenticated !== false ||
      state.session?.grantsRealAccess !== false) {
    throw new TypeError('Fictional checkout state required');
  }
  const quote = previewDemo(state);
  const cartLines = state.cart.lines.map(line => Object.freeze({
    productId: line.productId, quantity: line.quantity,
    subtotalMinor: line.quantity * line.unitPriceMinor
  }));
  const itemCount = cartLines.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalMinor = cartLines.reduce((sum, item) => sum + item.subtotalMinor, 0);
  if (!Number.isSafeInteger(subtotalMinor)) throw new RangeError('Unsafe fictional subtotal');
  const shippingAvailable = quote.shipping.status === 'fictional_quote';
  const shippingMinor = shippingAvailable ? quote.shipping.shippingMinor : null;
  const totalBeforeTaxMinor = shippingAvailable ? subtotalMinor + shippingMinor : null;
  if (totalBeforeTaxMinor !== null && !Number.isSafeInteger(totalBeforeTaxMinor)) {
    throw new RangeError('Unsafe fictional estimate');
  }
  const requirements = Object.freeze([
    Object.freeze({ key: 'cart', label: 'Fictional cart contains eligible products', ready: shippingAvailable }),
    Object.freeze({ key: 'shipping', label: 'Fictional destination has a sample shipping quote', ready: shippingAvailable }),
    Object.freeze({ key: 'identity', label: 'Real customer authentication', ready: false }),
    Object.freeze({ key: 'tax', label: 'Verified final taxes and pricing', ready: false }),
    Object.freeze({ key: 'payment', label: 'Real payment authorization', ready: false }),
    Object.freeze({ key: 'fulfillment', label: 'Supplier order and delivery capability', ready: false })
  ]);
  return Object.freeze({
    mockOnly: true, shopper: state.shopper, country: state.country,
    cartLines: Object.freeze(cartLines), itemCount, subtotalMinor,
    shippingStatus: quote.shipping.status, shippingMinor, totalBeforeTaxMinor,
    requirements, checkoutEnabled: false, canPlaceOrder: false,
    paymentEnabled: false, orderSubmitted: false, taxCalculated: false
  });
}
export { assessFictionalCheckout };

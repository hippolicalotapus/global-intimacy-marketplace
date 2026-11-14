// Fictional in-memory account/cart/shipping walkthrough. NOT authentication, payment or delivery.
import { canPublishProduct } from './vendor-domain.mjs';
import { createMockCheckout } from './mock-checkout.mjs';

const idPattern = /^[A-Za-z0-9_-]{1,100}$/;
const currencyPattern = /^[A-Z]{3}$/;
const countryPattern = /^[A-Z]{2}$/;
function validId(value) {
  return typeof value === 'string' && idPattern.test(value);
}
function requireCart(cart) {
  if (!cart || cart.kind !== 'fictional_cart' || !validId(cart.ownerId) ||
      !currencyPattern.test(cart.currency) || !Array.isArray(cart.lines)) {
    throw new TypeError('Fictional cart required');
  }
}
function createMockAccount({ accountId, state = 'active' } = {}) {
  if (!validId(accountId) || !['active', 'suspended'].includes(state)) {
    throw new TypeError('Invalid fictional account');
  }
  return Object.freeze({
    kind: 'fictional_account', accountId, state,
    authenticated: false, storesPersonalInformation: false, mockOnly: true
  });
}
function createMockCart({ ownerId, currency = 'CAD' } = {}) {
  if (!validId(ownerId) || typeof currency !== 'string' || !currencyPattern.test(currency)) {
    throw new TypeError('Invalid fictional cart owner or currency');
  }
  return Object.freeze({
    kind: 'fictional_cart', ownerId, currency, lines: Object.freeze([]), mockOnly: true
  });
}
function snapshotLine({ vendor, product, productId, quantity, unitPriceMinor } = {}) {
  if (!validId(productId)) throw new TypeError('Invalid product ID');
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) {
    throw new TypeError('Invalid quantity');
  }
  if (!Number.isSafeInteger(unitPriceMinor) || unitPriceMinor < 0) {
    throw new TypeError('Invalid fictional unit price');
  }
  // Copy only checkout-gating fields. Prevent caller mutations from changing a cart quote.
  const frozenVendor = Object.freeze({ status: vendor?.status });
  const frozenProduct = Object.freeze({
    status: product?.status,
    mediaRights: product?.mediaRights,
    resaleAuthorized: product?.resaleAuthorized,
    territories: Object.freeze(Array.isArray(product?.territories) ? [...product.territories] : []),
    stock: product?.stock,
    inventoryUpdatedAt: product?.inventoryUpdatedAt
  });
  return Object.freeze({
    vendor: frozenVendor, product: frozenProduct, productId, quantity, unitPriceMinor
  });
}
function addMockCartLine(cart, line) {
  requireCart(cart);
  if (cart.lines.length >= 100) throw new RangeError('Cart line limit');
  const item = snapshotLine(line);
  if (cart.lines.some(row => row.productId === item.productId)) {
    throw new Error('Duplicate cart product');
  }
  return Object.freeze({ ...cart, lines: Object.freeze([...cart.lines, item]) });
}
function setMockCartQuantity(cart, productId, quantity) {
  requireCart(cart);
  if (!validId(productId) || !cart.lines.some(line => line.productId === productId)) {
    throw new TypeError('Unknown product');
  }
  if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 100) {
    throw new TypeError('Invalid quantity');
  }
  const lines = quantity === 0
    ? cart.lines.filter(line => line.productId !== productId)
    : cart.lines.map(line => line.productId === productId
      ? Object.freeze({ ...line, quantity }) : line);
  return Object.freeze({ ...cart, lines: Object.freeze(lines) });
}
function previewMockShipping({
  cart, country, fixture, now = Date.now(), maxInventoryAgeMs
} = {}) {
  requireCart(cart);
  if (typeof country !== 'string' || !countryPattern.test(country)) {
    throw new TypeError('ISO-2 destination country required');
  }
  const eligible = cart.lines.length > 0 && cart.lines.every(line =>
    Number.isSafeInteger(line.quantity) && line.quantity > 0 &&
    canPublishProduct({
      vendor: line.vendor, product: line.product, country, now, maxInventoryAgeMs
    }) && line.quantity <= line.product.stock
  );
  const base = { country, mockOnly: true, deliveryConfirmed: false, shipmentBooked: false };
  if (!eligible) return Object.freeze({ ...base, status: 'unavailable', shippingMinor: null });
  if (!fixture || fixture.mode !== 'fictional' || !fixture.ratesMinor ||
      typeof fixture.ratesMinor !== 'object' ||
      !Object.hasOwn(fixture.ratesMinor, country)) {
    return Object.freeze({ ...base, status: 'unknown', shippingMinor: null });
  }
  const shippingMinor = fixture.ratesMinor[country];
  if (!Number.isSafeInteger(shippingMinor) || shippingMinor < 0) {
    throw new TypeError('Unsafe fictional shipping rate');
  }
  return Object.freeze({ ...base, status: 'fictional_quote', shippingMinor });
}
function previewMockCustomerCheckout({
  account, cart, country, fixture, orderId, idempotencyKey, now = Date.now(),
  maxInventoryAgeMs
} = {}) {
  requireCart(cart);
  if (!account || account.kind !== 'fictional_account' || account.mockOnly !== true ||
      account.state !== 'active' || account.accountId !== cart.ownerId) {
    throw new Error('Fictional account/cart mismatch or inactive account');
  }
  const shipping = previewMockShipping({ cart, country, fixture, now, maxInventoryAgeMs });
  if (shipping.status !== 'fictional_quote') throw new Error('Fictional shipping quote required');
  const checkout = createMockCheckout({
    id: orderId, idempotencyKey, currency: cart.currency, country,
    lines: cart.lines, now, maxInventoryAgeMs
  });
  const mockTotalBeforeTaxMinor = checkout.order.totalMinor + shipping.shippingMinor;
  if (!Number.isSafeInteger(mockTotalBeforeTaxMinor)) throw new RangeError('Unsafe mock total');
  return Object.freeze({
    checkout, shipping, mockTotalBeforeTaxMinor,
    taxNotCalculated: true, finalPriceAvailable: false,
    customerAuthenticated: false, addressCollected: false,
    paymentEnabled: false, inventoryReserved: false, shipmentBooked: false,
    orderSubmitted: false, requiresServerRevalidation: true, mockOnly: true
  });
}
export {
  createMockAccount, createMockCart, addMockCartLine, setMockCartQuantity,
  previewMockShipping, previewMockCustomerCheckout
};

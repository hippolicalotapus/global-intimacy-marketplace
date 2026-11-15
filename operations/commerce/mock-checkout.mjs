// Offline checkout simulation. Never accepts payment credentials or submits orders.
import { canPublishProduct } from './vendor-domain.mjs';
import { newOrder, advance } from './order-domain.mjs';

function createMockCheckout({ id, idempotencyKey, currency, lines, country, now, maxInventoryAgeMs } = {}) {
  if (!Array.isArray(lines) || lines.length === 0 || lines.length > 100) throw new TypeError('Order lines required');
  if (typeof country !== 'string' || !/^[A-Z]{2}$/.test(country)) throw new TypeError('Country must be ISO-2');
  const seen = new Set();
  let totalMinor = 0;
  const snapshot = lines.map(({ vendor, product, productId, quantity, unitPriceMinor }) => {
    if (typeof productId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(productId) || seen.has(productId)) throw new TypeError('Invalid or duplicate product ID');
    seen.add(productId);
    if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 100) throw new TypeError('Invalid quantity');
    if (!Number.isSafeInteger(unitPriceMinor) || unitPriceMinor < 0) throw new TypeError('Invalid unit price');
    if (!canPublishProduct({ vendor, product, country, now, maxInventoryAgeMs }) || quantity > product.stock) throw new Error('Product not eligible for checkout');
    const subtotal = quantity * unitPriceMinor;
    if (!Number.isSafeInteger(subtotal) || !Number.isSafeInteger(totalMinor + subtotal)) throw new RangeError('Unsafe total');
    totalMinor += subtotal;
    return Object.freeze({ productId, quantity, unitPriceMinor, subtotalMinor: subtotal });
  });
  // This is only a merchandise subtotal. Taxes, shipping and final prices require a trusted server.
  const order = newOrder({ id, idempotencyKey, currency, totalMinor });
  return Object.freeze({ order, lines: Object.freeze(snapshot), simulationOnly: true, totalsExcludeTaxAndShipping: true });
}
function simulatePayment(checkout, eventId) {
  if (!checkout || checkout.simulationOnly !== true || checkout.order.state !== 'draft') throw new Error('Invalid mock checkout');
  const awaiting = advance(checkout.order, 'awaiting_payment', eventId + '_start');
  const paid = advance(awaiting, 'paid', eventId + '_mock');
  return Object.freeze({ ...checkout, order: paid, simulatedPayment: true });
}
export { createMockCheckout, simulatePayment };

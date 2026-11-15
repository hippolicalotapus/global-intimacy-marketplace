// Pure, offline order state machine. Does not charge cards or contact suppliers.
const transitions = Object.freeze({
  draft: ['awaiting_payment', 'cancelled'],
  awaiting_payment: ['paid', 'cancelled'],
  paid: ['fulfillment_pending', 'refund_pending'],
  fulfillment_pending: ['submitted', 'manual_review', 'refund_pending'],
  submitted: ['fulfilled', 'manual_review', 'refund_pending'],
  manual_review: ['submitted', 'refund_pending'],
  fulfilled: ['refund_pending'],
  refund_pending: ['refunded', 'manual_review'],
  refunded: [],
  cancelled: []
});
function assertKey(key) {
  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(key)) throw new TypeError('Invalid idempotency key');
}
function newOrder({ id, idempotencyKey, currency, totalMinor }) {
  assertKey(idempotencyKey);
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) throw new TypeError('Invalid order ID');
  if (typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency)) throw new TypeError('Invalid currency');
  if (!Number.isSafeInteger(totalMinor) || totalMinor < 0) throw new TypeError('Invalid total');
  return Object.freeze({ id, idempotencyKey, currency, totalMinor, state: 'draft', processedEvents: Object.freeze([]) });
}
function advance(order, nextState, eventId) {
  if (!order || !Array.isArray(order.processedEvents) || !transitions[order.state]) throw new TypeError('Invalid order');
  assertKey(eventId);
  if (order.processedEvents.includes(eventId)) return order;
  if (!transitions[order.state].includes(nextState)) throw new Error('Illegal order transition');
  return Object.freeze({ ...order, state: nextState, processedEvents: Object.freeze([...order.processedEvents, eventId]) });
}
function shouldSubmitSupplierOrder({ order, submissionKey, priorSubmissionKeys = [] }) {
  if (!order || order.state !== 'fulfillment_pending') return false;
  assertKey(submissionKey);
  if (!Array.isArray(priorSubmissionKeys) || priorSubmissionKeys.includes(submissionKey)) return false;
  return true;
}
export { transitions, newOrder, advance, shouldSubmitSupplierOrder };

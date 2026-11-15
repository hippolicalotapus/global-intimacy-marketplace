import test from 'node:test';
import assert from 'node:assert/strict';
import { newOrder, advance, shouldSubmitSupplierOrder } from './order-domain.mjs';
const order = () => newOrder({ id: 'order_1', idempotencyKey: 'request_12345', currency: 'CAD', totalMinor: 2500 });
const pending = () => advance(advance(order(), 'awaiting_payment', 'evt_request_1'), 'paid', 'evt_payment_1');
test('orders start as immutable unpaid drafts', () => {
  const o = order();
  assert.equal(o.state, 'draft');
  assert.ok(Object.isFrozen(o));
  assert.throws(() => newOrder({ id: 'x', idempotencyKey: 'bad', currency: 'CAD', totalMinor: 10 }));
  assert.throws(() => newOrder({ id: 'x', idempotencyKey: 'valid_key_1', currency: 'CAD', totalMinor: 1.5 }));
});
test('paid state requires a valid transition and event', () => {
  assert.throws(() => advance(order(), 'paid', 'evt_payment_1'));
  assert.equal(pending().state, 'paid');
  assert.throws(() => advance(pending(), 'cancelled', 'evt_cancel_1'));
});
test('replayed events are idempotent', () => {
  const o = pending();
  assert.strictEqual(advance(o, 'refund_pending', 'evt_payment_1'), o);
});
test('supplier submissions only allowed after payment and not for repeated keys', () => {
  const o = advance(pending(), 'fulfillment_pending', 'evt_fulfill_1');
  assert.equal(shouldSubmitSupplierOrder({ order: o, submissionKey: 'supplier_12345' }), true);
  assert.equal(shouldSubmitSupplierOrder({ order: o, submissionKey: 'supplier_12345', priorSubmissionKeys: ['supplier_12345'] }), false);
  assert.equal(shouldSubmitSupplierOrder({ order: order(), submissionKey: 'supplier_12345' }), false);
});
test('refund and manual review paths never reopen terminal orders', () => {
  let o = advance(pending(), 'refund_pending', 'evt_refund_1');
  o = advance(o, 'refunded', 'evt_refund_2');
  assert.throws(() => advance(o, 'paid', 'evt_payment_2'));
});

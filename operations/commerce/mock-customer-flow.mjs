// Offline, fictional session and cart recovery. NEVER authentication or persistent customer storage.
import {
  createMockCart, addMockCartLine, setMockCartQuantity, previewMockCustomerCheckout
} from './mock-customer-cart.mjs';

const id = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);
function sessionForFixture({ account, sessionId, now, expiresAt } = {}) {
  if (!account || account.kind !== 'fictional_account' || account.mockOnly !== true ||
      account.state !== 'active' || !id(account.accountId) || !id(sessionId) ||
      !Number.isSafeInteger(now) || !Number.isSafeInteger(expiresAt) ||
      expiresAt <= now || expiresAt - now > 86400000) {
    throw new TypeError('Invalid fictional session fixture');
  }
  return Object.freeze({
    kind: 'fictional_session', sessionId, ownerId: account.accountId,
    expiresAt, mockOnly: true, authenticated: false, grantsRealAccess: false
  });
}
function checkFixtureAccess({ session, account, cart, now } = {}) {
  if (!session || session.kind !== 'fictional_session' || session.mockOnly !== true ||
      session.authenticated !== false || session.grantsRealAccess !== false ||
      !id(session.sessionId) || !id(session.ownerId) ||
      !Number.isSafeInteger(session.expiresAt) || !Number.isSafeInteger(now) ||
      now >= session.expiresAt || !account || account.kind !== 'fictional_account' ||
      account.mockOnly !== true || account.state !== 'active' ||
      account.accountId !== session.ownerId ||
      (cart && (cart.kind !== 'fictional_cart' || cart.mockOnly !== true || cart.ownerId !== session.ownerId))) {
    throw new Error('Fictional session is missing, expired or does not match customer/cart');
  }
  return true; // Fixture consistency only; NOT identity verification or authorization.
}
function saveFictionalCart({ session, account, cart, now } = {}) {
  checkFixtureAccess({ session, account, cart, now });
  if (!cart || !Array.isArray(cart.lines) || cart.lines.length > 100) throw new TypeError('Invalid fictional cart');
  // Keep only permitted fictional cart data. No credentials, names, contacts or addresses.
  const lines = cart.lines.map(line => ({
    productId: line.productId, quantity: line.quantity, unitPriceMinor: line.unitPriceMinor,
    vendor: { status: line.vendor?.status },
    product: {
      status: line.product?.status, mediaRights: line.product?.mediaRights,
      resaleAuthorized: line.product?.resaleAuthorized,
      territories: line.product?.territories, stock: line.product?.stock,
      inventoryUpdatedAt: line.product?.inventoryUpdatedAt
    }
  }));
  const verified = lines.reduce((c, line) => addMockCartLine(c, line),
    createMockCart({ ownerId: cart.ownerId, currency: cart.currency }));
  if (verified.lines.length !== lines.length) throw new TypeError('Invalid fictional cart snapshot');
  return JSON.stringify({
    format: 'gim-fictional-cart', version: 1, ownerId: session.ownerId,
    sessionId: session.sessionId, expiresAt: session.expiresAt,
    currency: cart.currency, lines
  });
}
function restoreFictionalCart({ serialized, session, account, now } = {}) {
  checkFixtureAccess({ session, account, now });
  if (typeof serialized !== 'string' || serialized.length > 100000) throw new TypeError('Invalid cart snapshot');
  let snapshot;
  try { snapshot = JSON.parse(serialized); } catch { throw new TypeError('Invalid cart JSON'); }
  if (!snapshot || Array.isArray(snapshot) || snapshot.format !== 'gim-fictional-cart' ||
      snapshot.version !== 1 || snapshot.ownerId !== session.ownerId ||
      snapshot.sessionId !== session.sessionId || snapshot.expiresAt !== session.expiresAt ||
      !Array.isArray(snapshot.lines) || snapshot.lines.length > 100) {
    throw new Error('Fictional cart snapshot missing, expired, tampered or mismatched');
  }
  let cart = createMockCart({ ownerId: snapshot.ownerId, currency: snapshot.currency });
  for (const line of snapshot.lines) cart = addMockCartLine(cart, line);
  return cart;
}
function previewFictionalJourney({
  account, session, cart, country, fixture, orderId, idempotencyKey, now,
  maxInventoryAgeMs
} = {}) {
  checkFixtureAccess({ account, session, cart, now });
  const restored = restoreFictionalCart({
    serialized: saveFictionalCart({ account, session, cart, now }), account, session, now
  });
  const preview = previewMockCustomerCheckout({
    account, cart: restored, country, fixture, orderId, idempotencyKey,
    now, maxInventoryAgeMs
  });
  return Object.freeze({
    restoredLineCount: restored.lines.length, preview,
    mockOnly: true, authenticated: false, orderSubmitted: false,
    paymentEnabled: false, shipmentBooked: false
  });
}
export {
  sessionForFixture, checkFixtureAccess, saveFictionalCart,
  restoreFictionalCart, previewFictionalJourney
};

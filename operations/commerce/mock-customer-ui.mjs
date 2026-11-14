// Offline customer-facing prototype state only; fictional fixtures, no browser storage or network.
import {
  createMockAccount, createMockCart, addMockCartLine, setMockCartQuantity,
  previewMockShipping, previewMockCustomerCheckout
} from './mock-customer-cart.mjs';
import {
  sessionForFixture, checkFixtureAccess, saveFictionalCart, restoreFictionalCart
} from './mock-customer-flow.mjs';

const fictionalRates = Object.freeze({ CA: 450, US: 750 });
const now = 200000;
let freshSessionSequence=0;
function demoProduct(productId, unitPriceMinor) {
  return {
    productId, unitPriceMinor, quantity: 1,
    vendor: { status: 'approved' },
    product: {
      status: 'approved', mediaRights: true, resaleAuthorized: true,
      territories: ['CA', 'US'], stock: 10,
      inventoryUpdatedAt: new Date(now - 1000).toISOString()
    }
  };
}
const catalog = Object.freeze({
  tee: Object.freeze(demoProduct('fictional_tee', 2500)),
  hoodie: Object.freeze(demoProduct('fictional_hoodie', 4900))
});
function createDemoCustomer({ shopper = 'returning', country = 'CA' } = {}) {
  if (!['returning', 'guest'].includes(shopper) || !['CA', 'US', 'GB'].includes(country)) {
    throw new TypeError('Unknown fictional shopper or country');
  }
  const account = createMockAccount({ accountId: shopper === 'returning' ? 'fictional_returning' : 'fictional_guest' });
  const session = sessionForFixture({
    account, sessionId: shopper === 'returning' ? 'returning_fixture' : 'guest_fixture',
    now, expiresAt: now + 60000
  });
  let cart = createMockCart({ ownerId: account.accountId });
  if (shopper === 'returning') cart = addMockCartLine(cart, catalog.tee);
  return Object.freeze({ account, session, cart, country, shopper, mockOnly: true });
}
function requireDemoAccess(state) {
  if(!state?.mockOnly) throw new TypeError('Not a fictional customer');
  checkFixtureAccess({account:state.account,session:state.session,cart:state.cart,now});
}
function restartDemoSession(state) {
  if(!state?.mockOnly || !['returning','guest'].includes(state.shopper) ||
      !['CA','US','GB'].includes(state.country) ||
      state.account?.accountId!==(state.shopper==='returning'?'fictional_returning':'fictional_guest')) {
    throw new TypeError('Invalid fictional customer for session restart');
  }
  const session=sessionForFixture({account:state.account,
    sessionId:'fresh_'+state.shopper+'_'+(++freshSessionSequence),now,expiresAt:now+60000});
  return Object.freeze({...state,session,cart:createMockCart({ownerId:state.account.accountId})});
}
function changeDemoQuantity(state, productId, quantity) {
  requireDemoAccess(state);
  if (!state?.mockOnly || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 10) {
    throw new TypeError('Unsafe fictional cart edit');
  }
  const existing = state.cart.lines.some(line => line.productId === productId);
  if (!existing && quantity === 0) return state;
  if (!existing && quantity > 0) {
    const entry = Object.values(catalog).find(item => item.productId === productId);
    if (!entry) throw new TypeError('Unknown fictional product');
    return Object.freeze({
      ...state, cart: addMockCartLine(state.cart, { ...entry, quantity })
    });
  }
  return Object.freeze({ ...state, cart: setMockCartQuantity(state.cart, productId, quantity) });
}
function changeDemoCountry(state, country) {
  requireDemoAccess(state);
  if (!state?.mockOnly || !['CA', 'US', 'GB'].includes(country)) throw new TypeError('Unsupported fictional country selection');
  return Object.freeze({ ...state, country });
}
function saveDemoCart(state) {
  requireDemoAccess(state);
  return saveFictionalCart({ account: state.account, session: state.session, cart: state.cart, now });
}
function restoreDemoCart(state, serialized) {
  requireDemoAccess(state);
  const restored = restoreFictionalCart({
    serialized, account: state.account, session: state.session, now
  });
  // Fictional snapshots are not signed: revalidate catalog identifiers and sample prices.
  // This is demo consistency, NOT production authentication or payment security.
  for (const line of restored.lines) {
    const approved = Object.values(catalog).find(item => item.productId === line.productId);
    if (!approved || line.unitPriceMinor !== approved.unitPriceMinor ||
        !Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 10) {
      throw new Error('Fictional snapshot does not match the demonstration catalog');
    }
  }
  return Object.freeze({ ...state, cart: restored });
}
function previewDemo(state) {
  requireDemoAccess(state);
  const fixture = { mode: 'fictional', ratesMinor: fictionalRates };
  const shipping = previewMockShipping({ cart: state.cart, country: state.country, fixture, now });
  if (shipping.status !== 'fictional_quote') {
    return Object.freeze({
      shipping, checkout: null, error: 'Fictional shipping unavailable',
      mockOnly: true, paymentEnabled: false
    });
  }
  const checkout = previewMockCustomerCheckout({
    account: state.account, cart: state.cart, country: state.country, fixture,
    orderId: 'fictional_preview', idempotencyKey: 'fictional_request', now
  });
  return Object.freeze({
    shipping, checkout, error: null, mockOnly: true, paymentEnabled: false
  });
}
export {
  catalog, createDemoCustomer, restartDemoSession, changeDemoQuantity, changeDemoCountry,
  saveDemoCart, restoreDemoCart, previewDemo
};

// Two independent, offline fictional shopper sessions. No real authentication, storage or network.
import {createDemoCustomer,restartDemoSession,changeDemoQuantity,saveDemoCart,restoreDemoCart,previewDemo,catalog} from './mock-customer-ui.mjs';
import {beginFictionalJourney} from './mock-checkout-lifecycle.mjs';
import {emptyFictionalHistory,recordFictionalHistory,visibleFictionalHistory} from './mock-checkout-history.mjs';
const shoppers=Object.freeze(['returning','guest']);
function makeSlot(shopper){return Object.freeze({customer:createDemoCustomer({shopper}),snapshot:null,history:emptyFictionalHistory(),
  revision:0,editKeys:Object.freeze([]),interrupted:null});}
function createParallelSessions(){
  return Object.freeze({mockOnly:true,active:'returning',slots:Object.freeze({returning:makeSlot('returning'),guest:makeSlot('guest')})});
}
function activeSlot(store){
  if(store?.mockOnly!==true || !shoppers.includes(store.active))throw new TypeError('Invalid fictional session collection');
  const slot=store.slots?.[store.active];
  const expected=store.active==='returning'?'fictional_returning':'fictional_guest';
  if(!slot || slot.customer?.shopper!==store.active || slot.customer.account?.accountId!==expected ||
      slot.customer.cart?.ownerId!==expected || slot.customer.session?.ownerId!==expected)
    throw new Error('Fictional shopper isolation mismatch');
  return slot;
}
function updateSlot(store,patch){
  const slot=activeSlot(store);
  const next=Object.freeze({...slot,...patch});
  return Object.freeze({...store,slots:Object.freeze({...store.slots,[store.active]:next})});
}
function switchParallelShopper(store,shopper){
  activeSlot(store);
  if(!shoppers.includes(shopper))throw new TypeError('Unknown fictional shopper');
  const selected=Object.freeze({...store,active:shopper});
  activeSlot(selected);
  return selected;
}
function editParallelTee(store,expectedRevision,key){
  const slot=activeSlot(store);
  if(!Number.isSafeInteger(expectedRevision)||expectedRevision!==slot.revision)throw new Error('Stale fictional cart revision');
  if(typeof key!=='string'||!/^[A-Za-z0-9_-]{8,80}$/.test(key))throw new TypeError('Invalid fictional edit identifier');
  if(slot.editKeys.includes(key))throw new Error('Duplicate fictional cart edit');
  const qty=slot.customer.cart.lines.find(x=>x.productId===catalog.tee.productId)?.quantity||0;
  const customer=changeDemoQuantity(slot.customer,catalog.tee.productId,qty+1);
  return updateSlot(store,{customer,revision:slot.revision+1,editKeys:Object.freeze([...slot.editKeys,key]),interrupted:null});
}
let editSequence=0;
function addParallelTee(store){
  const slot=activeSlot(store);
  return editParallelTee(store,slot.revision,'parallel_edit_'+(++editSequence));
}
function saveParallelSnapshot(store){
  const slot=activeSlot(store);
  return updateSlot(store,{snapshot:saveDemoCart(slot.customer)});
}
function recoverParallelSnapshot(store){
  const slot=activeSlot(store);
  if(!slot.snapshot)throw new Error('No snapshot in this fictional session');
  return updateSlot(store,{customer:restoreDemoCart(slot.customer,slot.snapshot),revision:slot.revision+1,interrupted:null});
}
function startParallelReview(store){
  const slot=activeSlot(store);
  const journey=beginFictionalJourney(slot.customer);
  const key='parallel_review_'+(slot.history.events.length+1);
  const history=recordFictionalHistory(slot.history,slot.customer.account,journey,'review',key);
  return updateSlot(store,{history,interrupted:Object.freeze({sessionId:slot.customer.session.sessionId,
    revision:slot.revision,journey,consumed:false})});
}
function resumeInterruptedParallelReview(store){
  const slot=activeSlot(store),hold=slot.interrupted;
  if(!hold||hold.consumed||hold.sessionId!==slot.customer.session.sessionId||hold.revision!==slot.revision)
    throw new Error('Interrupted fictional checkout is missing or stale');
  const fresh=beginFictionalJourney(slot.customer);
  if(JSON.stringify(fresh.review.cartLines)!==JSON.stringify(hold.journey.review.cartLines)||
     fresh.review.shippingMinor!==hold.journey.review.shippingMinor||
     fresh.country!==hold.journey.country)throw new Error('Fictional checkout changed; begin a new review');
  const history=recordFictionalHistory(slot.history,slot.customer.account,fresh,'review',
    'parallel_resume_'+(slot.history.events.length+1));
  return updateSlot(store,{history,interrupted:null});
}
function restartParallelSlot(store){
  const slot=activeSlot(store);
  return updateSlot(store,{customer:restartDemoSession(slot.customer),snapshot:null,history:emptyFictionalHistory(),revision:0,editKeys:Object.freeze([]),interrupted:null});
}
function describeParallelSlot(store){
  const slot=activeSlot(store);
  const events=visibleFictionalHistory(slot.history,slot.customer.account);
  const estimate=previewDemo(slot.customer);
  return Object.freeze({shopper:store.active,cartCount:slot.customer.cart.lines.reduce((n,x)=>n+x.quantity,0),
    events:events.length,hasSnapshot:!!slot.snapshot,canReview:!!estimate.checkout,
    canResume:!!slot.interrupted && slot.interrupted.sessionId===slot.customer.session.sessionId && slot.interrupted.revision===slot.revision,
    revision:slot.revision,
    paymentEnabled:false,orderSubmitted:false,sessionId:slot.customer.session.sessionId});
}
export {createParallelSessions,switchParallelShopper,addParallelTee,editParallelTee,saveParallelSnapshot,
  recoverParallelSnapshot,startParallelReview,resumeInterruptedParallelReview,restartParallelSlot,describeParallelSlot};
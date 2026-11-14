// Two independent, offline fictional shopper sessions. No real authentication, storage or network.
import {createDemoCustomer,restartDemoSession,changeDemoQuantity,saveDemoCart,restoreDemoCart,previewDemo,catalog} from './mock-customer-ui.mjs';
import {beginFictionalJourney} from './mock-checkout-lifecycle.mjs';
import {emptyFictionalHistory,recordFictionalHistory,visibleFictionalHistory} from './mock-checkout-history.mjs';
const shoppers=Object.freeze(['returning','guest']);
function makeSlot(shopper){return Object.freeze({customer:createDemoCustomer({shopper}),snapshot:null,history:emptyFictionalHistory()});}
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
function addParallelTee(store){
  const slot=activeSlot(store);
  const qty=slot.customer.cart.lines.find(x=>x.productId===catalog.tee.productId)?.quantity||0;
  return updateSlot(store,{customer:changeDemoQuantity(slot.customer,catalog.tee.productId,qty+1)});
}
function saveParallelSnapshot(store){
  const slot=activeSlot(store);
  return updateSlot(store,{snapshot:saveDemoCart(slot.customer)});
}
function recoverParallelSnapshot(store){
  const slot=activeSlot(store);
  if(!slot.snapshot)throw new Error('No snapshot in this fictional session');
  return updateSlot(store,{customer:restoreDemoCart(slot.customer,slot.snapshot)});
}
function startParallelReview(store){
  const slot=activeSlot(store);
  const journey=beginFictionalJourney(slot.customer);
  const key='parallel_review_'+(slot.history.events.length+1);
  const history=recordFictionalHistory(slot.history,slot.customer.account,journey,'review',key);
  return updateSlot(store,{history});
}
function restartParallelSlot(store){
  const slot=activeSlot(store);
  return updateSlot(store,{customer:restartDemoSession(slot.customer),snapshot:null,history:emptyFictionalHistory()});
}
function describeParallelSlot(store){
  const slot=activeSlot(store);
  const events=visibleFictionalHistory(slot.history,slot.customer.account);
  const estimate=previewDemo(slot.customer);
  return Object.freeze({shopper:store.active,cartCount:slot.customer.cart.lines.reduce((n,x)=>n+x.quantity,0),
    events:events.length,hasSnapshot:!!slot.snapshot,canReview:!!estimate.checkout,
    paymentEnabled:false,orderSubmitted:false,sessionId:slot.customer.session.sessionId});
}
export {createParallelSessions,switchParallelShopper,addParallelTee,saveParallelSnapshot,
  recoverParallelSnapshot,startParallelReview,restartParallelSlot,describeParallelSlot};
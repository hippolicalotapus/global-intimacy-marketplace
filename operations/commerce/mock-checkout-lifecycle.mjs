// Deliberately fictional, in-memory checkout journey. No actual orders or payment operations.
import { newOrder, advance } from './order-domain.mjs';
import { assessFictionalCheckout } from './mock-checkout-review.mjs';

const statuses=Object.freeze({
  draft:'Fictional review draft',
  awaiting_payment:'Simulated payment pending',
  paid:'Fictional payment confirmation (no charge)',
  cancelled:'Fictional checkout cancelled'
});
function requireJourney(journey){
  if(!journey || journey.mockOnly!==true || journey.order?.state!==journey.state ||
      !Object.hasOwn(statuses,journey.state) || journey.paymentEnabled!==false ||
      journey.orderSubmitted!==false || journey.shipmentBooked!==false) {
    throw new TypeError('Invalid fictional checkout journey');
  }
}
function beginFictionalJourney(state){
  const review=assessFictionalCheckout(state);
  if(review.totalBeforeTaxMinor===null || review.itemCount===0 || !review.requirements[0].ready ||
      !review.requirements[1].ready) throw new Error('A fictional cart and sample shipping quote are required');
  const order=newOrder({
    id:'fictional_preview_only',idempotencyKey:'fictional_preview_request',currency:'CAD',
    totalMinor:review.subtotalMinor
  });
  return Object.freeze({
    order,state:order.state,review,shopper:state.shopper,country:state.country,
    mockOnly:true,paymentEnabled:false,orderSubmitted:false,shipmentBooked:false,
    realPaymentProcessed:false,receiptIssued:false,outcome:'none'
  });
}
function progressFictionalJourney(journey,event){
  requireJourney(journey);
  if(!['pending','confirm','cancel','decline'].includes(event)) throw new TypeError('Unknown fictional event');
  const target=event==='pending'?'awaiting_payment':event==='confirm'?'paid':'cancelled';
  // Only the existing order-domain transition rules decide whether the event is legal.
  const eventId={pending:'fictional_event_pending',confirm:'fictional_event_confirm',cancel:'fictional_event_cancel',decline:'fictional_event_decline'}[event];
  // The UI treats repeated actions as invalid; keep order-domain webhook replay semantics intact.
  if(journey.order.processedEvents.includes(eventId)) throw new Error('Fictional action already applied');
  if(event==='decline' && journey.state!=='awaiting_payment') throw new Error('Decline requires fictional payment pending');
  const order=advance(journey.order,target,eventId);
  const outcome=event==='decline'?'declined':event==='cancel'?'cancelled':event==='confirm'?'confirmed':journey.outcome;
  return Object.freeze({...journey,order,state:order.state,outcome});
}
function describeFictionalJourney(journey){
  if(journey===null)return 'No fictional checkout review started.';
  requireJourney(journey);
  const label=journey.state==='cancelled' && journey.outcome==='declined'
    ? 'Simulated payment declined (no charge)' : statuses[journey.state];
  return label+'. No real payment, order, receipt or delivery.';
}
export { beginFictionalJourney,progressFictionalJourney,describeFictionalJourney };


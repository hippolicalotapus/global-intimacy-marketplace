// In-memory fictional order history only: not a production order record.
const labels=Object.freeze({review:'draft',pending:'awaiting_payment',retried:'draft',confirmed:'paid',declined:'cancelled',cancelled:'cancelled'});
function emptyFictionalHistory(){return Object.freeze({mockOnly:true,ownerId:null,events:Object.freeze([])});}
function recordFictionalHistory(history,account,journey,status,key){
  if(history?.mockOnly!==true || !Array.isArray(history.events) || history.events.length>=60 ||
      account?.authenticated!==false || typeof account.accountId!=='string' ||
      !journey?.mockOnly || journey.paymentEnabled!==false || journey.orderSubmitted!==false ||
      journey.realPaymentProcessed!==false || journey.shipmentBooked!==false ||
      journey.receiptIssued!==false || !Object.hasOwn(labels,status) || journey.state!==labels[status] ||
      (status==='confirmed'&&journey.outcome!=='confirmed') ||
      (status==='declined'&&journey.outcome!=='declined') ||
      (status==='cancelled'&&journey.outcome!=='cancelled') ||
      !Number.isSafeInteger(journey.attemptNumber) || journey.attemptNumber<1 || journey.attemptNumber>3 ||
      typeof key!=='string' || !/^[A-Za-z0-9_-]{8,80}$/.test(key)){
    throw new TypeError('Invalid fictional history event');
  }
  if(history.ownerId!==null&&history.ownerId!==account.accountId)throw new Error('Fictional history owner mismatch');
  if(history.events.some(e=>e.key===key))throw new Error('Duplicate fictional history event');
  const item=Object.freeze({key,status,attempt:journey.attemptNumber,ownerId:account.accountId,sequence:history.events.length+1});
  return Object.freeze({mockOnly:true,ownerId:account.accountId,events:Object.freeze([...history.events,item])});
}
function visibleFictionalHistory(history,account){
  if(history?.mockOnly!==true || !Array.isArray(history.events) || account?.authenticated!==false)throw new TypeError('Invalid fictional history viewer');
  if(history.ownerId!==null && history.ownerId!==account.accountId)return Object.freeze([]);
  return Object.freeze(history.events.filter(e=>e.ownerId===account.accountId));
}
export {emptyFictionalHistory,recordFictionalHistory,visibleFictionalHistory};

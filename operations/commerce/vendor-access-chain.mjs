// Offline fictional authorization-chain envelope. No production keys, identities, storage or endpoints.
import {createHash} from 'node:crypto';
import {sealFixtureAudit,openFixtureAudit} from './vendor-audit-envelope.mjs';
import {createFixtureAccessLedger} from './vendor-access-ledger.mjs';
const ensure=(ok,message)=>{if(!ok)throw new Error(message);};
const digest=value=>createHash('sha256').update(JSON.stringify(value),'utf8').digest('hex');
const kind='gim-access-ledger-chain-v1';
const initialHash=digest({kind,genesis:true});
function chainPolicyEvents(snapshot){
  ensure(snapshot&&typeof snapshot==='object'&&!Array.isArray(snapshot)&&
    Array.isArray(snapshot.history)&&Number.isSafeInteger(snapshot.version)&&
    snapshot.version===snapshot.history.length&&
    typeof snapshot.baselineHash==='string'&&/^[a-f0-9]{64}$/.test(snapshot.baselineHash),
    'Invalid policy chain input');
  let previous=digest({initialHash,baselineHash:snapshot.baselineHash});
  const events=[];
  for(let i=0;i<snapshot.history.length;i++){
    const event=snapshot.history[i];
    ensure(event&&typeof event==='object'&&!Array.isArray(event)&&event.version===i+1,
      'Invalid policy event sequence');
    const hash=digest({previous,event});
    events.push(Object.freeze({version:event.version,previous,hash}));
    previous=hash;
  }
  return Object.freeze({events,head:previous});
}
function sealAccessLedger(ledger,key){
  ensure(ledger&&typeof ledger.snapshot==='function','Fixture ledger required');
  const snapshot=ledger.snapshot();
  const chain=chainPolicyEvents(snapshot);
  return sealFixtureAudit({kind,snapshot,chain},key);
}
function restoreSealedAccessLedger(fixtures,envelope,key,
  {minimumPolicyVersion=0,minimumTransactionRevision=0,expectedHead}={}){
  ensure(fixtures&&typeof fixtures==='object'&&!Array.isArray(fixtures)&&
    !('savedState' in fixtures)&&!('minimumPolicyVersion' in fixtures)&&
    !('minimumTransactionRevision' in fixtures),'Independent trusted fixture baseline required');
  ensure(Number.isSafeInteger(minimumPolicyVersion)&&minimumPolicyVersion>=0&&
    Number.isSafeInteger(minimumTransactionRevision)&&minimumTransactionRevision>=0,
    'Invalid trusted recovery floor');
  if(expectedHead!==undefined)ensure(typeof expectedHead==='string'&&/^[a-f0-9]{64}$/.test(expectedHead),
    'Invalid trusted policy head');
  const contents=openFixtureAudit(envelope,key);
  ensure(contents&&typeof contents==='object'&&!Array.isArray(contents)&&
    Object.keys(contents).sort().join(',')==='chain,kind,snapshot'&&contents.kind===kind,
    'Unexpected signed policy envelope');
  const computed=chainPolicyEvents(contents.snapshot);
  ensure(JSON.stringify(computed)===JSON.stringify(contents.chain)&&
    (expectedHead===undefined||computed.head===expectedHead),
    'Policy event chain mismatch');
  // The ledger independently replays each transition and checks its account and membership results.
  return createFixtureAccessLedger({...fixtures,savedState:contents.snapshot,
    minimumPolicyVersion,minimumTransactionRevision});
}
export {chainPolicyEvents,sealAccessLedger,restoreSealedAccessLedger};

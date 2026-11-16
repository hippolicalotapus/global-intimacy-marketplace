// Offline trusted checkpoint simulation for fictional access ledgers.
// Checkpoints MUST come from independent trusted storage; a snapshot cannot certify itself.
import {createHash,timingSafeEqual} from 'node:crypto';
import {chainPolicyEvents,restoreSealedAccessLedger} from './vendor-access-chain.mjs';
import {openFixtureAudit} from './vendor-audit-envelope.mjs';
const ensure=(ok,msg)=>{if(!ok)throw new Error(msg);};
const sha=value=>createHash('sha256').update(JSON.stringify(value),'utf8').digest('hex');
const hex=value=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);
const matches=(a,b)=>hex(a)&&hex(b)&&timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));
const label='gim-access-checkpoint-v1';

function checkpointAccessLedger(ledger){
  ensure(ledger&&typeof ledger.snapshot==='function','Fictional ledger required');
  const state=ledger.snapshot();
  const chain=chainPolicyEvents(state);
  ensure(state.transactions&&Number.isSafeInteger(state.transactions.state?.revision)&&
    state.transactions.state.revision>=0,'Invalid transaction state');
  const checkpoint={
    kind:label,policyVersion:state.version,policyHead:chain.head,
    transactionRevision:state.transactions.state.revision,
    transactionDigest:sha(state.transactions),
    baselineHash:state.baselineHash
  };
  return Object.freeze(checkpoint);
}

function restoreCheckpointedAccessLedger(fixtures,signed,key,checkpoint){
  ensure(checkpoint&&typeof checkpoint==='object'&&!Array.isArray(checkpoint)&&
    Object.keys(checkpoint).sort().join(',')===
      'baselineHash,kind,policyHead,policyVersion,transactionDigest,transactionRevision'&&
    checkpoint.kind===label&&hex(checkpoint.baselineHash)&&hex(checkpoint.policyHead)&&
    hex(checkpoint.transactionDigest)&&Number.isSafeInteger(checkpoint.policyVersion)&&
    checkpoint.policyVersion>=0&&Number.isSafeInteger(checkpoint.transactionRevision)&&
    checkpoint.transactionRevision>=0,'Invalid trusted recovery checkpoint');
  // Do not treat the signing key or the untrusted snapshot as a source for the checkpoint.
  const envelope=openFixtureAudit(signed,key);
  ensure(envelope&&envelope.kind==='gim-access-ledger-chain-v1'&&
    envelope.snapshot&&envelope.chain,'Unexpected authorization snapshot');
  const state=envelope.snapshot;
  ensure(state.version===checkpoint.policyVersion&&
    state.transactions?.state?.revision===checkpoint.transactionRevision&&
    matches(state.baselineHash,checkpoint.baselineHash)&&
    matches(sha(state.transactions),checkpoint.transactionDigest),
    'Trusted checkpoint mismatches restored state');
  return restoreSealedAccessLedger(fixtures,signed,key,{
    expectedHead:checkpoint.policyHead,
    minimumPolicyVersion:checkpoint.policyVersion,
    minimumTransactionRevision:checkpoint.transactionRevision
  });
}
export {checkpointAccessLedger,restoreCheckpointedAccessLedger};

// Fictional checkpoint-head pinning for restart and fork detection.
// Pins must be retained independently of the snapshot/journal. No durable storage here.
import {timingSafeEqual} from 'node:crypto';
import {createFixtureCheckpointJournal} from './vendor-checkpoint-journal.mjs';
const fail=(ok,message)=>{if(!ok)throw new Error(message);};
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const equal=(a,b)=>hex(a)&&hex(b)&&
  timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));
const copy=value=>JSON.parse(JSON.stringify(value));
const label='gim-checkpoint-pin-v1';
function pinJournal(journal){
  fail(journal&&typeof journal.head==='function'&&typeof journal.snapshot==='function',
    'Trusted fixture journal required');
  const entries=journal.snapshot();
  const last=entries.at(-1);
  fail(last&&Number.isSafeInteger(last.index)&&last.index>0,'Committed checkpoint required');
  return Object.freeze({kind:label,head:journal.head(),index:last.index,
    baselineHash:last.checkpoint.baselineHash,
    policyVersion:last.checkpoint.policyVersion,
    transactionRevision:last.checkpoint.transactionRevision});
}
function openPinnedJournal(savedJournal,trustedPin){
  fail(trustedPin&&typeof trustedPin==='object'&&!Array.isArray(trustedPin)&&
    Object.keys(trustedPin).sort().join(',')===
      'baselineHash,head,index,kind,policyVersion,transactionRevision'&&
    trustedPin.kind===label&&hex(trustedPin.head)&&hex(trustedPin.baselineHash)&&
    Number.isSafeInteger(trustedPin.index)&&trustedPin.index>0&&
    Number.isSafeInteger(trustedPin.policyVersion)&&trustedPin.policyVersion>=0&&
    Number.isSafeInteger(trustedPin.transactionRevision)&&trustedPin.transactionRevision>=0,
    'Independent trusted journal pin required');
  const journal=createFixtureCheckpointJournal({savedJournal});
  const current=pinJournal(journal);
  fail(equal(current.head,trustedPin.head)&&
    equal(current.baselineHash,trustedPin.baselineHash)&&
    current.index===trustedPin.index&&
    current.policyVersion===trustedPin.policyVersion&&
    current.transactionRevision===trustedPin.transactionRevision,
    'Conflicting or rolled-back checkpoint history');
  return journal;
}
function appendPinnedCheckpoint(savedJournal,trustedPin,ledger){
  // Validate the existing persisted journal against its independent pin before advancing.
  const journal=openPinnedJournal(savedJournal,trustedPin);
  journal.append(ledger,{expectedHead:trustedPin.head});
  return Object.freeze({journal:journal.snapshot(),pin:pinJournal(journal)});
}
function recoverPinnedLedger(fixtures,signed,key,savedJournal,trustedPin){
  const journal=openPinnedJournal(savedJournal,trustedPin);
  return journal.recover(fixtures,signed,key);
}
export {pinJournal,openPinnedJournal,appendPinnedCheckpoint,recoverPinnedLedger};

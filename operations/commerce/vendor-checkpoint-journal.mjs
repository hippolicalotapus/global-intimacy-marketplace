// Offline checkpoint journal for fictional GIM authorization state.
// The journal must be held separately from untrusted signed snapshots. Not durable storage.
import {createHash} from 'node:crypto';
import {checkpointAccessLedger,restoreCheckpointedAccessLedger} from './vendor-access-checkpoint.mjs';
const fail=(ok,message)=>{if(!ok)throw new Error(message);};
const copy=x=>JSON.parse(JSON.stringify(x));
const hash=x=>createHash('sha256').update(JSON.stringify(x),'utf8').digest('hex');
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const checkpointFields='baselineHash,kind,policyHead,policyVersion,transactionDigest,transactionRevision';
const fields=x=>Object.keys(x).sort().join(',');
const validCheckpoint=c=>c&&typeof c==='object'&&!Array.isArray(c)&&
  fields(c)===checkpointFields&&c.kind==='gim-access-checkpoint-v1'&&
  hex(c.baselineHash)&&hex(c.policyHead)&&hex(c.transactionDigest)&&
  Number.isSafeInteger(c.policyVersion)&&c.policyVersion>=0&&
  Number.isSafeInteger(c.transactionRevision)&&c.transactionRevision>=0;
const genesis=hash({kind:'gim-checkpoint-journal-v1',genesis:true});
function validateJournal(entries){
  fail(Array.isArray(entries)&&entries.length<=10000,'Invalid checkpoint journal');
  let last=null,previous=genesis;
  for(let i=0;i<entries.length;i++){
    const entry=entries[i];
    fail(entry&&typeof entry==='object'&&!Array.isArray(entry)&&
      fields(entry)==='checkpoint,hash,index,previous'&&
      entry.index===i+1&&validCheckpoint(entry.checkpoint)&&
      entry.previous===previous&&hex(entry.hash)&&
      entry.hash===hash({index:entry.index,previous,checkpoint:entry.checkpoint}),
      'Invalid checkpoint chain');
    const next=entry.checkpoint;
    if(last){
      fail(next.baselineHash===last.baselineHash&&
        next.policyVersion>=last.policyVersion&&
        next.transactionRevision>=last.transactionRevision&&
        (next.policyVersion>last.policyVersion||next.transactionRevision>last.transactionRevision)&&
        (next.policyVersion!==last.policyVersion||next.policyHead===last.policyHead)&&
        (next.transactionRevision!==last.transactionRevision||
          next.transactionDigest===last.transactionDigest),
        'Conflicting or stale checkpoint transition');
    }
    last=next;previous=entry.hash;
  }
  return {last,head:previous};
}
function createFixtureCheckpointJournal({savedJournal}={}){
  const entries=savedJournal===undefined?[]:copy(savedJournal);
  validateJournal(entries);
  function append(ledger,{expectedHead}={}){
    fail(expectedHead===undefined||(hex(expectedHead)&&expectedHead===validateJournal(entries).head),
      'Checkpoint journal compare-and-swap conflict');
    fail(entries.length<10000,'Checkpoint journal full');
    const checkpoint=checkpointAccessLedger(ledger);
    const last=entries.at(-1)?.checkpoint;
    if(last){
      fail(checkpoint.baselineHash===last.baselineHash&&
        checkpoint.policyVersion>=last.policyVersion&&
        checkpoint.transactionRevision>=last.transactionRevision&&
        (checkpoint.policyVersion>last.policyVersion||
          checkpoint.transactionRevision>last.transactionRevision)&&
        (checkpoint.policyVersion!==last.policyVersion||
          checkpoint.policyHead===last.policyHead)&&
        (checkpoint.transactionRevision!==last.transactionRevision||
          checkpoint.transactionDigest===last.transactionDigest),
        'Conflicting or stale checkpoint transition');
    }
    const previous=entries.at(-1)?.hash??genesis;
    const index=entries.length+1;
    const entry={index,previous,checkpoint,hash:hash({index,previous,checkpoint})};
    entries.push(copy(entry));
    return copy(entry);
  }
  function recover(fixtures,signed,key){
    const {last}=validateJournal(entries);
    fail(last,'No trusted checkpoint to recover');
    return restoreCheckpointedAccessLedger(fixtures,signed,key,last);
  }
  function snapshot(){return copy(entries);}
  function head(){return entries.at(-1)?.hash??genesis;}
  return Object.freeze({append,recover,snapshot,head});
}
export {createFixtureCheckpointJournal};

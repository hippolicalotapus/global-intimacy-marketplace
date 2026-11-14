// In-memory transaction simulator for fictional vendor records. NOT durable storage or production auth.
import {createHash} from 'node:crypto';
import {createFixturePersistenceContract} from './vendor-persistence-fixture.mjs';
const fail=(ok,why)=>{if(!ok)throw new Error(why);};
const token=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{3,80}$/.test(x);
const copy=x=>JSON.parse(JSON.stringify(x));
const hash=x=>createHash('sha256').update(JSON.stringify(x),'utf8').digest('hex');
function createFixtureTransactionStore({users=[],sessions=[],vendors=[],memberships=[],savedState,minimumRevision=0}={}){
  const fixtures={users,sessions,vendors,memberships};
  fail(Number.isSafeInteger(minimumRevision)&&minimumRevision>=0,'Invalid trusted revision floor');
  const create=state=>createFixturePersistenceContract({...fixtures,...(state===undefined?{}:{savedState:state}),minimumRevision:state===undefined?0:minimumRevision});
  let state,receipts;
  if(savedState===undefined){
    fail(minimumRevision===0,'Missing state for revision floor');
    state=create().snapshot();
    receipts=new Map();
  }else{
    fail(savedState&&typeof savedState==='object'&&!Array.isArray(savedState)&&
      Object.keys(savedState).sort().join(',')==='receipts,state'&&Array.isArray(savedState.receipts),
      'Invalid transaction restore');
    state=create(savedState.state).snapshot();
    receipts=new Map();
    const coveredRevisions=new Set();
    const savedRecords=new Map(state.records.map(record=>[record.id,record]));
    for(const item of savedState.receipts){
      fail(item&&typeof item==='object'&&!Array.isArray(item)&&
        Object.keys(item).sort().join(',')==='digest,key,result,revision'&&token(item.key)&&
        /^[a-f0-9]{64}$/.test(item.digest)&&Number.isSafeInteger(item.revision)&&
        item.revision>0&&item.revision<=state.revision&&!receipts.has(item.key)&&
        Array.isArray(item.result)&&item.result.length>0&&item.result.length<=25&&
        item.revision>=item.result.length,'Invalid idempotency receipt');
      const start=item.revision-item.result.length;
      for(let i=0;i<item.result.length;i++){
        const result=item.result[i],event=state.events[start+i];
        fail(event&&!coveredRevisions.has(event.revision)&&
          event.revision===start+i+1&&result&&typeof result==='object'&&!Array.isArray(result)&&
          Object.keys(result).sort().join(',')==='id,reviewedBy,status,submittedBy,title,type,vendorSlug,version'&&
          result.id===event.recordId&&result.version===event.version&&
          result.status===(event.action==='submitted'?'pending':event.action)&&
          result.reviewedBy===(event.action==='submitted'?null:event.actorId)&&
          (event.action!=='submitted'||result.submittedBy===event.actorId),
          'Receipt conflicts with audit event');
        const finalRecord=savedRecords.get(result.id);
        fail(finalRecord&&result.vendorSlug===finalRecord.vendorSlug&&
          result.type===finalRecord.type&&result.title===finalRecord.title&&
          result.submittedBy===finalRecord.submittedBy,'Receipt conflicts with stored record');
        coveredRevisions.add(event.revision);
      }
      receipts.set(item.key,copy(item));
    }
    fail(coveredRevisions.size===state.events.length,'Missing or overlapping idempotency receipts');
  }
  function batch({key,expectedRevision,operations}={}){
    fail(token(key),'Idempotency key required');
    fail(Array.isArray(operations)&&operations.length>0&&operations.length<=25,
      'Batch requires 1-25 operations');
    fail(operations.every(op=>op&&typeof op==='object'&&!Array.isArray(op)&&
      ['submit','review'].includes(op.type)),'Invalid batch operation');
    const digest=hash(operations);
    const previous=receipts.get(key);
    if(previous){
      fail(previous.digest===digest,'Idempotency key reused for different operations');
      // Even a cached receipt must be checked against CURRENT trusted fixture access.
      // The returned result is never authorization to inspect another tenant.
      const reader=create(state);
      for(let i=0;i<operations.length;i++){
        const op=operations[i],result=previous.result[i];
        fail(result&&result.id===op.id,'Inconsistent replay receipt');
        reader.read({sessionId:op.sessionId,id:result.id});
        const principalId=sessions.find(x=>x.id===op.sessionId)?.userId;
        fail(token(principalId)&&
          (op.type==='submit'?result.submittedBy===principalId:
            result.reviewedBy===principalId),'Replay actor mismatch');
      }
      return Object.freeze({replayed:true,revision:previous.revision,results:copy(previous.result)});
    }
    fail(Number.isSafeInteger(expectedRevision)&&expectedRevision>=0&&
      expectedRevision===state.revision,'Global revision conflict');
    const working=create(state);
    const results=[];
    for(const op of operations){
      // Explicitly copy accepted arguments; never accept supplied actor role/tenant bypasses.
      if(op.type==='submit'){
        results.push(working.submit({sessionId:op.sessionId,vendorSlug:op.vendorSlug,
          id:op.id,type:op.recordType,title:op.title}));
      }else{
        results.push(working.review({sessionId:op.sessionId,id:op.id,
          expectedVersion:op.expectedVersion,decision:op.decision,evidence:op.evidence}));
      }
    }
    const candidate=working.snapshot();
    fail(Number.isSafeInteger(candidate.revision)&&candidate.revision>state.revision,
      'Invalid committed batch');
    // In-memory commit point. Any rejected operation leaves both structures unchanged.
    state=candidate;
    receipts.set(key,{key,digest,revision:state.revision,result:copy(results)});
    return Object.freeze({replayed:false,revision:state.revision,results:copy(results)});
  }
  function read({sessionId,id}={}){
    return create(state).read({sessionId,id});
  }
  function snapshot(){
    return copy({state,receipts:[...receipts.values()]});
  }
  return Object.freeze({batch,read,snapshot});
}
export {createFixtureTransactionStore};

// Fictional key-rotation and recovery boundary. No live secrets, persistence or authentication.
import {sealFixtureAudit,openFixtureAudit} from './vendor-audit-envelope.mjs';
import {createFixtureTransactionStore} from './vendor-transactions-fixture.mjs';
const ensure=(ok,msg)=>{if(!ok)throw new Error(msg);};
const id=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{3,80}$/.test(x);
const kind='gim-transaction-rotating-v1';
function createFixtureKeyring({keys=[],activeKeyId}={}){
  const entries=new Map();
  for(const item of keys){
    ensure(id(item?.id)&&!entries.has(item.id)&&
      ['active','verify-only','revoked'].includes(item.status)&&
      ((typeof item.secret==='string'&&Buffer.byteLength(item.secret,'utf8')>=32)||
      (Buffer.isBuffer(item.secret)&&item.secret.length>=32)),
      'Invalid fixture signing key');
    // A supplied Buffer must not remain mutable through an external reference.
    const secret=Buffer.isBuffer(item.secret)?Buffer.from(item.secret):item.secret;
    entries.set(item.id,Object.freeze({id:item.id,status:item.status,secret}));
  }
  ensure(entries.get(activeKeyId)?.status==='active','Active fixture key required');
  const get=(keyId,sign=false)=>{
    ensure(id(keyId)&&entries.has(keyId),'Unknown signing key');
    const item=entries.get(keyId);
    ensure(sign?item.status==='active':item.status!=='revoked','Key not eligible');
    return item.secret;
  };
  function seal(store){
    ensure(store&&typeof store.snapshot==='function','Fixture store required');
    const state=store.snapshot();
    const envelope=sealFixtureAudit({kind,keyId:activeKeyId,state},get(activeKeyId,true));
    return Object.freeze({keyId:activeKeyId,envelope});
  }
  function restore(fixtures,signed,{minimumRevision=0}={}){
    ensure(fixtures&&typeof fixtures==='object'&&!Array.isArray(fixtures)&&
      !('savedState' in fixtures)&&!('minimumRevision' in fixtures),'Trusted configuration required');
    ensure(Number.isSafeInteger(minimumRevision)&&minimumRevision>=0,'Invalid trusted floor');
    ensure(signed&&typeof signed==='object'&&!Array.isArray(signed)&&
      Object.keys(signed).sort().join(',')==='envelope,keyId'&&id(signed.keyId),
      'Invalid signed fixture container');
    const value=openFixtureAudit(signed.envelope,get(signed.keyId));
    ensure(value&&typeof value==='object'&&!Array.isArray(value)&&
      Object.keys(value).sort().join(',')==='keyId,kind,state'&&value.kind===kind&&
      value.keyId===signed.keyId,'Key identity mismatch');
    ensure(Number.isSafeInteger(value.state?.state?.revision)&&
      value.state.state.revision>=minimumRevision,'Stale transaction recovery');
    return createFixtureTransactionStore({...fixtures,savedState:value.state,minimumRevision});
  }
  return Object.freeze({seal,restore});
}
export {createFixtureKeyring};

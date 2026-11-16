// Offline, fictional-data audit envelope. NOT a production secrets manager or durable database.
import {createHmac, timingSafeEqual} from 'node:crypto';
import {createFixtureAuthorizationAdapter} from './vendor-authorization-fixture.mjs';
const fail=(okay,message)=>{if(!okay)throw new Error(message);};
const MAX_PAYLOAD_BYTES=1024*1024; // Bound fictional snapshot decoding and signing work.
const keyBytes=key=>{
  fail((typeof key==='string' && Buffer.byteLength(key,'utf8')>=32) ||
    (Buffer.isBuffer(key) && key.length>=32),'Independent fixture HMAC key of at least 32 bytes required');
  return Buffer.isBuffer(key)?key:Buffer.from(key,'utf8');
};
const signature=(payload,key)=>createHmac('sha256',keyBytes(key)).update('gim-fixture-audit:v1:', 'utf8').update(payload,'utf8').digest('hex');
function sealFixtureAudit(snapshot,key){
  fail(snapshot && typeof snapshot==='object' && !Array.isArray(snapshot),'Snapshot object required');
  const bytes=Buffer.from(JSON.stringify(snapshot),'utf8');
  fail(bytes.length<=MAX_PAYLOAD_BYTES,'Fixture audit snapshot too large');
  const payload=bytes.toString('base64url');
  return Object.freeze({version:1,payload,mac:signature(payload,key)});
}
function openFixtureAudit(envelope,key){
  fail(envelope && typeof envelope==='object' && !Array.isArray(envelope) &&
    Object.keys(envelope).sort().join(',')==='mac,payload,version' &&
    envelope.version===1 && typeof envelope.payload==='string' &&
    /^[A-Za-z0-9_-]+$/.test(envelope.payload) &&
    envelope.payload.length<=Math.ceil(MAX_PAYLOAD_BYTES*4/3)+4 &&
    typeof envelope.mac==='string' && /^[a-f0-9]{64}$/.test(envelope.mac),
    'Invalid fixture audit envelope');
  const expected=Buffer.from(signature(envelope.payload,key),'hex');
  const actual=Buffer.from(envelope.mac,'hex');
  fail(timingSafeEqual(expected,actual),'Fixture audit signature mismatch');
  let snapshot;
  try {
    const decoded=Buffer.from(envelope.payload,'base64url');
    fail(decoded.length<=MAX_PAYLOAD_BYTES && decoded.toString('base64url')===envelope.payload,'Noncanonical fixture payload');
    const json=new TextDecoder('utf-8',{fatal:true}).decode(decoded);
    snapshot=JSON.parse(json);
  } catch {
    throw new Error('Invalid fixture audit payload');
  }
  return snapshot;
}
function restoreSealedFixtureAuthorization(fixtures,envelope,key,{minimumSequence=0}={}){
  fail(fixtures && typeof fixtures==='object' && !('savedState' in fixtures) &&
    !('savedEnvelope' in fixtures),'Trusted fixture configuration required');
  fail(Number.isSafeInteger(minimumSequence) && minimumSequence>=0,'Invalid trusted sequence floor');
  // The floor must come from independently trusted state, not the supplied envelope.
  const savedState=openFixtureAudit(envelope,key);
  fail(Number.isSafeInteger(savedState?.sequence) && savedState.sequence>=minimumSequence,'Audit snapshot rollback detected');
  return createFixtureAuthorizationAdapter({...fixtures,savedState});
}
function sealAuthorizationFixture(adapter,key){
  fail(adapter && typeof adapter.snapshot==='function','Fixture adapter required');
  return sealFixtureAudit(adapter.snapshot(),key);
}
export {sealFixtureAudit,openFixtureAudit,restoreSealedFixtureAuthorization,sealAuthorizationFixture};

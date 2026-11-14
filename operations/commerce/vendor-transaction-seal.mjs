// Offline fictional transaction snapshot boundary. Not production authentication or durable storage.
import {sealFixtureAudit,openFixtureAudit} from './vendor-audit-envelope.mjs';
import {createFixtureTransactionStore} from './vendor-transactions-fixture.mjs';
const ensure=(ok,message)=>{if(!ok)throw new Error(message);};
const kind='gim-transaction-fixture-v1';

function sealTransactionFixture(store,key){
  ensure(store&&typeof store.snapshot==='function','Fixture transaction store required');
  return sealFixtureAudit({kind,snapshot:store.snapshot()},key);
}
function restoreSealedTransactionFixture(fixtures,envelope,key,{minimumRevision=0}={}){
  ensure(fixtures&&typeof fixtures==='object'&&!Array.isArray(fixtures)&&
    !('savedState' in fixtures)&&!('minimumRevision' in fixtures),
    'Independent trusted fixtures required');
  ensure(Number.isSafeInteger(minimumRevision)&&minimumRevision>=0,
    'Invalid independent revision floor');
  const contents=openFixtureAudit(envelope,key);
  ensure(contents&&typeof contents==='object'&&!Array.isArray(contents)&&
    Object.keys(contents).sort().join(',')==='kind,snapshot'&&
    contents.kind===kind,'Unexpected transaction envelope');
  // Verify the independent key and version before validating audit/receipts.
  const savedState=contents.snapshot;
  ensure(savedState&&typeof savedState==='object'&&
    Number.isSafeInteger(savedState.state?.revision)&&
    savedState.state.revision>=minimumRevision,'Stale transaction snapshot');
  return createFixtureTransactionStore({...fixtures,savedState,minimumRevision});
}
export {sealTransactionFixture,restoreSealedTransactionFixture};

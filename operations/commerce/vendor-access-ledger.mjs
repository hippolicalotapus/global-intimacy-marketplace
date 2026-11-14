// Fictional access-policy ledger and transaction bridge. No real identities, accounts, or backend.
import {createHash} from 'node:crypto';
import {createFixtureTransactionStore} from './vendor-transactions-fixture.mjs';
const validId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{3,80}$/.test(value);
const validSlug=value=>typeof value==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const ensure=(ok,why)=>{if(!ok)throw new Error(why);};
const copy=value=>JSON.parse(JSON.stringify(value));
const keys=value=>Object.keys(value).sort().join(',');
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

function createFixtureAccessLedger({users=[],sessions=[],vendors=[],memberships=[],savedState,minimumPolicyVersion=0,minimumTransactionRevision=0}={}){
  ensure(Number.isSafeInteger(minimumPolicyVersion)&&minimumPolicyVersion>=0&&
    Number.isSafeInteger(minimumTransactionRevision)&&minimumTransactionRevision>=0,
    'Invalid trusted recovery floor');
  const baseline={users:copy(users),sessions:copy(sessions),vendors:copy(vendors),memberships:copy(memberships)};
  const baselineHash=digest(baseline);
  const accounts=new Map(),access=new Map(),sessionsById=new Map(),tenantSlugs=new Set();
  for(const user of baseline.users){
    ensure(validId(user?.id)&&!accounts.has(user.id)&&
      ['user','platform_moderator'].includes(user.role)&&typeof user.active==='boolean','Invalid user fixture');
    accounts.set(user.id,{id:user.id,role:user.role,active:user.active});
  }
  for(const session of baseline.sessions){
    ensure(validId(session?.id)&&accounts.has(session.userId)&&!sessionsById.has(session.id),'Invalid session fixture');
    sessionsById.set(session.id,session.userId);
  }
  for(const vendor of baseline.vendors){
    ensure(validSlug(vendor?.slug)&&!tenantSlugs.has(vendor.slug)&&accounts.has(vendor.ownerId),'Invalid tenant fixture');
    tenantSlugs.add(vendor.slug);
  }
  for(const member of baseline.memberships){
    const key=member?.vendorSlug+':'+member?.userId;
    ensure(validSlug(member?.vendorSlug)&&tenantSlugs.has(member.vendorSlug)&&
      accounts.has(member.userId)&&['owner','manager','viewer'].includes(member.role)&&
      typeof member.active==='boolean'&&!access.has(key),'Invalid membership fixture');
    access.set(key,{userId:member.userId,vendorSlug:member.vendorSlug,role:member.role,active:member.active});
  }
  let version=0;
  const events=[];
  const principal=sessionId=>{
    ensure(validId(sessionId)&&sessionsById.has(sessionId),'Unknown session');
    const account=accounts.get(sessionsById.get(sessionId));
    ensure(account.active,'Suspended user');
    return account;
  };
  function transition({moderatorId,action,targetId,vendorSlug=null,approved=false}){
    const moderator=accounts.get(moderatorId);
    ensure(moderator?.role==='platform_moderator'&&moderator.active&&
      validId(targetId)&&accounts.has(targetId)&&moderatorId!==targetId,'Independent active moderator required');
    ensure(['suspend','reactivate','revoke-membership','demote','restore-manager'].includes(action),'Invalid policy action');
    let before,after;
    if(action==='suspend'||action==='reactivate'){
      ensure(vendorSlug===null,'Account action must not name a tenant');
      const account=accounts.get(targetId);
      before={active:account.active};
      ensure(action==='suspend'?account.active===true:
        account.active===false&&approved===true,'Invalid account transition');
      after={active:action==='reactivate'};
      account.active=after.active;
    }else{
      ensure(validSlug(vendorSlug)&&tenantSlugs.has(vendorSlug),'Tenant required');
      const member=access.get(vendorSlug+':'+targetId);
      ensure(member&&member.role!=='owner','Managed membership required');
      before={role:member.role,active:member.active};
      if(action==='revoke-membership'){
        ensure(member.active,'Already revoked');
        after={role:member.role,active:false};
      }else if(action==='demote'){
        ensure(member.active&&member.role==='manager','Manager required for demotion');
        after={role:'viewer',active:true};
      }else{
        ensure(approved===true&&(!member.active||member.role==='viewer'),
          'Explicit fictional approval required for access restoration');
        after={role:'manager',active:true};
      }
      Object.assign(member,after);
    }
    ensure(version<Number.MAX_SAFE_INTEGER,'Policy sequence exhausted');
    const event=Object.freeze({version:++version,moderatorId,action,targetId,vendorSlug,
      approved:approved===true,before,after});
    events.push(copy(event));
    return copy(event);
  }
  function change({sessionId,action,targetId,vendorSlug=null,approvalEvidence=false}={}){
    const actor=principal(sessionId);
    return transition({moderatorId:actor.id,action,targetId,vendorSlug,approved:approvalEvidence===true});
  }
  const currentConfig=()=>({
    users:[...accounts.values()].map(copy),
    sessions:copy(baseline.sessions),
    vendors:copy(baseline.vendors),
    memberships:[...access.values()].map(copy)
  });
  let transactionState;
  if(savedState===undefined){
    ensure(minimumPolicyVersion===0&&minimumTransactionRevision===0,'Trusted floor requires saved state');
    transactionState=createFixtureTransactionStore(currentConfig()).snapshot();
  }else{
    ensure(savedState&&typeof savedState==='object'&&!Array.isArray(savedState)&&
      keys(savedState)==='accounts,baselineHash,history,memberships,transactions,version'&&
      savedState.baselineHash===baselineHash&&Number.isSafeInteger(savedState.version)&&
      savedState.version>=minimumPolicyVersion&&Array.isArray(savedState.history)&&
      savedState.version===savedState.history.length,'Invalid policy snapshot');
    for(const event of savedState.history){
      ensure(event&&typeof event==='object'&&!Array.isArray(event)&&
        keys(event)==='action,after,approved,before,moderatorId,targetId,vendorSlug,version'&&
        event.version===version+1&&typeof event.approved==='boolean','Invalid policy history');
      const next=transition({moderatorId:event.moderatorId,action:event.action,targetId:event.targetId,
        vendorSlug:event.vendorSlug,approved:event.approved});
      ensure(JSON.stringify(next)===JSON.stringify(event),'Forged policy provenance');
    }
    ensure(JSON.stringify([...accounts.values()])===JSON.stringify(savedState.accounts)&&
      JSON.stringify([...access.values()])===JSON.stringify(savedState.memberships),
      'Restored permissions differ from audit');
    transactionState=createFixtureTransactionStore({...currentConfig(),savedState:savedState.transactions,
      minimumRevision:minimumTransactionRevision}).snapshot();
  }
  function batch(request){
    const current=createFixtureTransactionStore({...currentConfig(),savedState:transactionState,
      minimumRevision:transactionState.state.revision});
    const result=current.batch(request);
    transactionState=current.snapshot();
    return result;
  }
  function read(request){
    return createFixtureTransactionStore({...currentConfig(),savedState:transactionState,
      minimumRevision:transactionState.state.revision}).read(request);
  }
  function snapshot(){
    return copy({baselineHash,version,accounts:[...accounts.values()],memberships:[...access.values()],
      history:events,transactions:transactionState});
  }
  return Object.freeze({change,batch,read,snapshot});
}
export {createFixtureAccessLedger};

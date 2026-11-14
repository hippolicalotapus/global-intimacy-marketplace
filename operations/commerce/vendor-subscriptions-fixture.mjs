// Offline fictional vendor subscriptions and publishing entitlements.
// This module neither charges money nor grants permissions in a real marketplace.
import {createHash} from 'node:crypto';
const fail=(ok,message)=>{if(!ok)throw new Error(message);};
const id=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{3,80}$/.test(x);
const slug=x=>typeof x==='string'&&x.length<=64&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x);
const clock=x=>Number.isSafeInteger(x)&&x>=0;
const duration=30*24*60*60*1000;
const copy=x=>JSON.parse(JSON.stringify(x));
const digest=x=>createHash('sha256').update(JSON.stringify(x),'utf8').digest('hex');
const plans=Object.freeze({
  starter:Object.freeze({listingLimit:5}),
  studio:Object.freeze({listingLimit:50}),
  marketplace:Object.freeze({listingLimit:500})
});
function createFixtureSubscriptions({vendors=[],memberships=[],sessions=[]}={}){
  const tenants=new Map(),members=new Map(),actors=new Map(),subscriptions=new Map(),receipts=new Map();
  for(const v of vendors){
    fail(slug(v?.slug)&&id(v?.ownerId)&&
      ['approved','pending','suspended','rejected'].includes(v.status)&&!tenants.has(v.slug),
      'Invalid fictional vendor');
    tenants.set(v.slug,copy(v));
  }
  for(const m of memberships){
    fail(slug(m?.vendorSlug)&&tenants.has(m.vendorSlug)&&id(m.userId)&&
      ['owner','manager','viewer'].includes(m.role)&&typeof m.active==='boolean',
      'Invalid fictional membership');
    const key=m.vendorSlug+':'+m.userId;
    fail(!members.has(key),'Duplicate membership');
    members.set(key,copy(m));
  }
  for(const s of sessions){
    fail(id(s?.id)&&id(s.userId)&&typeof s.active==='boolean'&&!actors.has(s.id),
      'Invalid fictional session');
    actors.set(s.id,copy(s));
  }
  const authorize=(sessionId,vendorSlug)=>{
    const actor=actors.get(sessionId),member=actor&&members.get(vendorSlug+':'+actor.userId);
    fail(actor?.active===true&&member?.active===true&&
      ['owner','manager'].includes(member.role),'Active vendor editor required');
  };
  const get=vendorSlug=>{
    fail(slug(vendorSlug)&&tenants.has(vendorSlug),'Unknown tenant');
    return subscriptions.get(vendorSlug);
  };
  const status=(record,now)=>{
    if(!record)return 'none';
    if(record.status==='selected')return 'selected';
    if(record.status==='cancelled')return 'cancelled';
    if(now>=record.expiresAt)return 'expired';
    return record.cancelAtEnd?'cancelling':'active';
  };
  function transition({key,vendorSlug,sessionId,action,plan,now,evidence,immediate=false}={}){
    fail(id(key)&&clock(now)&&slug(vendorSlug),'Valid fictional request required');
    fail(['select','activate','renew','cancel','expire'].includes(action),'Invalid subscription action');
    const request={vendorSlug,sessionId,action,plan,now,evidence,immediate};
    const receipt=receipts.get(key),signature=digest(request);
    if(receipt){
      fail(receipt.signature===signature,'Conflicting idempotency request');
      authorize(sessionId,vendorSlug);
      fail(receipt.vendorSlug===vendorSlug,'Cross-tenant replay forbidden');
      return Object.freeze({...copy(receipt.response),replayed:true});
    }
    authorize(sessionId,vendorSlug);
    const tenant=tenants.get(vendorSlug);
    fail(tenant?.status==='approved','Approved fictional vendor required');
    const previous=get(vendorSlug);
    let next;
    if(action==='select'){
      fail(plans[plan]&&!previous,'Plan selection is only available before subscription');
      next={vendorSlug,plan,status:'selected',startedAt:null,expiresAt:null,cancelAtEnd:false,revision:1};
    }else{
      fail(previous,'Select a plan first');
      if(action==='activate'){
        fail(previous.status==='selected'&&evidence?.fixtureApproval===true,
          'Independent fictional activation evidence required');
        next={...previous,status:'active',startedAt:now,expiresAt:now+duration,cancelAtEnd:false,revision:previous.revision+1};
      }else if(action==='renew'){
        fail(previous.status==='active'&&!previous.cancelAtEnd&&
          evidence?.fixtureApproval===true&&now<previous.expiresAt,
          'Active approved subscription required for renewal');
        next={...previous,expiresAt:previous.expiresAt+duration,revision:previous.revision+1};
      }else if(action==='cancel'){
        fail(previous.status==='active','Only active subscriptions can be cancelled');
        next={...previous,status:immediate?'cancelled':'active',
          cancelAtEnd:!immediate,revision:previous.revision+1};
      }else{
        fail(previous.status==='active'&&now>=previous.expiresAt,'Subscription is not expired');
        next={...previous,status:'expired',cancelAtEnd:false,revision:previous.revision+1};
      }
    }
    fail(next.expiresAt===null||clock(next.expiresAt),'Invalid fixture expiration');
    subscriptions.set(vendorSlug,next);
    const response={vendorSlug,plan:next.plan,status:status(next,now),revision:next.revision,replayed:false};
    receipts.set(key,{signature,vendorSlug,response:copy(response)});
    return Object.freeze(copy(response));
  }
  function entitlement({vendorSlug,sessionId,now,approvedStorefront=false,approvedListings=0}={}){
    fail(clock(now)&&Number.isSafeInteger(approvedListings)&&approvedListings>=0,'Invalid entitlement context');
    authorize(sessionId,vendorSlug);
    const tenant=tenants.get(vendorSlug),record=get(vendorSlug);
    const state=status(record,now);
    const allowed=tenant.status==='approved'&&['active','cancelling'].includes(state)&&
      approvedStorefront===true&&approvedListings<=plans[record.plan].listingLimit;
    return Object.freeze({vendorSlug,plan:record?.plan??null,state,
      listingLimit:record?plans[record.plan].listingLimit:0,canPublish:allowed});
  }
  function snapshot(){return copy({subscriptions:[...subscriptions.values()],receipts:[...receipts.values()]});}
  return Object.freeze({transition,entitlement,snapshot});
}
export {createFixtureSubscriptions};

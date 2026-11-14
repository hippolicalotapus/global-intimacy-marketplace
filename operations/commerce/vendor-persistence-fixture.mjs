// Offline fictional persistence contract. In-memory only: no server, DB, network or checkout.
// Session and membership fixtures are trusted constructor inputs, not request-provided roles.
const idPattern=/^[A-Za-z0-9_-]{3,80}$/;
const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isId=value=>typeof value==='string'&&idPattern.test(value);
const isSlug=value=>typeof value==='string'&&value.length<=64&&slugPattern.test(value);
const isText=value=>typeof value==='string'&&value.trim().length>0&&value.length<=600&&!/[<>\x00-\x1f\x7f]/.test(value);
const ensure=(condition,message)=>{if(!condition)throw new Error(message)};
const copy=value=>JSON.parse(JSON.stringify(value));

function createFixturePersistenceContract({users=[],sessions=[],vendors=[],memberships=[],savedState,minimumRevision=0}={}) {
  ensure(Number.isSafeInteger(minimumRevision)&&minimumRevision>=0,'Invalid trusted revision floor');
  const people=new Map(),tokens=new Map(),tenants=new Map(),access=new Map();
  for(const user of users) {
    ensure(isId(user?.id)&&['user','platform_moderator'].includes(user.role)&&typeof user.active==='boolean'&&!people.has(user.id),'Invalid user fixture');
    people.set(user.id,Object.freeze({id:user.id,role:user.role,active:user.active}));
  }
  for(const session of sessions){
    ensure(isId(session?.id)&&people.has(session.userId)&&!tokens.has(session.id),'Invalid session fixture');
    tokens.set(session.id,session.userId);
  }
  for(const vendor of vendors){
    ensure(isSlug(vendor?.slug)&&isId(vendor.ownerId)&&people.has(vendor.ownerId)&&
      ['approved','pending','rejected','suspended'].includes(vendor.status)&&!tenants.has(vendor.slug),'Invalid vendor fixture');
    tenants.set(vendor.slug,Object.freeze({slug:vendor.slug,ownerId:vendor.ownerId,status:vendor.status}));
  }
  for(const membership of memberships){
    ensure(isSlug(membership?.vendorSlug)&&tenants.has(membership.vendorSlug)&&people.has(membership.userId)&&
      ['owner','manager','viewer'].includes(membership.role)&&typeof membership.active==='boolean','Invalid membership fixture');
    const key=membership.vendorSlug+':'+membership.userId;
    ensure(!access.has(key),'Duplicate membership');
    access.set(key,Object.freeze({userId:membership.userId,vendorSlug:membership.vendorSlug,role:membership.role,active:membership.active}));
  }
  let revision=0;
  const records=new Map(),events=[];
  const principal=sessionId=>{
    ensure(isId(sessionId)&&tokens.has(sessionId),'Unknown session');
    const user=people.get(tokens.get(sessionId));
    ensure(user.active,'Inactive user');
    return user;
  };
  const tenant=slug=>{
    ensure(isSlug(slug)&&tenants.has(slug),'Unknown tenant');
    const vendor=tenants.get(slug);
    ensure(vendor.status==='approved','Vendor inactive');
    return vendor;
  };
  const canEdit=(actor,slug)=>{
    const member=access.get(slug+':'+actor.id);
    return member?.active===true&&['owner','manager'].includes(member.role);
  };
  const expose=record=>copy(record);
  const checkVersion=(actual,expected)=>{
    ensure(Number.isSafeInteger(expected)&&expected>=1,'Expected record version required');
    ensure(actual===expected,'Version conflict');
  };
  if(savedState!==undefined){
    ensure(savedState&&typeof savedState==='object'&&!Array.isArray(savedState)&&
      Object.keys(savedState).sort().join(',')==='events,records,revision'&&
      Number.isSafeInteger(savedState.revision)&&savedState.revision>=minimumRevision&&
      Array.isArray(savedState.records)&&Array.isArray(savedState.events)&&
      savedState.revision===savedState.events.length,'Invalid restored revision');
    const seen=new Set(),replayed=new Map();
    for(let i=0;i<savedState.events.length;i++){
      const event=savedState.events[i];
      ensure(event&&typeof event==='object'&&!Array.isArray(event)&&
        Object.keys(event).sort().join(',')==='action,actorId,recordId,revision,version'&&
        event.revision===i+1&&isId(event.actorId)&&people.has(event.actorId)&&isId(event.recordId)&&
        ['submitted','approved','rejected'].includes(event.action)&&
        Number.isSafeInteger(event.version)&&event.version>=1,'Invalid restored event');
      const prior=replayed.get(event.recordId);
      if(event.action==='submitted'){
        ensure(!prior&&event.version===1,'Invalid submission event');
        replayed.set(event.recordId,{status:'pending',version:1,submittedBy:event.actorId,reviewedBy:null});
      }else{
        ensure(prior?.status==='pending'&&event.version===2&&prior.submittedBy!==event.actorId&&
          people.get(event.actorId)?.role==='platform_moderator','Invalid review event');
        replayed.set(event.recordId,{...prior,status:event.action,version:2,reviewedBy:event.actorId});
      }
      events.push(Object.freeze(copy(event)));
    }
    for(const record of savedState.records){
      ensure(record&&typeof record==='object'&&!Array.isArray(record)&&
        Object.keys(record).sort().join(',')==='id,reviewedBy,status,submittedBy,title,type,vendorSlug,version'&&
        isId(record.id)&&!seen.has(record.id)&&isSlug(record.vendorSlug)&&tenants.has(record.vendorSlug)&&
        isText(record.title)&&record.title===record.title.trim()&&
        ['listing','storefront'].includes(record.type),'Invalid restored record');
      const state=replayed.get(record.id),vendor=tenants.get(record.vendorSlug);
      const member=access.get(record.vendorSlug+':'+record.submittedBy);
      ensure(state&&state.version===record.version&&state.status===record.status&&
        state.submittedBy===record.submittedBy&&state.reviewedBy===record.reviewedBy&&
        member?.role!=='viewer'&&member?.active===true&&
        state.reviewedBy!==vendor.ownerId,'Inconsistent restored record');
      seen.add(record.id);records.set(record.id,Object.freeze(copy(record)));
    }
    ensure(replayed.size===records.size,'Orphan restored event');
    revision=savedState.revision;
  }else ensure(minimumRevision===0,'Trusted revision floor requires saved state');

  function submit({sessionId,vendorSlug,id,type,title}={}){
    const actor=principal(sessionId);tenant(vendorSlug);
    ensure(canEdit(actor,vendorSlug),'Tenant editor required');
    ensure(isId(id)&&!records.has(id)&&['listing','storefront'].includes(type)&&isText(title),'Invalid or duplicate record');
    const next=Object.freeze({id,vendorSlug,type,title:title.trim(),status:'pending',submittedBy:actor.id,reviewedBy:null,version:1});
    // All failure conditions checked before committing record and audit event.
    records.set(id,next);
    events.push(Object.freeze({revision:++revision,recordId:id,actorId:actor.id,action:'submitted',version:1}));
    return expose(next);
  }
  function review({sessionId,id,expectedVersion,decision,evidence}={}){
    const actor=principal(sessionId);
    ensure(actor.role==='platform_moderator','Moderator role required');
    ensure(isId(id)&&records.has(id),'Unknown record');
    const current=records.get(id),vendor=tenant(current.vendorSlug);
    checkVersion(current.version,expectedVersion);
    ensure(current.status==='pending','Already reviewed');
    ensure(actor.id!==current.submittedBy&&actor.id!==vendor.ownerId,'Independent reviewer required');
    ensure(['approved','rejected'].includes(decision),'Invalid decision');
    if(decision==='approved'){
      ensure(evidence?.identityVerified===true&&evidence?.termsVerified===true&&
        (current.type!=='listing'||(evidence.mediaRights===true&&evidence.resaleRights===true&&evidence.compliance===true)),
        'Approval evidence required');
    }
    ensure(Number.isSafeInteger(revision)&&revision<Number.MAX_SAFE_INTEGER,'Audit revision overflow');
    const next=Object.freeze({...current,status:decision,reviewedBy:actor.id,version:current.version+1});
    records.set(id,next);
    events.push(Object.freeze({revision:++revision,recordId:id,actorId:actor.id,action:decision,version:next.version}));
    return expose(next);
  }
  function read({sessionId,id}={}){
    const actor=principal(sessionId);
    ensure(isId(id)&&records.has(id),'Unknown record');
    const record=records.get(id);
    ensure(actor.role==='platform_moderator'||canEdit(actor,record.vendorSlug),'Tenant read forbidden');
    return expose(record);
  }
  function snapshot(){return copy({revision,records:[...records.values()],events});}
  return Object.freeze({submit,review,read,snapshot});
}
export {createFixturePersistenceContract};

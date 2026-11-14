// Fictional server-boundary simulator. No network, persistence service, real authentication or checkout.
// Fixture session IDs are NOT real credentials. Inputs here emulate trusted server-side records.
const idPattern = /^[A-Za-z0-9_-]{3,80}$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const validId = v => typeof v === 'string' && idPattern.test(v);
const validSlug = v => typeof v === 'string' && v.length <= 64 && slugPattern.test(v);
const fail = (valid, message) => { if (!valid) throw new Error(message); };
const clone = v => JSON.parse(JSON.stringify(v));
const cleanText = v => typeof v === 'string' && v.trim().length > 0 && v.length <= 600 && !/[<>\x00-\x1f\x7f]/.test(v);

function createFixtureAuthorizationAdapter({users=[], sessions=[], vendors=[], memberships=[], savedState}={}) {
  // Arrays below are private trusted test fixtures, never supplied by request arguments.
  const identities = new Map();
  const tokens = new Map();
  const tenants = new Map();
  const access = new Map();
  for (const user of users) {
    fail(validId(user?.id) && typeof user.active === 'boolean' &&
      ['platform_moderator','user'].includes(user.role) && !identities.has(user.id), 'Invalid user fixture');
    identities.set(user.id, Object.freeze({id:user.id,role:user.role,active:user.active}));
  }
  for (const session of sessions) {
    fail(validId(session?.id) && identities.has(session.userId) && !tokens.has(session.id), 'Invalid session fixture');
    tokens.set(session.id, session.userId);
  }
  for (const vendor of vendors) {
    fail(validSlug(vendor?.slug) && validId(vendor.ownerId) &&
      identities.has(vendor.ownerId) && ['approved','pending','rejected','suspended'].includes(vendor.status) &&
      !tenants.has(vendor.slug), 'Invalid vendor fixture');
    tenants.set(vendor.slug, Object.freeze({slug:vendor.slug,ownerId:vendor.ownerId,status:vendor.status}));
  }
  for (const entry of memberships) {
    fail(validSlug(entry?.vendorSlug) && tenants.has(entry.vendorSlug) &&
      identities.has(entry.userId) && ['owner','manager','viewer'].includes(entry.role) &&
      typeof entry.active === 'boolean', 'Invalid membership fixture');
    const key=entry.vendorSlug+':'+entry.userId;
    fail(!access.has(key), 'Duplicate membership fixture');
    access.set(key,Object.freeze({...entry}));
  }
  let sequence=0;
  const records = new Map();
  const history = [];
  if (savedState !== undefined) {
    // Trusted restoration fixture, not a request endpoint. Reject corrupted snapshots.
    fail(savedState && Number.isSafeInteger(savedState.sequence) && savedState.sequence >= 0 &&
      Array.isArray(savedState.records) && Array.isArray(savedState.history), 'Invalid saved state');
    const seen=new Set();
    for(const record of savedState.records) {
      fail(validId(record?.id) && validSlug(record.vendorSlug) && tenants.has(record.vendorSlug) &&
        ['storefront','listing'].includes(record.type) && validId(record.submittedBy) &&
        ['pending','approved','rejected'].includes(record.status) &&
        cleanText(record.title) && !seen.has(record.id), 'Invalid saved record');
      fail(record.status === 'pending' ? record.reviewedBy === null :
        validId(record.reviewedBy) && record.reviewedBy !== record.submittedBy &&
        record.reviewedBy !== tenants.get(record.vendorSlug).ownerId, 'Invalid review provenance');
      seen.add(record.id); records.set(record.id, Object.freeze(clone(record)));
    }
    for(const event of savedState.history) {
      fail(validId(event?.recordId) && seen.has(event.recordId) && validId(event.actorId) &&
        ['submitted','approved','rejected'].includes(event.action), 'Invalid audit fixture');
      history.push(Object.freeze(clone(event)));
    }
    fail(savedState.sequence === history.length, 'Invalid audit sequence');
    sequence=savedState.sequence;
  }
  const identity = sessionId => {
    fail(validId(sessionId) && tokens.has(sessionId), 'Unknown session');
    const user=identities.get(tokens.get(sessionId));
    fail(user?.active === true, 'Inactive session');
    return user;
  };
  const vendorFor = vendorSlug => {
    fail(validSlug(vendorSlug) && tenants.has(vendorSlug), 'Unknown vendor');
    const vendor=tenants.get(vendorSlug);
    fail(vendor.status === 'approved', 'Vendor not approved');
    return vendor;
  };
  const note = (recordId,actorId,action) => history.push(Object.freeze({sequence:++sequence,recordId,actorId,action}));
  function submit({sessionId,vendorSlug,id,type,title}) {
    const actor=identity(sessionId);
    vendorFor(vendorSlug);
    const membership=access.get(vendorSlug+':'+actor.id);
    fail(membership?.active === true && ['owner','manager'].includes(membership.role), 'Tenant editor required');
    fail(validId(id) && !records.has(id) && ['storefront','listing'].includes(type) && cleanText(title), 'Invalid submission');
    const record=Object.freeze({id,vendorSlug,type,title:title.trim(),submittedBy:actor.id,reviewedBy:null,status:'pending'});
    records.set(id,record);note(id,actor.id,'submitted');return clone(record);
  }
  function review({sessionId,id,decision,evidence}) {
    const actor=identity(sessionId);
    fail(actor.role === 'platform_moderator', 'Moderator required');
    fail(validId(id) && records.has(id), 'Unknown review record');
    const record=records.get(id), vendor=vendorFor(record.vendorSlug);
    fail(record.status === 'pending', 'Already reviewed');
    fail(actor.id !== record.submittedBy && actor.id !== vendor.ownerId, 'Independent reviewer required');
    fail(['approved','rejected'].includes(decision), 'Invalid decision');
    if(decision === 'approved') {
      fail(evidence?.identityVerified === true && evidence?.termsVerified === true &&
        (record.type !== 'listing' || (evidence.mediaRights === true &&
        evidence.resaleRights === true && evidence.compliance === true)), 'Approval evidence required');
    }
    const updated=Object.freeze({...record,status:decision,reviewedBy:actor.id});
    records.set(id,updated);note(id,actor.id,decision);return clone(updated);
  }
  function recordFor({sessionId,id}) {
    const actor=identity(sessionId);
    fail(validId(id) && records.has(id), 'Unknown record');
    const record=records.get(id);
    const member=access.get(record.vendorSlug+':'+actor.id);
    fail(actor.role === 'platform_moderator' || (member?.active === true &&
      ['owner','manager'].includes(member.role)), 'Tenant read forbidden');
    return clone(record);
  }
  function snapshot() { return clone({sequence,records:[...records.values()],history}); }
  return Object.freeze({submit,review,recordFor,snapshot});
}
export {createFixtureAuthorizationAdapter};

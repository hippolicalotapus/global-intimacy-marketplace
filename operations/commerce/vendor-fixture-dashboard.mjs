// Fixture-only dashboard renderer. No storage, fetch, cookies, real identities, or mutations.
const tabs=Object.freeze(['onboarding','moderation','storefront','audit']);
const escapeHtml=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function assertProjection(model){
  if(model?.kind!=='gim-fixture-vendor-console-v1'||model.mode!=='offline-read-only'||
    !model.vendor||!Array.isArray(model.listings)||!Array.isArray(model.audit?.events)||
    !model.onboarding||!model.storefront)throw new TypeError('Validated fixture console required');
}
function renderFixtureDashboard(model,{tab='onboarding',filter='all'}={}){
  assertProjection(model);
  if(!tabs.includes(tab)||!['all','pending','approved','rejected'].includes(filter))
    throw new TypeError('Invalid dashboard view');
  const h=escapeHtml;
  const nav=tabs.map(name=>`<button type="button" data-tab="${name}" aria-pressed="${tab===name}">${h(name[0].toUpperCase()+name.slice(1))}</button>`).join('');
  let content='';
  if(tab==='onboarding'){
    content=`<h2>Vendor onboarding</h2><dl><dt>Shop</dt><dd>${h(model.vendor.name)}</dd><dt>Status</dt><dd>${h(model.onboarding.status)}</dd><dt>Review</dt><dd>${model.onboarding.requiresModerator?'Independent moderator required':'No pending vendor review'}</dd></dl>`;
  }else if(tab==='moderation'){
    const items=model.listings.filter(x=>filter==='all'||x.status===filter);
    const controls=['all','pending','approved','rejected'].map(x=>`<button type="button" data-filter="${x}" aria-pressed="${filter===x}">${h(x)}</button>`).join('');
    content=`<h2>Listing review queue</h2><div class="filters" role="group" aria-label="Filter listing status">${controls}</div><p role="status">${items.length} fictional listing(s)</p><ul>${items.map(x=>`<li><strong>${h(x.title)}</strong> <span>${h(x.category)} · ${h(x.status)}</span></li>`).join('')}</ul>`;
  }else if(tab==='storefront'){
    const view=model.preview;
    content=`<h2>Public storefront preview</h2>${view?
      `<p class="shop">${h(view.name)}</p><p>${h(view.description)}</p><p>Country: ${h(view.country)}</p><ul>${view.products.map(x=>`<li>${h(x.title)} <span>${h(x.category)}</span></li>`).join('')}</ul>`:
      '<p role="status">No approved storefront preview available for this country and inventory.</p>'}`;
  }else{
    content=`<h2>Audit history</h2><p>${model.audit.events.length} fictional event(s)</p><ol>${model.audit.events.map(x=>`<li>#${h(x.sequence)} ${h(x.type)} — ${h(x.recordId)}</li>`).join('')}</ol>`;
  }
  return `<section aria-label="Fictional vendor dashboard"><p class="demo-label">OFFLINE DEMO · FICTIONAL DATA · READ ONLY</p><h1>Vendor workspace</h1><p>${h(model.vendor.name)} · ${h(model.vendor.status)}</p><nav aria-label="Vendor dashboard sections">${nav}</nav><section id="vendor-panel" aria-live="polite">${content}</section></section>`;
}
function mountFixtureDashboard(root,model){
  assertProjection(model);
  if(!root||typeof root.addEventListener!=='function')throw new TypeError('Dashboard root required');
  let tab='onboarding',filter='all';
  const repaint=()=>{root.innerHTML=renderFixtureDashboard(model,{tab,filter})};
  const click=event=>{
    const target=event.target?.closest?.('button[data-tab],button[data-filter]');
    if(!target||!root.contains(target))return;
    const nextTab=target.getAttribute('data-tab');
    const nextFilter=target.getAttribute('data-filter');
    if(nextTab!==null&&tabs.includes(nextTab))tab=nextTab;
    if(nextFilter!==null&&['all','pending','approved','rejected'].includes(nextFilter))filter=nextFilter;
    repaint();
    // Replacing the panel detaches the clicked button. Restore focus to its
    // equivalent control so keyboard users do not lose their place.
    if(nextTab!==null&&tabs.includes(nextTab)){
      root.querySelector?.('button[data-tab="'+nextTab+'"]')?.focus?.();
    }else if(nextFilter!==null&&['all','pending','approved','rejected'].includes(nextFilter)){
      root.querySelector?.('button[data-filter="'+nextFilter+'"]')?.focus?.();
    }
  };
  root.addEventListener('click',click);
  repaint();
  return ()=>root.removeEventListener('click',click);
}
export {renderFixtureDashboard,mountFixtureDashboard};

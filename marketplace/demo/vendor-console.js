'use strict';
(()=> {
const state={vendors:[],products:[]};
const $=id=>document.getElementById(id);
const notice=message=>{$('notice').textContent=message;};
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(n/100);
function render(){
 $('stats').textContent=state.vendors.length+' sample applications · '+state.products.length+' draft products · 0 live orders';
 $('vendors').replaceChildren();
 state.vendors.forEach(v=>{const p=document.createElement('p');p.textContent=v.business+' · '+v.country+' · '+v.category+' · pending review (demo)';$('vendors').append(p);});
 $('productRows').innerHTML=state.products.map((p,i)=>'<tr><td>'+escapeHTML(p.sku)+'</td><td>'+escapeHTML(p.title)+'</td><td>'+money(p.priceMinor)+'</td><td>'+p.stock+'</td><td>Draft only</td><td><button type="button" data-remove="'+i+'">Delete draft</button></td></tr>').join('');
}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{
 document.querySelectorAll('section.panel').forEach(s=>s.classList.toggle('hidden',s.id!==b.dataset.tab));
 notice('');
}));
$('vendorForm').addEventListener('submit',e=>{
 e.preventDefault();const f=new FormData(e.currentTarget);const business=String(f.get('business')||'').trim();
 if(business.length<2){notice('Enter a valid business name.');return;}
 state.vendors.push({business,country:String(f.get('country')),category:String(f.get('category'))});
 e.currentTarget.reset();render();notice('Sample application created in memory only. No account registered.');
});
$('productForm').addEventListener('submit',e=>{
 e.preventDefault();const f=new FormData(e.currentTarget),sku=String(f.get('sku')||'').trim(),title=String(f.get('title')||'').trim();
 const amount=Number(f.get('price')),stock=Number(f.get('stock')),priceMinor=Math.round(amount*100);
 if(!/^[A-Za-z0-9_-]{1,40}$/.test(sku)||!title||!Number.isFinite(amount)||amount<=0||Math.abs(amount*100-priceMinor)>0.00001||!Number.isSafeInteger(priceMinor)||!Number.isSafeInteger(stock)||stock<0||stock>1000000){notice('Check the product fields.');return;}
 if(state.products.some(p=>p.sku.toLowerCase()===sku.toLowerCase())){notice('SKU already exists in this demo.');return;}
 state.products.push({sku,title,priceMinor,stock});e.currentTarget.reset();render();notice('Draft product added locally; not available for sale.');
});
$('productRows').addEventListener('click',e=>{const b=e.target.closest('button[data-remove]');if(!b)return;const i=Number(b.dataset.remove);if(Number.isInteger(i)&&i>=0&&i<state.products.length){state.products.splice(i,1);render();notice('Draft removed.');}});
$('reset').addEventListener('click',()=>{state.vendors=[];state.products=[];$('vendorForm').reset();$('productForm').reset();render();notice('Demo reset.');});
render();
})();
"use strict";
(function(){
 const key="gim:cart-preview",products=[...(Array.isArray(window.GIM_PRODUCTS)?window.GIM_PRODUCTS:[]),...(Array.isArray(window.GIM_APPAREL)?window.GIM_APPAREL:[])];
 const byId=new Map(products.filter(p=>p&&p.id!==undefined).map(p=>[String(p.id),p]));
 const list=document.getElementById("cartItems"),summary=document.getElementById("cartSummary");
 function read(){try{const v=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(v)?v:[]}catch(_){return []}}
 function save(v){try{localStorage.setItem(key,JSON.stringify(v))}catch(_){summary.textContent="Browser storage unavailable."}}
 function valid(v){return v.filter(x=>x&&typeof x.id==="string"&&byId.has(x.id)&&Number.isInteger(x.quantity)&&x.quantity>=1&&x.quantity<=10).slice(0,20)}
 function render(){
  const items=valid(read());list.replaceChildren();
  if(!items.length){summary.textContent="Your preview cart is empty.";return}
  for(const item of items){
   const p=byId.get(item.id),li=document.createElement("li"),name=document.createElement("strong"),row=document.createElement("div"),qty=document.createElement("input"),remove=document.createElement("button");
   name.textContent=String(p.name||p.title||"Product preview");qty.type="number";qty.min="1";qty.max="10";qty.step="1";qty.value=String(item.quantity);qty.setAttribute("aria-label","Quantity for "+name.textContent);
   qty.addEventListener("change",()=>{const n=Number(qty.value);if(!Number.isInteger(n)||n<1||n>10){qty.value=String(item.quantity);return}save(items.map(x=>x.id===item.id?{id:x.id,quantity:n}:x));render()});
   remove.type="button";remove.textContent="Remove";remove.addEventListener("click",()=>{save(items.filter(x=>x.id!==item.id));render()});
   row.append("Quantity: ",qty," ",remove);li.append(name,row);list.append(li);
  }
  summary.textContent=items.reduce((n,x)=>n+x.quantity,0)+" preview item(s). No price or checkout available.";
 }
 document.getElementById("clearCart").addEventListener("click",()=>{save([]);render()});render();
}());

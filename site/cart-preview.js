"use strict";
(function(){
 const key="gim:cart-preview",products=Array.isArray(window.GIM_PRODUCTS)?window.GIM_PRODUCTS:[];
 const byId=new Map(products.filter(p=>p&&p.id!==undefined).map(p=>[String(p.id),p]));
 const list=document.getElementById("cartItems"),summary=document.getElementById("cartSummary");
 const picker=document.getElementById("cartProduct"),addButton=document.getElementById("addCartItem");
 if(picker&&addButton){for(const [id,p] of byId){const option=document.createElement("option");option.value=id;option.textContent=String(p.brand||"")+" — "+String(p.name||p.title||"Preview");picker.append(option)}
 addButton.disabled=!byId.size;addButton.addEventListener("click",()=>{const id=picker.value;if(!byId.has(id))return;const items=valid(read()),current=items.find(x=>x.id===id);if(current){if(current.quantity>=10){summary.textContent="Maximum 10 of each preview.";return}current.quantity++}else{if(items.length>=20){summary.textContent="Maximum 20 different previews.";return}items.push({id,quantity:1})}if(save(items))render()})}

 function read(){try{const v=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(v)?v:[]}catch(_){try{localStorage.setItem(key,"[]")}catch(__){}return []}}
 function save(v){try{localStorage.setItem(key,JSON.stringify(v));return true}catch(_){summary.textContent="Browser storage unavailable. Your changes were not saved.";return false}}
 function valid(v){const counts=new Map();for(const x of v.slice(0,1000)){if(!x||!Number.isInteger(x.quantity)||x.quantity<1||x.quantity>10)continue;const id=String(x.id);if(!byId.has(id))continue;const next=(counts.get(id)||0)+x.quantity;if(next<=10)counts.set(id,next)}return [...counts].slice(0,20).map(([id,quantity])=>({id,quantity}))}
 function render(){
  const raw=read(),items=valid(raw);list.replaceChildren();
  if(JSON.stringify(raw)!==JSON.stringify(items))save(items);
  if(!items.length){summary.textContent="Your preview cart is empty.";return}
  for(const item of items){
   const p=byId.get(item.id),li=document.createElement("li"),name=document.createElement("strong"),row=document.createElement("div"),qty=document.createElement("input"),remove=document.createElement("button");
   name.textContent=String(p.name||p.title||"Product preview");qty.type="number";qty.min="1";qty.max="10";qty.step="1";qty.value=String(item.quantity);qty.setAttribute("aria-label","Quantity for "+name.textContent);
   qty.addEventListener("change",()=>{const n=Number(qty.value);if(!Number.isInteger(n)||n<1||n>10){qty.value=String(item.quantity);return}if(save(items.map(x=>x.id===item.id?{id:x.id,quantity:n}:x)))render()});
   remove.type="button";remove.textContent="Remove";remove.addEventListener("click",()=>{if(save(items.filter(x=>x.id!==item.id)))render()});
   row.append("Quantity: ",qty," ",remove);li.append(name,row);list.append(li);
  }
  summary.textContent=items.reduce((n,x)=>n+x.quantity,0)+" preview item(s). No price or checkout available.";
 }
 document.getElementById("clearCart").addEventListener("click",()=>{if(save([]))render()});render();
}());

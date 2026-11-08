"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../site/cart-preview.js"),"utf8");
function harness(initial,products=[{id:1,name:"Test item"},{id:2,name:"Second item"}]){
 const data=new Map();if(initial!==undefined)data.set("gim:cart-preview",initial);
 function element(){return {textContent:"",value:"",children:[],attributes:{},replaceChildren(...v){this.children=v},append(...v){this.children.push(...v)},setAttribute(k,v){this.attributes[k]=v},addEventListener(k,fn){this[k]=fn}}}
 const nodes={cartItems:element(),cartSummary:element(),clearCart:element()};
 const document={getElementById:k=>nodes[k],createElement:()=>element()};
 const localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 vm.runInNewContext(source,{window:{GIM_PRODUCTS:products},document,localStorage},{timeout:1000});
 return {nodes,data,items:()=>JSON.parse(data.get("gim:cart-preview")||"[]")};
}
test("cart handles empty state and clears selections",()=>{
 const h=harness(JSON.stringify([{id:"1",quantity:2}]));
 assert.match(h.nodes.cartSummary.textContent,/2 preview item/);
 h.nodes.clearCart.click();assert.deepEqual(h.items(),[]);assert.match(h.nodes.cartSummary.textContent,/empty/);
});
test("cart repairs corrupt JSON and unknown products",()=>{
 const h=harness("{broken");assert.deepEqual(h.items(),[]);
 const other=harness(JSON.stringify([{id:"missing",quantity:1},{id:"1",quantity:2}]));
 assert.deepEqual(other.items(),[{id:"1",quantity:2}]);
});
test("cart combines duplicates and drops over-limit additions",()=>{
 const h=harness(JSON.stringify([{id:"1",quantity:2},{id:1,quantity:3},{id:"2",quantity:11},{id:"1",quantity:8}]));
 assert.deepEqual(h.items(),[{id:"1",quantity:5}]);
});
test("cart quantity updates persist and invalid changes revert",()=>{
 const h=harness(JSON.stringify([{id:"1",quantity:2}]));
 const li=h.nodes.cartItems.children[0],row=li.children[1],qty=row.children[1];
 qty.value="4";qty.change();assert.deepEqual(h.items(),[{id:"1",quantity:4}]);
 const next=h.nodes.cartItems.children[0].children[1].children[1];next.value="11";next.change();assert.equal(next.value,"4");
});
test("cart remove button deletes only selected item",()=>{
 const h=harness(JSON.stringify([{id:"1",quantity:1},{id:"2",quantity:2}]));
 const remove=h.nodes.cartItems.children[0].children[1].children[3];remove.click();
 assert.deepEqual(h.items(),[{id:"2",quantity:2}]);
});

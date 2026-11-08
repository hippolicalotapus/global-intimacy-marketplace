"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../site/cart-preview.js"),"utf8");
function harness(initial,products=[{id:1,name:"Test item"},{id:2,name:"Second item"}],storageFails=false){
 const data=new Map();if(initial!==undefined)data.set("gim:cart-preview",initial);
 function element(){return {textContent:"",value:"",children:[],attributes:{},replaceChildren(...v){this.children=v},append(...v){this.children.push(...v)},setAttribute(k,v){this.attributes[k]=v},addEventListener(k,fn){this[k]=fn}}}
 const nodes={cartItems:element(),cartSummary:element(),clearCart:element(),cartProduct:element(),addCartItem:element()};
 const document={getElementById:k=>nodes[k],createElement:()=>element()};
 const localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(storageFails)throw Error("storage disabled");data.set(k,v)}};
 vm.runInNewContext(source,{window:{GIM_PRODUCTS:products,location:{search:""}},URLSearchParams,document,localStorage},{timeout:1000});
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

test("preview product picker adds an item and increments quantity",()=>{
 const h=harness("[]");
 h.nodes.cartProduct.value="1";h.nodes.addCartItem.click();
 assert.deepEqual(h.items(),[{id:"1",quantity:1}]);
 h.nodes.addCartItem.click();
 assert.deepEqual(h.items(),[{id:"1",quantity:2}]);
});
test("preview picker does not add unknown items or exceed quantity limit",()=>{
 const h=harness(JSON.stringify([{id:"1",quantity:10}]));
 h.nodes.cartProduct.value="1";h.nodes.addCartItem.click();
 assert.deepEqual(h.items(),[{id:"1",quantity:10}]);
 h.nodes.cartProduct.value="unknown";h.nodes.addCartItem.click();
 assert.deepEqual(h.items(),[{id:"1",quantity:10}]);
});

test("cart does not claim successful add when storage is blocked",()=>{
 const h=harness("[]",[{id:1,name:"Test item"}],true);
 h.nodes.cartProduct.value="1";h.nodes.addCartItem.click();
 assert.deepEqual(h.items(),[]);
 assert.match(h.nodes.cartSummary.textContent,/not saved/);
});
test("cart enforces 20 distinct products",()=>{
 const products=Array.from({length:21},(_,i)=>({id:i+1,name:"Product "+(i+1)}));
 const initial=JSON.stringify(products.slice(0,20).map(p=>({id:String(p.id),quantity:1})));
 const h=harness(initial,products);
 h.nodes.cartProduct.value="21";h.nodes.addCartItem.click();
 assert.equal(h.items().length,20);
 assert.match(h.nodes.cartSummary.textContent,/Maximum 20/);
});

test("cart ignores oversized storage arrays beyond 1000 entries",()=>{
 const entries=Array.from({length:1100},(_,i)=>({id:i===1050?"2":"1",quantity:1}));
 const h=harness(JSON.stringify(entries));
 assert.deepEqual(h.items(),[{id:"1",quantity:10}]);
});

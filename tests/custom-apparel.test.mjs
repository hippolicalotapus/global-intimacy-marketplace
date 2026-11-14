import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFile} from "node:fs/promises";
const require = createRequire(import.meta.url);
const {GARMENTS, validate, createMockSession} = require("../operations/custom-apparel/mock-order.cjs");
const base = Object.freeze({garment:"tshirt", size:"M", color:"black", quantity:1,
  frontText:"  ONE HEART  ", backText:"Make it yours", frontPlacement:"center", backPlacement:"center"});

test("valid T-shirt normalizes original text and keeps approved option names", () => {
  const result=validate(base);
  assert.equal(result.ok,true);
  assert.equal(result.design.frontText,"ONE HEART");
  assert.equal(result.design.garment,"tshirt");
  assert.ok(Object.isFrozen(result.design));
});
test("valid hoodie preview includes size, color and front/back text", () => {
  const result=validate({...base,garment:"hoodie",color:"cream",size:"3XL",frontPlacement:"left-chest"});
  assert.equal(result.ok,true);
  assert.equal(result.design.frontPlacement,"left-chest");
});
test("invalid garments fail closed", () => {
  for(const garment of ["sweater","",null,"constructor","__proto__"]) assert.equal(validate({...base,garment}).ok,false);
});
test("invalid sizes and colours fail closed for garment", () => {
  assert.equal(validate({...base,size:"XXXL"}).reason,"size");
  assert.equal(validate({...base,garment:"hoodie",size:"XS"}).reason,"size");
  assert.equal(validate({...base,color:"cream"}).reason,"color");
});
test("quantity enforces bounded whole mock units", () => {
  for(const quantity of [-1,0,11,1.5,"2",NaN,Infinity]) assert.equal(validate({...base,quantity}).reason,"quantity");
  assert.equal(validate({...base,quantity:10}).ok,true);
});
test("text must be original printable plain text without control or markup", () => {
  for(const frontText of ["<script>alert(1)</script>","hi\nthere","a".repeat(49),null,42])
    assert.equal(validate({...base,frontText}).reason,"text");
});
test("at least one side must carry custom text", () => {
  assert.equal(validate({...base,frontText:" ",backText:""}).reason,"design_required");
  assert.equal(validate({...base,frontText:"",backText:"Only back"}).ok,true);
});
test("reject unexpected customer, payment and arbitrary fields", () => {
  for(const field of ["name","email","address","postal","payment","totalCents","supplierId"])
    assert.equal(validate({...base,[field]:"test"}).reason,"unexpected_fields");
  assert.equal(validate(null).ok,false);
  assert.equal(validate([]).ok,false);
});
test("invalid placement is rejected", () => {
  assert.equal(validate({...base,frontPlacement:"sleeve"}).reason,"placement");
  assert.equal(validate({...base,backPlacement:"neck"}).reason,"placement");
});
test("confirmation requires preview and consumes each preview only once", () => {
  const session=createMockSession();
  assert.equal(session.confirmMock().reason,"preview_required");
  assert.equal(session.preview(base).status,"preview_only");
  const receipt=session.confirmMock();
  assert.equal(receipt.status,"mock_only");
  assert.equal(receipt.mockId,"MOCK-0001");
  assert.equal(session.confirmMock().reason,"preview_required");
});
test("two independent fictional orders get sequential session IDs", () => {
  const session=createMockSession();
  session.preview(base);
  assert.equal(session.confirmMock().mockId,"MOCK-0001");
  session.preview({...base,garment:"hoodie",size:"L"});
  const second=session.confirmMock();
  assert.equal(second.mockId,"MOCK-0002");
  assert.equal(second.design.garment,"hoodie");
});
test("changing or invalidating options prevents a stale mock order", () => {
  const session=createMockSession();
  session.preview(base);session.invalidate();
  assert.equal(session.confirmMock().reason,"preview_required");
  session.preview(base);session.preview({...base,quantity:0});
  assert.equal(session.confirmMock().reason,"preview_required");
});
test("all mock receipts explicitly prohibit checkout and fulfillment", () => {
  const session=createMockSession();
  const preview=session.preview(base);
  assert.equal(preview.checkoutEnabled,false);
  assert.equal(preview.quoteStatus,"quote_required");
  assert.equal(preview.shippingStatus,"unverified");
  const receipt=session.confirmMock();
  assert.equal(receipt.paymentStatus,"disabled");
  assert.equal(receipt.fulfillmentStatus,"not_submitted");
  assert.equal(receipt.checkoutEnabled,false);
  assert.ok(!("totalCents" in receipt));
});
test("browser demo is self-contained, unlinked and has no network/order storage", async () => {
  const html=await readFile(new URL("../operations/custom-apparel/index.html",import.meta.url),"utf8");
  const js=await readFile(new URL("../operations/custom-apparel/browser-demo.js",import.meta.url),"utf8");
  assert.match(html,/PRIVATE TEST ONLY/);
  assert.match(html,/type="button" id="mockConfirm" disabled/);
  assert.match(html,/mock-order\.cjs/);
  assert.ok(!/fetch\(|XMLHttpRequest|localStorage|sessionStorage|sendBeacon|WebSocket|paymentRequest/i.test(js));
  assert.ok(!/checkout|api\/orders/.test(js));
  assert.ok(!html.includes('action="/checkout"'));
  assert.ok(GARMENTS.tshirt && GARMENTS.hoodie);
});

test("browser form previews shirt and hoodie, rejects invalid edits, and issues only fictional receipts", async () => {
  const {runInNewContext} = await import("node:vm");
  const browserSrc=await readFile(new URL("../operations/custom-apparel/browser-demo.js",import.meta.url),"utf8");
  const ids=["customForm","status","receipt","mockConfirm","frontMock","backMock","frontStage","backStage","garment","color","size","quantity","frontText","backText","frontPlacement"];
  const elems=Object.fromEntries(ids.map(id=>[id,{
    value:"",textContent:"",disabled:false,listeners:{},dataset:{},style:{},
    clientHeight:50,scrollHeight:50,clientWidth:60,scrollWidth:60,
    addEventListener(event,callback){this.listeners[event]=callback;},
    replaceChildren(...options){this.options=options;this.value=options[0]?.value||"";}
  }]));
  const document={getElementById:id=>elems[id],createElement:tag=>({tagName:tag,value:"",textContent:""})};
  elems.garment.value="tshirt";elems.frontPlacement.value="center";
  const window={GIMMockApparel:require("../operations/custom-apparel/mock-order.cjs")};
  runInNewContext(browserSrc,{document,window});
  const fire=(id,event)=>elems[id].listeners[event]({preventDefault(){}});
  assert.equal(elems.size.options.length,7);
  elems.quantity.value="1";elems.frontText.value="My own design";
  fire("customForm","input");fire("customForm","submit");
  assert.equal(elems.mockConfirm.disabled,false);
  assert.equal(elems.frontMock.textContent,"My own design");
  assert.equal(elems.frontStage.dataset.ready,"true");
  assert.equal(elems.frontStage.dataset.garment,"tshirt");
  fire("mockConfirm","click");
  assert.match(elems.receipt.textContent,/MOCK-0001/);
  assert.match(elems.receipt.textContent,/Payment disabled/);
  elems.garment.value="hoodie";fire("garment","change");
  assert.equal(elems.frontStage.dataset.ready,"false");
  assert.equal(elems.frontMock.textContent,"");
  assert.equal(elems.size.options.length,6);
  elems.quantity.value="0";fire("customForm","input");fire("customForm","submit");
  assert.equal(elems.mockConfirm.disabled,true);
  assert.match(elems.status.textContent,/Preview rejected: quantity/);
  elems.quantity.value="2";fire("customForm","input");fire("customForm","submit");
  fire("mockConfirm","click");
  assert.match(elems.receipt.textContent,/MOCK-0002.*hoodie/);
  assert.equal(elems.backStage.dataset.garment,"hoodie");
  assert.equal(elems.frontStage.dataset.ready,"true");
});

test("illustrative shirt and hoodie silhouettes exist for front and back", async () => {
  const html=await readFile(new URL("../operations/custom-apparel/index.html",import.meta.url),"utf8");
  assert.equal((html.match(/class="shirt"/g)||[]).length,2);
  assert.equal((html.match(/class="hoodie"/g)||[]).length,2);
  assert.match(html,/id="frontStage"/);
  assert.match(html,/id="backStage"/);
  assert.match(html,/data-color="cream"/);
  assert.match(html,/left-chest/);
  assert.match(html,/Not a photograph, supplier proof or exact scale/);
});
test("preview DOM updates use safe text and never persist or send orders", async () => {
  const js=await readFile(new URL("../operations/custom-apparel/browser-demo.js",import.meta.url),"utf8");
  assert.match(js,/front\.textContent = result\.design\.frontText/);
  assert.match(js,/stage\.dataset\.color = result\.design\.color/);
  assert.match(js,/clearPreview\(\)/);
  assert.ok(!/innerHTML|insertAdjacentHTML|fetch\(|XMLHttpRequest|localStorage|sessionStorage/.test(js));
});


test("left-chest print zone has enough width for common two-word artwork", async () => {
  const html=await readFile(new URL("../operations/custom-apparel/index.html",import.meta.url),"utf8");
  assert.match(html,/\.print-text\[data-placement="left-chest"\]\{[^}]*width:28%/);
  assert.match(html,/\.stage\[data-ready="false"\] \.print-text\{display:none\}/);
});

test("browser preview rejects overflow and never issues fictional receipt for clipped text", async () => {
  const {runInNewContext} = await import("node:vm");
  const source = await readFile(new URL("../operations/custom-apparel/browser-demo.js",import.meta.url),"utf8");
  const ids=["customForm","status","receipt","mockConfirm","frontMock","backMock","frontStage","backStage","garment","color","size","quantity","frontText","backText","frontPlacement"];
  const nodes=Object.fromEntries(ids.map(id=>[id,{
    value:"",textContent:"",disabled:false,listeners:{},dataset:{},style:{},
    clientHeight:50,scrollHeight:50,clientWidth:60,scrollWidth:60,
    addEventListener(type,fn){this.listeners[type]=fn;},
    replaceChildren(...values){this.options=values;this.value=values[0]?.value||"";}
  }]));
  const document={getElementById:id=>nodes[id],createElement:()=>({value:"",textContent:""})};
  nodes.garment.value="tshirt";nodes.frontPlacement.value="left-chest";
  runInNewContext(source,{document,window:{GIMMockApparel:require("../operations/custom-apparel/mock-order.cjs")}});
  const fire=(id,name)=>nodes[id].listeners[name]({preventDefault(){}});
  nodes.frontText.value="Supercalifragilisticexpialidocious";
  nodes.quantity.value="1";
  nodes.frontMock.scrollHeight=95;
  fire("customForm","input");fire("customForm","submit");
  assert.equal(nodes.mockConfirm.disabled,true);
  assert.equal(nodes.frontStage.dataset.ready,"false");
  assert.match(nodes.status.textContent,/cannot display all lettering/);
  fire("mockConfirm","click");
  assert.equal(nodes.receipt.textContent,"");
  nodes.frontMock.scrollHeight=40;
  fire("customForm","input");fire("customForm","submit");
  assert.equal(nodes.mockConfirm.disabled,false);
  assert.equal(nodes.frontStage.dataset.ready,"true");
  fire("mockConfirm","click");
  assert.match(nodes.receipt.textContent,/MOCK-0001/);
});

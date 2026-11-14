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
  assert.match(html,/type="button" id="mockConfirm" aria-describedby="mockSafety" disabled/);
  assert.match(html,/mock-order\.cjs/);
  assert.ok(!/fetch\(|XMLHttpRequest|localStorage|sessionStorage|sendBeacon|WebSocket|paymentRequest/i.test(js));
  assert.ok(!/checkout|api\/orders/.test(js));
  assert.ok(!html.includes('action="/checkout"'));
  assert.ok(GARMENTS.tshirt && GARMENTS.hoodie);
});

test("browser form previews shirt and hoodie, rejects invalid edits, and issues only fictional receipts", async () => {
  const {runInNewContext} = await import("node:vm");
  const browserSrc=await readFile(new URL("../operations/custom-apparel/browser-demo.js",import.meta.url),"utf8");
  const ids=["customForm","status","receipt","mockConfirm","frontMock","backMock","frontStage","backStage","garment","color","size","quantity","frontText","backText","frontPlacement","backPlacement","textStyle","placementHint","backPlacementHint","frontCount","backCount"];
  const elems=Object.fromEntries(ids.map(id=>[id,{
    value:"",textContent:"",disabled:false,listeners:{},dataset:{},style:{},
    clientHeight:50,scrollHeight:50,clientWidth:60,scrollWidth:60,
    addEventListener(event,callback){this.listeners[event]=callback;},
    replaceChildren(...options){this.options=options;this.value=options[0]?.value||"";}
  }]));
  const document={getElementById:id=>elems[id],createElement:tag=>({tagName:tag,value:"",textContent:""})};
  elems.garment.value="tshirt";elems.frontPlacement.value="center";elems.backPlacement.value="center";elems.backPlacement.value="center";elems.textStyle.value="bold";
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
  const ids=["customForm","status","receipt","mockConfirm","frontMock","backMock","frontStage","backStage","garment","color","size","quantity","frontText","backText","frontPlacement","backPlacement","textStyle","placementHint","backPlacementHint","frontCount","backCount"];
  const nodes=Object.fromEntries(ids.map(id=>[id,{
    value:"",textContent:"",disabled:false,listeners:{},dataset:{},style:{},
    clientHeight:50,scrollHeight:50,clientWidth:60,scrollWidth:60,
    addEventListener(type,fn){this.listeners[type]=fn;},
    replaceChildren(...values){this.options=values;this.value=values[0]?.value||"";}
  }]));
  const document={getElementById:id=>nodes[id],createElement:()=>({value:"",textContent:""})};
  nodes.garment.value="tshirt";nodes.frontPlacement.value="left-chest";nodes.backPlacement.value="center";nodes.textStyle.value="bold";
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


test("lettering styles use an allowlist and remain fictional", () => {
  assert.equal(validate({...base,textStyle:"bold"}).design.textStyle,"bold");
  assert.equal(validate({...base,textStyle:"classic"}).design.textStyle,"classic");
  assert.equal(validate({...base,textStyle:"mono"}).design.textStyle,"mono");
  assert.equal(validate({...base,textStyle:"url(javascript:alert(1))"}).reason,"text_style");
  assert.equal(validate(base).design.textStyle,"bold");
  const session=createMockSession();
  session.preview({...base,textStyle:"classic"});
  assert.equal(session.confirmMock().design.textStyle,"classic");
});
test("accessible print preview has labelled controls and front/back details", async () => {
  const html=await readFile(new URL("../operations/custom-apparel/index.html",import.meta.url),"utf8");
  for(const id of ["textStyle","frontText","backText","frontPlacement","garment","size","color"]) assert.match(html,new RegExp('for="'+id+'"'));
  assert.match(html,/id="status" role="status" aria-live="polite"/);
  assert.match(html,/id="receipt" role="status" aria-live="polite"/);
  assert.match(html,/:focus-visible\{/);
  assert.match(html,/data-side="back"/);
  assert.match(html,/\.stage\[data-side="back"\] \.front-detail\{display:none\}/);
  assert.match(html,/data-text-style="bold"/);
});


test("front print position changes accessible guidance without authorizing an order", async () => {
  const {runInNewContext} = await import("node:vm");
  const js=await readFile(new URL("../operations/custom-apparel/browser-demo.js",import.meta.url),"utf8");
  const ids=["customForm","status","receipt","mockConfirm","frontMock","backMock","frontStage","backStage","garment","color","size","quantity","frontText","backText","frontPlacement","backPlacement","textStyle","placementHint","backPlacementHint","frontCount","backCount"];
  const elems=Object.fromEntries(ids.map(id=>[id,{
    value:"",textContent:"",disabled:false,listeners:{},dataset:{},style:{},
    clientHeight:50,scrollHeight:50,clientWidth:60,scrollWidth:60,
    addEventListener(type,fn){this.listeners[type]=fn;},
    replaceChildren(...items){this.options=items;this.value=items[0]?.value||"";}
  }]));
  elems.garment.value="tshirt";elems.frontPlacement.value="center";elems.backPlacement.value="center";elems.backPlacement.value="center";elems.textStyle.value="bold";
  const document={getElementById:id=>elems[id],createElement:()=>({value:"",textContent:""})};
  runInNewContext(js,{document,window:{GIMMockApparel:require("../operations/custom-apparel/mock-order.cjs")}});
  assert.equal(elems.frontStage.dataset.placement,"center");
  assert.match(elems.placementHint.textContent,/larger lettering/);
  elems.frontPlacement.value="left-chest";elems.backPlacement.value="center";
  elems.customForm.listeners.input({});
  elems.frontPlacement.listeners.change({});
  assert.equal(elems.mockConfirm.disabled,true);
  assert.equal(elems.frontStage.dataset.placement,"left-chest");
  assert.match(elems.placementHint.textContent,/compact left-chest/);
  assert.doesNotMatch(elems.placementHint.textContent,/Back: centred/);
});
test("print-zone guidance is accessible and never claims verified supplier dimensions", async () => {
  const html=await readFile(new URL("../operations/custom-apparel/index.html",import.meta.url),"utf8");
  assert.match(html,/id="frontPlacement" aria-describedby="placementHint"/);
  assert.match(html,/id="placementHint"[^>]*aria-live="polite"/);
  assert.equal((html.match(/class="print-guide"/g)||[]).length,2);
  assert.match(html,/actual supplier dimensions are unverified/);
  assert.match(html,/data-placement="left-chest"/);
});


test("front and back independent positions validate safely", () => {
  assert.equal(validate({...base,backPlacement:"upper-back"}).ok,true);
  assert.equal(validate({...base,frontPlacement:"left-chest",backPlacement:"upper-back"}).ok,true);
  for(const backPlacement of ["shoulder","neck",null,"constructor"])
    assert.equal(validate({...base,backPlacement}).reason,"placement");
});
test("supplier print-zone intake leaves all measurements unverified", async () => {
  const spec=JSON.parse(await readFile(new URL("../operations/custom-apparel/print-zone-specifications.json",import.meta.url),"utf8"));
  assert.equal(spec.status,"supplier_verification_required");
  for(const garment of ["tshirt","hoodie"]) {
    assert.equal(spec.garments[garment].supplierSku,null);
    assert.equal(spec.garments[garment].fabricAndBlankConfirmed,false);
    for(const position of ["front_center","front_left_chest","back_center","back_upper_back"]) {
      const entry=spec.garments[garment].placements[position];
      assert.equal(entry.status,"unverified");
      for(const field of ["printAreaWidthMm","printAreaHeightMm","offsetFromCollarMm","offsetFromCenterMm","method","supplierProofUrl","approvedBy"])
        assert.equal(entry[field],null);
    }
  }
});
test("browser preview exposes independent back position and safe guidance", async () => {
  const html=await readFile(new URL("../operations/custom-apparel/index.html",import.meta.url),"utf8");
  const js=await readFile(new URL("../operations/custom-apparel/browser-demo.js",import.meta.url),"utf8");
  assert.match(html,/id="backPlacement" aria-describedby="backPlacementHint"/);
  assert.match(html,/data-side="back"\]\[data-placement="upper-back"/);
  assert.match(html,/print-text\[data-placement="upper-back"/);
  assert.match(js,/backPlacement:backPlacement\.value/);
  assert.match(js,/backStage\.dataset\.placement = result\.design\.backPlacement/);
  assert.match(js,/backPlacement\.addEventListener\("change", updateBackHint\)/);
  assert.doesNotMatch(js,/Back: centred print zone only/);
  assert.ok(!/fetch\(|XMLHttpRequest|localStorage|sessionStorage|innerHTML/.test(js));
});


test("accessible front and back character counts update and warn near the limit", async () => {
  const {runInNewContext} = await import("node:vm");
  const js=await readFile(new URL("../operations/custom-apparel/browser-demo.js",import.meta.url),"utf8");
  const ids=["customForm","status","receipt","mockConfirm","frontMock","backMock","frontStage","backStage","garment","color","size","quantity","frontText","backText","frontPlacement","backPlacement","textStyle","placementHint","backPlacementHint","frontCount","backCount"];
  const elems=Object.fromEntries(ids.map(id=>[id,{value:"",textContent:"",disabled:false,listeners:{},dataset:{},style:{},clientHeight:50,scrollHeight:50,clientWidth:60,scrollWidth:60,
    addEventListener(name,fn){this.listeners[name]=fn;},replaceChildren(...opts){this.options=opts;this.value=opts[0]?.value||"";}}]));
  elems.garment.value="tshirt"; elems.frontPlacement.value="center"; elems.backPlacement.value="center"; elems.textStyle.value="bold";
  const document={getElementById:id=>elems[id],createElement:()=>({value:"",textContent:""})};
  runInNewContext(js,{document,window:{GIMMockApparel:require("../operations/custom-apparel/mock-order.cjs")}});
  assert.equal(elems.frontCount.textContent,"0 of 48 characters");
  elems.frontText.value="A".repeat(40); elems.customForm.listeners.input({});
  assert.equal(elems.frontCount.textContent,"40 of 48 characters");
  assert.equal(elems.frontCount.dataset.nearLimit,"true");
  assert.equal(elems.backCount.dataset.nearLimit,"false");
  assert.equal(elems.mockConfirm.disabled,true);
  elems.backText.value="Back"; elems.customForm.listeners.input({});
  assert.equal(elems.backCount.textContent,"4 of 48 characters");
});
test("character counts are described accessibly and do not add network or order endpoints", async () => {
  const html=await readFile(new URL("../operations/custom-apparel/index.html",import.meta.url),"utf8");
  const js=await readFile(new URL("../operations/custom-apparel/browser-demo.js",import.meta.url),"utf8");
  assert.match(html,/id="frontText"[^>]*aria-describedby="artHint frontCount"/);
  assert.match(html,/id="backText"[^>]*aria-describedby="artHint backCount"/);
  assert.match(html,/id="frontCount" aria-live="off"/);
  assert.match(html,/id="backCount" aria-live="off"/);
  assert.ok(!/fetch\(|XMLHttpRequest|localStorage|sessionStorage|innerHTML/.test(js));
});

test("supplier readiness audit identifies missing proofs without authorizing manufacture", async () => {
  const {audit} = require("../operations/custom-apparel/supplier-readiness.cjs");
  const spec = JSON.parse(await readFile(new URL("../operations/custom-apparel/print-zone-specifications.json",import.meta.url),"utf8"));
  const result = audit(spec);
  assert.equal(result.complete,false);
  assert.equal(result.manufacturingApproved,false);
  assert.ok(result.missing.includes("tshirt.front_left_chest.printAreaWidthMm"));
  assert.ok(result.missing.includes("hoodie.back_upper_back.supplierProofUrl"));
  assert.ok(result.missing.length >= 60);
  assert.ok(Object.isFrozen(result.missing));
});
test("supplier audit rejects malformed and partially filled specifications", () => {
  const {audit} = require("../operations/custom-apparel/supplier-readiness.cjs");
  for(const sample of [null,[],{}, {schemaVersion:2}, {schemaVersion:1,garments:{}}]) {
    const result = audit(sample);
    assert.equal(result.complete,false);
    assert.equal(result.manufacturingApproved,false);
  }
});
test("offline supplier audit has no checkout, fetch, or persistence capability", async () => {
  const js=await readFile(new URL("../operations/custom-apparel/supplier-readiness.cjs",import.meta.url),"utf8");
  assert.match(js,/manufacturingApproved:false/);
  assert.ok(!/fetch\(|XMLHttpRequest|localStorage|sessionStorage|payment|checkoutEnabled|submitOrder/i.test(js));
});


test("resize invalidates previously valid mock preview and prevents stale receipt", async () => {
  const {runInNewContext} = await import("node:vm");
  const js=await readFile(new URL("../operations/custom-apparel/browser-demo.js",import.meta.url),"utf8");
  const ids=["customForm","status","receipt","mockConfirm","frontMock","backMock","frontStage","backStage","garment","color","size","quantity","frontText","backText","frontPlacement","backPlacement","textStyle","placementHint","backPlacementHint","frontCount","backCount"];
  const elems=Object.fromEntries(ids.map(id=>[id,{value:"",textContent:"",disabled:false,listeners:{},dataset:{},style:{},clientHeight:100,scrollHeight:25,clientWidth:100,scrollWidth:30,
    addEventListener(type,handler){this.listeners[type]=handler;},replaceChildren(...items){this.options=items;this.value=items[0]?.value||"";}}]));
  const events={};
  const window={GIMMockApparel:require("../operations/custom-apparel/mock-order.cjs"),addEventListener(type,handler){events[type]=handler;}};
  const document={getElementById:id=>elems[id],createElement:()=>({value:"",textContent:""})};
  elems.garment.value="tshirt";elems.frontPlacement.value="center";elems.backPlacement.value="center";elems.textStyle.value="bold";
  runInNewContext(js,{document,window});
  elems.frontText.value="Safe mock";elems.quantity.value="1";
  elems.customForm.listeners.input({});
  elems.customForm.listeners.submit({preventDefault(){}});
  assert.equal(elems.mockConfirm.disabled,false);
  events.resize({});
  assert.equal(elems.mockConfirm.disabled,true);
  assert.equal(elems.frontStage.dataset.ready,"false");
  assert.match(elems.status.textContent,/Screen size changed/);
  elems.mockConfirm.listeners.click({});
  assert.equal(elems.receipt.textContent,"");
  elems.customForm.listeners.submit({preventDefault(){}});
  assert.equal(elems.mockConfirm.disabled,false);
  events.pageshow({persisted:true});
  assert.equal(elems.mockConfirm.disabled,true);
  assert.match(elems.status.textContent,/Page restored/);
});
test("fictional confirmation communicates no-payment and supplier restrictions accessibly", async () => {
  const html=await readFile(new URL("../operations/custom-apparel/index.html",import.meta.url),"utf8");
  const js=await readFile(new URL("../operations/custom-apparel/browser-demo.js",import.meta.url),"utf8");
  assert.match(html,/id="mockConfirm" aria-describedby="mockSafety" disabled/);
  assert.match(html,/id="mockSafety"/);
  assert.match(html,/Nothing is saved, paid for, printed or submitted/);
  assert.match(js,/window.addEventListener\("resize"/);
  assert.match(js,/window.addEventListener\("pageshow"/);
});

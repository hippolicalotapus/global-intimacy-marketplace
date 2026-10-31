import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const root=new URL("../", import.meta.url);
const read=path=>readFile(new URL(path,root),"utf8");
async function page(){
 const html=await read("site/creator-feedback.html");
 const js=await read("site/creator-feedback.js");
 class El{
  constructor(id){this.id=id;this.value="";this.hidden=false;this.checked=false;this.href="";this.actions={};this.textContent="";this.selected=false}
  addEventListener(type,fn){(this.actions[type]??=[]).push(fn)}
  dispatch(type){for(const fn of this.actions[type]||[])fn({preventDefault(){}})}
  focus(){}
  select(){this.selected=true}
 }
 const elements=new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],new El(m[1])]));
 elements.get("cf-send-wrap").hidden=true;
 elements.get("cf-answer-preview-wrap").hidden=true;
 const doc={getElementById(id){assert.ok(elements.has(id),"Missing ID "+id);return elements.get(id)}};
 let clipboardWrites=[];
 const navigator={clipboard:{async writeText(text){clipboardWrites.push(text)}}};
 let gate="https://www.google.com/";
 const win={location:{href:"https://store.example/#shop",replace(url){gate=url}}};
 const storage={getItem(){return null},setItem(){}};
 runInNewContext(js,{document:doc,window:win,navigator,sessionStorage:storage,URL},{timeout:1500});
 return {html,js,elements,navigator,clipboardWrites,gate:()=>gate,click:(id,type="click")=>elements.get(id).dispatch(type)};
}

test("Creator feedback page is linked from storefront and stays preview-only",async()=>{
 const html=await read("site/index.html"),fb=await read("site/creator-feedback.html"),script=await read("site/creator-feedback.js");
 assert.match(html,/href="creator-feedback.html"/);
 assert.match(fb,/No purchases, commissions, referral tracking or benefits are active/);
 assert.match(fb,/not a paid partnership, affiliate contract or guaranteed benefit/);
 assert.match(fb,/No cash payments, discounts, gifts, commissions, individual referral credits/);
 assert.match(fb,/not submitted automatically|We do not collect your answers automatically/);
 assert.ok(!script.includes("fetch(")&&!script.includes("XMLHttpRequest"));
 assert.ok(!fb.includes("action=\"/api/"));
});
test("Invite copy uses generic URL without public creator identity or tracking",async()=>{
 const app=await page();
 assert.equal(app.elements.get("cf-link").value,"https://store.example/creator-feedback.html");
 app.elements.get("cf-alias").value="Some Creator";
 app.click("cf-copy-link");
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(app.clipboardWrites.at(-1),"https://store.example/creator-feedback.html");
 assert.ok(!app.clipboardWrites.at(-1).includes("Some%20Creator"));
});
test("Survey only prepares email when at least one response exists and does not send",async()=>{
 const app=await page();
 app.click("cf-form","submit");
 assert.match(app.elements.get("cf-answer-status").textContent,/at least one/);
 assert.equal(app.elements.get("cf-send-wrap").hidden,true);
 app.elements.get("cf-products").value="Comfortable hoodies and app-connected gifts";
 app.elements.get("cf-alias").value="StageAlias";
 app.click("cf-form","submit");
 assert.equal(app.elements.get("cf-send-wrap").hidden,false);
 const url=app.elements.get("cf-send-email").href;
 assert.ok(url.startsWith("mailto:globalintimacypartner@gmail.com?subject="));
 assert.ok(decodeURIComponent(url).includes("Comfortable hoodies and app-connected gifts"));
 assert.ok(decodeURIComponent(url).includes("StageAlias"));
 assert.equal(app.elements.get("cf-answer-preview-wrap").hidden,false);
});
test("Responses are copyable and fallback is select-ready",async()=>{
 const app=await page();
 app.elements.get("cf-idea").value="Safer wishlist gifting";
 app.click("cf-copy-answers");
 await new Promise(resolve=>setImmediate(resolve));
 assert.match(app.clipboardWrites.at(-1),/Safer wishlist gifting/);
 app.navigator.clipboard.writeText=async()=>{throw Error("denied")};
 app.click("cf-copy-answers");
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(app.elements.get("cf-answer-preview").selected,true);
});
test("Age acknowledgement is explicit, while copy/share never send personal details",async()=>{
 const app=await page();
 assert.equal(app.elements.get("ageGate").hidden,false);
 app.click("ageYes");
 assert.equal(app.elements.get("ageGate").hidden,true);
 assert.match(app.elements.get("cf-message").value,/not a paid referral program/i);
});

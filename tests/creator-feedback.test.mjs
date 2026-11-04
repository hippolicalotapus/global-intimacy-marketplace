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
  constructor(id){this.id=id;this.value="";this.hidden=false;this.checked=false;this.disabled=false;this.required=false;this.href="";this.actions={};this.textContent="";this.selected=false}
  addEventListener(type,fn){(this.actions[type]??=[]).push(fn)}
  dispatch(type){const e={defaultPrevented:false,preventDefault(){this.defaultPrevented=true}};for(const fn of this.actions[type]||[])fn(e);return e}
  focus(){}
  select(){this.selected=true}
 }
 const elements=new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],new El(m[1])]));
 elements.get("cf-answer-preview-wrap").hidden=true;
 const doc={getElementById(id){assert.ok(elements.has(id),"Missing ID "+id);return elements.get(id)}};
 let clipboardWrites=[];
 const navigator={clipboard:{async writeText(text){clipboardWrites.push(text)}}};
 let gate="https://www.google.com/";
 const win={actions:{},addEventListener(type,fn){this.actions[type]=fn},location:{href:"https://store.example/#shop",replace(url){gate=url}}};
 const storage={getItem(){return null},setItem(){}};
 runInNewContext(js,{document:doc,window:win,navigator,sessionStorage:storage,URL},{timeout:1500});
 return {html,js,elements,navigator,win,clipboardWrites,gate:()=>gate,click:(id,type="click")=>elements.get(id).dispatch(type)};
}

test("Creator feedback uses direct same-origin POST with consent and no paid features",async()=>{
 const html=await read("site/index.html"),fb=await read("site/creator-feedback.html"),script=await read("site/creator-feedback.js");
 assert.match(html,/href="creator-feedback.html"/);
 assert.match(fb,/No purchases, commissions, referral tracking or benefits are active/);
 assert.match(fb,/not a paid partnership, affiliate contract or guaranteed benefit/);
 assert.match(fb,/No cash payments, discounts, gifts, commissions, individual referral credits/);
 assert.match(fb,/<form[^>]+name="creator-feedback"[^>]+method="POST"[^>]+action="\/creator-feedback-thanks.html"[^>]+data-netlify="true"/);
 assert.match(fb,/name="form-name" value="creator-feedback"/);
 assert.match(fb,/netlify-honeypot="bot-field"/);
 assert.match(fb,/id="cf-consent"[^>]+required/);
 for(const name of ["stage-name","creator-format","wishlist-experience","products-wanted","safer-gifting","privacy-priority","future-opportunities","must-have-feature","email","follow-up"])assert.ok(fb.includes('name="'+name+'"'),"Missing form field "+name);
 assert.match(fb,/Responses are stored in our Netlify account/);
 assert.ok(!fb.includes("Open email app")&&!script.includes("mailto:"));
 assert.match(await read("netlify.toml"),/form-action 'self'/);
 assert.match(await read("netlify.toml"),/connect-src 'none'/);
 assert.match(await read("site/creator-feedback-thanks.html"),/Your feedback is in/);
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
test("Survey blocks empty or unconsented answers and permits native POST after consent",async()=>{
 const app=await page();
 assert.equal(app.click("cf-form","submit").defaultPrevented,true);
 assert.match(app.elements.get("cf-answer-status").textContent,/at least one/);
 app.elements.get("cf-products").value="Comfortable hoodies and app-connected gifts";
 app.elements.get("cf-alias").value="StageAlias";
 assert.equal(app.click("cf-form","submit").defaultPrevented,true);
 assert.match(app.elements.get("cf-answer-status").textContent,/agree to send/);
 app.elements.get("cf-consent").checked=true;
 assert.equal(app.click("cf-form","submit").defaultPrevented,false);
 assert.equal(app.elements.get("cf-submit").disabled,true);
 assert.match(app.elements.get("cf-answer-status").textContent,/Submitting/);
 app.win.actions.pageshow();
 assert.equal(app.elements.get("cf-submit").disabled,false);
});
test("Contact email is excluded unless a reply is requested and required for requested replies",async()=>{
 const app=await page();
 assert.equal(app.elements.get("cf-email").disabled,true);
 assert.equal(app.elements.get("cf-contact-wrap").hidden,true);
 app.elements.get("cf-products").value="Art tees";
 app.elements.get("cf-consent").checked=true;
 app.elements.get("cf-followup").checked=true;
 app.click("cf-followup","change");
 assert.equal(app.elements.get("cf-email").disabled,false);
 assert.equal(app.elements.get("cf-email").required,true);
 assert.equal(app.click("cf-form","submit").defaultPrevented,true);
 app.elements.get("cf-email").value="test@example.com";
 assert.equal(app.click("cf-form","submit").defaultPrevented,false);
 app.elements.get("cf-followup").checked=false;
 app.click("cf-followup","change");
 assert.equal(app.elements.get("cf-email").disabled,true);
 assert.equal(app.elements.get("cf-email").required,false);
});
test("Chat invitation contains the questionnaire URL and no personal answer data",async()=>{
 const app=await page();
 app.elements.get("cf-alias").value="PrivateAlias";
 app.elements.get("cf-products").value="PrivateAnswer";
 app.click("cf-copy-message");
 await new Promise(resolve=>setImmediate(resolve));
 const copied=app.clipboardWrites.at(-1);
 assert.match(copied,/click Submit feedback/);
 assert.match(copied,/https:\/\/store.example\/creator-feedback.html/);
 assert.ok(!copied.includes("PrivateAlias")&&!copied.includes("PrivateAnswer"));
 assert.match(app.elements.get("cf-share-status").textContent,/Paste it into your chat/);
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
 assert.match(app.elements.get("cf-message").value,/no purchase or promised rewards/i);
});


import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

const root=new URL("../",import.meta.url);
const read=path=>readFile(new URL(path,root),"utf8");

test("All storefront files and approved logo exist in deployable site",async()=>{
  const html=await read("site/index.html");
  const paths=["site/styles.css","site/catalog.js","site/app.js","site/assets/approved-logo.svg"];
  await Promise.all(paths.map(path=>access(new URL(path,root))));
  assert.ok(html.includes('assets/approved-logo.svg'));
  assert.ok(!html.includes("assets/approved-logo.webp"));
  assert.ok(html.includes("Global Intimacy Marketplace"));
  const logo=await read("site/assets/approved-logo.svg");
  assert.match(logo,/data:image\/webp;base64,/);
});

test("Client script only refers to defined ID elements",async()=>{
  const html=await read("site/index.html");
  const js=await read("site/app.js");
  const known=new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map(x=>x[1]));
  const required=[...js.matchAll(/\bel\("([^"]+)"\)/g)].map(x=>x[1]);
  const missing=[...new Set(required)].filter(x=>!known.has(x));
  assert.deepEqual(missing,[]);
});

test("Every research product is ID-distinct, undiscounted and explicitly not authorized",async()=>{
  const src=await read("site/catalog.js");
  const sandbox={window:{}};
  runInNewContext(src,sandbox,{timeout:1200});
  const ps=sandbox.window.GIM_PRODUCTS;
  assert.ok(ps.length>=45);
  assert.equal(new Set(ps.map(x=>x.id)).size,ps.length);
  for(const p of ps){
    assert.equal(p.resellerApproved,false);
    assert.equal(p.imageApproved,false);
    assert.equal(p.stockVerified,false);
    assert.equal(p.priceVerified,false);
    assert.ok(p.name&&p.brand);
    assert.ok(!("wholesale" in p));
  }
});

test("Netlify serves only public site folder, never supplier operations",async()=>{
  const config=await read("netlify.toml");
  assert.match(config,/publish\s*=\s*"site"/);
  assert.match(config,/Content-Security-Policy/);
  const registry=JSON.parse(await read("operations/suppliers/supplier-registry.json"));
  assert.equal(registry.defaultControls.canPublish,false);
  assert.equal(registry.defaultControls.canAcceptOrders,false);
  assert.ok(registry.suppliers.length>=12);
  assert.ok(registry.suppliers.every(x=>!["approved","active"].includes(x.status)));
});

test("Beta contains no live checkout forms or real order submission hooks",async()=>{
  const html=await read("site/index.html");
  const js=await read("site/app.js");
  assert.ok(html.includes("No purchases or live stock yet"));
  assert.ok(!html.includes('action="/checkout"'));
  assert.ok(!js.includes('fetch("/api/checkout"'));
  assert.ok(!js.includes('fetch("/api/orders"'));
});

test("All research and supplier staging remains separate from public deployment",async()=>{
  const site=await read("site/index.html");
  const app=await read("site/app.js");
  assert.ok(!site.includes("wholesale_price"));
  assert.ok(!app.includes("privateSupplierData"));
  const ignore=await read(".gitignore");
  assert.ok(ignore.includes("private_staging/"));
});


test("Creator wishlist has one delegated add handler and does not truncate choices",async()=>{
  const js=await read("site/app.js");
  const catalog=await read("site/catalog.js");
  assert.ok(js.includes('document.addEventListener("click",function(e){'),"Expected delegated click handling");
  assert.ok(js.includes('else if(wish){wishlist(Number(wish.dataset.wish));'),"Wishlist click branch must remain");
  assert.ok(!js.includes('el("wishlistPicker").addEventListener("click"'),"Picker must not also toggle wishlist on same bubbling click");
  assert.ok(!js.includes('.slice(0,60)'),"Wishlist picker should not drop the last six research products");
  const sandbox={window:{}};
  runInNewContext(catalog,sandbox,{timeout:1200});
  assert.equal(sandbox.window.GIM_PRODUCTS.length,66);
});

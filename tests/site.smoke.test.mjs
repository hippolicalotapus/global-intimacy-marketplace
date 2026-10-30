import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

const root=new URL("../",import.meta.url);
const read=path=>readFile(new URL(path,root),"utf8");

test("All storefront files and approved logo exist in deployable site",async()=>{
  const html=await read("site/index.html");
  const paths=["site/styles.css","site/catalog.js","site/apparel.js","site/app.js","site/assets/approved-logo.svg"];
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
  assert.equal(sandbox.window.GIM_PRODUCTS.length,87);
});

test("New companion and adult life-size research collections remain unapproved",async()=>{
  const catalog=await read("site/catalog.js");
  const app=await read("site/app.js");
  const html=await read("site/index.html");
  const sandbox={window:{}};
  runInNewContext(catalog,sandbox,{timeout:1200});
  const ps=sandbox.window.GIM_PRODUCTS;
  assert.equal(ps.length,87);
  for(const category of ["AI Companions","Life-Size Dolls","Doll Care & Parts"]){
    assert.ok(ps.some(p=>p.category===category), "Missing category "+category);
    assert.ok(app.includes('"'+category+'"'),"Missing navigation category "+category);
  }
  assert.ok(ps.some(p=>p.brand==="Realbotix"&&p.name==="Echo Full-Body Humanoid"));
  assert.ok(ps.some(p=>p.brand==="WM Custom Dolls"));
  assert.ok(ps.filter(p=>["AI Companions","Life-Size Dolls","Doll Care & Parts"].includes(p.category)).every(p=>p.resellerApproved===false&&p.imageApproved===false&&p.stockVerified===false&&p.priceVerified===false));
  assert.match(html,/NEW COLLECTION UNDER RESEARCH/);
  assert.match(html,/Not yet available to purchase, reserve, or gift/);
});

test("Concorde research catalogue and collection tier filters remain unpriced",async()=>{
  const cat=await read("site/catalog.js");
  const js=await read("site/app.js");
  const html=await read("site/index.html");
  const sandbox={window:{}};
  runInNewContext(cat,sandbox,{timeout:1200});
  const ps=sandbox.window.GIM_PRODUCTS;
  assert.equal(ps.length,87);
  for(const collection of ["Everyday","Premium","ULTRA"]){
    assert.ok(ps.some(p=>p.collection===collection),"Missing collection "+collection);
    assert.ok(html.includes('data-collection="'+collection+'"'));
  }
  for(const category of ["Lingerie","Essentials","Massage & Care","Games & Gifts"]){
    assert.ok(ps.some(p=>p.category===category),"Missing category "+category);
  }
  assert.ok(html.includes('id="collectionFilters"'));
  assert.ok(js.includes('el("collectionFilters").addEventListener("click"'));
  assert.ok(js.includes('activeCollection==="All"||p.collection===activeCollection'));
  assert.ok(ps.slice(73).every(p=>p.resellerApproved===false&&p.imageApproved===false&&p.priceVerified===false&&p.stockVerified===false));
  assert.ok(!html.includes('action="/checkout"'));
});

test("ONE HEART 16 owner-approved image concepts augment the existing 87-item catalogue",async()=>{
  const sandbox={window:{}};
  runInNewContext(await read("site/catalog.js"),sandbox,{timeout:1200});
  assert.equal(sandbox.window.GIM_PRODUCTS.length,87);
  runInNewContext(await read("site/apparel.js"),sandbox,{timeout:1200});
  const products=sandbox.window.GIM_PRODUCTS;
  assert.equal(products.length,103);
  const apparel=products.filter(p=>p.collection==="ONE HEART");
  assert.equal(apparel.length,16);
  assert.equal(apparel.filter(p=>p.category==="ONE HEART Hoodies").length,5);
  assert.equal(apparel.filter(p=>p.category==="ONE HEART Art Tees").length,11);
  assert.equal(new Set(products.map(p=>p.id)).size,103);
  for(const p of apparel){
    assert.equal(p.conceptImage,true);
    assert.equal(p.priceVerified,false);
    assert.equal(p.stockVerified,false);
    assert.equal(p.resellerApproved,false);
    assert.equal(p.preorderType,"nonbinding enquiry");
    assert.ok(/^assets\/one-heart\/[a-z-]+\.webp$/.test(p.previewImage));
    assert.ok(p.previewImageAlt.includes("not a photo"));
    await access(new URL("site/"+p.previewImage,root));
  }
});
test("Store offers ONE HEART filters and nonbinding email enquiries, no paid pre-orders",async()=>{
  const html=await read("site/index.html"),js=await read("site/app.js");
  assert.ok(html.includes('data-collection="ONE HEART"'));
  assert.ok(html.includes('src="apparel.js"'));
  assert.ok(html.includes('data-oneheart'));
  assert.ok(js.includes("mailto:globalintimacypartner@gmail.com"));
  assert.ok(js.includes('activeCollection="ONE HEART"'));
  assert.ok(js.includes('p.previewImage'));
  assert.ok(html.includes("No purchases or live stock yet."));
  assert.ok(!html.includes('action="/checkout"'));
});

test("Photo-first storefront surfaces owner-supplied imagery above old abstract hero",async()=>{
  const html=await read("site/index.html"), js=await read("site/app.js"), css=await read("site/styles.css");
  const gallery=html.indexOf('class="photo-first-grid"');
  const research=html.indexOf('id="catalog"');
  assert.ok(gallery>0&&gallery<research,"Photo gallery must come before entire research catalogue");
  assert.ok(html.includes('class="hero-art hero-product-display"'));
  assert.ok(html.includes('data-detail="99"'));
  assert.ok(html.includes('data-detail="103"'));
  assert.ok(html.includes('data-detail="93"'));
  assert.match(js,/sort==="featured"\)list\.sort\(function\(a,b\)\{return Number\(!!b\.previewImage\)-Number\(!!a\.previewImage\)/);
  assert.ok(css.includes(".photo-first-grid"));
  assert.ok(html.includes("No purchases or live stock yet."));
});

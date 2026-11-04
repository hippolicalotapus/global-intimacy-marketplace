import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

// Execute the real browser scripts and their event handlers against a small DOM
// fixture. Browser QA separately checks layout, links and decoded image assets.
async function storefront(hash = "", options = {}) {
  const settings = { country: "CA", previews: true, blockedStorage: false, ...options };
  const html = await read("site/index.html");
  class Element {
    constructor(id, dataset = {}) {
      Object.assign(this, { id, dataset, value: "", innerHTML: "", textContent: "", hidden: false, open: false, listeners: {} });
      this.classList = { add() {}, remove() {}, toggle() {} };
    }
    dispatchEvent(event) { for (const handler of this.listeners[event.type] || []) handler(event); }
    addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
    dispatch(type, target = this) { for (const handler of this.listeners[type] || []) handler({ target, preventDefault() {} }); }
    setAttribute() {}
    removeAttribute() {}
    querySelectorAll() { return this.children || []; }
    focus() {}
    scrollIntoView() {}
    showModal() { this.open = true; }
    close() { this.open = false; }
  }
  const nodes = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(m => [m[1], new Element(m[1])]));
  const links = [...html.matchAll(/<a\b([^>]+)>/g)].map(m => {
    const dataset = Object.fromEntries([...m[1].matchAll(/\bdata-([\w-]+)(?:="([^"]*)")?/g)].map(a => [a[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase()), a[2] || ""]));
    return new Element("", dataset);
  });
  nodes.get("collectionFilters").children = [...html.matchAll(/<button[^>]*data-collection="([^"]+)"/g)].map(m => new Element("", { collection: m[1] }));
  nodes.get("communityFilters").children = [...html.matchAll(/<button[^>]*data-community-group="([^"]+)"/g)].map(m => new Element("", { communityGroup: m[1] }));
  nodes.get("unconventionalFilters").children = [...html.matchAll(/<button[^>]*data-unconventional-group="([^"]+)"/g)].map(m => new Element("", { unconventionalGroup: m[1] }));
  const document = new Element("document");
  document.readyState = "loading";
  document.getElementById = id => { assert.ok(nodes.has(id), `Undefined DOM ID ${id}`); return nodes.get(id); };
  document.querySelectorAll = selector => selector === "[data-oneheart]" ? links.filter(n => "oneheart" in n.dataset)
    : selector === '[data-all-products], [data-route="shop"]' ? links.filter(n => "allProducts" in n.dataset || n.dataset.route === "shop")
    : selector === "[data-route]" ? links.filter(n => n.dataset.route)
    : selector === ".page" ? [...nodes.values()].filter(n => n.id.startsWith("view-")) : [];
  const storage = () => { const values = new Map(settings.country ? [["gim:country",settings.country]] : []); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };
  const location = { hash, href: "https://store.example/" + hash };
  const window = new Element("window");
  window.scrollTo = () => {};
  const local = settings.blockedStorage ? {getItem(){throw Error("blocked");},setItem(){throw Error("blocked");}} : storage();
  const sandbox = { window, document, location, localStorage: local, CustomEvent: class {constructor(type){this.type=type;}}, sessionStorage: storage(), navigator: {}, URL, TextEncoder, TextDecoder,
    btoa: value => Buffer.from(value, "binary").toString("base64"), atob: value => Buffer.from(value, "base64").toString("binary"),
    requestAnimationFrame: fn => fn(), setTimeout: () => 0, clearTimeout() {} };
  for (const path of ["site/catalog.js", "site/apparel.js", "site/countries.js", "site/shipping.js", "site/globe-math.js", "site/globe-3d.js", "site/globe-software.js", "site/destination.js", "site/app.js"]) {
    if(path==="site/app.js" && settings.synthetic)window.GIM_PRODUCTS.push(settings.synthetic);
    runInNewContext(await read(path), sandbox, { timeout: 1200 });
  }
  document.dispatch("DOMContentLoaded");
  if(settings.previews){ nodes.get("previewMode").checked=true; nodes.get("previewMode").dispatch("change"); }
  const click = (name, dataset) => nodes.get(name).dispatch("click", { closest: () => ({ dataset }) });
  const search = value => { nodes.get("searchInput").value = value; nodes.get("searchInput").dispatch("input"); };
  const count = () => Number(nodes.get("resultCount").textContent);
  return { nodes, links, document, window, location, search, click, count, local };
}

test("Catalogue search finds ONE HEART aliases, collection names and mixed keywords", async () => {
  const app = await storefront();
  assert.equal(app.count(), 106);
  for (const query of ["one heart", "ONE HEART", "oneheart", "one-heart", "one  heart", "one heart collection", "heart one"]) {
    app.search(query); assert.equal(app.count(), 18, query);
  }
  for (const [query, expected] of [["oneheart hoodies", 9], ["mountain collection", 9], ["paisley", 3], ["natural cream", 2], ["Three Sisters", 1], ["no-such-item", 0], ["", 106]]) {
    app.search(query); assert.equal(app.count(), expected, query);
  }
});

test("Switching collections clears incompatible category, brand and search filters", async () => {
  const app = await storefront();
  app.click("categoryChips", { category: "Essentials" });
  assert.equal(app.count(), 5);
  app.search("lubrix");
  app.click("collectionFilters", { collection: "ONE HEART" });
  assert.equal(app.count(), 18);
  assert.equal(app.nodes.get("searchInput").value, "");
  assert.equal(app.nodes.get("brandSelect").value, "all");
  app.links.find(n => "allProducts" in n.dataset).dispatch("click");
  assert.equal(app.count(), 106);
});

test("Direct ONE HEART route and its navigation link show all 18 designs", async () => {
  const app = await storefront("#one-heart");
  assert.equal(app.count(), 18);
  app.search("missing");
  app.links.find(n => "oneheart" in n.dataset).dispatch("click");
  assert.equal(app.count(), 18);
  assert.equal((await storefront("#one-heart")).count(), 18);
  const html = await read("site/index.html");
  assert.ok([...html.matchAll(/<a\b([^>]*data-oneheart[^>]*)>/g)].every(m => m[1].includes('href="#one-heart"')));
});

test("Wishlist search uses the same collection and keyword search", async () => {
  const app = await storefront("#creators");
  for (const [query, expected] of [["oneheart", 18], ["one heart hoodies", 9], ["mountain collection", 9]]) {
    app.nodes.get("wishlistSearch").value = query;
    app.nodes.get("wishlistSearch").dispatch("input");
    assert.equal((app.nodes.get("wishlistPicker").innerHTML.match(/class="picker-item"/g) || []).length, expected, query);
  }
});

test("ONE HEART details, favorites and shareable wishlist use real catalogue IDs", async () => {
  const app = await storefront();
  const delegated = (key, id) => app.document.dispatch("click", { closest: selector => selector === `[data-${key}]` ? { dataset: { [key]: String(id) } } : null });
  delegated("detail", 201);
  assert.equal(app.nodes.get("productDialog").open, true);
  assert.ok(app.nodes.get("modalBody").innerHTML.includes("assets/apparel/references/OH_H01-H03_Mountain_Hoodies.webp"));
  assert.ok(app.nodes.get("modalBody").innerHTML.includes("mailto:globalintimacypartner@gmail.com"));
  app.nodes.get("closeModal").dispatch("click");
  assert.equal(app.nodes.get("productDialog").open, false);
  delegated("fav", 201);
  assert.ok(app.nodes.get("favoritesGrid").innerHTML.includes("Three Sisters"));
  delegated("wish", 201);
  app.nodes.get("creatorAlias").value = "Test Studio";
  app.nodes.get("createShareLink").dispatch("click");
  const share = new URL(app.nodes.get("shareUrl").value);
  const guest = await storefront(share.hash);
  assert.equal(guest.nodes.get("giftAlias").textContent, "Test Studio");
  assert.ok(guest.nodes.get("giftGrid").innerHTML.includes("Three Sisters"));
});

test("Gay and lesbian section has a direct route and searches existing products", async () => {
  const app = await storefront("#gay-lesbian");
  assert.equal(app.document.title, "Gay & Lesbian | Global Intimacy Marketplace");
  assert.equal(Number(app.nodes.get("communityResultCount").textContent), 106);
  app.nodes.get("communitySearch").value = "oneheart";
  app.nodes.get("communitySearch").dispatch("input");
  assert.equal(Number(app.nodes.get("communityResultCount").textContent), 18);
  app.click("communityFilters", { communityGroup: "style" });
  assert.equal(app.nodes.get("communitySearch").value, "");
  assert.equal(Number(app.nodes.get("communityResultCount").textContent), 22);
  app.nodes.get("communitySearch").value = "no-such-item";
  app.nodes.get("communitySearch").dispatch("input");
  assert.equal(app.nodes.get("communityEmpty").hidden, false);
  app.nodes.get("clearCommunityFilters").dispatch("click");
  assert.equal(Number(app.nodes.get("communityResultCount").textContent), 106);
});

test("Store search finds the Gay and Lesbian section without assigning shopper identities", async () => {
  const app = await storefront();
  for (const query of ["gay", "lesbian", "gay and lesbian", "LGBTQ"]) {
    app.search(query);
    assert.equal(app.nodes.get("communitySearchResult").hidden, false, query);
    assert.equal(app.count(), 1, query);
    assert.equal(app.nodes.get("emptyProducts").hidden, true, query);
  }
  app.search("one heart");
  assert.equal(app.nodes.get("communitySearchResult").hidden, true);
  assert.equal(app.count(), 18);
});

test("Header search reaches all products from another page and clears stale filters", async () => {
  const app = await storefront("#creators");
  app.nodes.get("brandSelect").value = "Lovense";
  app.nodes.get("brandSelect").dispatch("change");
  app.search("oneheart");
  assert.equal(app.location.hash, "results");
  assert.equal(app.count(), 18);
  assert.equal(app.nodes.get("brandSelect").value, "all");
  assert.equal(app.nodes.get("activeFilterSummary").hidden, false);
  assert.ok(app.nodes.get("activeFilterText").textContent.includes("oneheart"));
  app.nodes.get("storeSearchForm").dispatch("submit");
  assert.equal(app.count(), 18);
  app.nodes.get("clearActiveFilters").dispatch("click");
  assert.equal(app.count(), 106);
  assert.equal(app.nodes.get("activeFilterSummary").hidden, true);
});

test("Category menu links and select controls expose the same catalogue categories", async () => {
  const app = await storefront();
  app.document.dispatch("click", { closest: selector => selector === "[data-browse-category]" ? { dataset: { browseCategory: "Couples" } } : null });
  assert.equal(app.count(), 15);
  assert.equal(app.nodes.get("categorySelect").value, "Couples");
  assert.equal(app.nodes.get("shopMenu").open, false);
  app.nodes.get("categorySelect").value = "ONE HEART Hoodies";
  app.nodes.get("categorySelect").dispatch("change");
  assert.equal(app.count(), 9);
  assert.ok(app.nodes.get("activeFilterText").textContent.includes("ONE HEART Hoodies"));
});



test("First visit requires a valid country and preserves direct ONE HEART routing", async () => {
 const app = await storefront("#one-heart", {country:null,previews:false});
 assert.equal(app.nodes.get("countryEntrance").hidden,false);
 assert.equal(app.nodes.get("storeShell").hidden,true);
 assert.equal(app.window.GIMDestination.enter("EU"),false);
 assert.equal(app.window.GIMDestination.enter("CA"),true);
 assert.equal(app.nodes.get("storeShell").hidden,false);
 assert.equal(app.count(),0);
 app.nodes.get("previewMode").checked=true;app.nodes.get("previewMode").dispatch("change");
 assert.equal(app.count(),18);
});

test("Country selection never presents current research previews as delivery-confirmed", async () => {
 const app = await storefront("", {previews:false});
 assert.equal(app.count(),0);
 assert.equal(app.nodes.get("countryEmpty").hidden,false);
 assert.equal(app.nodes.get("productGrid").innerHTML,"");
 app.nodes.get("showResearchPreviews").dispatch("click");
 assert.equal(app.count(),106);
 assert.match(app.nodes.get("productGrid").innerHTML,/Delivery to Canada not confirmed/);
 app.window.GIMDestination.enter("GB");
 assert.equal(app.count(),0, "country switch resets explicit preview opt-in");
 assert.equal(app.nodes.get("previewMode").checked,false);
 assert.match(app.nodes.get("countryCurrent").textContent,/United Kingdom/);
 app.search("oneheart"); assert.equal(app.count(),0);
 app.nodes.get("clearActiveFilters").dispatch("click");assert.equal(app.count(),0);
 assert.equal(app.window.GIMDestination.country(),"GB");
});

test("Wishlist, shared gifts, saved items and details cannot promise unsupported delivery", async () => {
 const app=await storefront();
 const id=201;
 const click=key=>app.document.dispatch("click",{closest:s=>s===`[data-${key}]`?{dataset:{[key]:String(id)}}:null});
 click("fav");click("wish");click("detail");
 assert.equal(app.nodes.get("productDialog").open,true);
 app.window.GIMDestination.enter("US");
 assert.equal(app.nodes.get("productDialog").open,false);
 assert.equal(app.nodes.get("favoritesGrid").innerHTML,"");
 assert.equal(app.nodes.get("wishlistPicker").innerHTML.includes('class="picker-item"'),false);
 assert.match(app.nodes.get("selectedWishItems").innerHTML,/Delivery to United States not confirmed/);
 click("detail");assert.equal(app.nodes.get("productDialog").open,false);
});

test("Blocked local storage and unavailable canvas retain working country-list selection", async () => {
 const app=await storefront("",{country:null,previews:false,blockedStorage:true});
 assert.equal(app.nodes.get("globeFallback").hidden,false);
 assert.equal(app.window.GIMDestination.enter("NZ"),true);
 assert.equal(app.window.GIMDestination.country(),"NZ");
 assert.equal(app.count(),0);
 app.nodes.get("countryCurrent").dispatch("click");
 assert.equal(app.nodes.get("countryEntrance").hidden,false);
 app.nodes.get("cancelCountry").dispatch("click");
 assert.equal(app.nodes.get("storeShell").hidden,false);
});


test("A synthetic approved SKU is filtered consistently when the shopper changes country",async()=>{
 const synthetic={id:999,brand:"Test fixture",name:"Synthetic test product",category:"Wellness",collection:"Everyday",researchType:"Test only",resellerApproved:true,stockVerified:true,canAcceptOrders:true,
 deliveryRules:[{productId:999,country:"CA",status:"allowed",verified:true,countrywide:true,resaleTerritoryApproved:true,importReviewed:true,fulfillmentConfirmed:true,checkedAt:"2020-01-01",validUntil:"2099-01-01"},{country:"US",status:"blocked"}]};
 const app=await storefront("",{previews:false,synthetic});
 assert.equal(app.count(),1);
 assert.match(app.nodes.get("productGrid").innerHTML,/Synthetic test product/);
 assert.match(app.nodes.get("productGrid").innerHTML,/Delivery confirmed for Canada/);
 assert.equal(app.nodes.get("countryEmpty").hidden,true);
 assert.match(app.nodes.get("destinationNote").textContent,/1 products/);
 app.window.GIMDestination.enter("US");
 assert.equal(app.count(),0);
 app.nodes.get("showResearchPreviews").dispatch("click");
 assert.equal(app.count(),106, "Blocked product stays excluded even from preview results");
 assert.ok(!app.nodes.get("productGrid").innerHTML.includes("Synthetic test product"));
});



test("Current apparel routes show 18 ONE HEART designs and one SARCASTABASTARD design",async()=>{
 const app=await storefront("#sarcastabastard");assert.equal(app.count(),1);
 assert.match(app.nodes.get("productGrid").innerHTML,/I FUCK UP EVERYTHING/);
 app.click("collectionFilters",{collection:"ONE HEART"});assert.equal(app.count(),18);
 app.search("Yamnuska");assert.equal(app.count(),1);
});
test("Clothing details frame complete garments and link full-dimension boards",async()=>{
 const app=await storefront();
 for(const id of [88,93,201,209,301,302,303,401]){
 app.document.dispatch("click",{closest:s=>s==="[data-detail]"?{dataset:{detail:String(id)}}:null});
 const body=app.nodes.get("modalBody").innerHTML;
 assert.match(body,/preserveAspectRatio="xMidYMid meet"/);
 assert.match(body,/Open full-size design board/);
 assert.match(body,/No payment or reservation will be taken/);
 app.nodes.get("closeModal").dispatch("click");
 }
});

test("Unconventional direct links and earlier name aliases reach the dedicated section",async()=>{
 for(const hash of ["#freaks-weirdos-deviants","#unconventional","#freaks-and-geeks"]){
  const app=await storefront(hash);
  assert.equal(app.document.title,"Freaks, Weirdos & Deviants | Global Intimacy Marketplace");
  assert.ok(Number(app.nodes.get("unconventionalResultCount").textContent)>0);
  assert.match(app.nodes.get("unconventionalGrid").innerHTML,/SARCASTABASTARD/);
  assert.ok(!app.nodes.get("unconventionalGrid").innerHTML.includes("Organic Chamomile"));
 }
});

test("Global search finds the unconventional area under its welcome wording and interests",async()=>{
 const app=await storefront();
 for(const query of ["freaks weirdos and deviants","Freaks & Geeks","unconventional","bdsm","kink","alternative fashion","role-play"]){
  app.search(query);
  assert.equal(app.nodes.get("unconventionalSearchResult").hidden,false,query);
  assert.equal(app.count(),1,query);
  assert.equal(app.nodes.get("emptyProducts").hidden,true,query);
 }
 app.search("one heart");
 assert.equal(app.nodes.get("unconventionalSearchResult").hidden,true);
 assert.equal(app.count(),18);
});

test("Unconventional interests filter actual candidates and disclose the unsourced BDSM collection",async()=>{
 const app=await storefront("#freaks-weirdos-deviants");
 app.click("unconventionalFilters",{unconventionalGroup:"style"});
 assert.equal(Number(app.nodes.get("unconventionalResultCount").textContent),21);
 assert.match(app.nodes.get("unconventionalGrid").innerHTML,/Three Sisters/);
 assert.ok(!app.nodes.get("unconventionalGrid").innerHTML.includes("Solace Pro"));
 app.nodes.get("unconventionalSearch").value="paisley";app.nodes.get("unconventionalSearch").dispatch("input");
 assert.equal(Number(app.nodes.get("unconventionalResultCount").textContent),3);
 app.click("unconventionalFilters",{unconventionalGroup:"roleplay"});
 assert.equal(app.nodes.get("unconventionalSearch").value,"");
 assert.equal(Number(app.nodes.get("unconventionalResultCount").textContent),6);
 app.click("unconventionalFilters",{unconventionalGroup:"kink"});
 assert.equal(app.nodes.get("unconventionalGrid").innerHTML,"");
 assert.equal(app.nodes.get("unconventionalEmpty").hidden,false);
 assert.match(app.nodes.get("unconventionalEmptyTitle").textContent,/being sourced/);
 assert.match(app.nodes.get("unconventionalEmptyText").textContent,/not added BDSM-specific products/);
 app.nodes.get("clearUnconventionalFilters").dispatch("click");
 assert.equal(app.nodes.get("unconventionalEmpty").hidden,true);
});

test("Unconventional products cannot bypass country checks or preview consent",async()=>{
 const app=await storefront("#freaks-weirdos-deviants",{previews:false});
 assert.equal(Number(app.nodes.get("unconventionalResultCount").textContent),0);
 assert.equal(app.nodes.get("unconventionalGrid").innerHTML,"");
 assert.match(app.nodes.get("unconventionalEmptyTitle").textContent,/No confirmed matches for Canada/);
 app.nodes.get("showResearchPreviews").dispatch("click");
 assert.match(app.nodes.get("unconventionalGrid").innerHTML,/Delivery to Canada not confirmed/);
 app.window.GIMDestination.enter("US");
 assert.equal(Number(app.nodes.get("unconventionalResultCount").textContent),0);
 assert.equal(app.nodes.get("unconventionalGrid").innerHTML,"");
 assert.match(app.nodes.get("unconventionalAvailability").textContent,/United States/);
 assert.equal(app.nodes.get("previewMode").checked,false);
 app.click("unconventionalFilters",{unconventionalGroup:"technology"});
 app.nodes.get("clearUnconventionalFilters").dispatch("click");
 assert.equal(Number(app.nodes.get("unconventionalResultCount").textContent),0);
});

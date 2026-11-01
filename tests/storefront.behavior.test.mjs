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
  assert.equal(app.count(), 103);
  for (const query of ["one heart", "ONE HEART", "oneheart", "one-heart", "one  heart", "one heart collection", "heart one"]) {
    app.search(query); assert.equal(app.count(), 16, query);
  }
  for (const [query, expected] of [["oneheart hoodies", 5], ["mountain collection", 5], ["psychedelic expanded", 5], ["natural cream", 1], ["Rocky Mountains", 1], ["no-such-item", 0], ["", 103]]) {
    app.search(query); assert.equal(app.count(), expected, query);
  }
});

test("Switching collections clears incompatible category, brand and search filters", async () => {
  const app = await storefront();
  app.click("categoryChips", { category: "Essentials" });
  assert.equal(app.count(), 5);
  app.search("lubrix");
  app.click("collectionFilters", { collection: "ONE HEART" });
  assert.equal(app.count(), 16);
  assert.equal(app.nodes.get("searchInput").value, "");
  assert.equal(app.nodes.get("brandSelect").value, "all");
  app.links.find(n => "allProducts" in n.dataset).dispatch("click");
  assert.equal(app.count(), 103);
});

test("Direct ONE HEART route and its navigation link show all 16 designs", async () => {
  const app = await storefront("#one-heart");
  assert.equal(app.count(), 16);
  app.search("missing");
  app.links.find(n => "oneheart" in n.dataset).dispatch("click");
  assert.equal(app.count(), 16);
  assert.equal((await storefront("#one-heart")).count(), 16);
  const html = await read("site/index.html");
  assert.ok([...html.matchAll(/<a\b([^>]*data-oneheart[^>]*)>/g)].every(m => m[1].includes('href="#one-heart"')));
});

test("Wishlist search uses the same collection and keyword search", async () => {
  const app = await storefront("#creators");
  for (const [query, expected] of [["oneheart", 16], ["one heart hoodies", 5], ["mountain collection", 5]]) {
    app.nodes.get("wishlistSearch").value = query;
    app.nodes.get("wishlistSearch").dispatch("input");
    assert.equal((app.nodes.get("wishlistPicker").innerHTML.match(/class="picker-item"/g) || []).length, expected, query);
  }
});

test("ONE HEART details, favorites and shareable wishlist use real catalogue IDs", async () => {
  const app = await storefront();
  const delegated = (key, id) => app.document.dispatch("click", { closest: selector => selector === `[data-${key}]` ? { dataset: { [key]: String(id) } } : null });
  delegated("detail", 99);
  assert.equal(app.nodes.get("productDialog").open, true);
  assert.ok(app.nodes.get("modalBody").innerHTML.includes("assets/one-heart/rocky-mountains.webp"));
  assert.ok(app.nodes.get("modalBody").innerHTML.includes("mailto:globalintimacypartner@gmail.com"));
  app.nodes.get("closeModal").dispatch("click");
  assert.equal(app.nodes.get("productDialog").open, false);
  delegated("fav", 99);
  assert.ok(app.nodes.get("favoritesGrid").innerHTML.includes("Rocky Mountains"));
  delegated("wish", 99);
  app.nodes.get("creatorAlias").value = "Test Studio";
  app.nodes.get("createShareLink").dispatch("click");
  const share = new URL(app.nodes.get("shareUrl").value);
  const guest = await storefront(share.hash);
  assert.equal(guest.nodes.get("giftAlias").textContent, "Test Studio");
  assert.ok(guest.nodes.get("giftGrid").innerHTML.includes("Rocky Mountains"));
});

test("Gay and lesbian section has a direct route and searches existing products", async () => {
  const app = await storefront("#gay-lesbian");
  assert.equal(app.document.title, "Gay & Lesbian | Global Intimacy Marketplace");
  assert.equal(Number(app.nodes.get("communityResultCount").textContent), 103);
  app.nodes.get("communitySearch").value = "oneheart";
  app.nodes.get("communitySearch").dispatch("input");
  assert.equal(Number(app.nodes.get("communityResultCount").textContent), 16);
  app.click("communityFilters", { communityGroup: "style" });
  assert.equal(app.nodes.get("communitySearch").value, "");
  assert.equal(Number(app.nodes.get("communityResultCount").textContent), 19);
  app.nodes.get("communitySearch").value = "no-such-item";
  app.nodes.get("communitySearch").dispatch("input");
  assert.equal(app.nodes.get("communityEmpty").hidden, false);
  app.nodes.get("clearCommunityFilters").dispatch("click");
  assert.equal(Number(app.nodes.get("communityResultCount").textContent), 103);
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
  assert.equal(app.count(), 16);
});

test("Header search reaches all products from another page and clears stale filters", async () => {
  const app = await storefront("#creators");
  app.nodes.get("brandSelect").value = "Lovense";
  app.nodes.get("brandSelect").dispatch("change");
  app.search("oneheart");
  assert.equal(app.location.hash, "results");
  assert.equal(app.count(), 16);
  assert.equal(app.nodes.get("brandSelect").value, "all");
  assert.equal(app.nodes.get("activeFilterSummary").hidden, false);
  assert.ok(app.nodes.get("activeFilterText").textContent.includes("oneheart"));
  app.nodes.get("storeSearchForm").dispatch("submit");
  assert.equal(app.count(), 16);
  app.nodes.get("clearActiveFilters").dispatch("click");
  assert.equal(app.count(), 103);
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
  assert.equal(app.count(), 5);
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
 assert.equal(app.count(),16);
});

test("Country selection never presents current research previews as delivery-confirmed", async () => {
 const app = await storefront("", {previews:false});
 assert.equal(app.count(),0);
 assert.equal(app.nodes.get("countryEmpty").hidden,false);
 assert.equal(app.nodes.get("productGrid").innerHTML,"");
 app.nodes.get("showResearchPreviews").dispatch("click");
 assert.equal(app.count(),103);
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
 const id=99;
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
 assert.equal(app.count(),103, "Blocked product stays excluded even from preview results");
 assert.ok(!app.nodes.get("productGrid").innerHTML.includes("Synthetic test product"));
});

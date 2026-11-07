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
    focus(options) { this.focusOptions=options; this.focusCount=(this.focusCount||0)+1; }
    scrollIntoView(options) { this.scrollOptions=options; this.scrollCount=(this.scrollCount||0)+1; }
    showModal() { this.open = true; }
    close() { this.open = false; }
  }
  const nodes = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(m => [m[1], new Element(m[1])]));
  const links = [...html.matchAll(/<a\b([^>]+)>/g)].map(m => {
    const dataset = Object.fromEntries([...m[1].matchAll(/\bdata-([\w-]+)(?:="([^"]*)")?/g)].map(a => [a[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase()), a[2] || ""]));
    return new Element("", dataset);
  });
  nodes.get("collectionFilters").children = [...html.matchAll(/<button[^>]*data-collection="([^"]+)"/g)].map(m => new Element("", { collection: m[1] }));
  nodes.get("unconventionalFilters").children = [...html.matchAll(/<button[^>]*data-unconventional-group="([^"]+)"/g)].map(m => new Element("", { unconventionalGroup: m[1] }));
  const document = new Element("document");
  document.readyState = "loading";
  document.body = new Element("body");
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
  for (const path of ["site/catalog.js", "site/apparel.js", "site/product-drawings.js", "site/countries.js", "site/shipping.js", "site/globe-math.js", "site/globe-3d.js", "site/globe-software.js", "site/destination.js", "site/ruby-welcome.js", "site/app.js"]) {
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
  assert.equal(app.count(), 110);
  for (const query of ["one heart", "ONE HEART", "oneheart", "one-heart", "one  heart", "one heart collection", "heart one"]) {
    app.search(query); assert.equal(app.count(), 18, query);
  }
  for (const [query, expected] of [["oneheart hoodies", 9], ["mountain collection", 9], ["paisley", 3], ["natural cream", 2], ["Three Sisters", 1], ["no-such-item", 0], ["", 110]]) {
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
  assert.equal(app.count(), 110);
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

test("Every mountain hoodie exposes complete front and back without expanding hidden views", async () => {
  const app=await storefront();
  for(let id=201;id<=209;id++){
    app.document.dispatch("click",{closest:selector=>selector==='[data-detail]'?{dataset:{detail:String(id)}}:null});
    const html=app.nodes.get("modalBody").innerHTML;
    assert.ok(html.includes('class="hoodie-detail-pair"'));
    assert.ok(html.includes('Complete hoodie — front')&&html.includes('Complete hoodie — back'));
    assert.ok(!html.includes('class="detail-extra"'));
    assert.ok(html.includes('Current approved artwork shown in a placement illustration'));
    assert.ok(html.includes('No payment or reservation will be taken'));
    app.nodes.get("closeModal").dispatch("click");
  }
});

test("ONE HEART details, favorites and shareable wishlist use real catalogue IDs", async () => {
  const app = await storefront();
  const delegated = (key, id) => app.document.dispatch("click", { closest: selector => selector === `[data-${key}]` ? { dataset: { [key]: String(id) } } : null });
  delegated("detail", 201);
  assert.equal(app.nodes.get("productDialog").open, true);
  assert.ok(app.nodes.get("modalBody").innerHTML.includes("assets/drawings/p201.webp"));
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

test("Earlier community links open the combined interest area and its welcome", async () => {
  const app = await storefront("#gay-lesbian");
  assert.equal(app.document.title, "Explore Your Interests | Global Intimacy Marketplace");
  assert.equal(app.location.hash, "explore-interests?group=community");
  assert.equal(app.nodes.get("interestCommunityWelcome").hidden, false);
  assert.equal(Number(app.nodes.get("unconventionalResultCount").textContent), 110);
  app.nodes.get("unconventionalSearch").value = "oneheart";
  app.nodes.get("unconventionalSearch").dispatch("input");
  assert.equal(Number(app.nodes.get("unconventionalResultCount").textContent), 18);
  app.nodes.get("unconventionalSearch").value = "no-such-item";
  app.nodes.get("unconventionalSearch").dispatch("input");
  assert.equal(app.nodes.get("unconventionalEmpty").hidden, false);
});

test("Community and interest search share one welcoming discovery card", async () => {
  const app = await storefront();
  for (const query of ["gay", "lesbian", "gay and lesbian", "LGBTQ", "gay kink", "explore your interests"]) {
    app.search(query);
    assert.equal(app.nodes.get("unconventionalSearchResult").hidden, false, query);
    assert.equal(app.count(), 1, query);
    assert.equal(app.nodes.get("emptyProducts").hidden, true, query);
  }
  app.search("one heart");
  assert.equal(app.nodes.get("unconventionalSearchResult").hidden, true);
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
  assert.equal(app.count(), 110);
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
 assert.equal(app.count(),110);
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
 assert.equal(app.count(),110, "Blocked product stays excluded even from preview results");
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

test("Interest hub and earlier aliases reach the combined section",async()=>{
 for(const hash of ["#explore-interests","#freaks-weirdos-deviants","#unconventional","#freaks-and-geeks"]){
  const app=await storefront(hash);
  assert.equal(app.document.title,"Explore Your Interests | Global Intimacy Marketplace");
  assert.ok(Number(app.nodes.get("unconventionalResultCount").textContent)>0);
  assert.match(app.nodes.get("unconventionalGrid").innerHTML,/SARCASTABASTARD/);
  assert.equal(Number(app.nodes.get("unconventionalResultCount").textContent),110);
 }
});

test("Global search preserves earlier interest aliases without displaying those labels",async()=>{
 const app=await storefront();
 for(const query of ["freaks weirdos and deviants","Freaks & Geeks","unconventional","bdsm","kink","alternative fashion","role-play"]){
  app.search(query);
  assert.equal(app.nodes.get("unconventionalSearchResult").hidden,false,query);
  assert.equal(app.count(),query==="kink"?5:1,query);
  assert.equal(app.nodes.get("emptyProducts").hidden,true,query);
 }
 app.search("one heart");
 assert.equal(app.nodes.get("unconventionalSearchResult").hidden,true);
 assert.equal(app.count(),18);
});

test("Unconventional interests include the four unconfirmed accessory drawings",async()=>{
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
 assert.equal(Number(app.nodes.get("unconventionalResultCount").textContent),4);
 assert.equal(app.nodes.get("unconventionalEmpty").hidden,true);
 assert.match(app.nodes.get("unconventionalGrid").innerHTML,/Eyes Wide Shut/);
 assert.match(app.nodes.get("unconventionalGrid").innerHTML,/Delivery to Canada not confirmed/);
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


test("A specific category narrows an interest and switching interests clears stale categories",async()=>{
 const app=await storefront("#explore-interests");
 app.click("unconventionalFilters",{unconventionalGroup:"style"});
 app.nodes.get("interestCategory").value="ONE HEART Hoodies";app.nodes.get("interestCategory").dispatch("change");
 assert.equal(Number(app.nodes.get("unconventionalResultCount").textContent),9);
 assert.match(app.nodes.get("unconventionalGrid").innerHTML,/Three Sisters/);
 assert.ok(!app.nodes.get("unconventionalGrid").innerHTML.includes("Paisley T-Shirt"));
 app.click("unconventionalFilters",{unconventionalGroup:"technology"});
 assert.equal(app.nodes.get("interestCategory").value,"all");
 assert.ok(Number(app.nodes.get("unconventionalResultCount").textContent)>0);
 app.click("unconventionalFilters",{unconventionalGroup:"kink"});
 assert.equal(app.nodes.get("interestCategory").disabled,false);
 assert.equal(Number(app.nodes.get("unconventionalResultCount").textContent),4);
});

test("Community browsing uses shared products and preserves country and preview consent",async()=>{
 const app=await storefront("#explore-interests?group=community",{previews:false});
 assert.equal(app.nodes.get("interestCommunityWelcome").hidden,false);
 assert.equal(Number(app.nodes.get("unconventionalResultCount").textContent),0);
 app.nodes.get("showResearchPreviews").dispatch("click");
 assert.equal(Number(app.nodes.get("unconventionalResultCount").textContent),110);
 app.window.GIMDestination.enter("US");
 assert.equal(Number(app.nodes.get("unconventionalResultCount").textContent),0);
 assert.equal(app.nodes.get("previewMode").checked,false);
 app.click("unconventionalFilters",{unconventionalGroup:"connection"});
 assert.equal(app.nodes.get("interestCommunityWelcome").hidden,true);
});

test("The public interface uses one interest page and neutral wording",async()=>{
 const html=await read("site/index.html");
 assert.ok(!/Freaks|Weirdos|Deviants|THE UNCONVENTIONAL/.test(html));
 assert.ok(!/data-route="gay-lesbian"|id="view-gay-lesbian"/.test(html));
 assert.match(html,/id="view-explore-interests"/);
 assert.match(html,/Gay &amp; Lesbian connections/);
 assert.match(html,/Explore a more specific category/);
});


test("An interest tap clears narrower filters and takes focus directly to all matching products",async()=>{
 const app=await storefront("#explore-interests");
 app.click("unconventionalFilters",{unconventionalGroup:"style"});
 app.nodes.get("interestCategory").value="ONE HEART Hoodies";app.nodes.get("interestCategory").dispatch("change");
 app.nodes.get("unconventionalSearch").value="Three Sisters";app.nodes.get("unconventionalSearch").dispatch("input");
 assert.equal(Number(app.nodes.get("unconventionalResultCount").textContent),1);
 const before=app.nodes.get("interestResults").scrollCount;
 app.click("unconventionalFilters",{unconventionalGroup:"style"});
 assert.equal(Number(app.nodes.get("unconventionalResultCount").textContent),21);
 assert.equal(app.nodes.get("interestCategory").value,"all");
 assert.equal(app.nodes.get("unconventionalSearch").value,"");
 assert.equal(app.nodes.get("interestResultsTitle").textContent,"Fashion & self-expression");
 assert.equal(app.nodes.get("interestResults").scrollCount,before+1);
 assert.equal(app.nodes.get("interestResultsTitle").focusOptions.preventScroll,true);
 app.nodes.get("backToInterests").dispatch("click");
 assert.equal(app.nodes.get("unconventionalDiscoveries").scrollOptions.block,"start");
 assert.equal(app.nodes.get("interestChoiceTitle").focusCount,1);
});

test("Category shortcuts open the complete category list without stale brand or search filters",async()=>{
 const app=await storefront("#creators");
 app.search("paisley");
 app.nodes.get("brandSelect").value="ONE HEART";app.nodes.get("brandSelect").dispatch("change");
 app.document.dispatch("click",{closest:selector=>selector==="[data-browse-category]"?{dataset:{browseCategory:"Couples"}}:null});
 assert.equal(app.location.hash,"#results");
 assert.equal(app.count(),15);
 assert.equal(app.nodes.get("brandSelect").value,"all");
 assert.equal(app.nodes.get("searchInput").value,"");
 assert.equal(app.nodes.get("categorySelect").value,"Couples");
 assert.equal(app.nodes.get("catalogResults").scrollOptions.block,"start");
});

test("A direct category result keeps country checks and never opts into research previews",async()=>{
 const app=await storefront("#explore-interests?group=style",{previews:false});
 assert.equal(app.nodes.get("interestResultsTitle").textContent,"Fashion & self-expression");
 assert.equal(app.nodes.get("interestResults").scrollOptions.block,"start");
 assert.equal(Number(app.nodes.get("unconventionalResultCount").textContent),0);
 assert.equal(app.nodes.get("previewMode").checked,false);
 app.click("unconventionalFilters",{unconventionalGroup:"technology"});
 assert.equal(Number(app.nodes.get("unconventionalResultCount").textContent),0);
 app.nodes.get("categorySelect").value="ONE HEART Hoodies";app.nodes.get("categorySelect").dispatch("change");
 assert.equal(app.count(),0);
 assert.equal(app.nodes.get("previewMode").checked,false);
});


test("Exact design codes and common garment wording find the same catalogue entries",async()=>{
 const app=await storefront();
 for(const query of ["OH-H01","oh h01","OH H01"]){app.search(query);assert.equal(app.count(),1);assert.match(app.nodes.get("productGrid").innerHTML,/Three Sisters/);}
 app.search("hoodie");const singular=app.count();app.search("hoodies");assert.equal(app.count(),singular);assert.equal(singular,9);
 app.search("t shirt");const tees=app.count();app.search("tee");assert.equal(app.count(),tees);app.search("t-shirts");assert.equal(app.count(),tees);assert.equal(tees,10);
});

test("Applied filters can be removed one at a time while preserving the others",async()=>{
 const app=await storefront();
 app.search("paisley");app.nodes.get("brandSelect").value="ONE HEART";app.nodes.get("brandSelect").dispatch("change");
 assert.equal(app.count(),3);assert.match(app.nodes.get("activeFilterChips").innerHTML,/Remove ONE HEART filter/);
 app.click("activeFilterChips",{removeFilter:"search"});
 assert.equal(app.count(),18);assert.equal(app.nodes.get("brandSelect").value,"ONE HEART");assert.equal(app.nodes.get("searchInput").value,"");
 app.click("activeFilterChips",{removeFilter:"brand"});assert.equal(app.count(),110);assert.equal(app.nodes.get("activeFilterSummary").hidden,true);
});

test("Product details disclose actual design facts and leave unverified clothing specifications pending",async()=>{
 const app=await storefront();
 app.document.dispatch("click",{closest:selector=>selector==="[data-detail]"?{dataset:{detail:"201"}}:null});
 assert.match(app.nodes.get("modalBody").innerHTML,/Design code/);assert.match(app.nodes.get("modalBody").innerHTML,/OH-H01/);assert.match(app.nodes.get("modalBody").innerHTML,/Size, fabric &amp; care/);assert.match(app.nodes.get("modalBody").innerHTML,/after the production sample/);
 app.nodes.get("closeModal").dispatch("click");app.search("paisley");assert.equal(app.nodes.get("catalogResultsTitle").textContent,'Search: “paisley”');assert.match(app.nodes.get("catalogMatchCount").textContent,/3 product previews/);
});


import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

// Execute the real browser scripts and their event handlers against a small DOM
// fixture. Browser QA separately checks layout, links and decoded image assets.
async function storefront(hash = "") {
  const html = await read("site/index.html");
  class Element {
    constructor(id, dataset = {}) {
      Object.assign(this, { id, dataset, value: "", innerHTML: "", textContent: "", hidden: false, open: false, listeners: {} });
      this.classList = { add() {}, remove() {}, toggle() {} };
    }
    addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
    dispatch(type, target = this) { for (const handler of this.listeners[type] || []) handler({ target }); }
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
  const document = new Element("document");
  document.readyState = "loading";
  document.getElementById = id => { assert.ok(nodes.has(id), `Undefined DOM ID ${id}`); return nodes.get(id); };
  document.querySelectorAll = selector => selector === "[data-oneheart]" ? links.filter(n => "oneheart" in n.dataset)
    : selector === '[data-all-products], [data-route="shop"]' ? links.filter(n => "allProducts" in n.dataset || n.dataset.route === "shop")
    : selector === "[data-route]" ? links.filter(n => n.dataset.route)
    : selector === ".page" ? [...nodes.values()].filter(n => n.id.startsWith("view-")) : [];
  const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };
  const location = { hash, href: "https://store.example/" + hash };
  const window = new Element("window");
  window.scrollTo = () => {};
  const sandbox = { window, document, location, localStorage: storage(), sessionStorage: storage(), navigator: {}, URL, TextEncoder, TextDecoder,
    btoa: value => Buffer.from(value, "binary").toString("base64"), atob: value => Buffer.from(value, "base64").toString("binary"),
    requestAnimationFrame: fn => fn(), setTimeout: () => 0, clearTimeout() {} };
  for (const path of ["site/catalog.js", "site/apparel.js", "site/app.js"]) runInNewContext(await read(path), sandbox, { timeout: 1200 });
  document.dispatch("DOMContentLoaded");
  const click = (name, dataset) => nodes.get(name).dispatch("click", { closest: () => ({ dataset }) });
  const search = value => { nodes.get("searchInput").value = value; nodes.get("searchInput").dispatch("input"); };
  const count = () => Number(nodes.get("resultCount").textContent);
  return { nodes, links, document, window, location, search, click, count };
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

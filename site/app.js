"use strict";
/* Global Intimacy Marketplace — privacy-first browser-only beta.
 * No purchase, login, collection, shipping or inventory APIs are called. */
(function () {
  var products = Array.isArray(window.GIM_PRODUCTS) ? window.GIM_PRODUCTS : [];
  var byId = new Map(products.map(function (p) { return [p.id,p]; }));
  var categories = ["All","Wearables","Interactive","Couples","Connected devices","Wellness"];
  var brands = Array.from(new Set(products.map(function (p) {return p.brand;}))).sort();
  var activeCategory = "All", search = "", brand = "all", sort = "featured";
  var toastTimer;

  function el(id) {return document.getElementById(id);}
  function esc(value) {return String(value === null || value === undefined ? "" : value).replace(/[&<>"']/g,function (c) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });}
  function readJson(key, fallback) {try {var raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}}
  function saveJson(key, value) {try {localStorage.setItem(key,JSON.stringify(value));}catch(e){notify("Local storage is unavailable in this browser.");}}
  function cleanIds(value,max) {return Array.isArray(value) ? Array.from(new Set(value.map(Number).filter(function(id){return Number.isInteger(id)&&byId.has(id);}))).slice(0,max||50) : [];}
  var favorites = cleanIds(readJson("gim:favorites",[]),66);
  var selected = cleanIds(readJson("gim:wishlist",[]),24);
  function safeAlias(raw) {return String(raw||"").replace(/[\u0000-\u001f<>]/g,"").trim().slice(0,36);}
  var creatorAlias = safeAlias(readJson("gim:creatorName",""));
  function notify(message) {var node=el("toast");node.textContent=message;node.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(function(){node.classList.remove("show");},3400);}
  function mark(p) {return p.category==="Couples"?"♡":p.category==="Interactive"?"◎":p.category==="Wearables"?"✧":p.category==="Wellness"?"◈":"✦";}
  function visualClass(p) {return p.category==="Couples"?"visual-couples":p.category==="Interactive"?"visual-interactive":p.category==="Wellness"?"visual-wellness":"";}
  function card(p) {
    var saved=favorites.includes(p.id);
    return '<article class="product-card">'+
      '<div class="product-visual '+visualClass(p)+'">'+
      '<span class="tag">'+esc(p.category)+'</span>'+
      '<button type="button" class="fav-button'+(saved?" is-saved":"")+'" data-fav="'+p.id+'" aria-label="'+(saved?"Remove from":"Add to")+' saved items" aria-pressed="'+saved+'">'+(saved?"♥":"♡")+'</button>'+
      '<span class="product-mark" aria-hidden="true">'+mark(p)+'</span></div>'+
      '<div class="product-card-body"><div class="product-brand">'+esc(p.brand)+'</div><h3>'+esc(p.name)+'</h3>'+
      '<p class="product-meta">'+esc(p.researchType)+'</p><div class="product-footer"><span class="product-status">Preview only</span>'+
      '<button type="button" class="outline-small" data-detail="'+p.id+'">View details →</button></div></div></article>';
  }
  function renderChips(){
    el("categoryChips").innerHTML=categories.map(function(c){return '<button type="button" data-category="'+esc(c)+'" aria-pressed="'+(activeCategory===c)+'" class="category-chip'+(activeCategory===c?" active":"")+'">'+esc(c)+'</button>';}).join("");
  }
  function renderCatalog(){
    var q=search.toLocaleLowerCase();
    var list=products.filter(function(p){
      return (activeCategory==="All"||p.category===activeCategory)&&
        (brand==="all"||p.brand===brand)&&
        (!q||(p.name+" "+p.brand+" "+p.category+" "+p.researchType+" "+p.researchFeature).toLocaleLowerCase().includes(q));
    });
    if(sort==="az")list.sort(function(a,b){return a.name.localeCompare(b.name);});
    else if(sort==="brand")list.sort(function(a,b){return a.brand.localeCompare(b.brand)||a.name.localeCompare(b.name);});
    el("resultCount").textContent=list.length;
    el("productGrid").innerHTML=list.map(card).join("");
    el("emptyProducts").hidden=list.length!==0;
    renderChips();
  }
  function renderFavorites(){
    var favProducts=favorites.map(function(id){return byId.get(id);}).filter(Boolean);
    el("favoritesGrid").innerHTML=favProducts.map(card).join("");
    el("favoritesEmpty").hidden=favProducts.length>0;
  }
  function renderPicker(){
    var q=el("wishlistSearch").value.trim().toLocaleLowerCase();
    var filtered=products.filter(function(p){return !q||(p.name+" "+p.brand).toLocaleLowerCase().includes(q);});
    el("wishlistPicker").innerHTML=filtered.map(function(p){
      var added=selected.includes(p.id);
      return '<div class="picker-item"><div><b>'+esc(p.brand+" · "+p.name)+'</b><small>'+esc(p.category)+'</small></div>'+
        '<button type="button" class="'+(added?"added":"")+'" data-wish="'+p.id+'" aria-pressed="'+added+'">'+(added?"✓ Added":"+ Add")+'</button></div>';
    }).join("")||'<p class="muted" style="padding:15px">No matching products found.</p>';
  }
  function renderSelection(){
    var name=safeAlias(el("creatorAlias").value);
    el("previewAlias").textContent=name||"Your creator name";
    el("selectedWishItems").innerHTML=selected.length?selected.map(function(id){
      var p=byId.get(id);return p?'<div class="selected-item"><div><b>'+esc(p.brand+" · "+p.name)+'</b><small>Research candidate</small></div>'+
        '<button type="button" data-remove="'+p.id+'" aria-label="Remove '+esc(p.name)+'">×</button></div>':"";
    }).join(""):'<p class="muted">Add products to see your wishlist preview.</p>';
    el("shareLinkArea").hidden=true;
  }
  function favorite(id) {
    if(!byId.has(id))return;
    favorites=favorites.includes(id)?favorites.filter(function(x){return x!==id;}):favorites.concat(id);
    saveJson("gim:favorites",favorites);renderCatalog();renderFavorites();
    notify(favorites.includes(id)?"Saved to your favorites.":"Removed from favorites.");
  }
  function wishlist(id){
    if(!byId.has(id))return;
    if(!selected.includes(id)&&selected.length>=24){notify("Demo wishlists support up to 24 items.");return;}
    selected=selected.includes(id)?selected.filter(function(x){return x!==id;}):selected.concat(id);
    saveJson("gim:wishlist",selected);renderPicker();renderSelection();
    notify(selected.includes(id)?"Added to wishlist preview.":"Removed from wishlist preview.");
  }
  function details(id){
    var p=byId.get(id);if(!p)return;
    el("modalBody").innerHTML='<div class="modal-visual">'+mark(p)+'</div><div class="modal-content"><span class="product-brand">'+esc(p.brand)+'</span>'+
      '<h2 id="modalName">'+esc(p.name)+'</h2><p>'+esc(p.researchType)+' · '+esc(p.researchFeature)+'</p>'+
      '<p>Explore this product as a potential addition to a future collection. Device connectivity and features must be verified for this exact model before launch.</p>'+
      '<div class="modal-notice"><b>Research candidate — not for sale.</b><br>No current price, stock, supplier authorization or photo license has been confirmed. The image is an abstract placeholder.</div>'+
      '<div class="modal-controls"><button class="button button-ghost" type="button" data-fav="'+p.id+'">'+(favorites.includes(p.id)?"♥ Saved":"♡ Save")+'</button>'+
      '<button class="button button-primary" type="button" data-wish="'+p.id+'">Add to wishlist demo</button></div></div>';
    el("productDialog").showModal();
  }
  function encodeShare(obj){
    var buffer=new TextEncoder().encode(JSON.stringify(obj)), raw="";
    buffer.forEach(function(b){raw+=String.fromCharCode(b);});
    return btoa(raw).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  }
  function decodeShare(token){
    if(!/^[A-Za-z0-9_-]{4,1500}$/.test(token||""))return null;
    try{
      var padded=token.replace(/-/g,"+").replace(/_/g,"/"),raw=atob(padded);
      var bytes=Uint8Array.from(raw,function(c){return c.charCodeAt(0);});
      var obj=JSON.parse(new TextDecoder().decode(bytes));
      if(obj.v!==1||typeof obj.a!=="string"||!Array.isArray(obj.p)||obj.p.length>24)return null;
      var alias=safeAlias(obj.a),ids=cleanIds(obj.p,24);
      if(!alias||!ids.length)return null;
      return {a:alias,p:ids};
    }catch(e){return null;}
  }
  function renderGift(){
    var code=location.hash.slice(6);
    var data=decodeShare(code);
    if(!data){el("giftAlias").textContent="Invalid or expired demo link";el("giftGrid").innerHTML='<p>This is not a valid preview wishlist. Ask the creator for a new link.</p>';return;}
    el("giftAlias").textContent=data.a;
    el("giftGrid").innerHTML=data.p.map(function(id){
      var p=byId.get(id);
      return '<article class="wish-public-item"><div class="tiny-symbol">'+mark(p)+'</div><div><strong>'+esc(p.brand+" · "+p.name)+'</strong>'+
        '<small>Preview · Not available for gifting or purchase yet</small></div></article>';
    }).join("");
  }
  function navigate(){
    var hash=location.hash.slice(1);
    var view=hash.startsWith("gift=")?"gift":hash==="catalog"?"shop":hash.split("?")[0];
    if(!["shop","favorites","creators","gift","early","about"].includes(view))view="shop";
    document.querySelectorAll(".page").forEach(function(p){p.classList.toggle("active",p.id==="view-"+view);});
    document.querySelectorAll("[data-route]").forEach(function(n){var on=n.dataset.route===view;n.classList.toggle("active",on);if(on)n.setAttribute("aria-current","page");else n.removeAttribute("aria-current");});
    if(view==="favorites")renderFavorites();
    if(view==="creators"){renderPicker();renderSelection();}
    if(view==="gift")renderGift();
    if(view==="shop"&&hash==="catalog"){requestAnimationFrame(function(){el("catalog").scrollIntoView({block:"start"});});}
    else window.scrollTo({top:0,behavior:"instant"});
    document.title=(view==="shop"?"Explore":view.charAt(0).toUpperCase()+view.slice(1))+" | Global Intimacy Marketplace";
  }
  function setup(){
    el("year").textContent=new Date().getFullYear();
    el("brandSelect").innerHTML='<option value="all">All brands</option>'+brands.map(function(b){return '<option value="'+esc(b)+'">'+esc(b)+'</option>';}).join("");
    renderCatalog();renderFavorites();
    el("searchInput").addEventListener("input",function(e){search=e.target.value.trim();renderCatalog();});
    el("brandSelect").addEventListener("change",function(e){brand=e.target.value;renderCatalog();});
    el("sortSelect").addEventListener("change",function(e){sort=e.target.value;renderCatalog();});
    el("categoryChips").addEventListener("click",function(e){var b=e.target.closest("[data-category]");if(b){activeCategory=b.dataset.category;renderCatalog();}});
    el("clearFilters").addEventListener("click",function(){activeCategory="All";brand="all";search="";sort="featured";el("brandSelect").value="all";el("sortSelect").value="featured";el("searchInput").value="";renderCatalog();});
    el("openSearchBtn").addEventListener("click",function(){location.hash="catalog";setTimeout(function(){el("searchInput").focus();},50);});
    document.addEventListener("click",function(e){
      var fav=e.target.closest("[data-fav]"),wish=e.target.closest("[data-wish]"),detail=e.target.closest("[data-detail]"),remove=e.target.closest("[data-remove]");
      if(fav){favorite(Number(fav.dataset.fav));if(el("productDialog").open)details(Number(fav.dataset.fav));}
      else if(wish){wishlist(Number(wish.dataset.wish));if(el("productDialog").open){el("productDialog").close();location.hash="creators";}}
      else if(detail)details(Number(detail.dataset.detail));
      else if(remove)wishlist(Number(remove.dataset.remove));
    });
    el("closeModal").addEventListener("click",function(){el("productDialog").close();});
    el("productDialog").addEventListener("click",function(e){if(e.target===el("productDialog"))el("productDialog").close();});
    el("creatorAlias").value=creatorAlias;
    el("creatorAlias").addEventListener("input",function(e){creatorAlias=safeAlias(e.target.value);saveJson("gim:creatorName",creatorAlias);renderSelection();});
    el("wishlistSearch").addEventListener("input",renderPicker);
    // Wishlist clicks are handled by the document-level delegated handler above.
    // A second picker-level listener would toggle a product on and immediately off.
    el("createShareLink").addEventListener("click",function(){
      var alias=safeAlias(el("creatorAlias").value);
      if(alias.length<2){notify("Enter a public creator name (at least 2 characters).");el("creatorAlias").focus();return;}
      if(!selected.length){notify("Select at least one product for your demo wishlist.");return;}
      var url=new URL(location.href);url.hash="gift="+encodeShare({v:1,a:alias,p:selected});
      el("shareUrl").value=url.toString();el("shareLinkArea").hidden=false;notify("Demo shareable link created. No personal address included.");
    });
    el("copyShare").addEventListener("click",async function(){
      var input=el("shareUrl");
      try{await navigator.clipboard.writeText(input.value);notify("Demo link copied.");}catch(e){input.select();notify("Select and copy the link from the field.");}
    });
    function survey(formId,key,ids){
      el(formId).addEventListener("submit",function(e){
        e.preventDefault();
        var answers=ids.map(function(id){return el(id).value;});
        if(answers.some(function(a){return !a;})){notify("Please answer each question.");return;}
        saveJson("gim:survey:"+key,{answers:answers,updatedAt:new Date().toISOString(),demo:true});
        notify("Saved on this device only — this is not a submission or registration.");
        e.target.reset();
      });
    }
    survey("creatorSurvey","creator",["creatorPlatform","creatorInterest","creatorPriority"]);
    survey("buyerSurvey","buyer",["buyerInterest","buyerPriority"]);
    window.addEventListener("hashchange",navigate);
    navigate();
    if(sessionStorage.getItem("gim:adult")==="yes"){el("ageGate").hidden=true;}
    else{el("ageGate").hidden=false;el("ageYes").focus();}
    el("ageYes").addEventListener("click",function(){sessionStorage.setItem("gim:adult","yes");el("ageGate").hidden=true;});
    el("ageNo").addEventListener("click",function(){location.replace("https://www.google.com/");});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup);
  else setup();
}());
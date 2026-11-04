"use strict";
/* Global Intimacy Marketplace — privacy-first browser-only beta.
 * No purchase, login, collection, shipping or inventory APIs are called. */
(function () {
  var products = Array.isArray(window.GIM_PRODUCTS) ? window.GIM_PRODUCTS : [];
  var byId = new Map(products.map(function (p) { return [p.id,p]; }));
  var categories = ["All","ONE HEART Hoodies","ONE HEART Art Tees","SARCASTABASTARD Tees","Lingerie","Essentials","Massage & Care","Games & Gifts","AI Companions","Life-Size Dolls","Doll Care & Parts","Wearables","Interactive","Couples","Connected devices","Wellness"];
  var collections = ["All","Everyday","Premium","ULTRA","ONE HEART","SARCASTABASTARD"];
  var brands = Array.from(new Set(products.map(function (p) {return p.brand;}))).sort();
  var activeCategory = "All", activeCollection = "All", search = "", brand = "all", sort = "featured";
  var toastTimer;
  var communityGroup="all";
  var communityGroups={all:null,connection:["Couples","Wearables","Connected devices","Interactive"],care:["Wellness","Essentials","Massage & Care"],style:["Lingerie","Games & Gifts","ONE HEART Hoodies","ONE HEART Art Tees","SARCASTABASTARD Tees"]};

  function el(id) {return document.getElementById(id);}
  function esc(value) {return String(value === null || value === undefined ? "" : value).replace(/[&<>"']/g,function (c) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });}
  function readJson(key, fallback) {try {var raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}}
  function saveJson(key, value) {try {localStorage.setItem(key,JSON.stringify(value));}catch(e){notify("Local storage is unavailable in this browser.");}}
  function cleanIds(value,max) {return Array.isArray(value) ? Array.from(new Set(value.map(Number).filter(function(id){return Number.isInteger(id)&&byId.has(id);}))).slice(0,max||50) : [];}
  var favorites = cleanIds(readJson("gim:favorites",[]),100);
  var selected = cleanIds(readJson("gim:wishlist",[]),24);
  function safeAlias(raw) {return String(raw||"").replace(/[\u0000-\u001f<>]/g,"").trim().slice(0,36);}
  var creatorAlias = safeAlias(readJson("gim:creatorName",""));
  function notify(message) {var node=el("toast");node.textContent=message;node.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(function(){node.classList.remove("show");},3400);}
  function enquiryUrl(p) {
    var subject="Pre-order enquiry — "+p.brand+" · "+p.name;
    var body="Hello Global Intimacy Marketplace,\n\nI would like information about the potential pre-order of: "+p.brand+" · "+p.name+" (preview ID "+p.id+").\n\nPlease contact me when legal availability, manufacturer approval, pricing, production, shipping and delivery information are confirmed. I understand this email is an enquiry only: I am NOT placing a paid, binding, reserved or guaranteed order, and no delivery date has been promised.\n\nCountry / region: \nQuantity of interest (optional): \n\nThank you.";
    return "mailto:globalintimacypartner@gmail.com?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);
  }
  function mark(p) {return p.category==="AI Companions"?"◇":p.category==="Life-Size Dolls"?"✧":p.category==="Doll Care & Parts"?"✳":p.category==="Couples"?"♡":p.category==="Interactive"?"◎":p.category==="Wearables"?"✧":p.category==="Wellness"?"◈":"✦";}
  function visualClass(p) {return p.category==="AI Companions"?"visual-ai":p.category==="Life-Size Dolls"?"visual-dolls":p.category==="Doll Care & Parts"?"visual-care":p.category==="Couples"?"visual-couples":p.category==="Interactive"?"visual-interactive":p.category==="Wellness"?"visual-wellness":"";}
  function destinationVisible(p) { return !!window.GIMDestination && window.GIMDestination.include(p); }
  function deliveryLabel(p) { return window.GIMDestination ? window.GIMDestination.label(p) : "Choose a country to check delivery"; }
  function updateDestination() {
    var d = window.GIMDestination;
    var count = products.filter(function(p){return destinationVisible(p);}).length;
    el("countryEmpty").hidden = !d || d.previews() || count > 0;
    el("countryEmptyText").textContent = d ? "We have not confirmed products for delivery to " + d.name() + ". Choose another country above, or explore clearly marked research previews." : "Choose your country first.";
    document.querySelectorAll("[data-research-content]").forEach(function(n){n.hidden = !d || !d.previews();});
    renderCatalog();renderFavorites();renderCommunity();renderPicker();renderSelection();
    if(location.hash.startsWith("#gift="))renderGift();
    if(el("productDialog").open)el("productDialog").close();
  }
  function card(p) {
    var saved=favorites.includes(p.id);
    return '<article class="product-card">'+
      '<div class="product-visual '+(p.previewImage?"visual-oneheart ":"")+visualClass(p)+'">'+
      '<span class="tag">'+esc(p.category)+'</span>'+
      '<button type="button" class="fav-button'+(saved?" is-saved":"")+'" data-fav="'+p.id+'" aria-label="'+(saved?"Remove from":"Add to")+' saved items" aria-pressed="'+saved+'">'+(saved?"♥":"♡")+'</button>'+
      '<span class="product-mark" aria-hidden="true">'+(p.previewImage?'<img class="product-preview-image" src="'+esc(p.previewImage)+'" alt="'+esc(p.previewImageAlt)+'" loading="lazy" decoding="async" width="307" height="438">' : mark(p))+'</span></div>'+
      '<div class="product-card-body"><div class="product-brand">'+esc(p.brand)+'</div><h3>'+esc(p.name)+'</h3>'+
      '<p class="delivery-label">'+esc(deliveryLabel(p))+'</p><p class="product-meta">'+esc(p.researchType)+' · '+esc(p.collection)+' collection</p><div class="product-footer"><span class="product-status">Preview only</span>'+
      '<button type="button" class="outline-small" data-detail="'+p.id+'">View details →</button></div>'+
      '<a class="preorder-link" href="'+esc(enquiryUrl(p))+'" aria-label="Email a nonbinding pre-order enquiry for '+esc(p.name)+'">Ask about pre-order ↗</a></div></article>';
  }
  function renderCollections(){
    el("collectionFilters").querySelectorAll("[data-collection]").forEach(function(btn){
      var on=btn.dataset.collection===activeCollection;
      btn.classList.toggle("active",on);
      btn.setAttribute("aria-pressed",String(on));
    });
  }
  function renderChips(){
    el("categoryChips").innerHTML=categories.map(function(c){return '<button type="button" data-category="'+esc(c)+'" aria-pressed="'+(activeCategory===c)+'" class="category-chip'+(activeCategory===c?" active":"")+'">'+esc(c)+'</button>';}).join("");
  }
  function normalizeSearch(value){
    return String(value||"").normalize("NFKD").replace(/\p{M}/gu,"").toLowerCase()
      .replace(/\bone[\s_-]*heart\b/g,"one heart").replace(/[^\p{L}\p{N}]+/gu," ").trim();
  }
  function matchesSearch(p,query){
    var q=normalizeSearch(query);
    if(!q)return true;
    var text=normalizeSearch([p.name,p.brand,p.category,p.collection,"collection",p.collectionGroup,p.researchType,p.researchFeature,p.colorway].filter(Boolean).join(" "));
    return q.split(" ").every(function(word){return text.includes(word);});
  }
  function selectCollection(collection){
    activeCollection=collections.includes(collection)?collection:"All";
    activeCategory="All";brand="all";search="";sort="featured";
    el("brandSelect").value="all";el("searchInput").value="";el("sortSelect").value="featured";
    renderCatalog();
  }
  function renderCatalog(){
    var list=products.filter(function(p){
      return destinationVisible(p) && (activeCollection==="All"||p.collection===activeCollection)&&
        (activeCategory==="All"||p.category===activeCategory)&&
        (brand==="all"||p.brand===brand)&&
        matchesSearch(p,search);
    });
    if(sort==="featured")list.sort(function(a,b){return Number(!!b.previewImage)-Number(!!a.previewImage)||a.id-b.id;});
    else if(sort==="az")list.sort(function(a,b){return a.name.localeCompare(b.name);});
    else if(sort==="brand")list.sort(function(a,b){return a.brand.localeCompare(b.brand)||a.name.localeCompare(b.name);});
    var sectionMatch=/(^| )(gay|lesbian|lgbt|lgbtq|queer)( |$)/.test(normalizeSearch(search));
    el("communitySearchResult").hidden=!sectionMatch;
    el("resultCount").textContent=list.length+(sectionMatch?1:0);
    el("productGrid").innerHTML=list.map(card).join("");
    el("emptyProducts").hidden=!el("countryEmpty").hidden||list.length!==0||sectionMatch;
    el("categorySelect").value=activeCategory;
    var filters=[];
    if(activeCollection!=="All")filters.push(activeCollection);
    if(activeCategory!=="All")filters.push(activeCategory);
    if(brand!=="all")filters.push(brand);
    if(search)filters.push('Search: "'+search+'"');
    el("activeFilterText").textContent=filters.join(" · ");
    el("activeFilterSummary").hidden=filters.length===0;
    renderChips();renderCollections();
  }
  function runGlobalSearch(){
    activeCollection="All";activeCategory="All";brand="all";search=el("searchInput").value.trim();
    el("brandSelect").value="all";renderCatalog();location.hash="results";
  }
  function browseCategory(category){
    selectCollection("All");
    activeCategory=categories.includes(category)?category:"All";
    el("shopMenu").open=false;renderCatalog();
  }
  function renderCommunity(){
    var allowed=communityGroups[communityGroup], query=el("communitySearch").value;
    var list=products.filter(function(p){return destinationVisible(p) && (!allowed||allowed.includes(p.category))&&matchesSearch(p,query);});
    list.sort(function(a,b){return Number(!!b.previewImage)-Number(!!a.previewImage)||a.id-b.id;});
    el("communityResultCount").textContent=list.length;
    el("communityGrid").innerHTML=list.map(card).join("");
    el("communityEmpty").hidden=list.length>0;
    el("communityFilters").querySelectorAll("[data-community-group]").forEach(function(btn){
      var on=btn.dataset.communityGroup===communityGroup;btn.classList.toggle("active",on);btn.setAttribute("aria-pressed",String(on));
    });
  }
  function renderFavorites(){
    var favProducts=favorites.map(function(id){return byId.get(id);}).filter(function(p){return p && destinationVisible(p);});
    el("favoritesGrid").innerHTML=favProducts.map(card).join("");
    el("favoritesEmpty").hidden=favProducts.length>0;
  }
  function renderPicker(){
    var query=el("wishlistSearch").value;
    var filtered=products.filter(function(p){return destinationVisible(p) && matchesSearch(p,query);});
    el("wishlistPicker").innerHTML=filtered.map(function(p){
      var added=selected.includes(p.id);
      return '<div class="picker-item"><div><b>'+esc(p.brand+" · "+p.name)+'</b><small>'+esc(p.category)+' · '+esc(deliveryLabel(p))+'</small></div>'+
        '<button type="button" class="'+(added?"added":"")+'" data-wish="'+p.id+'" aria-pressed="'+added+'">'+(added?"✓ Added":"+ Add")+'</button></div>';
    }).join("")||'<p class="muted" style="padding:15px">No matching products found.</p>';
  }
  function renderSelection(){
    var name=safeAlias(el("creatorAlias").value);
    el("previewAlias").textContent=name||"Your creator name";
    el("selectedWishItems").innerHTML=selected.length?selected.map(function(id){
      var p=byId.get(id);return p?'<div class="selected-item"><div><b>'+esc(p.brand+" · "+p.name)+'</b><small>'+esc(deliveryLabel(p))+'</small></div>'+
        '<button type="button" data-remove="'+p.id+'" aria-label="Remove '+esc(p.name)+'">×</button></div>':"";
    }).join(""):'<p class="muted">Add products to see your wishlist preview.</p>';
    el("shareLinkArea").hidden=true;
  }
  function favorite(id) {
    if(!byId.has(id))return;
    favorites=favorites.includes(id)?favorites.filter(function(x){return x!==id;}):favorites.concat(id);
    saveJson("gim:favorites",favorites);renderCatalog();renderFavorites();renderCommunity();
    notify(favorites.includes(id)?"Saved to your favorites.":"Removed from favorites.");
  }
  function wishlist(id){
    if(!byId.has(id))return;
    if(!selected.includes(id)&&selected.length>=24){notify("Demo wishlists support up to 24 items.");return;}
    selected=selected.includes(id)?selected.filter(function(x){return x!==id;}):selected.concat(id);
    saveJson("gim:wishlist",selected);renderPicker();renderSelection();
    notify(selected.includes(id)?"Added to wishlist preview.":"Removed from wishlist preview.");
  }
  function detailVisual(p,view){
    var box=view.box, frame="detail-frame-"+p.id+"-"+box.join("-");
    return '<svg viewBox="'+box.join(" ")+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="'+esc(p.name+" — "+view.label+". Concept artwork, not manufactured stock.")+'"><defs><clipPath id="'+frame+'"><rect x="'+box[0]+'" y="'+box[1]+'" width="'+box[2]+'" height="'+box[3]+'" /></clipPath></defs><image clip-path="url(#'+frame+')" href="'+esc(p.detailImage)+'" width="'+p.detailImageWidth+'" height="'+p.detailImageHeight+'" /></svg>';
  }
  function detailGallery(p){
    if(!p.detailImage||!p.detailViews||!p.detailViews.length)return '<div class="modal-visual'+(p.previewImage?" with-preview":"")+'">'+(p.previewImage?'<img src="'+esc(p.previewImage)+'" alt="'+esc(p.previewImageAlt)+'">':mark(p))+'</div>';
    return '<figure class="detail-gallery"><div class="modal-visual with-preview">'+detailVisual(p,p.detailViews[0])+'</div><figcaption><b>'+esc(p.detailViews[0].label)+'</b><a class="detail-enlarge" href="'+esc(p.detailImage)+'" target="_blank" rel="noopener">Open full-size design board ↗</a><span>Full source dimensions. Zoom in the new tab to inspect the artwork. These are concept views, not finished stock.</span></figcaption>'+(p.detailViews.length>1?'<details class="detail-extra"><summary>See more views and artwork details</summary><div class="detail-extra-grid">'+p.detailViews.slice(1).map(function(view){return '<figure>'+detailVisual(p,view)+'<figcaption>'+esc(view.label)+'</figcaption></figure>';}).join("")+'</div></details>':'')+'</figure>';
  }
  function details(id){
    var p=byId.get(id);if(!p)return;if(!destinationVisible(p)){notify(deliveryLabel(p));return;}
    el("modalBody").innerHTML=detailGallery(p)+'<div class="modal-content"><span class="product-brand">'+esc(p.brand)+'</span>'+
      '<h2 id="modalName">'+esc(p.name)+'</h2><p class="delivery-label">'+esc(deliveryLabel(p))+'</p><p>'+esc(p.researchType)+' · '+esc(p.researchFeature)+'</p>'+
      '<p>'+(p.conceptImage?"This is an owner-selected clothing concept, not a manufactured product. Final fabric, sizing, colour accuracy and print quality require factory sampling.":"Explore this potential future product. Model-specific features, materials, territories and available stock must be verified before any sale.")+'</p>'+
      '<div class="modal-notice"><b>Pre-order enquiry only — not a binding order.</b><br>No payment or reservation will be taken. Prices, stock, production and delivery are unconfirmed. '+(p.conceptImage?"Image is an AI lookbook mockup, not a production-ready print file.":"Manufacturer resale and product-photo rights remain under review; abstract placeholder shown.")+'</div>'+
      '<div class="modal-controls"><button class="button button-ghost" type="button" data-fav="'+p.id+'">'+(favorites.includes(p.id)?"♥ Saved":"♡ Save")+'</button>'+
      '<button class="button button-ghost" type="button" data-wish="'+p.id+'">Add to wishlist demo</button>'+
      '<a class="button button-primary" href="'+esc(enquiryUrl(p))+'">Ask about pre-order</a></div></div>';
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
        '<small>'+esc(deliveryLabel(p))+' · Gifting and purchase disabled</small></div></article>';
    }).join("");
  }
  function navigate(){
    var hash=location.hash.slice(1);
    var view=hash.startsWith("gift=")?"gift":(hash==="catalog"||hash==="one-heart"||hash==="sarcastabastard"||hash==="results")?"shop":hash.split("?")[0];
    if(hash==="one-heart")selectCollection("ONE HEART");
    if(hash==="sarcastabastard")selectCollection("SARCASTABASTARD");
    if(!["shop","favorites","creators","gift","early","about","gay-lesbian"].includes(view))view="shop";
    document.querySelectorAll(".page").forEach(function(p){p.classList.toggle("active",p.id==="view-"+view);});
    document.querySelectorAll("[data-route]").forEach(function(n){var on=n.dataset.route===view;n.classList.toggle("active",on);if(on)n.setAttribute("aria-current","page");else n.removeAttribute("aria-current");});
    if(view==="favorites")renderFavorites();
    if(view==="creators"){renderPicker();renderSelection();}
    if(view==="gift")renderGift();
    if(view==="gay-lesbian")renderCommunity();
    if(view==="shop"&&(hash==="catalog"||hash==="one-heart"||hash==="sarcastabastard"||hash==="results")){requestAnimationFrame(function(){el(hash==="results"?"catalogResults":"catalog").scrollIntoView({block:"start"});});}
    else window.scrollTo({top:0,behavior:"instant"});
    document.title=(view==="shop"?"Explore":view==="gay-lesbian"?"Gay & Lesbian":view.charAt(0).toUpperCase()+view.slice(1))+" | Global Intimacy Marketplace";
  }
  function setup(){
    el("year").textContent=new Date().getFullYear();
    el("brandSelect").innerHTML='<option value="all">All brands</option>'+brands.map(function(b){return '<option value="'+esc(b)+'">'+esc(b)+'</option>';}).join("");
    el("categorySelect").innerHTML=categories.map(function(c){return '<option value="'+esc(c)+'">'+esc(c==="All"?"All categories":c)+'</option>';}).join("");
    el("shopCategoryLinks").innerHTML=categories.map(function(c){return '<a href="#catalog" data-browse-category="'+esc(c)+'">'+esc(c==="All"?"All products":c)+'</a>';}).join("");
    updateDestination();
    window.addEventListener("gim:destinationchange",updateDestination);
    el("searchInput").addEventListener("input",runGlobalSearch);
    el("storeSearchForm").addEventListener("submit",function(e){e.preventDefault();runGlobalSearch();});
    el("categorySelect").addEventListener("change",function(e){activeCategory=e.target.value;renderCatalog();});
    el("clearActiveFilters").addEventListener("click",function(){selectCollection("All");});
    el("brandSelect").addEventListener("change",function(e){brand=e.target.value;renderCatalog();});
    el("sortSelect").addEventListener("change",function(e){sort=e.target.value;renderCatalog();});
    el("categoryChips").addEventListener("click",function(e){var b=e.target.closest("[data-category]");if(b){activeCategory=b.dataset.category;renderCatalog();}});
    document.querySelectorAll("[data-oneheart]").forEach(function(link){link.addEventListener("click",function(){selectCollection("ONE HEART");});});
    document.querySelectorAll('[data-all-products], [data-route="shop"]').forEach(function(link){link.addEventListener("click",function(){selectCollection("All");});});
    el("collectionFilters").addEventListener("click",function(e){
      var b=e.target.closest("[data-collection]");
      if(b){selectCollection(b.dataset.collection);}
    });
    el("clearFilters").addEventListener("click",function(){selectCollection("All");});
    el("openSearchBtn").addEventListener("click",function(){el("searchInput").focus();});
    document.addEventListener("click",function(e){
      var fav=e.target.closest("[data-fav]"),wish=e.target.closest("[data-wish]"),detail=e.target.closest("[data-detail]"),remove=e.target.closest("[data-remove]"),browse=e.target.closest("[data-browse-category]");
      if(fav){favorite(Number(fav.dataset.fav));if(el("productDialog").open)details(Number(fav.dataset.fav));}
      else if(wish){wishlist(Number(wish.dataset.wish));if(el("productDialog").open){el("productDialog").close();location.hash="creators";}}
      else if(detail)details(Number(detail.dataset.detail));
      else if(remove)wishlist(Number(remove.dataset.remove));
      else if(browse)browseCategory(browse.dataset.browseCategory);
    });
    el("closeModal").addEventListener("click",function(){el("productDialog").close();});
    el("productDialog").addEventListener("click",function(e){if(e.target===el("productDialog"))el("productDialog").close();});
    el("creatorAlias").value=creatorAlias;
    el("creatorAlias").addEventListener("input",function(e){creatorAlias=safeAlias(e.target.value);saveJson("gim:creatorName",creatorAlias);renderSelection();});
    el("communitySearch").addEventListener("input",renderCommunity);
    el("communityFilters").addEventListener("click",function(e){
      var b=e.target.closest("[data-community-group]");
      if(b&&Object.prototype.hasOwnProperty.call(communityGroups,b.dataset.communityGroup)){
        communityGroup=b.dataset.communityGroup;el("communitySearch").value="";renderCommunity();
      }
    });
    el("clearCommunityFilters").addEventListener("click",function(){communityGroup="all";el("communitySearch").value="";renderCommunity();});
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
    var adult=false;
    try{adult=sessionStorage.getItem("gim:adult")==="yes";}catch(e){}
    el("ageGate").hidden=adult;el("storeShell").inert=!adult;el("countryEntrance").inert=!adult;
    if(!adult)el("ageYes").focus();
    el("ageYes").addEventListener("click",function(){
      try{sessionStorage.setItem("gim:adult","yes");}catch(e){}
      el("ageGate").hidden=true;el("storeShell").inert=false;el("countryEntrance").inert=false;
      if(window.GIMDestination.country())el("main").focus();else el("countryHeading").focus();
    });
    el("ageNo").addEventListener("click",function(){location.replace("https://www.google.com/");});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup);
  else setup();
}());



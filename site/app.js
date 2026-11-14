"use strict";
/* Global Intimacy Marketplace — privacy-first browser-only beta.
 * No purchase, login, collection, shipping or inventory APIs are called. */
(function () {
  var products = Array.isArray(window.GIM_PRODUCTS) ? window.GIM_PRODUCTS : [];
  var byId = new Map(products.map(function (p) { return [p.id,p]; }));
  var categories = ["All","ONE HEART Hoodies","ONE HEART Art Tees","SARCASTABASTARD Tees","Lingerie","Essentials","Massage & Care","Games & Gifts","AI Companions","Life-Size Dolls","Doll Care & Parts","Wearables","Interactive","Couples","Connected devices","Wellness","Kink & Accessories"];
  var collections = ["All","Everyday","Premium","ULTRA","ONE HEART","SARCASTABASTARD"];
  var brands = Array.from(new Set(products.map(function (p) {return p.brand;}))).sort();
  var activeCategory = "All", activeCollection = "All", search = "", brand = "all", sort = "featured";
  var toastTimer;
  var unconventionalGroup="all", interestCategory="all";
  var interestLabels={all:"All interests",community:"Gay & Lesbian connections",connection:"Couples & connection",companions:"Companions & dolls",kink:"Kink & BDSM",style:"Fashion & self-expression",roleplay:"Role-play & fantasy",sensory:"Sensory & wellness",technology:"Connected technology"};
  // Editorial interests reuse existing candidates; they do not approve products
  // or assign an identity to a shopper.
  var unconventionalGroups={
    all:null,
    community:null,
    connection:["Couples","Games & Gifts","Wearables","Connected devices","Interactive"],
    companions:["AI Companions","Life-Size Dolls","Doll Care & Parts"],
    kink:["Kink & Accessories"],
    style:["ONE HEART Hoodies","ONE HEART Art Tees","SARCASTABASTARD Tees","Lingerie"],
    roleplay:["Lingerie","Games & Gifts","Life-Size Dolls"],
    sensory:["Wellness","Essentials","Massage & Care","Wearables","Connected devices"],
    technology:["Interactive","Connected devices","Wearables","AI Companions"]
  };

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
    el("countryEmptyText").textContent = d ? "No products are confirmed for delivery to " + d.name() + " yet. The catalogue contains " + products.length + " research and design previews that you can explore using the button below. These are not available to purchase." : "Choose your country first.";
    document.querySelectorAll("[data-research-content]").forEach(function(n){n.hidden = !d || !d.previews();});
    renderCatalog();renderFavorites();renderUnconventional();renderPicker();renderSelection();
    if(location.hash.startsWith("#gift="))renderGift();
    if(el("productDialog").open)el("productDialog").close();
  }
  function drawingLabel(p) {
    return p.drawingKind === "range" ? "Range drawing · model not selected" : p.drawingKind === "packaging" ? "Packaging drawing · design unverified" : p.drawingKind === "garment" ? "Garment drawing · sample pending" : "Product drawing · appearance may vary";
  }
  function card(p) {
    var saved=favorites.includes(p.id);
    return '<article class="product-card">'+
      '<div class="product-visual '+(p.previewImage?"visual-oneheart ":"")+(p.temporaryIllustration?"visual-drawing ":"")+visualClass(p)+'">'+
      '<span class="tag">'+esc(p.category)+'</span>'+
      '<button type="button" class="fav-button'+(saved?" is-saved":"")+'" data-fav="'+p.id+'" aria-label="'+(saved?"Remove from":"Add to")+' saved items" aria-pressed="'+saved+'">'+(saved?"♥":"♡")+'</button>'+
      '<span class="product-mark">'+(p.previewImage?'<img class="product-preview-image" src="'+esc(p.previewImage)+'" alt="'+esc(p.previewImageAlt)+'" loading="lazy" decoding="async" width="307" height="438">' : mark(p))+'</span></div>'+
      '<div class="product-card-body">'+(p.temporaryIllustration?'<p class="drawing-label">'+esc(drawingLabel(p))+'</p>':'')+'<div class="product-brand">'+esc(p.brand)+'</div><h3>'+esc(p.name)+'</h3>'+
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
      .replace(/\bone[\s_-]*heart\b/g,"one heart").replace(/[^\p{L}\p{N}]+/gu," ").trim()
      .replace(/\b(t shirts?|tee shirts?|tshirts?|tees?)\b/g,"t shirt").replace(/\bhoodies\b/g,"hoodie").replace(/\bvibrators\b/g,"vibrator").replace(/\bmassagers\b/g,"massager").replace(/\bcolours?\b/g,"color");
  }
  function matchesSearch(p,query){
    var q=normalizeSearch(query);
    if(!q)return true;
    var text=normalizeSearch([p.name,p.brand,p.category,p.collection,"collection",p.collectionGroup,p.researchType,p.researchFeature,p.colorway,p.designId,p.sku,p.id].filter(Boolean).join(" "));
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
    var communityMatch=/(^| )(gay|lesbian|lgbt|lgbtq|queer)( |$)/.test(normalizeSearch(search));
    var interestMatch=communityMatch||/(^| )(freaks?|geeks?|weirdos?|deviants?|unconventional|bdsm|kinks?|fetish|fetishes|sensory|roleplay)( |$)/.test(normalizeSearch(search))||/(^| )(explore your interests|alternative fashion|role play)( |$)/.test(normalizeSearch(search));
    el("unconventionalSearchResult").hidden=!interestMatch;
    el("unconventionalSearchResult").setAttribute("href",communityMatch?"#explore-interests?group=community":"#explore-interests");
    el("resultCount").textContent=list.length+(interestMatch?1:0);
    el("catalogMatchCount").textContent=list.length+" product previews"+(interestMatch?" · 1 interest section":"");
    el("catalogResultsTitle").textContent=search?'Search: “'+search+'”':activeCategory!=="All"?activeCategory:activeCollection!=="All"?activeCollection:"All products";
    el("productGrid").innerHTML=list.map(card).join("");
    el("emptyProducts").hidden=!el("countryEmpty").hidden||list.length!==0||interestMatch;
    el("categorySelect").value=activeCategory;
    var filters=[];
    if(activeCollection!=="All")filters.push(activeCollection);
    if(activeCategory!=="All")filters.push(activeCategory);
    if(brand!=="all")filters.push(brand);
    if(search)filters.push('Search: "'+search+'"');
    el("activeFilterText").textContent=filters.join(" · ");
    el("activeFilterSummary").hidden=filters.length===0;
    var chips=[];
    function filterChip(key,label){chips.push('<button type="button" class="filter-chip" data-remove-filter="'+key+'" aria-label="Remove '+esc(label)+' filter">'+esc(label)+' <span aria-hidden="true">×</span></button>');}
    if(activeCollection!=="All")filterChip("collection",activeCollection);
    if(activeCategory!=="All")filterChip("category",activeCategory);
    if(brand!=="all")filterChip("brand",brand);
    if(search)filterChip("search",'Search: '+search);
    el("activeFilterChips").innerHTML=chips.join("");
    renderChips();renderCollections();
  }
  function runGlobalSearch(){
    activeCollection="All";activeCategory="All";brand="all";search=el("searchInput").value.trim();
    el("brandSelect").value="all";renderCatalog();location.hash="results";
  }
  function browseCategory(category){
    selectCollection("All");
    activeCategory=categories.includes(category)?category:"All";
    el("shopMenu").open=false;renderCatalog();location.hash="#results";navigate();
  }
  function showInterestResults(){
    requestAnimationFrame(function(){el("interestResults").scrollIntoView({block:"start"});el("interestResultsTitle").focus({preventScroll:true});});
  }
  function renderUnconventional(){
    var allowed=unconventionalGroups[unconventionalGroup],query=el("unconventionalSearch").value;
    var inGroup=function(p){return !allowed||allowed.includes(p.category);};
    var subcategories=categories.filter(function(c){return c!=="All"&&products.some(function(p){return p.category===c&&inGroup(p);});});
    if(!subcategories.includes(interestCategory))interestCategory="all";
    el("interestCategory").innerHTML='<option value="all">All categories in this interest</option>'+subcategories.map(function(c){return '<option value="'+esc(c)+'">'+esc(c)+'</option>';}).join("");
    el("interestCategory").value=interestCategory;
    el("interestResultsTitle").textContent=interestCategory==="all"?interestLabels[unconventionalGroup]:interestCategory;
    el("interestCategory").disabled=subcategories.length===0;
    el("interestCommunityWelcome").hidden=unconventionalGroup!=="community";
    var list=products.filter(function(p){return destinationVisible(p)&&inGroup(p)&&(interestCategory==="all"||p.category===interestCategory)&&matchesSearch(p,query);});
    list.sort(function(a,b){return Number(!!b.previewImage)-Number(!!a.previewImage)||a.id-b.id;});
    el("unconventionalResultCount").textContent=list.length;
    el("unconventionalGrid").innerHTML=list.map(card).join("");
    el("unconventionalEmpty").hidden=list.length>0;
    var country=window.GIMDestination?window.GIMDestination.name():"your selected country";
    var researching=!!window.GIMDestination&&window.GIMDestination.previews();
    el("unconventionalAvailability").textContent=researching?"Research-preview mode · delivery to "+country+" is checked for each item. Unconfirmed entries stay clearly labelled.":"Shopping country: "+country+" · only delivery-confirmed entries can appear. Research previews are optional.";
    var title=researching?"No matching discoveries yet.":"No confirmed matches for "+country+" yet.";
    var text=researching?"Try another interest or a different keyword.":"Choose another interest, or use Explore unconfirmed research previews above to browse clearly marked ideas. Selecting a country does not confirm delivery.";
    el("unconventionalEmptyTitle").textContent=title;
    el("unconventionalEmptyText").textContent=text;
    el("unconventionalFilters").querySelectorAll("[data-unconventional-group]").forEach(function(btn){
      var on=btn.dataset.unconventionalGroup===unconventionalGroup;
      btn.classList.toggle("active",on);btn.setAttribute("aria-pressed",String(on));
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
    saveJson("gim:favorites",favorites);renderCatalog();renderFavorites();renderUnconventional();
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
    var hoodie=p.category==="ONE HEART Hoodies";
    var main=hoodie?'<div class="hoodie-detail-pair">'+p.detailViews.slice(0,2).map(function(view){return '<figure><div class="hoodie-view">'+detailVisual(p,view)+'</div><figcaption>'+esc(view.label)+'</figcaption></figure>';}).join("")+'</div>':'<div class="modal-visual with-preview">'+detailVisual(p,p.detailViews[0])+'</div>';
    var extra=hoodie?p.detailViews.slice(2):p.detailViews.slice(1);
    return '<figure class="detail-gallery'+(hoodie?' hoodie-gallery':'')+'">'+main+'<figcaption><b>'+(hoodie?'Complete front and back':esc(p.detailViews[0].label))+'</b><a class="detail-enlarge" href="'+esc(p.detailImage)+'" target="_blank" rel="noopener">Open full-size design board ↗</a><span>'+(p.currentArtProof?'Current approved artwork shown in a placement illustration. Final garment and print dimensions require a sample.':'Full source dimensions. Zoom in the new tab to inspect the artwork. These are concept views, not finished stock.')+'</span></figcaption>'+(extra.length?'<details class="detail-extra"><summary>See more views and artwork details</summary><div class="detail-extra-grid">'+extra.map(function(view){return '<figure>'+detailVisual(p,view)+'<figcaption>'+esc(view.label)+'</figcaption></figure>';}).join("")+'</div></details>':'')+'</figure>';
  }
  function productFacts(p){
    if(!p.conceptImage)return '<details class="product-information"><summary>Materials, care &amp; product guidance</summary><p>Model-specific materials, instructions and care information are awaiting supplier verification. This research listing is not a confirmed specification.</p></details>';
    return '<dl class="product-facts"><div><dt>Design code</dt><dd>'+esc(p.designId||"Not assigned")+'</dd></div><div><dt>Garment concept</dt><dd>'+esc(p.researchType)+'</dd></div><div><dt>Design colourway</dt><dd>'+esc(p.colorway||"Not specified")+'</dd></div></dl><details class="product-information"><summary>Size, fabric &amp; care</summary><p>Final size ranges, garment measurements, fabric composition and care instructions will be published after the production sample and supplier specifications are confirmed. The artwork does not establish fit or material.</p></details>';
  }
  function details(id){
    var p=byId.get(id);if(!p)return;if(!destinationVisible(p)){notify(deliveryLabel(p));return;}
    el("modalBody").innerHTML=detailGallery(p)+'<div class="modal-content"><span class="product-brand">'+esc(p.brand)+'</span>'+
      '<h2 id="modalName">'+esc(p.name)+'</h2><p class="delivery-label">'+esc(deliveryLabel(p))+'</p><p>'+esc(p.researchType)+' · '+esc(p.researchFeature)+'</p>'+
      '<p>'+(p.conceptImage?"This is an owner-selected clothing concept, not a manufactured product. Final fabric, sizing, colour accuracy and print quality require factory sampling.":"Explore this potential future product. Model-specific features, materials, territories and available stock must be verified before any sale.")+'</p>'+
      productFacts(p)+(p.imageDisclosure?'<p class="drawing-disclosure"><b>'+esc(drawingLabel(p))+'</b><br>'+esc(p.imageDisclosure)+'</p>':'')+'<div class="modal-notice"><b>Pre-order enquiry only — not a binding order.</b><br>No payment or reservation will be taken. Prices, stock, production and delivery are unconfirmed. '+(p.currentArtProof?"Current artwork is shown as a placement illustration, not manufactured stock or an accepted garment template.":p.conceptImage?"Image is an AI lookbook mockup, not a production-ready print file.":"Manufacturer resale and product-photo rights remain under review. Original representative drawing shown; appearance is unverified.")+'</div>'+
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
    var hash=location.hash.slice(1), interestDeepLink=false;
    if(["unconventional","freaks-and-geeks","freaks-weirdos-deviants","gay-lesbian"].includes(hash)){
      hash=hash==="gay-lesbian"?"explore-interests?group=community":"explore-interests";
      location.hash=hash;
    }
    if(hash.startsWith("explore-interests?group=")){
      var requestedGroup=hash.split("group=")[1].split("&")[0];
      if(Object.prototype.hasOwnProperty.call(unconventionalGroups,requestedGroup)){
        interestDeepLink=true;unconventionalGroup=requestedGroup;interestCategory="all";el("unconventionalSearch").value="";
      }
    }
    var view=hash.startsWith("gift=")?"gift":(hash==="catalog"||hash==="one-heart"||hash==="sarcastabastard"||hash==="results")?"shop":hash.split("?")[0];
    if(hash==="one-heart")selectCollection("ONE HEART");
    if(hash==="sarcastabastard")selectCollection("SARCASTABASTARD");
    if(!["shop","favorites","creators","gift","early","about","explore-interests"].includes(view))view="shop";
    document.querySelectorAll(".page").forEach(function(p){p.classList.toggle("active",p.id==="view-"+view);});
    document.querySelectorAll("[data-route]").forEach(function(n){var on=n.dataset.route===view;n.classList.toggle("active",on);if(on)n.setAttribute("aria-current","page");else n.removeAttribute("aria-current");});
    if(view==="favorites")renderFavorites();
    if(view==="creators"){renderPicker();renderSelection();}
    if(view==="gift")renderGift();
    if(view==="explore-interests")renderUnconventional();
    if(view==="shop"&&(hash==="catalog"||hash==="one-heart"||hash==="sarcastabastard"||hash==="results")){requestAnimationFrame(function(){el(hash==="results"?"catalogResults":"catalog").scrollIntoView({block:"start"});if(hash==="results")el("catalogResultsTitle").focus({preventScroll:true});});}
    else if(view==="explore-interests"&&interestDeepLink)showInterestResults();
    else window.scrollTo({top:0,behavior:"instant"});
    document.title=(view==="shop"?"Explore":view==="explore-interests"?"Explore Your Interests":view.charAt(0).toUpperCase()+view.slice(1))+" | Global Intimacy Marketplace";
  }
  function setup(){
    el("year").textContent=new Date().getFullYear();
    el("brandSelect").innerHTML='<option value="all">All brands</option>'+brands.map(function(b){return '<option value="'+esc(b)+'">'+esc(b)+'</option>';}).join("");
    el("categorySelect").innerHTML=categories.map(function(c){return '<option value="'+esc(c)+'">'+esc(c==="All"?"All categories":c)+'</option>';}).join("");
    el("shopCategoryLinks").innerHTML=categories.map(function(c){return '<a href="#catalog" data-browse-category="'+esc(c)+'">'+esc(c==="All"?"All products":c)+'</a>';}).join("")+'<a href="#explore-interests" data-route="explore-interests">Explore Your Interests ↗</a>';
    updateDestination();
    window.addEventListener("gim:destinationchange",updateDestination);
    el("searchInput").addEventListener("input",runGlobalSearch);
    el("storeSearchForm").addEventListener("submit",function(e){e.preventDefault();runGlobalSearch();});
    el("categorySelect").addEventListener("change",function(e){browseCategory(e.target.value);});
    el("clearActiveFilters").addEventListener("click",function(){selectCollection("All");});
    el("activeFilterChips").addEventListener("click",function(e){
      var b=e.target.closest("[data-remove-filter]");if(!b)return;
      if(b.dataset.removeFilter==="collection")activeCollection="All";
      else if(b.dataset.removeFilter==="category")activeCategory="All";
      else if(b.dataset.removeFilter==="brand"){brand="all";el("brandSelect").value="all";}
      else if(b.dataset.removeFilter==="search"){search="";el("searchInput").value="";}
      renderCatalog();
    });
    el("brandSelect").addEventListener("change",function(e){brand=e.target.value;renderCatalog();});
    el("sortSelect").addEventListener("change",function(e){sort=e.target.value;renderCatalog();});
    el("categoryChips").addEventListener("click",function(e){var b=e.target.closest("[data-category]");if(b)browseCategory(b.dataset.category);});
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
      else if(browse){e.preventDefault();browseCategory(browse.dataset.browseCategory);}
      if(e.target.closest('[data-route="explore-interests"]'))el("shopMenu").open=false;
    });
    el("closeModal").addEventListener("click",function(){el("productDialog").close();});
    el("productDialog").addEventListener("click",function(e){if(e.target===el("productDialog"))el("productDialog").close();});
    el("creatorAlias").value=creatorAlias;
    el("creatorAlias").addEventListener("input",function(e){creatorAlias=safeAlias(e.target.value);saveJson("gim:creatorName",creatorAlias);renderSelection();});
    el("interestCategory").addEventListener("change",function(){interestCategory=el("interestCategory").value;renderUnconventional();showInterestResults();});
    el("backToInterests").addEventListener("click",function(){el("unconventionalDiscoveries").scrollIntoView({block:"start"});el("interestChoiceTitle").focus({preventScroll:true});});
    el("unconventionalSearch").addEventListener("input",renderUnconventional);
    el("unconventionalBrowse").addEventListener("click",function(){el("unconventionalDiscoveries").scrollIntoView({block:"start"});el("unconventionalSearch").focus({preventScroll:true});});
    el("unconventionalFilters").addEventListener("click",function(e){
      var b=e.target.closest("[data-unconventional-group]");
      if(b&&Object.prototype.hasOwnProperty.call(unconventionalGroups,b.dataset.unconventionalGroup)){
        unconventionalGroup=b.dataset.unconventionalGroup;interestCategory="all";el("unconventionalSearch").value="";renderUnconventional();showInterestResults();
      }
    });
    el("clearUnconventionalFilters").addEventListener("click",function(){unconventionalGroup="all";interestCategory="all";el("unconventionalSearch").value="";renderUnconventional();});
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
    else if(window.GIMWelcome)window.GIMWelcome.start();
    el("ageYes").addEventListener("click",function(){
      try{sessionStorage.setItem("gim:adult","yes");}catch(e){}
      el("ageGate").hidden=true;el("storeShell").inert=false;el("countryEntrance").inert=false;
      if(!(window.GIMWelcome&&window.GIMWelcome.start())){if(window.GIMDestination.country())el("main").focus();else el("countryHeading").focus();}
    });
    el("ageNo").addEventListener("click",function(){location.replace("https://www.google.com/");});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup);
  else setup();
}());




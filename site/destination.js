"use strict";
(function () {
  var countries = (window.GIM_COUNTRIES || []).slice();
  var world = window.GIM_WORLD, shipping = window.GIMShipping;
  var country = "", previews = false, canvas, renderer, selectedIndex = -1;
  var longitude = -35, latitude = 24, frame = 0, pointer = null, returnFocus = null;
  var byCode = new Map(countries.map(function (c) { return [c.code, c]; }));
  function el(id) { return document.getElementById(id); }
  function name(code) { return byCode.has(code) ? byCode.get(code).name : "Choose country"; }
  function escape(value) { return String(value).replace(/[&<>"']/g, function(c) {return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
  function notify() { window.dispatchEvent(new CustomEvent("gim:destinationchange")); }
  function chosen() { return country; }
  function include(product) { return !!country && (shipping.status(product, country) === "eligible" || (previews && shipping.status(product, country) !== "blocked")); }
  function label(product) { return shipping.label(product, country, name(country)); }
  function updateSummary() {
    el("countryCurrent").textContent = "Country: " + name(country) + " · Change";
    el("previewMode").checked = previews;
    el("destinationSummary").textContent = previews ? "Research previews for " + name(country) + " — delivery is not promised."
      : "Showing only products with confirmed delivery eligibility for " + name(country) + ".";
    var confirmed = (window.GIM_PRODUCTS || []).filter(function(p){return shipping.status(p,country)==="eligible";}).length;
    el("destinationNote").textContent = previews ? "Preview mode includes unconfirmed concepts. Nothing can be purchased or gifted in this beta."
      : confirmed ? confirmed + " products have country-level delivery confirmation. The final address is checked before any future order." : "No purchasable products are confirmed yet. You can explore unconfirmed research previews separately below.";
  }
  function open() {
    returnFocus = document.activeElement;
    el("storeShell").hidden = true;
    el("countryEntrance").hidden = false;
    el("countrySelect").value = country;
    el("countrySearch").value = "";
    updateChoices("");
    updateSelection(country);
    el("cancelCountry").hidden = !country;
    window.scrollTo({top:0, behavior:"instant"});
    el("countryHeading").focus(); schedule();
  }
  function enter(code) {
    if (!byCode.has(code)) { el("countryStatus").textContent = "Choose a country from the globe or list first."; return false; }
    country = code; previews = false;
    try { localStorage.setItem("gim:country", country); } catch (e) { /* Session selection still works without storage. */ }
    el("countryEntrance").hidden = true; el("storeShell").hidden = false;
    updateSummary(); notify(); el("main").focus(); return true;
  }
  function updateSelection(code) {
    var c = byCode.get(code);
    el("countrySelect").value = c ? code : "";
    el("enterCountry").disabled = !c;
    el("enterCountry").textContent = c ? "Explore " + c.name + " →" : "Choose your country";
    el("countryStatus").textContent = c ? c.name + " selected. Delivery eligibility will be shown inside." : "Spin the globe or find your country below.";
    selectedIndex = world ? world.features.findIndex(function (f) {return f.code === code;}) : -1;
    if (selectedIndex >= 0) { longitude = world.features[selectedIndex].center[0]; latitude = world.features[selectedIndex].center[1]; }
    schedule();
  }
  function updateChoices(query) {
    var previous = el("countrySelect").value;
    var q = String(query || "").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();
    var list = countries.filter(function (c) {return (c.name + " " + c.code).normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().includes(q);});
    el("countrySelect").innerHTML = '<option value="">Select a country / region</option>' + list.map(function(c){return '<option value="'+c.code+'">'+escape(c.name)+'</option>';}).join("");
    el("countrySelect").value = list.some(function(c){return c.code===previous;}) ? previous : "";
    el("enterCountry").disabled = !el("countrySelect").value;
    el("countryMatchCount").textContent = list.length ? list.length + " countries and regions" : "No matches. Try another name or a two-letter country code.";
  }
  function schedule() { if (!frame && renderer && !el("countryEntrance").hidden) frame = requestAnimationFrame(function(){ frame = 0; draw(); }); }
  function draw() { if(renderer)renderer.draw(longitude,latitude,selectedIndex); }
  function tap(event) {
    var rect=canvas.getBoundingClientRect();
    var hit=window.GIMGlobeMath.pick((event.clientX-rect.left)/rect.width,(event.clientY-rect.top)/rect.height,longitude,latitude);
    if(!hit)return;
    var f=window.GIMGlobeMath.featureAt(world.features,hit[0],hit[1]);
    if(f && byCode.has(f.code)){el("countrySearch").value="";updateChoices("");updateSelection(f.code);enter(f.code);}
    else el("countryStatus").textContent="For islands and small regions, choose the country from the list below.";
  }
  function init() {
    try { var saved=localStorage.getItem("gim:country"); if(byCode.has(saved))country=saved; }catch(e){}
    updateChoices(""); updateSelection(country); updateSummary();
    el("countryEntrance").hidden=!!country; el("storeShell").hidden=!country;
    el("countrySearch").addEventListener("input",function(e){updateChoices(e.target.value);updateSelection(el("countrySelect").value);});
    el("countrySelect").addEventListener("change",function(e){updateSelection(e.target.value);});
    el("countryForm").addEventListener("submit",function(e){e.preventDefault();enter(el("countrySelect").value);});
    el("countryCurrent").addEventListener("click",open);
    el("cancelCountry").addEventListener("click",function(){el("countryEntrance").hidden=true;el("storeShell").hidden=false;if(returnFocus)returnFocus.focus();});
    el("previewMode").addEventListener("change",function(e){previews=!!e.target.checked;updateSummary();notify();});
    el("showResearchPreviews").addEventListener("click",function(){previews=true;updateSummary();notify();location.hash="catalog";});
    canvas=el("countryGlobe");
    try {
      try{renderer=window.GIMGlobe3D.create(canvas,world);}
      catch(gpuError){
        var fresh=canvas.cloneNode(true);canvas.replaceWith(fresh);canvas=fresh;
        renderer=window.GIMGlobeSoftware.create(canvas,world);
      }
      if(renderer) {
      canvas.addEventListener("pointerdown",function(e){pointer={id:e.pointerId,x:e.clientX,y:e.clientY,lon:longitude,lat:latitude,moved:false};canvas.setPointerCapture(e.pointerId);});
      canvas.addEventListener("pointermove",function(e){if(!pointer || pointer.id!==e.pointerId)return;var dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(Math.abs(dx)+Math.abs(dy)>6)pointer.moved=true;longitude=pointer.lon-dx*.4;latitude=Math.max(-80,Math.min(80,pointer.lat+dy*.32));schedule();});
      canvas.addEventListener("pointerup",function(e){if(!pointer || pointer.id!==e.pointerId)return;if(!pointer.moved)tap(e);pointer=null;});
      canvas.addEventListener("pointercancel",function(){pointer=null;});
      canvas.addEventListener("keydown",function(e){var delta={ArrowLeft:-15,ArrowRight:15,ArrowUp:10,ArrowDown:-10};if(!(e.key in delta))return;e.preventDefault();if(e.key==="ArrowLeft"||e.key==="ArrowRight")longitude+=delta[e.key];else latitude=Math.max(-80,Math.min(80,latitude+delta[e.key]));schedule();});
      canvas.addEventListener("webglcontextlost",function(e){e.preventDefault();renderer=null;canvas.hidden=true;el("globeFallback").hidden=false;});
      schedule();
    } else throw new Error("No canvas");}catch(e){console.warn("Globe renderer unavailable: "+e.message);canvas.hidden=true;el("globeFallback").hidden=false;}
    notify();
  }
  window.GIMDestination={country:chosen,name:function(){return name(country);},include:include,label:label,open:open,enter:enter,previews:function(){return previews;}};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
}());

"use strict";
(function () {
  var active=false, completed=false, timer=0, renderer=null, bound=false;
  function el(id){return document.getElementById(id);}
  function restore(){
    el("countryEntrance").inert=false;el("storeShell").inert=false;
    if(window.GIMDestination.country())el("main").focus();else el("countryHeading").focus();
  }
  function finish(){
    if(!active)return;
    clearTimeout(timer);timer=0;active=false;completed=true;
    el("rubyWelcome").hidden=true;el("rubyWelcome").classList.remove("is-bursting");
    document.body.classList.remove("ruby-open");
    if(renderer&&renderer.dispose)renderer.dispose();renderer=null;
    try{var url=new URL(location.href);if(url.searchParams.has("welcome")){url.searchParams.delete("welcome");history.replaceState(null,"",url.href);}}catch(e){}
    restore();
  }
  function reveal(){
    if(!active||el("rubyReveal").disabled)return;
    el("rubyReveal").disabled=true;
    el("rubyWelcome").classList.add("is-bursting");
    el("rubyStatus").textContent="Revealing the globe.";
    var reduced=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timer=setTimeout(finish,reduced?200:1400);
  }
  function draw(){
    var canvas=el("rubyGlobe");
    try{
      try{renderer=window.GIMGlobe3D.create(canvas,window.GIM_WORLD);}
      catch(e){var fresh=canvas.cloneNode(true);canvas.replaceWith(fresh);canvas=fresh;renderer=window.GIMGlobeSoftware.create(canvas,window.GIM_WORLD);}
      renderer.draw(-35,24,-1);
    }catch(e){/* The country list remains available even if both renderers fail. */}
  }
  function start(){
    if(active)return true;
    if(!el("ageGate").hidden)return false;
    // Show on every page load; completion only suppresses duplicate starts on this page.
    if(completed)return false;
    if(!bound){
      el("rubyReveal").addEventListener("click",reveal);
      el("rubySkip").addEventListener("click",finish);
      el("rubyWelcome").addEventListener("keydown",function(e){
        if(e.key==="Escape"){e.preventDefault();finish();}
        else if(e.key==="Tab"){
          e.preventDefault();
          if(el("rubyReveal").disabled||document.activeElement===el("rubyReveal"))el("rubySkip").focus();else el("rubyReveal").focus();
        }
      });bound=true;
    }
    active=true;el("rubyWelcome").hidden=false;el("rubyReveal").disabled=false;
    el("countryEntrance").inert=true;el("storeShell").inert=true;
    document.body.classList.add("ruby-open");
    draw();el("rubyReveal").focus();return true;
  }
  window.GIMWelcome={start:start};
}());

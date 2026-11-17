"use strict";
/* Display preference only. No fabricated prices or exchange rates. */
(function(root,factory){
  var api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else {root.GIMCurrencyPreference=api;if(root.document){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",api.init);else api.init();}}
}(typeof window!=="undefined"?window:globalThis,function(){
  var defaults={CA:"CAD",US:"USD",GB:"GBP",AU:"AUD",NZ:"NZD",JP:"JPY",CH:"CHF",IN:"INR",MX:"MXN",BR:"BRL",ZA:"ZAR",AE:"AED",SG:"SGD",DE:"EUR",FR:"EUR",ES:"EUR",IT:"EUR",NL:"EUR",IE:"EUR",BE:"EUR",AT:"EUR",PT:"EUR",FI:"EUR",GR:"EUR"};
  function defaultFor(code){return defaults[String(code||"").toUpperCase()]||null;}
  function resolve(country,override){return override&&override!=="auto"?override:defaultFor(country);}
  function init(){
    var field=document.getElementById("displayCurrency");if(!field)return;
    var saved="auto";try{saved=localStorage.getItem("gim:currency")||"auto";}catch(e){}
    if(Array.from(field.options).some(function(o){return o.value===saved;}))field.value=saved;
    function refresh(){
      var country=window.GIMDestination&&window.GIMDestination.country();
      var currency=resolve(country,field.value);
      var auto=field.options[0];auto.textContent="Country default"+(defaultFor(country)?" ("+defaultFor(country)+")":" (not configured)");
      field.setAttribute("data-effective-currency",currency||"");
      field.title=currency?"Display preference: "+currency+". No live prices in this beta.":"No currency configured for this country; prices remain unavailable.";
    }
    field.addEventListener("change",function(){try{localStorage.setItem("gim:currency",field.value);}catch(e){}refresh();});
    window.addEventListener("gim:destinationchange",refresh);refresh();
  }
  return Object.freeze({defaultFor:defaultFor,resolve:resolve,init:init});
}));
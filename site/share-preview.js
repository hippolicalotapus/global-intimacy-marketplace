"use strict";
(function(){
  document.querySelectorAll("[data-copy-link]").forEach(function(button){
    button.addEventListener("click",async function(){
      var field=document.getElementById(button.dataset.copyLink);
      var status=document.getElementById("copyLinkStatus");
      if(!field)return;
      try{await navigator.clipboard.writeText(field.value);if(status)status.textContent="Link copied. Share it wherever the platform allows.";}
      catch(error){field.focus();field.select();if(status)status.textContent="Select and copy the link from this field.";}
    });
  });
})();

'use strict';
(function(){
  function setup(root){
    if(!root)return;
    const garment=root.querySelector('#studio-garment');
    const color=root.querySelector('#studio-color');
    const placement=root.querySelector('#studio-placement');
    const wording=root.querySelector('#studio-wording');
    const preview=root.querySelector('#studio-preview');
    if(!garment||!color||!placement||!wording||!preview)return;
    function render(){
      const safeText=wording.value.slice(0,24).trim();
      preview.textContent=[garment.value,color.value,placement.value,safeText||'No personal text'].join(' · ');
    }
    [garment,color,placement,wording].forEach(el=>el.addEventListener('input',render));
    render();
  }
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setup(document));
    else setup(document);
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={setup};
})();

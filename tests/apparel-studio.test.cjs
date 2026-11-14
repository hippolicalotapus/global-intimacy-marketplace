const {test}=require('node:test');
const assert=require('node:assert/strict');
const {setup}=require('../site/apparel-studio.js');
function field(value){return {value,listeners:{},addEventListener(type,fn){this.listeners[type]=fn}}}
test('preview updates safely using textContent',()=>{
 const fields={'#studio-garment':field('T-shirt'),'#studio-color':field('Ivory'),'#studio-placement':field('Front'),'#studio-wording':field('<img src=x onerror=alert(1)>')};
 const preview={textContent:''};fields['#studio-preview']=preview;
 setup({querySelector:s=>fields[s]});
 assert.equal(preview.textContent,'T-shirt · Ivory · Front · <img src=x onerror=alert');
 fields['#studio-garment'].value='Hoodie';fields['#studio-garment'].listeners.input();
 assert.match(preview.textContent,/^Hoodie/);
});
test('missing controls do not crash',()=>assert.doesNotThrow(()=>setup({querySelector:()=>null})));

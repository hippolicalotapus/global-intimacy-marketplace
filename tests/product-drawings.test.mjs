import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
test('Every catalogue entry has a distinct readable drawing with matching file digest',async()=>{
  const context={window:{}};
  for(const file of ['catalog.js','apparel.js','product-drawings.js'])runInNewContext(await read('site/'+file),context);
  const products=context.window.GIM_PRODUCTS;
  const registry=JSON.parse(await read('site/drawing-register.json'));
  assert.equal(products.length,110);
  assert.equal(new Set(products.map(p=>p.previewImage)).size,110);
  for(const p of products){
    const entry=registry.records.find(r=>r.id===p.id);
    assert.ok(entry,p.name);
    assert.equal(p.temporaryIllustration,true);
    assert.equal(p.exactLikenessVerified,false);
    assert.equal(p.imageApproved,false);
    assert.equal(p.stockVerified,false);
    assert.equal(p.resellerApproved,false);
    assert.notEqual(p.canAcceptOrders,true);
    assert.match(p.previewImageAlt,/drawing, not a photo/);
    assert.ok(p.imageDisclosure.length>50);
    const bytes=await readFile(new URL('site/'+p.previewImage,root));
    assert.equal(bytes.toString('ascii',0,4),'RIFF');
    assert.equal(bytes.toString('ascii',8,12),'WEBP');
    assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256,p.name);
    if(p.drawingKind==='range')assert.match(p.imageDisclosure,/No specific model/);
    if(p.drawingKind==='packaging')assert.match(p.imageDisclosure,/generic packaging/);
    if(p.id>=201&&p.id<=209)assert.equal(p.detailImage,p.previewImage);
  }
});
test('Drawing integration loads after apparel and before the storefront',async()=>{
 const html=await read('site/index.html');
 assert.ok(html.indexOf('src="apparel.js"')<html.indexOf('src="product-drawings.js"'));
 assert.ok(html.indexOf('src="product-drawings.js"')<html.indexOf('src="app.js"'));
 assert.match(html,/href="product-drawings.css"/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');
test('Public lookbook has 18 unique existing garment drawings and no purchase form',async()=>{
 const html=await read('site/lookbook.html');
 assert.equal((html.match(/class="lookbook-card"/g)||[]).length,18);
 const images=[...html.matchAll(/<img src="([^"]+)"/g)].map(m=>m[1]).filter(p=>!p.includes('approved-logo'));
 assert.equal(new Set(images).size,18);
 await Promise.all(images.map(p=>access(new URL('site/'+p,root))));
 assert.match(html,/Production samples/);
 assert.match(html,/do not place or reserve an order/);
 assert.ok(!html.includes('<form'));
 assert.ok(!html.includes('<style>'));
 assert.match(html,/src="share-preview.js"/);
});
test('Sharing metadata and feedback entry use public links and retain the preview gates',async()=>{
 const html=await read('site/index.html'),book=await read('site/lookbook.html');
 for(const s of [html,book]){
  assert.match(s,/property="og:image"/);assert.match(s,/name="twitter:card"/);
  assert.match(s,/https:\/\/x.com\/gimmarketplace/);
  assert.match(s,/61596014503194/);
  assert.match(s,/noindex,nofollow/);
 }
 assert.match(html,/Send feedback to the team/);
 assert.match(html,/The demo surveys below stay on your device/);
 const image=await readFile(new URL('site/assets/social/one-heart-preview.png',root));
 assert.equal(image.readUInt32BE(16),1200);assert.equal(image.readUInt32BE(20),630);
});

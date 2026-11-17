import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../site/app.js',import.meta.url),'utf8');
test('last saved favorite falls back to the empty-state explore link',()=>{
  assert.match(app,/focusContainer\.id==="favoritesGrid"/);
  assert.match(app,/el\("favoritesEmpty"\)\.querySelector\("a"\)/);
  assert.match(app,/replacement\.focus\(\{preventScroll:true\}\)/);
});

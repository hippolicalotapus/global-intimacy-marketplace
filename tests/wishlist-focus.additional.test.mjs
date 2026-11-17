import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../site/app.js',import.meta.url),'utf8');
test('wishlist picker retains keyboard focus after rerender',()=>{
  assert.match(app,/focusPicker=active&&active\.matches\("#wishlistPicker \[data-wish\]"\)/);
  assert.match(app,/next\.focus\(\{preventScroll:true\}\)/);
});
test('wishlist removal restores focus to another remove control or search',()=>{
  assert.match(app,/focusRemoval=active&&active\.matches\("#selectedWishItems \[data-remove\]"\)/);
  assert.match(app,/querySelector\("\[data-remove\]"\)\|\|el\("wishlistSearch"\)/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../site/app.js',import.meta.url),'utf8');
test('favorite rerender restores keyboard focus to matching replacement control',()=>{
  assert.match(app,/var restoreFocus=active&&active\.matches\("\[data-fav\]"\)/);
  assert.match(app,/focusContainer\.querySelector\(/);
  assert.match(app,/replacement\.focus\(\{preventScroll:true\}\)/);
});

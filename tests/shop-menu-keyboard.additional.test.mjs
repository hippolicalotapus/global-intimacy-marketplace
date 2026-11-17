import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../site/app.js',import.meta.url),'utf8');
test('category menu Escape closes and restores focus to summary',()=>{
  assert.match(app,/el\("shopMenu"\)\.addEventListener\("keydown",function\(e\)/);
  assert.match(app,/e\.key==="Escape"&&el\("shopMenu"\)\.open/);
  assert.match(app,/e\.preventDefault\(\);el\("shopMenu"\)\.open=false;el\("shopMenu"\)\.querySelector\("summary"\)\.focus\(\)/);
});

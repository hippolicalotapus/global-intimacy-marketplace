import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('storefront entrypoints and approved artwork directory exist', () => {
  for (const path of ['index.html', 'site/index.html', 'site/app.js', 'site/apparel.js', 'site/assets/approved-logo.svg']) {
    assert.ok(existsSync(path), `Missing storefront file: ${path}`);
  }
  const html = readFileSync('site/index.html', 'utf8');
  assert.match(html, /<meta[^>]*viewport/i);
});

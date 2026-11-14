import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// These development/internal folders must never be included in a static deployment.
const internal = new Set(['.git', '.github', '.netlify', '.svn', 'node_modules', 'private', 'data', 'exports', 'backups']);
function checkPublicTree(root) {
  const visit = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      assert.ok(!internal.has(entry.name.toLowerCase()), `Internal path included in published site: ${entry.name}`);
      const path = join(dir, entry.name);
      assert.ok(!entry.isSymbolicLink(), `Published site contains symlink: ${entry.name}`);
      if (entry.isDirectory()) visit(path);
      else assert.ok(entry.isFile(), `Unsupported public file entry: ${entry.name}`);
    }
  };
  visit(root);
}
function withFixture(run) {
  const directory = mkdtempSync(join(tmpdir(), 'gim-internal-path-'));
  try { mkdirSync(join(directory, 'site')); run(join(directory, 'site')); }
  finally { rmSync(directory, {recursive:true, force:true}); }
}
test('public site contains no internal development directories', () => {
  checkPublicTree(new URL('../site/', import.meta.url).pathname);
});
test('normal public assets remain allowed', () => {
  withFixture(site => { mkdirSync(join(site, 'assets')); writeFileSync(join(site,'assets','logo.svg'),'<svg/>'); assert.doesNotThrow(()=>checkPublicTree(site)); });
});
test('internal folder names fail closed at site root', () => {
  for (const name of internal) withFixture(site => { mkdirSync(join(site, name)); assert.throws(()=>checkPublicTree(site), /Internal path included/); });
});
test('nested and case-varied internal folders fail closed', () => {
  withFixture(site => { mkdirSync(join(site,'assets')); mkdirSync(join(site,'assets','NODE_MODULES')); assert.throws(()=>checkPublicTree(site), /Internal path included/); });
});

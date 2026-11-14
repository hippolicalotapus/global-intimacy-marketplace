import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname ?? new URL('..', import.meta.url).pathname, '..');
const forbidden = /^(?:\.env(?:\..*)?|private_staging|operations|backups?|credentials(?:\..*)?|secrets?(?:\..*)?|supplier-registry\.json|concorde-public-candidates\.json|.*\.(?:pem|p12|key|sqlite3?|db|bak))$/i;

function assertPublicBoundary(base) {
  const config = readFileSync(join(base, 'netlify.toml'), 'utf8');
  const build = /^\s*\[build\]\s*$/gm;
  assert.equal([...config.matchAll(build)].length, 1, 'Exactly one Netlify build section required');
  // Track TOML sections: a publish key outside [build] does not configure
  // Netlify's primary public directory and must never count as approved.
  let section = '';
  const publish = [];
  for (const line of config.split(/\r?\n/)) {
    const header = /^\s*\[([^\]]+)\]\s*(?:#.*)?$/.exec(line);
    if (header) { section = header[1]; continue; }
    const match = /^\s*publish\s*=\s*['"]([^'"]+)['"]\s*(?:#.*)?$/.exec(line);
    if (match) publish.push({ section, directory: match[1] });
  }
  assert.equal(publish.length, 1, 'Exactly one explicit publish directory required');
  assert.equal(publish[0].section, 'build', 'Publish directory must be declared inside [build]');
  assert.equal(publish[0].directory, 'site', 'Public deployment must publish only site/');
  const visit = dir => {
    for (const entry of readdirSync(dir, {withFileTypes:true})) {
      assert.ok(!forbidden.test(entry.name), `Prohibited published path: ${entry.name}`);
      assert.ok(!entry.isSymbolicLink(), `Published site must not contain symlinks: ${entry.name}`);
      const path = join(dir,entry.name);
      if(entry.isDirectory()) visit(path);
      else assert.ok(entry.isFile(), `Unexpected published filesystem object: ${entry.name}`);
    }
  };
  visit(join(base,'site'));
}
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'gim-public-boundary-'));
  mkdirSync(join(dir,'site'));
  writeFileSync(join(dir,'netlify.toml'), '[build]\npublish = "site"\ncommand = ""\n');
  return dir;
}

test('actual Netlify deploy surface contains no private supplier or credential files',()=>{
  assertPublicBoundary(root);
});
test('normal public assets are accepted',()=>{
  const dir=fixture(); try { mkdirSync(join(dir,'site','assets')); writeFileSync(join(dir,'site','assets','logo.svg'),'<svg/>'); assert.doesNotThrow(()=>assertPublicBoundary(dir)); } finally { rmSync(dir,{recursive:true,force:true}); }
});
test('publishing repository root or an unknown folder is rejected',()=>{
  const dir=fixture(); try { for(const publish of ['.', 'operations', '../site']) { writeFileSync(join(dir,'netlify.toml'),`[build]\npublish = "${publish}"\n`); assert.throws(()=>assertPublicBoundary(dir),/publish only site/); } } finally { rmSync(dir,{recursive:true,force:true}); }
});
test('duplicate publish configuration is rejected',()=>{
  const dir=fixture();try { writeFileSync(join(dir,'netlify.toml'),'[build]\npublish = "site"\npublish = "."\n'); assert.throws(()=>assertPublicBoundary(dir),/Exactly one explicit publish/); } finally { rmSync(dir,{recursive:true,force:true}); }
});
test('private supplier files, backup files and environment secrets are blocked',()=>{
  for (const name of ['supplier-registry.json', '.env', 'orders.db', 'secrets.json', 'private_staging']) {
    const dir=fixture();try { if(name==='private_staging')mkdirSync(join(dir,'site',name));else writeFileSync(join(dir,'site',name),'not public'); assert.throws(()=>assertPublicBoundary(dir),/Prohibited published path/); } finally { rmSync(dir,{recursive:true,force:true}); }
  }
});
test('symlinks cannot expose files outside public site',async t=>{
  const {symlinkSync} = await import('node:fs');
  const dir=fixture();try { writeFileSync(join(dir,'private.txt'),'private');symlinkSync(join(dir,'private.txt'),join(dir,'site','external-link.txt'));assert.throws(()=>assertPublicBoundary(dir),/must not contain symlinks/); } finally {rmSync(dir,{recursive:true,force:true});}
});

test('publish key outside [build] cannot stand in for the public site boundary',()=>{
  const dir=fixture();
  try {
    for (const scope of ['[context.production]', '[headers.values]']) {
      writeFileSync(join(dir,'netlify.toml'),`[build]\ncommand = ""\n${scope}\npublish = "site"\n`);
      assert.throws(()=>assertPublicBoundary(dir),/must be declared inside \[build\]/);
    }
  } finally { rmSync(dir,{recursive:true,force:true}); }
});

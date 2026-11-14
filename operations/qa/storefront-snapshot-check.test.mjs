import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { checkSnapshot } from './storefront-snapshot-check.mjs';

const sha = data => createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
async function fixture(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'gim-storefront-'));
  try { await fn(dir); } finally { await rm(dir, {recursive:true, force:true}); }
}

test('verifies exact Git blob bytes and file sizes', async () => fixture(async dir => {
  await mkdir(join(dir, 'site'));
  const data = Buffer.from('hello\n');
  await writeFile(join(dir, 'site', 'app.js'), data);
  const result = await checkSnapshot(dir, {sourceCommit:'test', files:[{path:'site/app.js',sha:sha(data),size:data.length}]});
  assert.equal(result.verified, 1);
  assert.equal(result.missing, 0);
  assert.equal(result.mismatched, 0);
}));

test('reports missing, corrupt and altered-size files without claiming success', async () => fixture(async dir => {
  await writeFile(join(dir, 'present.js'), 'different');
  const result = await checkSnapshot(dir, {files:[{path:'absent.js',sha:sha(Buffer.from('ok'))},{path:'present.js',sha:sha(Buffer.from('ok'))}]});
  assert.equal(result.verified, 0);
  assert.equal(result.missing, 1);
  assert.equal(result.mismatched, 1);
}));

test('rejects path traversal and duplicate file entries', async () => fixture(async dir => {
  await assert.rejects(checkSnapshot(dir, {files:[{path:'../private',sha:'a'.repeat(40)}]}), /Invalid snapshot/);
  await assert.rejects(checkSnapshot(dir, {files:[{path:'site/x',sha:'a'.repeat(40)},{path:'site/x',sha:'a'.repeat(40)}]}), /Invalid snapshot/);
}));

test('does not follow symlinks outside snapshot root', async () => fixture(async dir => {
  const outside = await mkdtemp(join(tmpdir(), 'gim-outside-'));
  try {
    await writeFile(join(outside,'secret.js'), 'secret');
    await symlink(join(outside,'secret.js'), join(dir,'link.js'));
    const result = await checkSnapshot(dir, {files:[{path:'link.js',sha:sha(Buffer.from('secret'))}]});
    assert.equal(result.verified,0);
    assert.equal(result.mismatched,1);
    assert.equal(result.files[0].status,'outside-root');
  } finally {await rm(outside,{recursive:true,force:true});}
}));

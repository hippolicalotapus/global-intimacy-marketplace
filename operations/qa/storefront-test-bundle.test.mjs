import test from 'node:test';
import assert from 'node:assert/strict';
import { combineSnapshotManifests, prepareAndTest } from './storefront-test-bundle.mjs';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const rev = 'b63bfe7419ecd85fbbf44fc14c957662b444b5b5';
const core = {sourceCommit:rev, files:[{path:'site/index.html',sha:'a'.repeat(40),size:12}]};
const images = {sourceCommit:rev, files:[{path:'site/assets/apparel/cards/oh-a01.webp',sha:'b'.repeat(40),size:120}]};

test('combines matching source and apparel image snapshots', () => {
  const combined = combineSnapshotManifests(core, images);
  assert.equal(combined.sourceCommit, rev);
  assert.deepEqual(combined.files.map(f=>f.path), [core.files[0].path, images.files[0].path]);
});

test('accepts apparel SVG placement preview assets', () => {
  const mixed={...images,files:[...images.files,{path:'site/assets/apparel/current/oh-h01-placement.svg',sha:'c'.repeat(40),size:32}]};
  assert.equal(combineSnapshotManifests(core,mixed).files.length,3);
});

test('rejects mismatched commits, duplicate entries, and missing images', () => {
  assert.throws(()=>combineSnapshotManifests(core,{...images,sourceCommit:'f'.repeat(40)}),/same pinned commit/);
  assert.throws(()=>combineSnapshotManifests(core,{...images,files:[core.files[0]]}),/Duplicate/);
  assert.throws(()=>combineSnapshotManifests(core,{...images,files:[]}),/apparel WebP or SVG/);
  assert.throws(()=>combineSnapshotManifests(core,{...images,files:[{...images.files[0],path:'site/private.txt'}]}),/apparel WebP or SVG/);
});

test('runs both storefront suites only after complete verification', async () => {
  let seen, runs=0;
  const result=await prepareAndTest({core,images,destination:'/tmp/not-created',token:'offline',
    transfer:async args=>{seen=args.manifest;return {directory:'/snapshot',verified:2,missing:0,mismatched:0};},
    runner:async dir=>{assert.equal(dir,'/snapshot');runs++;return 0;}});
  assert.equal(runs,1);assert.equal(seen.files.length,2);assert.equal(result.exitCode,0);
});

test('refuses tests when transfer is incomplete or fails', async () => {
  let runs=0;
  await assert.rejects(prepareAndTest({core,images,
    transfer:async()=>({directory:'/snapshot',verified:1,missing:1,mismatched:0}),
    runner:async()=>{runs++;return 0;}}),/Incomplete verified/);
  await assert.rejects(prepareAndTest({core,images,
    transfer:async()=>{throw Error('Bad GitHub blob');},
    runner:async()=>{runs++;return 0;}}),/Bad GitHub blob/);
  assert.equal(runs,0);
});

test('reports a storefront test failure without masking it', async () => {
  const result=await prepareAndTest({core,images,
    transfer:async()=>({directory:'/snapshot',verified:2,missing:0,mismatched:0}),
    runner:async()=>1});
  assert.equal(result.exitCode,1);
});


test('offline checkout mode verifies pinned hashes before running tests, without a token', async () => {
  let verified=false, run=false;
  const result=await prepareAndTest({core,images,checkout:'/tmp/complete-checkout',
    verify:async (directory,manifest)=>{
      assert.equal(directory,'/tmp/complete-checkout');
      assert.equal(manifest.files.length,2);
      verified=true; return {verified:2,total:2,missing:0,mismatched:0};
    },
    runner:async (directory)=>{assert.equal(directory,'/tmp/complete-checkout');assert.equal(verified,true);run=true;return 0;}
  });
  assert.equal(result.exitCode,0);assert.equal(run,true);
});

test('offline checkout rejects missing or corrupted files and cannot fetch as a fallback', async () => {
  let run=false;
  await assert.rejects(prepareAndTest({core,images,checkout:'/tmp/incomplete',
    verify:async()=>({verified:1,total:2,missing:1,mismatched:0}),
    runner:async()=>{run=true;return 0;}
  }),/Incomplete verified/);
  await assert.rejects(prepareAndTest({core,images,checkout:'/tmp/corrupt',
    verify:async()=>({verified:1,total:2,missing:0,mismatched:1}),
    runner:async()=>{run=true;return 0;}
  }),/Incomplete verified/);
  await assert.rejects(prepareAndTest({core,images,checkout:'/tmp/foo',token:'unsafe',runner:async()=>0}),/must not download/);
  assert.equal(run,false);
});


test('offline checkout validates actual on-disk Git blobs and blocks mutation', async () => {
  const dir=await mkdtemp(join(tmpdir(),'gim-offline-'));
  const code=Buffer.from('<main>safe</main>');
  const image=Buffer.from('fake static asset');
  const sha=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
  const actualCore={sourceCommit:rev,files:[{path:'site/index.html',sha:sha(code),size:code.length}]};
  const actualImages={sourceCommit:rev,files:[{path:'site/assets/apparel/cards/example.webp',sha:sha(image),size:image.length}]};
  let ran=0;
  try {
    await mkdir(join(dir,'site/assets/apparel/cards'),{recursive:true});
    await writeFile(join(dir,'site/index.html'),code);
    await writeFile(join(dir,'site/assets/apparel/cards/example.webp'),image);
    const opts={core:actualCore,images:actualImages,checkout:dir,runner:async()=>{ran++;return 0;}};
    assert.equal((await prepareAndTest(opts)).verified,2);
    assert.equal(ran,1);
    await writeFile(join(dir,'site/index.html'),'<main>tampered</main>');
    await assert.rejects(prepareAndTest(opts),/Incomplete verified/);
    assert.equal(ran,1);
  } finally {await rm(dir,{recursive:true,force:true});}
});

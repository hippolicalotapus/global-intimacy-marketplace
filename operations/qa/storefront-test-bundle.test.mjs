import test from 'node:test';
import assert from 'node:assert/strict';
import { combineSnapshotManifests, prepareAndTest } from './storefront-test-bundle.mjs';
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

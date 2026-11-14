import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { checkSnapshot } from './storefront-snapshot-check.mjs';

export function combineSnapshotManifests(core, images) {
  if (!core || !images || !/^[a-f0-9]{40}$/.test(core.sourceCommit) ||
      core.sourceCommit !== images.sourceCommit ||
      !Array.isArray(core.files) || !Array.isArray(images.files)) {
    throw new Error('Storefront source and image manifests must use the same pinned commit');
  }
  const all = [...core.files, ...images.files];
  if (all.length === 0 || new Set(all.map(f => f.path)).size !== all.length) {
    throw new Error('Duplicate or empty storefront snapshot entries');
  }
  if (!images.files.length || !images.files.every(f =>
    typeof f.path === 'string' && /^site\/assets\/apparel\/[a-zA-Z0-9_./-]+\.(?:webp|svg)$/.test(f.path))) {
    throw new Error('Image manifest must contain only apparel WebP or SVG assets');
  }
  return { sourceCommit: core.sourceCommit, files: all };
}

export async function prepareAndTest({ core, images, destination, token, transfer, checkout, verify = checkSnapshot, runner = defaultRunner }) {
  const manifest = combineSnapshotManifests(core, images);
  if (checkout && (transfer || destination || token)) throw new Error('Checkout mode must not download files or accept a token');
  const snapshot = checkout
    ? { ...(await verify(checkout, manifest)), directory: resolve(checkout) }
    : await (transfer || (await import('./materialize-storefront.mjs')).materializeStorefront)({ manifest, destination, token });
  if (snapshot.verified !== manifest.files.length || snapshot.missing !== 0 || snapshot.mismatched !== 0) {
    throw new Error('Incomplete verified storefront snapshot; refusing to run tests');
  }
  const code = await runner(snapshot.directory);
  return { sourceCommit: manifest.sourceCommit, verified: snapshot.verified, total: manifest.files.length, exitCode: code };
}

function defaultRunner(directory) {
  return new Promise((resolveCode, reject) => {
    const child = spawn(process.execPath, ['--test', 'tests/site.smoke.test.mjs', 'tests/storefront.behavior.test.mjs'],
      {cwd: directory, stdio: 'inherit', env: { PATH: process.env.PATH || '' }});
    child.on('error', reject);
    child.on('close', code => resolveCode(code ?? 1));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sourceRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
  const core = JSON.parse(await readFile(resolve(sourceRoot, 'operations/qa/storefront-snapshot-manifest.json')));
  const images = JSON.parse(await readFile(resolve(sourceRoot, 'operations/qa/storefront-apparel-assets-manifest.json')));
  const isCheckout = process.argv[2] === '--checkout';
  if (isCheckout && !process.argv[3]) throw new Error('Usage: node storefront-test-bundle.mjs --checkout <existing-checkout-path>');
  const result = await prepareAndTest({core, images,
    ...(isCheckout ? {checkout: resolve(process.argv[3])} : {destination: resolve(process.argv[2] || '/mnt/data/gim-storefront-verified'), token: process.env.GITHUB_TOKEN})});
  console.log(`Verified ${result.verified}/${result.total} storefront files from ${result.sourceCommit}; test exit ${result.exitCode}`);
  if (result.exitCode !== 0) process.exitCode = result.exitCode;
}

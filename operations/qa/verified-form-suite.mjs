/**
 * Bridge the pinned storefront snapshot verifier and public form audit.
 * Does not perform purchases, deploy, or access live website data.
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareAndTest } from './storefront-test-bundle.mjs';
import { auditSiteForms } from './public-form-gate.mjs';

const PUBLIC_HTML = Object.freeze([
  'site/creator-feedback-thanks.html',
  'site/creator-feedback.html',
  'site/drawing-review.html',
  'site/index.html',
  'site/lookbook.html'
]);

export function verifyPublicFormsInSnapshot(directory, manifest) {
  const listed = new Set(manifest?.files?.map(entry => entry.path) ?? []);
  for (const html of PUBLIC_HTML) {
    if (!listed.has(html)) throw new Error(`Unverified public HTML excluded from snapshot: ${html}`);
  }
  const findings = auditSiteForms(join(directory, 'site'));
  if (findings.length) throw new Error(`Public form audit failed: ${findings.join('; ')}`);
}

export function runVerifiedFormSuite(options) {
  return prepareAndTest({...options, preflight: verifyPublicFormsInSnapshot});
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sourceRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
  const core = JSON.parse(readFileSync(join(sourceRoot,'operations/qa/storefront-snapshot-manifest.json'), 'utf8'));
  const images = JSON.parse(readFileSync(join(sourceRoot,'operations/qa/storefront-apparel-assets-manifest.json'), 'utf8'));
  try {
    const result=await runVerifiedFormSuite({core, images,
      destination:resolve(process.argv[2] || '/mnt/data/gim-verified-form-suite'), token:process.env.GITHUB_TOKEN});
    console.log(`Verified ${result.verified}/${result.total} pinned storefront files; storefront tests exit ${result.exitCode}`);
    process.exitCode=result.exitCode;
  } catch(error) {
    console.error(`Storefront verification stopped: ${error.message}`);
    process.exitCode=1;
  }
}

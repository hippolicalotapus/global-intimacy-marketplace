import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { auditResearchCandidates } from './research-readiness.mjs';
const root = dirname(fileURLToPath(import.meta.url));
const registry = JSON.parse(readFileSync(join(root, 'supplier-registry.json'), 'utf8'));
const candidates = JSON.parse(readFileSync(join(root, 'concorde-public-candidates.json'), 'utf8'));

test('current 14 Concorde public-source candidates remain research-only and unshippable', () => {
  const report = auditResearchCandidates(registry, candidates, 'CA');
  assert.equal(report.researchCandidates, 14);
  assert.equal(report.invalidCount, 0, JSON.stringify(report.problems));
  assert.equal(report.publicationEligible, 0);
  assert.equal(report.shippingEligible, 0);
  assert.equal(report.shippingUnverified, 14);
  assert.equal(report.conclusion, 'RESEARCH_ONLY_NOT_FOR_SALE');
});
test('current source has two candidate identifiers requiring supplier feed reconciliation', () => {
  const report = auditResearchCandidates(registry, candidates, 'GB');
  assert.deepEqual(report.review.map(x => x.researchId), [86, 87]);
  assert.equal(report.reviewCount, 2);
  assert.equal(report.shippingEligible, 0);
});

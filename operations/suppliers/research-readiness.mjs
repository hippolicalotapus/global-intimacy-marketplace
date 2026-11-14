/**
 * Offline integrity audit of PUBLIC-SOURCE supplier research candidates.
 * Never writes catalogue data, confers supplier rights, authorizes shipping,
 * publishes listings or enables checkout. No network access.
 * Run from repository root: node operations/suppliers/research-readiness.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

function validEAN13(value) {
  if (!/^\d{13}$/.test(value)) return false;
  const weighted = [...value.slice(0, 12)].reduce((sum, digit, i) => sum + Number(digit) * (i % 2 ? 3 : 1), 0);
  return (10 - weighted % 10) % 10 === Number(value[12]);
}
function validOfficialSource(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && !u.username && !u.password &&
      (u.hostname === 'concordepro.com' || u.hostname === 'www.concordepro.com') &&
      u.port === '';
  } catch { return false; }
}
/**
 * Audit only: an item remains unverified for every destination regardless of
 * any research-page reference, nominal stock or dealer account activation.
 */
export function auditResearchCandidates(registry, batch, destinationCountry = 'CA') {
  if (!registry || !Array.isArray(registry.suppliers) || !batch || !Array.isArray(batch.items)) {
    throw new TypeError('Supplier registry and research candidate batch are required');
  }
  if (!/^[A-Z]{2}$/.test(destinationCountry)) throw new TypeError('Use an uppercase two-letter destination country');
  const problems = [], review = [], seenIds = new Set(), seenEANs = new Set(), seenURLs = new Set();
  const issue = (target, code, id = null) => target.push({ code, researchId: id });
  const supplier = registry.suppliers.find(s => s.id === batch.supplierId);
  if (!supplier) issue(problems, 'unknown_supplier');
  if (batch.sourceCount !== batch.items.length) issue(problems, 'source_count_mismatch');
  if (batch.supplierId !== 'concorde-pro') issue(problems, 'unexpected_public_source_batch');
  for (const product of batch.items) {
    if (!product || typeof product !== 'object' || Array.isArray(product)) {
      issue(problems, 'malformed_candidate'); continue;
    }
    const id = product.storeResearchId;
    if (!Number.isSafeInteger(id) || id <= 0) issue(problems, 'invalid_research_id', id ?? null);
    else if (seenIds.has(id)) issue(problems, 'duplicate_research_id', id);
    else seenIds.add(id);
    if (typeof product.brand !== 'string' || !product.brand.trim() ||
        typeof product.storePreviewName !== 'string' || !product.storePreviewName.trim()) {
      issue(problems, 'missing_display_identity', id);
    }
    if (!validOfficialSource(product.sourceUrl)) issue(problems, 'non_official_source_url', id);
    else if (seenURLs.has(product.sourceUrl)) issue(problems, 'duplicate_source_url', id);
    else seenURLs.add(product.sourceUrl);
    const ref = typeof product.supplierReference === 'string' ? product.supplierReference.trim() : '';
    const ean = typeof product.ean === 'string' ? product.ean.trim() : '';
    if (!ref && !ean) issue(review, 'missing_supplier_identifier', id);
    if (ean) {
      if (!validEAN13(ean)) issue(problems, 'invalid_ean13', id);
      else if (seenEANs.has(ean)) issue(problems, 'duplicate_ean13', id);
      else seenEANs.add(ean);
    }
    // Research data cannot authorize commercial claims, even if a supplier
    // account exists. A changed approval flag requires separate reconciliation.
    if (product.canPublishAsPurchasable !== false || product.verifiedStock !== false ||
        product.verifiedWholesalePrice !== false || product.photoLicense !== false ||
        product.dropshipAuthorized !== false || !Array.isArray(product.resaleTerritoriesApproved) ||
        product.resaleTerritoriesApproved.length !== 0) {
      issue(problems, 'research_candidate_has_unverified_commercial_claim', id);
    }
  }
  return {
    supplierId: batch.supplierId,
    destinationCountry,
    researchCandidates: batch.items.length,
    researchOnly: batch.items.length,
    shippingEligible: 0,
    shippingUnverified: batch.items.length,
    publicationEligible: 0,
    invalidCount: problems.length,
    reviewCount: review.length,
    problems, review,
    readOnly: true,
    conclusion: problems.length ? 'FAIL_RESEARCH_INTEGRITY' : 'RESEARCH_ONLY_NOT_FOR_SALE'
  };
}

const localFile = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (localFile) {
  const directory = dirname(fileURLToPath(import.meta.url));
  const registry = JSON.parse(readFileSync(join(directory, 'supplier-registry.json'), 'utf8'));
  const batch = JSON.parse(readFileSync(join(directory, 'concorde-public-candidates.json'), 'utf8'));
  const report = auditResearchCandidates(registry, batch);
  console.log(JSON.stringify(report, null, 2));
  if (report.invalidCount > 0) process.exitCode = 1;
}

/**
 * Offline, read-only creator research summary. Input must be a deliberately
 * authorized JSON array of form records. No network access or file writes.
 * Never include email, alias, free-text answers, individual rows, or IDs.
 */
const OPTIONS = Object.freeze({
  'creator-format': ['Subscription content', 'Live streaming', 'Independent / social', 'Product reviews', 'Other'],
  'privacy-priority': ['Private delivery address', 'Discreet packaging', 'Control over fan contact', 'Secure gifting and order updates', 'Other / all equally important'],
  'future-opportunities': ['Help test new wishlist features', 'Affiliate or referral commissions (if established)', 'Product testing or review collaborations', 'Exclusive merchandise collaborations', 'Only giving feedback, no promotion']
});

/** Only aggregate consented records; every reported bucket needs >=5 responses. */
export function aggregateCreatorFeedback(records) {
  if (!Array.isArray(records)) throw new TypeError('Expected array of feedback records');
  const eligible = records.filter(row => row && typeof row === 'object' && !Array.isArray(row) && row['response-consent'] === 'yes' && (row['form-name'] == null || row['form-name'] === 'creator-feedback') && (row['bot-field'] == null || row['bot-field'] === ''));
  const groups = {};
  for (const [field, options] of Object.entries(OPTIONS)) {
    const counts = Object.fromEntries(options.map(x => [x, 0]));
    for (const row of eligible) {
      if (typeof row[field] === 'string' && Object.hasOwn(counts, row[field])) counts[row[field]]++;
    }
    // Suppress all small groups; do not emit total exact counts or other/unknown buckets.
    groups[field] = Object.fromEntries(Object.entries(counts).filter(([, count]) => count >= 5));
  }
  return Object.freeze({
    schemaVersion: 1,
    consentedSample: eligible.length < 5 ? 'below_reporting_threshold' : 'at_least_five',
    minimumGroupSize: 5,
    groups,
    internalResearchOnly: true,
    containsIndividualResponses: false
  });
}

// YXROBOT offline draft adapter. Accepts rows from the five verified supplier tabs.
// Does not fetch the supplier spreadsheet, publish products, or assume resale/media rights.
const TABS = Object.freeze(['STPE', 'Silicone', 'Hybrid', 'AI Robot', 'Anime']);
const field = (v) => v == null ? '' : String(v).trim();
const norm = (v) => field(v).normalize('NFKC').toUpperCase();
const keyPart = (v) => encodeURIComponent(norm(v));
const validHeight = (v) => /^\d{2,3}$/.test(field(v)) && Number(v) >= 100 && Number(v) <= 250;
function draftYXRobotRow(tab, cells, sourceRow) {
  if (!TABS.includes(tab)) throw new TypeError('Unknown YXROBOT tab');
  if (!Array.isArray(cells) || !Number.isSafeInteger(sourceRow) || sourceRow < 2) throw new TypeError('Invalid source row');
  const head = field(cells[1]), height = field(cells[2]), cup = field(cells[3]);
  const material = tab === 'Anime' ? field(cells[4]) : tab;
  const reference = field(cells[tab === 'Anime' ? 5 : 4]);
  if (!head || !/^[\p{L}\p{N}#._-]{1,80}$/u.test(head) || !validHeight(height) || !cup || !reference || reference.length > 250) {
    throw new TypeError('Incomplete YXROBOT model at ' + tab + ':' + sourceRow);
  }
  const supplierSku = [tab, head, height, cup, material, reference].map(keyPart).join(':');
  return Object.freeze({
    supplier: 'yxrobot', supplierSku, category: tab, headId: head, bodyHeightCm: Number(height),
    cup, material, supplierReference: reference, sourceTab: tab, sourceRow,
    status: 'draft', published: false, mediaRightsVerified: false, resaleAuthorized: false,
    wholesaleCents: null, currency: null, stock: null, shippingCountries: Object.freeze([]),
    fulfillmentVerified: false
  });
}
function draftYXRobotCatalogue(sheets) {
  if (!sheets || typeof sheets !== 'object' || Array.isArray(sheets)) throw new TypeError('Expected tab-to-rows object');
  const drafts = [], rejected = [], seen = new Set();
  for (const tab of TABS) {
    const rows = sheets[tab];
    if (!Array.isArray(rows) || rows.length > 10000) throw new TypeError('Missing/invalid YXROBOT tab: ' + tab);
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i];
      if (!Array.isArray(cells) || cells.every(v => !field(v))) continue;
      try {
        const draft = draftYXRobotRow(tab, cells, i + 1);
        if (seen.has(draft.supplierSku)) throw new TypeError('Duplicate model variant key');
        seen.add(draft.supplierSku);
        drafts.push(draft);
      } catch (e) {
        rejected.push(Object.freeze({ tab, row: i + 1, reason: e.message }));
      }
    }
  }
  return Object.freeze({ drafts: Object.freeze(drafts), rejected: Object.freeze(rejected),
    summary: Object.freeze({ imported: drafts.length, rejected: rejected.length, published: 0 }) });
}
export { TABS, draftYXRobotRow, draftYXRobotCatalogue };

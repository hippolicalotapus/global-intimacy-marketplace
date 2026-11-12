import test from 'node:test';
import assert from 'node:assert/strict';
import { TABS, draftYXRobotRow, draftYXRobotCatalogue } from './yxrobot-draft-import.mjs';

const sample = () => ({
  STPE: [['商图','头雕#','身型','罩杯','链接'],['','56','150','M Cup','150cm-#56']],
  Silicone: [['商图','头雕#','身型/CM','罩杯','链接'],['','198','163','H Cup','163cm-#198-妆1']],
  Hybrid: [['商图','头雕#','身型','罩杯','链接'],['','SS167','159','C Cup','159cm-#SS167']],
  'AI Robot': [['商图','头雕#','身型','罩杯','链接'],[null,'1068','164','F Cup','Silicone 164cm+AI Head 1068']],
  Anime: [['商图','头雕#','身型','罩杯','身型材质','链接'],['','Y001','146','C Cup','STPE','146cm-#Y001-妆1']]
});
test('imports every category as private, unpublished draft with no invented costs', () => {
  const result = draftYXRobotCatalogue(sample());
  assert.deepEqual(TABS, ['STPE','Silicone','Hybrid','AI Robot','Anime']);
  assert.equal(result.summary.imported, 5);
  assert.equal(result.summary.published, 0);
  assert.equal(result.summary.rejected, 0);
  for (const d of result.drafts) {
    assert.equal(d.status, 'draft');
    assert.equal(d.published, false);
    assert.equal(d.wholesaleCents, null);
    assert.equal(d.mediaRightsVerified, false);
    assert.equal(d.fulfillmentVerified, false);
    assert.ok(Object.isFrozen(d));
  }
});
test('preserves distinct variants with same head ID', () => {
  const data = sample();
  data.STPE.push(['','56','156','H Cup','156cm-#56']);
  const result = draftYXRobotCatalogue(data);
  assert.equal(result.summary.imported, 6);
  assert.notEqual(result.drafts[0].supplierSku, result.drafts[1].supplierSku);
});
test('rejects duplicate and incomplete rows without publishing', () => {
  const data = sample();
  data.STPE.push(['','56','150','M Cup','150cm-#56']);
  data.STPE.push(['','', '150','M Cup','missing head']);
  const result = draftYXRobotCatalogue(data);
  assert.equal(result.summary.imported, 5);
  assert.equal(result.summary.rejected, 2);
  assert.equal(result.summary.published, 0);
});
test('does not modify source data and rejects unsupported tabs', () => {
  const data = sample();
  const before = JSON.stringify(data);
  draftYXRobotCatalogue(data);
  assert.equal(JSON.stringify(data), before);
  assert.throws(() => draftYXRobotRow('unknown',['','56','150','M Cup','x'],2));
  assert.throws(() => draftYXRobotCatalogue({STPE: []}), /Missing/);
});

test('preserves supplier body codes without inventing a numeric height', () => {
  const x = draftYXRobotRow('STPE', ['', '53', 'B15', '/', 'B15-#53'], 48);
  assert.equal(x.bodySizeRaw, 'B15');
  assert.equal(x.bodyHeightCm, null);
  assert.equal(x.published, false);
});

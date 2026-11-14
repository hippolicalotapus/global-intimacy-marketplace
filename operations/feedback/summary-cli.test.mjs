import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('./summary-cli.mjs', import.meta.url));
const run = args => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
const withFile = (content, fn) => {
  const dir = mkdtempSync(join(tmpdir(), 'gim-summary-'));
  const path = join(dir, 'fictional.json');
  try { writeFileSync(path, content); fn(path); }
  finally { rmSync(dir, { recursive: true, force: true }); }
};
const example = () => ({
  'response-consent': 'yes', 'form-name': 'creator-feedback', 'bot-field': '',
  'creator-format': 'Product reviews', 'stage-name': 'PrivateStage',
  'email': 'private@example.invalid', 'must-have-feature': 'Private need'
});

test('CLI reports only privacy-filtered grouped data from a local JSON export', () => {
  withFile(JSON.stringify(Array.from({length: 5}, example)), path => {
    const result = run(['--input', path]);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.groups['creator-format']['Product reviews'], 5);
    assert.equal(report.internalResearchOnly, true);
    assert.ok(!result.stdout.includes('PrivateStage'));
    assert.ok(!result.stdout.includes('private@example.invalid'));
    assert.ok(!result.stdout.includes('Private need'));
  });
});
test('CLI suppresses small groups and excludes non-consenting entries', () => {
  const rows = [...Array.from({length:4}, example), {...example(), 'response-consent':'no'}];
  withFile(JSON.stringify(rows), path => {
    const result = run(['--input', path]);
    assert.equal(result.status, 0);
    assert.deepEqual(JSON.parse(result.stdout).groups['creator-format'], {});
  });
});
test('CLI requires an explicit input argument', () => {
  const result = run([]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Usage:/);
  assert.equal(result.stdout, '');
});
test('CLI fails closed for invalid JSON and never echoes user content', () => {
  withFile('{"email":"secret@example.invalid", invalid', path => {
    const result = run(['--input', path]);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.ok(!result.stderr.includes('secret@example.invalid'));
    assert.ok(!result.stderr.includes(path));
  });
});
test('CLI rejects oversized input without producing raw records', () => {
  withFile('x'.repeat(1024*1024+1), path => {
    const result=run(['--input',path]);
    assert.equal(result.status,1);
    assert.equal(result.stdout,'');
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateCreatorFeedback } from './aggregate.mjs';
const row = (more={}) => ({'response-consent':'yes','creator-format':'Product reviews','privacy-priority':'Private delivery address','future-opportunities':'Help test new wishlist features','stage-name':'Sensitive Alias','email':'private@example.com','must-have-feature':'Sensitive free text',...more});

test('rejects malformed inputs',()=>{
  assert.throws(()=>aggregateCreatorFeedback(null), /Expected array/);
  assert.throws(()=>aggregateCreatorFeedback({}), /Expected array/);
});
test('ignores non-consenting, empty and malformed rows',()=>{
  const report=aggregateCreatorFeedback([row({'response-consent':'no'}),null,[],{},'example']);
  assert.equal(report.consentedSample,'below_reporting_threshold');
  assert.deepEqual(report.groups['creator-format'],{});
});
test('suppresses all counts for a group with fewer than five responses',()=>{
  const report=aggregateCreatorFeedback(Array.from({length:4},()=>row()));
  assert.deepEqual(report.groups['privacy-priority'],{});
  assert.ok(!JSON.stringify(report).includes('4'));
});
test('reports only allowlisted categories with five or more consented selections',()=>{
  const report=aggregateCreatorFeedback([...Array.from({length:5},()=>row()),row({'creator-format':'Other','privacy-priority':'Other / all equally important'})]);
  assert.equal(report.groups['creator-format']['Product reviews'],5);
  assert.equal(report.groups['privacy-priority']['Private delivery address'],5);
  assert.equal(report.groups['future-opportunities']['Help test new wishlist features'],6);
  assert.equal(report.groups['creator-format'].Other,undefined);
});
test('never copies stage names, email, free text, unknown options or per-person records',()=>{
  const report=aggregateCreatorFeedback(Array.from({length:5},()=>row({'email':'test@secret.invalid','stage-name':'ConfidentialAlias','products-wanted':'ConfidentialText','creator-format':'=IMPORTXML("https://evil")'})));
  const serialized=JSON.stringify(report);
  for(const sensitive of ['test@secret.invalid','ConfidentialAlias','ConfidentialText','IMPORTXML','products-wanted','email','stage-name']) assert.ok(!serialized.includes(sensitive),sensitive);
  assert.deepEqual(report.groups['creator-format'],{});
});
test('does not mutate supplied data',()=>{
  const records=[row()];const copy=structuredClone(records);
  aggregateCreatorFeedback(records);
  assert.deepEqual(records,copy);
});

test('rejects honeypot submissions even if consent checkbox was spoofed',()=>{
  const spam=Array.from({length:5},()=>row({'bot-field':'robot-content'}));
  const report=aggregateCreatorFeedback(spam);
  assert.equal(report.consentedSample,'below_reporting_threshold');
  assert.deepEqual(report.groups['creator-format'],{});
});
test('accepts genuine blank honeypot submissions',()=>{
  const report=aggregateCreatorFeedback(Array.from({length:5},()=>row({'bot-field':''})));
  assert.equal(report.groups['creator-format']['Product reviews'],5);
});

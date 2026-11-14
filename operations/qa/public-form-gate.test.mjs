import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditHtmlForms,auditSiteForms} from './public-form-gate.mjs';
const approved = '<form id="cf-form" name="creator-feedback" method="POST" action="/creator-feedback-thanks.html" data-netlify="true"></form>';
test('approved creator feedback action remains allowed',()=>assert.deepEqual(auditHtmlForms(approved,'site/creator-feedback.html'),[]));
test('the approved form is rejected on an unexpected page',()=>assert.match(auditHtmlForms(approved,'site/index.html').join(' '),/unapproved POST/));
test('unapproved or implicit post destinations are rejected',()=>{
  assert.match(auditHtmlForms('<form method="POST"></form>').join(' '),/unapproved POST/);
  assert.match(auditHtmlForms('<form method="POST" action="/submit"></form>').join(' '),/unapproved POST/);
});
test('external, protocol-relative and payment action targets rejected',()=>{
  for(const a of ['https://invalid.example/submit','//invalid.example/post','/api/orders','/checkout']) {
    assert.ok(auditHtmlForms(`<form action="${a}">`).length > 0,a);
  }
});
test('formaction override rejected for buttons and inputs',()=>{
  for(const tag of ['<button type="submit" formaction="/pay">Pay</button>','<input type="submit" formaction="https://invalid.example">']){
    assert.match(auditHtmlForms(tag).join(' '),/override forbidden/);
  }
});
test('demo GET forms with no external destination remain allowed',()=>{
  assert.deepEqual(auditHtmlForms('<form id="storeSearchForm" role="search"><input type="search"></form>'),[]);
});
test('site-file scanner audits every root HTML page and reports unsafe forms',()=>{
  const dir=mkdtempSync(join(tmpdir(),'gim-form-'));
  try { writeFileSync(join(dir,'a.html'),approved);writeFileSync(join(dir,'b.html'),'<form method="POST" action="https://invalid.example">');
    const issues=auditSiteForms(dir);assert.ok(issues.length>=2);
  } finally {rmSync(dir,{recursive:true,force:true});}
});

test('all public HTML pages pass the prelaunch form gate', () => {
  const sourceSite = new URL('../../site/', import.meta.url);
  assert.deepEqual(auditSiteForms(fileURLToPath(sourceSite)), []);
});

test('formmethod override cannot activate a POST request',()=>{
  assert.match(auditHtmlForms('<form><button type="submit" formmethod="POST">Send</button></form>').join(' '),/submit override forbidden/);
  assert.match(auditHtmlForms('<form><input type="submit" formmethod="post"></form>').join(' '),/submit override forbidden/);
});
test('duplicate action attributes cannot conceal an external form endpoint',()=>{
  const issues = auditHtmlForms('<form action="https://invalid.example/collect" action=""></form>');
  assert.match(issues.join(' '),/duplicate submission attribute forbidden/);
  assert.match(issues.join(' '),/external form action/);
});
test('duplicate method attributes cannot conceal an unapproved POST',()=>{
  const issues = auditHtmlForms('<form method="POST" method="GET"></form>');
  assert.match(issues.join(' '),/duplicate submission attribute forbidden/);
  assert.match(issues.join(' '),/unapproved POST/);
});

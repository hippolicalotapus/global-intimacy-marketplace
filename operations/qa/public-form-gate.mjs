/** Offline prelaunch HTML form audit. Never submits or modifies a form. */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ATTR = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
function attrs(tag) {
  const values = Object.create(null);
  for (const match of tag.matchAll(ATTR)) values[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4];
  return values;
}

/** Fail closed for unexpected submissions, external targets and checkout. */
export function auditHtmlForms(html, file = 'page.html') {
  const findings = [];
  const tags = html.match(/<(?:form|button|input)\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const kind = /^<([a-z]+)/i.exec(tag)[1].toLowerCase();
    const a = attrs(tag);
    const id = `${file}:${kind}${a.id ? `#${a.id}` : ''}`;
    if ('formaction' in a) findings.push(`${id}: form submit override forbidden`);
    if (kind !== 'form') continue;
    const method = (a.method ?? 'get').toLowerCase();
    const target = (a.action ?? '').trim();
    const isApproved = file === 'site/creator-feedback.html' && a.name === 'creator-feedback' && method === 'post' && target === '/creator-feedback-thanks.html' && a['data-netlify'] === 'true';
    if (method === 'post' && !isApproved) findings.push(`${id}: unapproved POST form`);
    if (!['get', 'post'].includes(method)) findings.push(`${id}: invalid form method`);
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target)) findings.push(`${id}: external form action`);
    if (/checkout|\/api\/orders|\/api\/payments/i.test(target)) findings.push(`${id}: checkout or payment action forbidden`);
  }
  return findings;
}
export function auditSiteForms(siteDirectory) {
  const findings = [];
  for (const entry of readdirSync(siteDirectory, {withFileTypes:true})) {
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    const path = join(siteDirectory, entry.name);
    findings.push(...auditHtmlForms(readFileSync(path,'utf8'), `site/${entry.name}`));
  }
  return findings;
}

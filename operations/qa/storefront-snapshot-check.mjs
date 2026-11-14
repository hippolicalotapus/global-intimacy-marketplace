import { readFile, realpath } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export async function checkSnapshot(root, manifest) {
  if (!manifest || !Array.isArray(manifest.files)) throw new Error('Invalid snapshot manifest');
  const base = await realpath(root);
  const files = [];
  const seen = new Set();
  for (const entry of manifest.files) {
    const name = entry?.path;
    if (typeof name !== 'string' || !/^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(name) ||
        name.split('/').includes('..') || seen.has(name) || !/^[a-f0-9]{40}$/.test(entry?.sha)) {
      throw new Error(`Invalid snapshot entry: ${String(name)}`);
    }
    seen.add(name);
    const path = resolve(base, name);
    try {
      const canonical = await realpath(path);
      const rel = relative(base, canonical);
      if (rel === '..' || rel.startsWith(`..${sep}`) || rel.startsWith(sep)) {
        files.push({path: name, status: 'outside-root'});
        continue;
      }
      const data = await readFile(canonical);
      const sha = createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
      const status = sha === entry.sha && (entry.size == null || data.length === entry.size) ? 'verified' : 'mismatch';
      files.push({path: name, status});
    } catch (error) {
      if (error?.code === 'ENOENT') files.push({path: name, status: 'missing'});
      else throw error;
    }
  }
  const verified = files.filter(x => x.status === 'verified').length;
  return {sourceCommit: manifest.sourceCommit, total: files.length, verified,
    missing: files.filter(x => x.status === 'missing').length,
    mismatched: files.filter(x => x.status === 'mismatch' || x.status === 'outside-root').length,
    files};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] || resolve(fileURLToPath(new URL('../../', import.meta.url)));
  const manifestPath = process.argv[3] || resolve(fileURLToPath(new URL('./storefront-snapshot-manifest.json', import.meta.url)));
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const result = await checkSnapshot(root, manifest);
  console.log(JSON.stringify(result, null, 2));
  if (result.verified !== result.total) process.exitCode = 1;
}

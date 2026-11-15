import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, rename, rm, stat, writeFile, mkdtemp } from 'node:fs/promises';
import { resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSnapshot } from './storefront-snapshot-check.mjs';

const DEFAULT_REPOSITORY = 'hippolicalotapus/global-intimacy-marketplace';
const shaFor = data => createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
const safeName = name => typeof name === 'string' && /^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(name) && !name.split('/').includes('..');

/** Download immutable Git blobs, validate hashes, then publish a verified local snapshot. */
export async function materializeStorefront({ manifest, destination, token, fetchImpl = fetch, repository = DEFAULT_REPOSITORY }) {
  if (repository !== DEFAULT_REPOSITORY) throw new Error('Unexpected GitHub repository');
  if (!token || !/^[^\s]+$/.test(token)) throw new Error('GITHUB_TOKEN must be supplied securely at runtime');
  if (!manifest || !/^[a-f0-9]{40}$/.test(manifest.sourceCommit) || !Array.isArray(manifest.files) || manifest.files.length < 1) throw new Error('Invalid pinned snapshot manifest');
  const seen = new Set();
  for (const file of manifest.files) {
    if (!safeName(file.path) || seen.has(file.path) || [...seen].some(p => p.startsWith(`${file.path}/`) || file.path.startsWith(`${p}/`)) || !/^[a-f0-9]{40}$/.test(file.sha) || !Number.isSafeInteger(file.size) || file.size < 0) throw new Error('Invalid manifest file entry');
    seen.add(file.path);
  }
  const parent = await realpath(dirname(resolve(destination)));
  const out = resolve(destination);
  const rel = relative(parent, out);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || rel.startsWith(sep)) throw new Error('Unsafe snapshot destination');
  try { await stat(out); throw new Error('Snapshot destination already exists: refusing overwrite'); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  const stage = await mkdtemp(resolve(parent, '.gim-snapshot-'));
  try {
    for (const entry of manifest.files) {
      const url = `https://api.github.com/repos/${repository}/git/blobs/${entry.sha}`;
      const response = await fetchImpl(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
        redirect: 'error', signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(`Cannot retrieve ${entry.path}: GitHub HTTP ${response.status}`);
      const body = await response.json();
      if (body.sha !== entry.sha || body.encoding !== 'base64' || typeof body.content !== 'string') throw new Error(`Invalid GitHub blob response: ${entry.path}`);
      const b64 = body.content.replace(/\s/g, '');
      if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(b64)) throw new Error(`Invalid base64: ${entry.path}`);
      const bytes = Buffer.from(b64, 'base64');
      if (bytes.length !== entry.size || shaFor(bytes) !== entry.sha) throw new Error(`Blob checksum mismatch: ${entry.path}`);
      const target = resolve(stage, entry.path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, bytes, { flag: 'wx', mode: 0o600 });
    }
    const result = await checkSnapshot(stage, manifest);
    if (result.verified !== result.total) throw new Error('Snapshot validation failed');
    await rename(stage, out);
    return { ...result, directory: out };
  } catch (error) {
    await rm(stage, { recursive: true, force: true });
    throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
  const manifest = JSON.parse(await readFile(resolve(root, 'operations/qa/storefront-snapshot-manifest.json'), 'utf8'));
  const target = resolve(process.argv[2] || '/mnt/data/gim-storefront-verified');
  const result = await materializeStorefront({ manifest, destination: target, token: process.env.GITHUB_TOKEN });
  console.log(`Verified ${result.verified}/${result.total} files in ${result.directory}; commit ${result.sourceCommit}`);
}

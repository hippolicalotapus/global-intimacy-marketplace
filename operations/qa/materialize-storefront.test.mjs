import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { materializeStorefront } from './materialize-storefront.mjs';

const hash = b => createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const fixture = async fn => { const d=await mkdtemp(join(tmpdir(),'gim-transfer-'));try{await fn(d);}finally{await rm(d,{force:true,recursive:true});} };
const manifestFor = content => ({sourceCommit:'a'.repeat(40),files:Object.entries(content).map(([path,value])=>{
  const b=Buffer.from(value);return {path,sha:hash(b),size:b.length};
})});
const respond = (content, { corrupt = false, log=[] }={}) => async (url, options) => {
  log.push({url, options});
  const item=Object.values(content).map(v=>Buffer.from(v)).find(b=>url.endsWith(hash(b)));
  if(!item) return {ok:false,status:404};
  return {ok:true, json:async()=>({sha:hash(item),encoding:'base64',content:(corrupt?Buffer.from('corrupted'):item).toString('base64')})};
};

test('materializes all expected files, verifies immutable blobs and keeps token out of output',async()=>fixture(async dir=>{
  const content={'site/index.html':'<main>Hello</main>','tests/site.smoke.test.mjs':'import test from "node:test";','site/assets/approved-logo.svg':'<svg/>'};
  const manifest=manifestFor(content), log=[], target=join(dir,'snapshot');
  const result=await materializeStorefront({manifest,destination:target,token:'fake-offline-token',fetchImpl:respond(content,{log})});
  assert.equal(result.verified,3);
  assert.equal(result.missing,0);
  assert.equal(result.mismatched,0);
  assert.equal(log.length,3);
  assert.ok(log.every(x=>x.url.includes('/git/blobs/')&&x.options.redirect==='error'));
  assert.ok(log.every(x=>x.options.headers.Authorization==='Bearer fake-offline-token'));
  assert.ok(!JSON.stringify(result).includes('fake-offline-token'));
  for(const [name, value] of Object.entries(content))assert.equal(await readFile(join(target,name),'utf8'),value);
}));

test('fails closed on corrupt blob and leaves no published snapshot',async()=>fixture(async dir=>{
  const manifest=manifestFor({'site/a.js':'valid'}), destination=join(dir,'snapshot');
  await assert.rejects(materializeStorefront({manifest,destination,token:'offline',fetchImpl:respond({'site/a.js':'valid'},{corrupt:true})}),/checksum mismatch/);
  await assert.rejects(stat(destination),{code:'ENOENT'});
  assert.deepEqual(await readdir(dir),[]);
}));

test('rejects missing token, traversal and duplicate paths before transfer',async()=>fixture(async dir=>{
  const manifest=manifestFor({'site/a.js':'valid'});
  await assert.rejects(materializeStorefront({manifest,destination:join(dir,'snapshot')}),/GITHUB_TOKEN/);
  const bad={...manifest,files:[{...manifest.files[0],path:'../escaped'}]};
  await assert.rejects(materializeStorefront({manifest:bad,destination:join(dir,'snapshot'),token:'offline'}),/Invalid manifest/);
  const duplicate={...manifest,files:[manifest.files[0],manifest.files[0]]};
  await assert.rejects(materializeStorefront({manifest:duplicate,destination:join(dir,'snapshot'),token:'offline'}),/Invalid manifest/);
}));

test('refuses overwrite of an existing snapshot',async()=>fixture(async dir=>{
  const content={'x.js':'hello'}, manifest=manifestFor(content), destination=join(dir,'snapshot');
  await materializeStorefront({manifest,destination,token:'offline',fetchImpl:respond(content)});
  await assert.rejects(materializeStorefront({manifest,destination,token:'offline',fetchImpl:respond(content)}),/already exists/);
  assert.equal(await readFile(join(destination,'x.js'),'utf8'),'hello');
}));


test('rejects parent-child manifest path collisions in either order before transfer',async()=>fixture(async dir=>{
 const base=manifestFor({'site/index.html':'hello'}).files[0];
 for(const files of [[{...base,path:'site'},base],[base,{...base,path:'site'}]]){
  const manifest={sourceCommit:'a'.repeat(40),files};
  await assert.rejects(materializeStorefront({manifest,destination:join(dir,'snapshot'),token:'offline'}),/Invalid manifest/);
 }
}));

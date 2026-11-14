import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const require=createRequire(import.meta.url);
const {REQUIRED,inspect,execute}=require('../operations/custom-apparel/offline-regression.cjs');
function fixture(fn){
  const root=mkdtempSync(path.join(os.tmpdir(),'gim-preflight-'));
  try{return fn(root)}finally{rmSync(root,{recursive:true,force:true})}
}
function populate(root){for(const rel of REQUIRED){const p=path.join(root,rel);mkdirSync(path.dirname(p),{recursive:true});writeFileSync(p,'// isolated fixture\n');}}
test('incomplete checkout fails closed without running any regression',()=>fixture(root=>{
  let called=false;const r=execute(root,()=>{called=true;throw Error('should not run')});
  assert.equal(r.executed,false);assert.equal(r.status,'blocked_missing_files');assert.equal(called,false);
  assert.ok(r.missing.includes('site/index.html'));
}));
test('complete fixture enables only offline Node test invocation',()=>fixture(root=>{
  populate(root);let command,argv,opts;
  const r=execute(root,(c,a,o)=>{command=c;argv=a;opts=o;return {status:0,stdout:'# pass 1\n',stderr:''};});
  assert.equal(r.passed,true);assert.equal(r.executed,true);
  assert.equal(command,process.execPath);assert.equal(argv[0],'--test');
  assert.ok(argv.includes('operations/suppliers/import-feed.test.mjs'));
  assert.equal(argv.length,REQUIRED.filter(x=>x.startsWith('tests/')).length+2);
  assert.equal(opts.cwd,root);
}));
test('nonzero test status is reported as failure not success',()=>fixture(root=>{
  populate(root);const r=execute(root,()=>({status:1,stdout:'# fail 2',stderr:'test failure'}));
  assert.equal(r.passed,false);assert.equal(r.status,'failed');assert.equal(r.exitCode,1);
}));
test('node execution errors fail closed',()=>fixture(root=>{
  populate(root);const r=execute(root,()=>({status:null,error:new Error('timeout')}));
  assert.equal(r.passed,false);assert.equal(r.status,'execution_error');
}));
test('required manifest has no duplicate or unsafe paths',()=>{
  assert.equal(new Set(REQUIRED).size,REQUIRED.length);
  for(const rel of REQUIRED){assert.ok(!path.isAbsolute(rel));assert.ok(!rel.split('/').includes('..'));}
  assert.ok(REQUIRED.includes('.github/workflows/beta-checks.yml'));
});
test('a partial checkout cannot be misreported as full regression',()=>fixture(root=>{
  populate(root);
  rmSync(path.join(root,'tests/storefront.behavior.test.mjs'));
  const report=inspect(root);
  assert.equal(report.ready,false);
  assert.ok(report.missing.includes('tests/storefront.behavior.test.mjs'));
}));

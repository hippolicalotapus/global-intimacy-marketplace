import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {verifyPublicFormsInSnapshot,runVerifiedFormSuite} from './verified-form-suite.mjs';
const sha='b63bfe7419ecd85fbbf44fc14c957662b444b5b5';
const names=['creator-feedback-thanks.html','creator-feedback.html','drawing-review.html','index.html','lookbook.html'];
const form='<form name="creator-feedback" method="POST" action="/creator-feedback-thanks.html" data-netlify="true"></form>';
const core={sourceCommit:sha,files:names.map(path=>({path:`site/${path}`,sha:'a'.repeat(40),size:1}))};
const images={sourceCommit:sha,files:[{path:'site/assets/apparel/cards/oh-a01.webp',sha:'b'.repeat(40),size:1}]};
async function withSite(fn){
  const d=mkdtempSync(join(tmpdir(),'gim-form-bridge-'));
  try{
    mkdirSync(join(d,'site'));
    for(const n of names)writeFileSync(join(d,'site',n),n==='creator-feedback.html'?form:'<form id="demo"></form>');
    return await fn(d);
  }finally{rmSync(d,{recursive:true,force:true});}
}
test('audits the verified public HTML set without findings',()=>withSite(d=>assert.doesNotThrow(()=>verifyPublicFormsInSnapshot(d,{files:core.files}))));
test('refuses manifest missing any public HTML page',()=>withSite(d=>assert.throws(()=>verifyPublicFormsInSnapshot(d,{files:core.files.slice(1)}),/Unverified public HTML/)));
test('rejects an unsafe form even within otherwise valid snapshot',()=>withSite(d=>{
  writeFileSync(join(d,'site','index.html'),'<form method="POST" action="https://invalid.example">');
  assert.throws(()=>verifyPublicFormsInSnapshot(d,{files:core.files}),/Public form audit failed/);
}));
test('runs existing storefront test runner only after form audit',()=>withSite(async d=>{
  let count=0;
  const result=await runVerifiedFormSuite({core,images,transfer:async()=>({directory:d,verified:6,missing:0,mismatched:0}),runner:async()=>{count++;return 0}});
  assert.equal(count,1);assert.equal(result.exitCode,0);
}));
test('does not run storefront tests when form verification fails',async()=>{
  let count=0;
  await assert.rejects(runVerifiedFormSuite({core,images,transfer:async()=>({directory:'/nonexistent',verified:6,missing:0,mismatched:0}),runner:async()=>{count++;return 0}}));
  assert.equal(count,0);
});
test('does not run form audit or storefront tests for incomplete transfer',async()=>{
  let count=0;
  await assert.rejects(runVerifiedFormSuite({core,images,transfer:async()=>({directory:'/nonexistent',verified:5,missing:1,mismatched:0}),runner:async()=>{count++;return 0}}),/Incomplete verified/);
  assert.equal(count,0);
});

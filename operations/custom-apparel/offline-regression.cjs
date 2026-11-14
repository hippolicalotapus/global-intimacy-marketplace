"use strict";
/* Local-only regression preflight. No network, deployment, publishing or checkout actions. */
const {existsSync, readdirSync, statSync} = require("node:fs");
const path = require("node:path");
const {spawnSync} = require("node:child_process");

const REQUIRED = Object.freeze([
  ".github/workflows/beta-checks.yml",
  "operations/custom-apparel/browser-demo.js",
  "operations/custom-apparel/index.html",
  "operations/custom-apparel/mock-order.cjs",
  "operations/custom-apparel/offline-regression.cjs",
  "operations/custom-apparel/print-zone-specifications.json",
  "operations/custom-apparel/proof-checklist.cjs",
  "operations/custom-apparel/supplier-readiness.cjs",
  "operations/one-heart/quote-preview.cjs",
  "operations/suppliers/import-feed.mjs",
  "operations/suppliers/import-feed.test.mjs",
  "operations/suppliers/supplier-registry.json",
  "site/app.js",
  "site/apparel.js",
  "site/catalog.js",
  "site/countries.js",
  "site/creator-feedback.html",
  "site/creator-feedback.js",
  "site/creator-feedback-thanks.html",
  "site/drawing-register.json",
  "site/globe-math.js",
  "site/globe-3d.js",
  "site/globe-software.js",
  "site/destination.js",
  "site/index.html",
  "site/lookbook.html",
  "site/product-drawings.js",
  "site/ruby-welcome.js",
  "site/ruby-welcome.css",
  "site/share-preview.js",
  "site/shipping.js",
  "site/styles.css",
  "site/assets/approved-logo.svg",
  "site/assets/social/one-heart-preview.png",
  "site/assets/welcome/1000156129.png",
  "tests/creator-feedback.test.mjs",
  "tests/custom-apparel.test.mjs",
  "tests/globe.test.mjs",
  "tests/one-heart-quote.test.mjs",
  "tests/offline-regression.test.mjs",
  "tests/product-drawings.test.mjs",
  "tests/proof-checklist.test.mjs",
  "tests/ruby-welcome.test.mjs",
  "tests/sharing.test.mjs",
  "tests/shipping.test.mjs",
  "tests/site.smoke.test.mjs",
  "tests/storefront.behavior.test.mjs"
]);

function inspect(root) {
  const fullRoot=path.resolve(root);
  const missing=REQUIRED.filter(rel=> !existsSync(path.join(fullRoot,rel)) || !statSync(path.join(fullRoot,rel)).isFile());
  const testDir=path.join(fullRoot,"tests");
  const testFiles=existsSync(testDir) ? readdirSync(testDir).filter(name=>name.endsWith(".test.mjs")).sort().map(name=>path.join("tests",name)) : [];
  const expectedTests=REQUIRED.filter(x=>x.startsWith("tests/")&&x.endsWith(".test.mjs"));
  const extraTests=testFiles.filter(x=>!expectedTests.includes(x));
  return Object.freeze({ready:missing.length===0,missing:Object.freeze(missing),tests:Object.freeze(testFiles),extraTests:Object.freeze(extraTests)});
}
function execute(root,runner=spawnSync) {
  const check=inspect(root);
  if(!check.ready) return Object.freeze({status:"blocked_missing_files",passed:false,missing:check.missing,executed:false});
  const args=["--test",...check.tests,"operations/suppliers/import-feed.test.mjs"];
  const result=runner(process.execPath,args,{cwd:path.resolve(root),encoding:"utf8",timeout:120000});
  return Object.freeze({status:result.error?"execution_error":result.status===0?"passed":"failed",passed:result.status===0&&!result.error,
    executed:true,exitCode:result.status,stdout:result.stdout||"",stderr:result.stderr||""});
}
if(require.main===module){
  const root=process.argv[2]||process.cwd();
  const run=process.argv.includes("--run");
  const report=run?execute(root):inspect(root);
  if(run&&report.executed){process.stdout.write(report.stdout);process.stderr.write(report.stderr);}
  else process.stdout.write(JSON.stringify(report,null,2)+"\n");
  if(run && (!report.executed || !report.passed)) process.exitCode=1;
}
module.exports=Object.freeze({REQUIRED,inspect,execute});

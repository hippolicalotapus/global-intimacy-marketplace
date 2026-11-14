import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const require = createRequire(import.meta.url);
const {inspectSupplierProof,GARMENTS,PLACEMENTS,REQUIRED} = require('../operations/custom-apparel/proof-checklist.cjs');
const makeSpec = () => ({
  schemaVersion:1, supplier:null,
  garments:Object.fromEntries(GARMENTS.map(garment=>[garment,{
    supplierSku:null, fabricAndBlankConfirmed:false,
    placements:Object.fromEntries(PLACEMENTS.map(position=>[position,{
      status:'unverified', printAreaWidthMm:null,printAreaHeightMm:null,
      offsetFromCollarMm:null,offsetFromCenterMm:null, method:null,
      supplierProofUrl:null,approvedBy:null
    }]))
  }]))
});
test('missing supplier print data yields actionable, bounded checklist', () => {
  const report=inspectSupplierProof(makeSpec());
  assert.equal(report.schemaValid,true);
  assert.equal(report.supplierReady,false);
  assert.equal(report.manufacturingApproved,false);
  assert.equal(report.missingCount,1 + 2*2 + 2*4*(1+7));
  assert.deepEqual(report.pending[0],{garment:null,position:null,field:'supplier'});
  assert.ok(report.pending.some(x=>x.garment==='hoodie'&&x.position==='back_upper_back'&&x.field==='supplierProofUrl'));
});
test('malformed and unsupported schemas fail closed', () => {
  for(const bad of [null,[],{},42,{schemaVersion:2},'invalid']) {
    const r=inspectSupplierProof(bad); assert.equal(r.schemaValid,false);
    assert.equal(r.manufacturingApproved,false);assert.equal(r.missingCount,1);
  }
});
test('all expected garments and placements are covered', () => {
  assert.deepEqual([...GARMENTS],['tshirt','hoodie']);
  assert.deepEqual([...PLACEMENTS],['front_center','front_left_chest','back_center','back_upper_back']);
});
test('partially supplied measurements cannot pass', () => {
  const spec=makeSpec();spec.supplier='Supplier A';
  spec.garments.tshirt.placements.front_center.printAreaWidthMm=200;
  const r=inspectSupplierProof(spec);assert.equal(r.supplierReady,false);
  assert.ok(r.pending.some(x=>x.field==='printAreaHeightMm'&&x.position==='front_center'));
});
test('width and height require positive finite numbers', () => {
  for(const bad of [-1,0,NaN,Infinity,'200',null]) {
    const spec=makeSpec();spec.garments.hoodie.placements.back_center.printAreaWidthMm=bad;
    assert.ok(inspectSupplierProof(spec).pending.some(x=>x.garment==='hoodie'&&x.field==='printAreaWidthMm'));
  }
});
test('offset coordinates accept zero but reject negative and nonnumeric values', () => {
  const spec=makeSpec();const e=spec.garments.tshirt.placements.front_center;
  for(const field of ['offsetFromCollarMm','offsetFromCenterMm']) {
    e[field]=0;assert.ok(!inspectSupplierProof(spec).pending.some(x=>x.garment==='tshirt'&&x.position==='front_center'&&x.field===field));
    e[field]=-2;assert.ok(inspectSupplierProof(spec).pending.some(x=>x.garment==='tshirt'&&x.position==='front_center'&&x.field===field));
    e[field]=null;
  }
});
test('verified status alone is not sufficient proof', () => {
  const spec=makeSpec();spec.garments.hoodie.placements.back_upper_back.status='verified';
  const r=inspectSupplierProof(spec);
  assert.equal(r.supplierReady,false);
  assert.ok(r.pending.some(x=>x.position==='back_upper_back'&&x.field==='approvedBy'));
});
test('fully populated fictional specification still never grants manufacturing approval', () => {
  const spec=makeSpec();spec.supplier='Fictional supplier';
  for(const garment of GARMENTS){const g=spec.garments[garment];g.supplierSku='TEST-SKU';g.fabricAndBlankConfirmed=true;
    for(const position of PLACEMENTS){const p=g.placements[position];p.status='verified';
      p.printAreaWidthMm=150;p.printAreaHeightMm=200;p.offsetFromCollarMm=30;p.offsetFromCenterMm=0;
      p.method='Sample print';p.supplierProofUrl='https://example.invalid/proof';p.approvedBy='Fictional approver';}}
  const r=inspectSupplierProof(spec);
  assert.equal(r.supplierReady,true);assert.equal(r.missingCount,0);
  assert.equal(r.manufacturingApproved,false);
});
test('report is frozen and exposes field names, not sensitive supplier values', () => {
  const spec=makeSpec();spec.supplier='Confidential Supplier';
  const r=inspectSupplierProof(spec);
  assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.pending)&&Object.isFrozen(r.pending[0]));
  assert.ok(!JSON.stringify(r).includes('Confidential Supplier'));
  assert.ok(!JSON.stringify(r).includes('http'));
});
test('source contains no network, storage, payment, or supplier submission', async () => {
  const source=await readFile(new URL('../operations/custom-apparel/proof-checklist.cjs',import.meta.url),'utf8');
  assert.ok(!/fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|payment|submitOrder|http[s]?:\/\//i.test(source));
  assert.ok(source.includes('manufacturingApproved:false'));
  assert.equal(REQUIRED.length,7);
});

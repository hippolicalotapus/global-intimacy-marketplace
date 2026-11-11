import test from "node:test";
import assert from "node:assert/strict";
import { parseCSV, stageSupplierRows } from "./import-feed.mjs";

test("CSV parses quoted commas, BOM and embedded newlines",()=>{
  const rows=parseCSV('\uFEFFSKU,Name,EAN,Stock\nA1,"Product, Blue",0001234567890,3\nA2,"Multi\nline",0001234567891,0\n');
  assert.equal(rows.length,2);
  assert.equal(rows[0].name,"Product, Blue");
  assert.equal(rows[1].name,"Multi\nline");
  assert.equal(rows[0].ean,"0001234567890");
});

test("European semicolon feed parses model, image and numerical stock",()=>{
  const rows=parseCSV('Reference;Designation;Marque;EAN;Stock;Photo URL\nSKU-001;"Device; Mini";Brand;0001234567890;12;https://assets.example.com/item.jpg\n');
  const staged=stageSupplierRows("concorde-pro",rows,"2026-10-26T00:00:00Z");
  assert.equal(staged.metrics.staged,1);
  assert.equal(staged.products[0].title,"Device; Mini");
  assert.equal(staged.products[0].source.gtin,"0001234567890");
  assert.equal(staged.products[0].privateSupplierData.rawStockQuantity,12);
  assert.equal(staged.products[0].status,"pending_review");
  assert.equal(staged.products[0].flags.publicListingReady,false);
  assert.equal(staged.products[0].flags.imageRightsGranted,false);
  assert.equal(staged.allowOrders,false);
});

test("Missing SKU or title is quarantined and duplicates blocked",()=>{
  const rows=[
    {sku:"A1",name:"One"},
    {sku:"A1",name:"One again"},
    {sku:"",name:"No SKU"},
    {sku:"A4",name:""}
  ];
  const staged=stageSupplierRows("dreamlove",rows);
  assert.equal(staged.metrics.staged,1);
  assert.equal(staged.metrics.quarantined,3);
});

test("Missing stock stays unknown, not zero or in stock",()=>{
  const staged=stageSupplierRows("msx-distribution",[{sku:"x1",name:"Sample",stock:"unknown"}]);
  assert.equal(staged.products[0].privateSupplierData.rawStockQuantity,null);
  assert.ok(staged.products[0].warnings.some(x=>x.includes("Stock not reported")));
});

test("Unsafe and unauthorised photo URL is never treated as licenced",()=>{
  const staged=stageSupplierRows("satisfyer",[{sku:"x",name:"<script>window.alert(1)</script>",image:"javascript:alert(1)"}]);
  assert.equal(staged.products[0].privateSupplierData.sourceImageUrl,"");
  assert.equal(staged.products[0].flags.imageRightsGranted,false);
  assert.equal(staged.products[0].flags.publicListingReady,false);
});

test("Wholesale price remains in privateSupplierData, never ready for publication",()=>{
  const staged=stageSupplierRows("concorde-pro",[{sku:"a1",name:"Test",wholesale_price:"19.95",rrp:"39.99"}]);
  assert.equal(staged.products[0].privateSupplierData.wholesalePriceRaw,"19.95");
  assert.equal(staged.allowPublicExport,false);
  assert.equal(staged.products[0].flags.ownerApproved,false);
  assert.ok(!Object.keys(staged.products[0]).includes("publicPrice"));
});

test("Supplier ID format validation",()=>{
  assert.throws(()=>stageSupplierRows("../outside",[]),/Invalid supplier ID/);
});

test("Unclosed CSV quote is rejected rather than truncated",()=>{
  assert.throws(()=>parseCSV('SKU,Name\n1,"unterminated'),/Malformed CSV/);
});

test("Every imported item receives blocked readiness, even with positive stock",()=>{
  const staged=stageSupplierRows("concorde-pro",[{sku:"x2",name:"Sample",stock:"99",image:"https://example.com/image.jpg"}]);
  assert.equal(staged.products[0].readiness.publishable,false);
  assert.equal(staged.products[0].readiness.orderable,false);
  assert.ok(staged.products[0].readiness.publicationReasons.includes("media_license_missing"));
  assert.equal(staged.allowPublicExport,false);
});
test("Supplier feed cannot inject approval flags",()=>{
  const staged=stageSupplierRows("concorde-pro",[{sku:"x3",name:"Sample",ownerApproved:true,resellerApproved:true,commercialPhotoPermission:true,priceApproved:true}]);
  assert.equal(staged.products[0].flags.ownerApproved,false);
  assert.equal(staged.products[0].readiness.publishable,false);
});

test("Duplicate normalized CSV headers fail before import",()=>{
  assert.throws(()=>parseCSV('SKU,sku,Name\nA1,B1,Demo\n'),/duplicate CSV headers/);
});
test("Short and long CSV rows are rejected",()=>{
  assert.throws(()=>parseCSV('SKU,Name\nA1\n'),/fields; expected/);
  assert.throws(()=>parseCSV('SKU,Name\nA1,Demo,extra\n'),/fields; expected/);
});
test("Unexpected characters after closing quote are rejected",()=>{
  assert.throws(()=>parseCSV('SKU,Name\nA1,"Demo"oops\n'),/Unexpected characters/);
});

test("Case-only supplier SKU variants are quarantined instead of double-staged",()=>{
  const staged=stageSupplierRows("concorde-pro",[
    {sku:"ABC-1",name:"First"},
    {sku:"abc-1",name:"Duplicate with different case"}
  ]);
  assert.deepEqual(staged.metrics,{rows:2,staged:1,quarantined:1});
  assert.equal(staged.quarantine[0].reason,"Duplicate supplier SKU in feed");
  assert.equal(staged.allowPublicExport,false);
  assert.equal(staged.allowOrders,false);
});

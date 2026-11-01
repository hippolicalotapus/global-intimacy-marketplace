import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {createRequire} from "node:module";
const math=createRequire(import.meta.url)("../site/globe-math.js");
const scope={window:{}};runInNewContext(readFileSync(new URL('../site/countries.js',import.meta.url),'utf8'),scope);
const world=scope.window.GIM_WORLD.features;
test("Globe land picking identifies actual polygons across hemispheres and the date line",()=>{
 for(const [lon,lat,code] of [[-110,55,'CA'],[-100,40,'US'],[2,47,'FR'],[10,51,'DE'],[134,-25,'AU'],[172.6,-43.5,'NZ'],[179.4,-16.4,'FJ'],[139,36,'JP'],[78,22,'IN']])assert.equal(math.featureAt(world,lon,lat)?.code,code,`${lon},${lat}`);
 assert.equal(math.featureAt(world,-30,0),null,"Ocean must not select a nearby country");
});
test("All list entries are unique and small destinations remain selectable without a map polygon",()=>{
 const choices=scope.window.GIM_COUNTRIES;
 assert.equal(new Set(choices.map(c=>c.code)).size,choices.length);
 for(const code of ['CA','GB','US','NZ','SG','MT','VA','MC'])assert.ok(choices.some(c=>c.code===code),code);
 assert.ok(!choices.some(c=>c.code==='EU'||c.code==='WW'));
});


test("Perspective ray picking follows sphere rotation and rejects points beyond its silhouette",()=>{
 for(const [lon,lat] of [[0,0],[-110,55],[172,-44],[30,80]]){
  const hit=math.pick(.5,.5,lon,lat);assert.ok(Math.abs(hit[0]-lon)<1e-8);assert.ok(Math.abs(hit[1]-lat)<1e-8);
 }
 assert.equal(math.pick(0,0,0,0),null);
 const hit=math.pick(.5,.5,-110,55);assert.equal(math.featureAt(world,...hit)?.code,"CA");
});

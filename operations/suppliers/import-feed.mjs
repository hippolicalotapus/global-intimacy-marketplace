/**
 * Supplier catalogue STAGING adapter. Node 20+. No network, email, credential,
 * checkout or public storefront access. Every imported record remains unapproved.
 * Usage: node operations/suppliers/import-feed.mjs --supplier concorde-pro --file ./sample.csv
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, extname, basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { evaluateProductReadiness } from "./publication-gates.mjs";
import { validateCSVStructure } from "./feed-validation.mjs";

const moduleDir = resolve(fileURLToPath(new URL(".", import.meta.url)));
const projectRoot = resolve(moduleDir, "../..");
const MAX_BYTES = 25 * 1024 * 1024;
const MAX_ROWS = 30000;

function text(v, max=6000) {
  return String(v ?? "").replace(/\u0000/g,"").trim().slice(0,max);
}
function normalizeHeader(h) {
  return text(h,120).toLowerCase().replace(/[\s.\-/\\]+/g,"_").replace(/[^a-z0-9_]/g,"").replace(/_+/g,"_").replace(/^_+|_+$/g,"");
}
function countDelimiter(str, d) {
  let n=0, quote=false;
  for(let i=0;i<str.length;i++) {
    if(str[i]==='"') {
      if(quote && str[i+1]==='"'){i++;continue;}
      quote=!quote;
    } else if(str[i]===d && !quote) n++;
    else if((str[i]==="\n"||str[i]==="\r")&&!quote)break;
  }
  return n;
}
export function parseCSV(input) {
  validateCSVStructure(input);
  const data=String(input ?? "").replace(/^\uFEFF/,"");
  const delim=[";",",","\t","|"].sort((a,b)=>countDelimiter(data,b)-countDelimiter(data,a))[0];
  const rows=[];
  let row=[],cell="",quoted=false;
  for(let i=0;i<data.length;i++){
    const c=data[i];
    if(c==='"'){
      if(quoted && data[i+1]==='"'){cell+='"';i++;}
      else quoted=!quoted;
    }else if(c===delim&&!quoted){row.push(cell);cell="";}
    else if((c==="\r"||c==="\n")&&!quoted){
      if(c==="\r"&&data[i+1]==="\n")i++;
      row.push(cell);cell="";
      if(row.some(x=>x.trim()))rows.push(row);
      if(rows.length>MAX_ROWS+1)throw new Error("Too many feed rows");
      row=[];
    }else{cell+=c;if(cell.length>80000)throw new Error("Field too long");}
  }
  if(quoted)throw new Error("Malformed CSV: unclosed quoted value");
  row.push(cell);
  if(row.some(x=>x.trim()))rows.push(row);
  if(rows.length<2)return [];
  const headers=rows.shift().map(normalizeHeader);
  if(!headers.some(Boolean))throw new Error("No valid CSV column headers");
  return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,text(r[i],12000)]).filter(([k])=>k)));
}

const columnAliases={
  supplierSku:["supplier_sku","sku","reference","ref","product_id","product_reference","item_code","code","article_number","supplier_ref"],
  gtin:["ean","ean13","ean_13","barcode","gtin","upc","gtin13","ean_code"],
  name:["name","product_name","product_title","title","designation","libelle","label"],
  brand:["brand","brand_name","marque","manufacturer"],
  category:["category","product_category","famille","type"],
  description:["description","product_description","details","description_en","description_fr"],
  stockQuantity:["stock","stock_quantity","quantity","qty","inventory","available_stock","stock_level","stocklevels","qte","quantity_available"],
  suggestedRetail:["retail_price","recommended_retail_price","msrp","rrp","public_price","selling_price","prix_public","prix_conseille"],
  privateWholesalePrice:["wholesale_price","dealer_price","buy_price","cost","price_pro","purchase_price","net_price"],
  imageUrl:["image","image_url","main_image","photo","photo_url","picture_url","image_link","image_1"],
  currency:["currency","price_currency","currency_code"]
};
function pick(row, names) {
  for(const key of names) if(Object.prototype.hasOwnProperty.call(row,key)&&text(row[key]))return text(row[key]);
  return "";
}
function fromInputRow(row) {
  const normalized=Object.fromEntries(Object.entries(row||{}).map(([k,v])=>[normalizeHeader(k),v]));
  const out={};
  for(const [target,names] of Object.entries(columnAliases)) out[target]=pick(normalized,names);
  return out;
}
function nonnegQty(raw) {
  const value=text(raw,40).replace(/[, ]/g,"");
  if(!value || !/^\d+$/.test(value))return null;
  const quantity=Number(value);
  return Number.isSafeInteger(quantity)?quantity:null;
}
function httpsOnly(raw) {
  try {
    const u=new URL(raw);
    return u.protocol==="https:" && !u.username && !u.password ? u.href.slice(0,2000) : "";
  } catch{return "";}
}
export function stageSupplierRows(supplierId, rows, receivedAt = new Date().toISOString()) {
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(supplierId))throw new Error("Invalid supplier ID");
  if(!Array.isArray(rows))throw new Error("Expected array of feed rows");
  if(rows.length>MAX_ROWS)throw new Error("Too many records");
  const seen=new Set(), products=[], quarantine=[];
  for(let i=0;i<rows.length;i++){
    const raw=fromInputRow(rows[i]);
    const sku=text(raw.supplierSku||raw.gtin,100);
    const name=text(raw.name,250);
    const gtin=text(raw.gtin,32).replace(/[\s-]/g,"");
    if(!sku || !name){quarantine.push({row:i+1,reason:"Missing name and/or supplier SKU/GTIN"});continue;}
    const compound=supplierId+":"+sku;
    if(seen.has(compound)){quarantine.push({row:i+1,reason:"Duplicate supplier SKU in feed",sku});continue;}
    seen.add(compound);
    const amount=nonnegQty(raw.stockQuantity);
    const imageUrl=httpsOnly(raw.imageUrl);
    const id=createHash("sha256").update(compound).digest("hex").slice(0,20);
    const risk=[];
    if(!gtin)risk.push("GTIN absent; cross-supplier matching requires review");
    if(amount===null)risk.push("Stock not reported as a verified numeric quantity");
    if(raw.imageUrl&&!imageUrl)risk.push("Image URL invalid or not HTTPS");
    const readiness=evaluateProductReadiness();
    products.push({
      readiness,
      source:{supplierId,supplierSku:sku,gtin,receivedAt,importHash:id},
      title:name,brand:text(raw.brand,120),category:text(raw.category,120),
      description:text(raw.description,6000),
      privateSupplierData:{
        wholesalePriceRaw:text(raw.privateWholesalePrice,100),
        suggestedRetailRaw:text(raw.suggestedRetail,100),
        priceCurrency:text(raw.currency,10),
        rawStockQuantity:amount,
        sourceImageUrl:imageUrl
      },
      flags:{resellerAuthorized:false,territoryApproved:false,salesChannelApproved:false,
        fulfillmentConfirmed:false,imageRightsGranted:false,complianceVerified:false,
        marginReviewed:false,ownerApproved:false,publicListingReady:false},
      status:"pending_review",warnings:risk
    });
  }
  return {
    schemaVersion:1,sourceSupplier:supplierId,receivedAt,
    previewOnly:true,allowPublicExport:false,allowOrders:false,
    metrics:{rows:rows.length,staged:products.length,quarantined:quarantine.length},
    products,quarantine
  };
}
async function main(){
  const args=process.argv.slice(2);
  const option=n=>{const i=args.indexOf("--"+n);return i<0?"":args[i+1]||"";};
  const supplier=option("supplier"),src=option("file");
  if(!supplier||!src)throw new Error("Use --supplier <known-id> --file <catalogue.csv|.json>");
  const registry=JSON.parse(await readFile(join(moduleDir,"supplier-registry.json"),"utf8"));
  if(!registry.suppliers.some(s=>s.id===supplier))throw new Error("Unknown supplier ID; verify onboarding first");
  const absolute=resolve(src);
  const info=await import("node:fs/promises").then(fs=>fs.stat(absolute));
  if(info.size>MAX_BYTES)throw new Error("Feed exceeds 25 MB safety limit");
  const input=await readFile(absolute,"utf8");
  const ext=extname(absolute).toLowerCase();
  let rows;
  if(ext===".json"){const obj=JSON.parse(input);rows=Array.isArray(obj)?obj:obj.products;}
  else if(ext===".csv"||ext===".tsv"||ext===".txt")rows=parseCSV(input);
  else throw new Error("Only local CSV, TSV and JSON feeds currently supported; no XML/API credentials configured");
  const staged=stageSupplierRows(supplier,rows);
  const outdir=join(projectRoot,"private_staging");
  await mkdir(outdir,{recursive:true});
  const file=join(outdir, supplier+"-"+Date.now()+".json");
  await writeFile(file,JSON.stringify(staged,null,2),{encoding:"utf8",mode:0o600,flag:"wx"});
  console.log(JSON.stringify({supplier,file:basename(file),...staged.metrics,status:"LOCAL DRAFT ONLY; NO PUBLIC LISTINGS OR ORDERS"},null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main().catch(e=>{console.error("Import aborted:",e.message);process.exitCode=1;});

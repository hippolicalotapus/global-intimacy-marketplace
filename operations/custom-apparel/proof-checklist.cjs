"use strict";
/* Read-only supplier intake checklist. Never authorizes manufacture or checkout. */
const GARMENTS = Object.freeze(["tshirt", "hoodie"]);
const PLACEMENTS = Object.freeze(["front_center", "front_left_chest", "back_center", "back_upper_back"]);
const REQUIRED = Object.freeze([
  "printAreaWidthMm", "printAreaHeightMm", "offsetFromCollarMm", "offsetFromCenterMm",
  "method", "supplierProofUrl", "approvedBy"
]);
const isRecord = x => x !== null && typeof x === "object" && !Array.isArray(x);
const nonEmpty = x => typeof x === "string" && x.trim().length > 0;
// Syntax and transport checks only. A plausible URL is not evidence of a real supplier proof.
const plausibleProofLink = value => {
  if (!nonEmpty(value)) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && !url.username && !url.password &&
      url.pathname.length > 1 && host !== "localhost" &&
      !host.endsWith(".localhost") && !host.endsWith(".invalid") &&
      !host.endsWith(".test") && !host.endsWith(".example") &&
      host !== "example.com" && host !== "www.example.com" &&
      !/^(127\.|10\.|192\.168\.|169\.254\.)/.test(host);
  } catch { return false; }
};
const missingField = (entry, field) => {
  const value = entry?.[field];
  if (field.endsWith("Mm")) {
    return !Number.isFinite(value) || value < 0 || (field.startsWith("printArea") && value === 0);
  }
  if (field === "supplierProofUrl") return !plausibleProofLink(value);
  return !nonEmpty(value);
};
function inspectSupplierProof(spec) {
  const entries = [];
  const add = (garment, position, field) => entries.push(Object.freeze({garment, position, field}));
  if (!isRecord(spec) || spec.schemaVersion !== 1) {
    return Object.freeze({schemaValid:false, supplierReady:false, manufacturingApproved:false,
      missingCount:1, pending:Object.freeze([Object.freeze({garment:null,position:null,field:"schemaVersion"})])});
  }
  if (!nonEmpty(spec.supplier)) add(null,null,"supplier");
  for (const garment of GARMENTS) {
    const item = spec.garments?.[garment];
    if (!isRecord(item)) { add(garment,null,"garment"); continue; }
    if (!nonEmpty(item.supplierSku)) add(garment,null,"supplierSku");
    if (item.fabricAndBlankConfirmed !== true) add(garment,null,"fabricAndBlankConfirmed");
    for (const position of PLACEMENTS) {
      const entry = item.placements?.[position];
      if (!isRecord(entry)) { add(garment,position,"placement"); continue; }
      if (entry.status !== "verified") add(garment,position,"status");
      for (const field of REQUIRED) if (missingField(entry,field)) add(garment,position,field);
    }
  }
  // This report deliberately excludes source values, supplier URLs and personal names.
  return Object.freeze({schemaValid:true,supplierReady:entries.length===0,
    manufacturingApproved:false,missingCount:entries.length,pending:Object.freeze(entries)});
}
module.exports = Object.freeze({inspectSupplierProof,GARMENTS,PLACEMENTS,REQUIRED});

"use strict";
/* Offline supplier intake audit. A completed checklist is NOT production approval. */
const GARMENTS = ["tshirt", "hoodie"];
const POSITIONS = ["front_center", "front_left_chest", "back_center", "back_upper_back"];
const MEASUREMENTS = ["printAreaWidthMm", "printAreaHeightMm", "offsetFromCollarMm", "offsetFromCenterMm"];
const DETAILS = ["method", "supplierProofUrl", "approvedBy"];
function audit(spec) {
  const missing = [];
  const object = value => value && typeof value === "object" && !Array.isArray(value);
  if (!object(spec) || spec.schemaVersion !== 1) return Object.freeze({complete:false, manufacturingApproved:false, missing:["schemaVersion"]});
  if (typeof spec.supplier !== "string" || !spec.supplier.trim()) missing.push("supplier");
  for (const garment of GARMENTS) {
    const item = spec.garments?.[garment];
    if (!object(item)) {missing.push(garment);continue;}
    if (typeof item.supplierSku !== "string" || !item.supplierSku.trim()) missing.push(garment + ".supplierSku");
    if (item.fabricAndBlankConfirmed !== true) missing.push(garment + ".fabricAndBlankConfirmed");
    for (const position of POSITIONS) {
      const p = item.placements?.[position];
      if (!object(p)) {missing.push(garment + "." + position);continue;}
      if (p.status !== "verified") missing.push(garment + "." + position + ".status");
      for (const key of MEASUREMENTS) if (!Number.isFinite(p[key]) || p[key] < 0 || (key.startsWith("printArea") && p[key] === 0))
        missing.push(garment + "." + position + "." + key);
      for (const key of DETAILS) if (typeof p[key] !== "string" || !p[key].trim())
        missing.push(garment + "." + position + "." + key);
    }
  }
  // No business authorization or publishing transition is exposed by this offline module.
  return Object.freeze({complete:missing.length === 0, manufacturingApproved:false, missing:Object.freeze(missing)});
}
module.exports = Object.freeze({audit});

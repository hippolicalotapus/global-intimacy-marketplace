"use strict";
/* Offline production preflight: never label concept art print-ready. */
const PROFILES=Object.freeze({
  sample_dtf_12x16:Object.freeze({id:"sample_dtf_12x16",label:"SAMPLE ONLY — DTF 12 x 16 in",widthIn:12,heightIn:16,dpi:300,transparent:true,formats:["png"],verified:false}),
  sample_vector:Object.freeze({id:"sample_vector",label:"SAMPLE ONLY — vector 12 x 16 in",widthIn:12,heightIn:16,dpi:null,transparent:true,formats:["svg"],verified:false})
});
function preflight(job,profile=PROFILES.sample_dtf_12x16){
 const errors=[];
 if(!job||typeof job!=="object")return {ok:false,errors:["Missing job"]};
 if(!profile||!profile.verified)errors.push("Supplier profile has not been verified");
 if(typeof job.saying!=="string"||!job.saying.trim()||/[\x00-\x1f\x7f]/.test(job.saying))errors.push("Missing or invalid wording");
 if(job.rightsStatus!=="cleared")errors.push("Commercial rights not cleared");
 if(job.artworkStatus!=="approved-original"&&job.artworkStatus!=="licensed")errors.push("Artwork is not approved");
 if(!job.exactWordingChecked)errors.push("Exact wording has not been proofread");
 if(!["front","back","left-chest"].includes(job.placement))errors.push("Unsupported placement");
 if(!job.artwork||typeof job.artwork!=="object")errors.push("Missing production artwork");
 else{
  if(!profile||!profile.formats.includes(job.artwork.format))errors.push("Format unsupported by supplier profile");
  if(job.artwork.transparent!==true)errors.push("Transparency not verified");
  if(profile&&profile.dpi&&job.artwork.format==="png"){
   if(!Number.isInteger(job.artwork.widthPx)||job.artwork.widthPx<Math.ceil(profile.widthIn*profile.dpi))errors.push("Insufficient pixel width");
   if(!Number.isInteger(job.artwork.heightPx)||job.artwork.heightPx<Math.ceil(profile.heightIn*profile.dpi))errors.push("Insufficient pixel height");
  }
  if(!job.artwork.qualityChecked)errors.push("Artwork quality not verified");
 }
 return {ok:errors.length===0,errors,requiredPixels:profile&&profile.dpi?{width:Math.ceil(profile.widthIn*profile.dpi),height:Math.ceil(profile.heightIn*profile.dpi)}:null};
}
function createOfflineManifest(job,profile=PROFILES.sample_dtf_12x16){
 const check=preflight(job,profile);
 return {schemaVersion:1,offlineOnly:true,productionApproved:check.ok,orderCreated:false,printerSubmission:false,supplierProfile:profile.id,preflight:check,job};
}
if(typeof module!=="undefined")module.exports={PROFILES,preflight,createOfflineManifest};

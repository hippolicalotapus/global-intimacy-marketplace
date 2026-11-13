'use strict';
const METHODS={
 dtg:{format:'png',transparent:true,mirror:false},
 dtf:{format:'png',transparent:true,mirror:null},
 sublimation:{format:'png',transparent:false,mirror:null},
 screen:{format:'svg',separations:true},
 vinyl:{format:'svg',cutPaths:true},
 embroidery:{format:'dst',digitized:true,smallOnly:true},
 uv:{format:'png'},
 allover:{format:'pdf',template:true,bleed:true}
};
function validate(job,profile){
 const errors=[];
 if(!profile||!profile.verified||!profile.supplierId||!profile.machineId)errors.push('Unverified supplier/machine');
 const method=profile&&METHODS[profile.method];
 if(!method)errors.push('Unsupported printing method');
 if(!job||!job.master||!job.artwork)errors.push('Missing master or production artwork');
 if(!job||job.rightsStatus!=='cleared'||job.artworkStatus!=='approved-original')errors.push('Artwork rights or originality not approved');
 if(!job||typeof job.saying!=='string'||!job.saying.trim()||job.saying!==job.proofreadSaying)errors.push('Exact typography not verified');
 if(!job||!['front','back','left-chest','hat-front'].includes(job.placement))errors.push('Invalid placement');
 if(profile&&job&&(!profile.placements||!profile.placements.includes(job.placement)))errors.push('Placement not supported by machine');
 if(method&&job&&job.artwork){
  if(job.artwork.format!==method.format)errors.push('Incorrect production format');
  if(method.transparent===true&&job.artwork.transparent!==true)errors.push('Transparent artwork required');
  if(typeof method.mirror==='boolean'&&job.artwork.mirrored!==method.mirror)errors.push('Incorrect mirroring');
  if(method.mirror===null&&(!profile||typeof profile.mirror!=='boolean'||job.artwork.mirrored!==profile.mirror))errors.push('Unverified mirroring');
  if(method.separations&&!job.artwork.spotSeparationsVerified)errors.push('Spot separations not verified');
  if(method.cutPaths&&!job.artwork.cutPathsVerified)errors.push('Cut paths not verified');
  if(method.digitized&&!job.artwork.machineDigitizingVerified)errors.push('Embroidery digitizing not verified');
  if(method.smallOnly&&!['left-chest','hat-front'].includes(job.placement))errors.push('Embroidery restricted to small placements');
  if(method.template&&(!job.artwork.templateVerified||!job.artwork.bleedVerified))errors.push('Garment template/bleed not verified');
  if(!job.artwork.colorWorkflowVerified||!profile||!profile.colorWorkflow)errors.push('Colour workflow not verified');
  if(!job.artwork.qualityChecked)errors.push('Artwork quality not verified');
  if(profile&&profile.widthIn&&profile.heightIn&&profile.dpi&&method.format==='png'){
   if(job.artwork.widthPx<Math.ceil(profile.widthIn*profile.dpi)||job.artwork.heightPx<Math.ceil(profile.heightIn*profile.dpi))errors.push('Insufficient production resolution');
  }
 }
 return {ok:errors.length===0,errors};
}
function offlineManifest(job,profile){const preflight=validate(job,profile);return {schemaVersion:1,offlineOnly:true,orderCreated:false,printerSubmission:false,productionApproved:preflight.ok,method:profile&&profile.method,supplierId:profile&&profile.supplierId,machineId:profile&&profile.machineId,preflight,artwork:job&&job.artwork};}
module.exports={METHODS,validate,offlineManifest};

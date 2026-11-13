'use strict';
const METHODS=Object.freeze({
 dtf:{format:'png',transparent:true,mirror:false,large:true},
 dtg:{format:'png',transparent:true,mirror:false,large:true},
 sublimation:{format:'png',transparent:false,mirror:'supplier-defined',large:true},
 screen:{format:'svg',separations:true,large:true},
 embroidery:{format:'dst',digitizing:true,large:false}
});
function validateProduction(job,profile){
 const errors=[];
 if(!job||!profile)return {ready:false,errors:['Missing job or supplier profile']};
 const method=METHODS[profile.method];
 if(!method)return {ready:false,errors:['Unknown printing method']};
 if(!profile.verified)errors.push('Supplier profile unverified');
 if(!job.rightsCleared||!job.artworkApproved||!job.exactTextVerified)errors.push('Artwork, rights or text not approved');
 if(!['front','back','left-chest','hat-front'].includes(job.placement))errors.push('Unsupported placement');
 if(!method.large&&!['left-chest','hat-front'].includes(job.placement))errors.push('Embroidery restricted to small emblems');
 if(job.format!==method.format)errors.push('Wrong production format');
 if(method.digitizing&&!job.digitizedFileVerified)errors.push('Embroidery stitch file unverified');
 if(method.separations&&!job.spotSeparationsVerified)errors.push('Screen-print separations unverified');
 if(method.mirror==='supplier-defined'&&typeof profile.mirror!=='boolean')errors.push('Sublimation mirror setting unverified');
 if(method.transparent&&job.transparent!==true)errors.push('Transparent artwork required');
 if(!Number.isFinite(profile.widthIn)||!Number.isFinite(profile.heightIn)||profile.widthIn<=0||profile.heightIn<=0)errors.push('Supplier print dimensions missing');
 if(method.format==='png'){
  if(!Number.isFinite(profile.dpi)||profile.dpi<1)errors.push('Supplier DPI missing');
  else if(!Number.isInteger(job.widthPx)||!Number.isInteger(job.heightPx)||job.widthPx<Math.ceil(profile.widthIn*profile.dpi)||job.heightPx<Math.ceil(profile.heightIn*profile.dpi))errors.push('Insufficient raster dimensions');
 }
 if(!profile.colourWorkflowVerified)errors.push('Colour workflow unverified');
 return {ready:errors.length===0,errors,method:profile.method};
}
function offlineManifest(job,profile){return {offlineOnly:true,orderCreated:false,submittedToPrinter:false,preflight:validateProduction(job,profile)}}
module.exports={METHODS,validateProduction,offlineManifest};

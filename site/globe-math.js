"use strict";
(function(root,factory){var api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.GIMGlobeMath=api;}(typeof window!=="undefined"?window:globalThis,function(){
  function contains(ring,lon,lat){
    if(!ring.length)return false;
    var points=[],previous=ring[0][0];
    ring.forEach(function(p){var x=p[0];while(x-previous>180)x-=360;while(x-previous < -180)x+=360;points.push([x,p[1]]);previous=x;});
    var x=lon;while(x-points[0][0]>180)x-=360;while(x-points[0][0] < -180)x+=360;
    var inside=false;
    for(var i=0,j=points.length-1;i<points.length;j=i++){
      var a=points[i],b=points[j];
      if((a[1]>lat)!==(b[1]>lat)&&x<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }
    return inside;
  }
  function featureAt(features,lon,lat){
    lon=((lon+180)%360+360)%360-180;
    return features.find(function(f){var polygons=f.geometry.type==="Polygon"?[f.geometry.coordinates]:f.geometry.coordinates;
      return polygons.some(function(rings){return contains(rings[0],lon,lat)&&!rings.slice(1).some(function(hole){return contains(hole,lon,lat);});});
    })||null;
  }
  function pick(x,y,longitude,latitude){
    var t=Math.tan(42*Math.PI/360),dx=(x*2-1)*t,dy=(1-y*2)*t,a=dx*dx+dy*dy+1,discriminant=36-32*a;
    if(discriminant<0)return null;
    var distance=(6-Math.sqrt(discriminant))/(2*a),vx=dx*distance,vy=dy*distance,vz=3-distance,lat0=latitude*Math.PI/180;
    var lat=Math.asin(Math.max(-1,Math.min(1,vy*Math.cos(lat0)+vz*Math.sin(lat0))));
    var lon=longitude*Math.PI/180+Math.atan2(vx,vz*Math.cos(lat0)-vy*Math.sin(lat0));
    return [((lon*180/Math.PI+180)%360+360)%360-180,lat*180/Math.PI];
  }
  return Object.freeze({featureAt:featureAt,pick:pick});
}));

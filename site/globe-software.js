"use strict";
/* Perspective ray/sphere rendering for browsers where GPU/WebGL is unavailable. */
(function(){
  function create(canvas,world){
    var ctx=canvas.getContext("2d");if(!ctx)throw new Error("Canvas unavailable");
    var size=500;canvas.width=size;canvas.height=size;canvas.dataset.renderer="software-3d";
    var flat=document.createElement("canvas");flat.width=2048;flat.height=1024;
    var c=flat.getContext("2d");
    world.features.forEach(function(f,index){var polys=f.geometry.type==="Polygon"?[f.geometry.coordinates]:f.geometry.coordinates;c.fillStyle="rgb("+(index+1)+",0,0)";polys.forEach(function(rings){c.beginPath();rings.forEach(function(ring){ring.forEach(function(p,i){var x=(p[0]+180)/360*2048,y=(90-p[1])/180*1024;if(i)c.lineTo(x,y);else c.moveTo(x,y);});c.closePath();});c.fill("evenodd");});});
    var texture=c.getImageData(0,0,2048,1024).data,pixels=ctx.createImageData(size,size),rays=[];
    var tangent=Math.tan(42*Math.PI/360),light=[-.45,.65,.9],lm=Math.hypot.apply(Math,light);light=light.map(function(v){return v/lm;});
    for(var py=0;py<size;py++)for(var px=0;px<size;px++){
      var dx=((px+.5)/size*2-1)*tangent,dy=(1-(py+.5)/size*2)*tangent,a=dx*dx+dy*dy+1,disc=36-32*a;
      if(disc<0)continue;
      var t=(6-Math.sqrt(disc))/(2*a),x=dx*t,y=dy*t,z=3-t;
      var vx=-x,vy=-y,vz=3-z,vm=Math.hypot(vx,vy,vz);vx/=vm;vy/=vm;vz/=vm;
      var hx=light[0]+vx,hy=light[1]+vy,hz=light[2]+vz,hm=Math.hypot(hx,hy,hz);
      rays.push({offset:(py*size+px)*4,x:x,y:y,z:z,light:.28+.8*Math.max(0,x*light[0]+y*light[1]+z*light[2]),spec:Math.pow(Math.max(0,(x*hx+y*hy+z*hz)/hm),48),rim:Math.pow(1-Math.max(0,x*vx+y*vy+z*vz),3)});
    }
    function draw(longitude,latitude,selected){
      var lon0=longitude*Math.PI/180,lat0=latitude*Math.PI/180,sl=Math.sin(lat0),cl=Math.cos(lat0),data=pixels.data;
      rays.forEach(function(p){
        var lat=Math.asin(Math.max(-1,Math.min(1,p.y*cl+p.z*sl))),lon=lon0+Math.atan2(p.x,p.z*cl-p.y*sl);
        var u=((lon/Math.PI+1)/2%1+1)%1,v=.5-lat/Math.PI,tx=Math.min(2047,Math.floor(u*2048)),ty=Math.max(0,Math.min(1023,Math.floor(v*1024))),at=(ty*2048+tx)*4;
        var id=texture[at],land=id>0,right=texture[at+4],below=texture[at+8192],border=land&&((right>0&&right!==id)||(below>0&&below!==id));
        var base=land?[.28,.60,.53]:[.025,.15,.23];if(border)base=[.54,.76,.65];if(land&&id===selected+1)base=[.91,.67,.35];
        var grid=Math.min(Math.abs(((u*12+.5)%1)-.5),Math.abs(((v*6+.5)%1)-.5))<.006;
        for(var i=0;i<3;i++)data[p.offset+i]=Math.min(255,Math.round(255*(base[i]*p.light+p.spec*(land?.035:.27)+[.06,.15,.18][i]*p.rim+(grid?[.03,.07,.065][i]:0))));
        data[p.offset+3]=255;
      });
      ctx.putImageData(pixels,0,0);
    }
    return {draw:draw};
  }
  window.GIMGlobeSoftware={create:create};
}());

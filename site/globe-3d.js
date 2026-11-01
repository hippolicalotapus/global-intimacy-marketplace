"use strict";
/* A real WebGL sphere, locally rendered. No map tiles, map API or network calls. */
(function(){
  function create(canvas,world){
    var gl=canvas.getContext("webgl",{alpha:true,antialias:true,depth:true,premultipliedAlpha:false});
    if(!gl)throw new Error("WebGL unavailable");
    canvas.width=900;canvas.height=900;canvas.dataset.renderer="webgl-3d";
    var vertex="attribute vec3 aPosition;attribute vec2 aUV;uniform mat4 uModel;uniform mat4 uProjection;uniform float uScale;varying vec3 vNormal;varying vec3 vPosition;varying vec2 vUV;void main(){vec4 p=uModel*vec4(aPosition*uScale,1.0);vPosition=p.xyz;vNormal=normalize((uModel*vec4(aPosition,0.0)).xyz);vUV=aUV;p.z-=3.0;gl_Position=uProjection*p;}";
    var fragment="precision mediump float;uniform sampler2D uMap;uniform float uSelected;uniform float uAtmosphere;varying vec3 vNormal;varying vec3 vPosition;varying vec2 vUV;void main(){vec3 n=normalize(vNormal);vec3 view=normalize(vec3(0.0,0.0,3.0)-vPosition);float facing=max(dot(n,view),0.0);if(uAtmosphere>0.5){float rim=pow(1.0-facing,4.0);gl_FragColor=vec4(0.32,0.72,0.78,rim*0.45);return;}float id=floor(texture2D(uMap,vUV).r*255.0+0.5);bool land=id>0.5;float right=floor(texture2D(uMap,vUV+vec2(1.0/2048.0,0.0)).r*255.0+0.5);float down=floor(texture2D(uMap,vUV+vec2(0.0,1.0/1024.0)).r*255.0+0.5);bool border=land&&((right>0.5&&abs(right-id)>0.5)||(down>0.5&&abs(down-id)>0.5));vec3 base=land?vec3(0.28,0.60,0.53):vec3(0.025,0.15,0.23);if(border)base=vec3(0.54,0.76,0.65);if(abs(id-uSelected)<0.4&&land)base=vec3(0.91,0.67,0.35);vec3 light=normalize(vec3(-0.65,0.8,1.1));float diffuse=max(dot(n,light),0.0);vec3 halfAngle=normalize(light+view);float spec=pow(max(dot(n,halfAngle),0.0),48.0)*(land?0.035:0.27);float rim=pow(1.0-facing,3.0);vec3 rgb=base*(0.28+0.8*diffuse)+vec3(spec)+vec3(0.06,0.15,0.18)*rim;float grid=min(abs(fract(vUV.x*12.0+0.5)-0.5),abs(fract(vUV.y*6.0+0.5)-0.5));if(grid<0.006)rgb+=vec3(0.03,0.07,0.065);gl_FragColor=vec4(rgb,1.0);}";
    function shader(type,source){var s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error("Globe shader failed");return s;}
    var program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error("Globe program failed");gl.useProgram(program);
    var flat=document.createElement("canvas");flat.width=2048;flat.height=1024;
    var c=flat.getContext("2d");
    world.features.forEach(function(f,index){var polygons=f.geometry.type==="Polygon"?[f.geometry.coordinates]:f.geometry.coordinates;c.fillStyle="rgb("+(index+1)+",0,0)";polygons.forEach(function(rings){c.beginPath();rings.forEach(function(ring){ring.forEach(function(p,i){var x=(p[0]+180)/360*2048,y=(90-p[1])/180*1024;if(i)c.lineTo(x,y);else c.moveTo(x,y);});c.closePath();});c.fill("evenodd");});});
    var texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,flat);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    var positions=[],uv=[],indices=[],rows=64,cols=128;
    for(var row=0;row<=rows;row++){var lat=Math.PI/2-row/rows*Math.PI;for(var col=0;col<=cols;col++){var lon=-Math.PI+col/cols*Math.PI*2;positions.push(Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon));uv.push(col/cols,row/rows);}}
    for(var y=0;y<rows;y++)for(var x=0;x<cols;x++){var a=y*(cols+1)+x,b=a+cols+1;indices.push(a,b,a+1,a+1,b,b+1);}
    function attribute(name,data,count){var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);var loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,count,gl.FLOAT,false,0,0);}
    attribute("aPosition",positions,3);attribute("aUV",uv,2);
    var index=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
    var model=gl.getUniformLocation(program,"uModel"),projection=gl.getUniformLocation(program,"uProjection"),selected=gl.getUniformLocation(program,"uSelected"),scale=gl.getUniformLocation(program,"uScale"),atmosphere=gl.getUniformLocation(program,"uAtmosphere");
    var f=1/Math.tan(42*Math.PI/360),near=.1,far=10;
    gl.uniformMatrix4fv(projection,false,new Float32Array([f,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]));gl.uniform1i(gl.getUniformLocation(program,"uMap"),0);
    function draw(longitude,latitude,selectedIndex){
      var lo=longitude*Math.PI/180,la=latitude*Math.PI/180,cl=Math.cos(lo),sl=Math.sin(lo),ca=Math.cos(la),sa=Math.sin(la);
      gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.disable(gl.BLEND);
      gl.uniformMatrix4fv(model,false,new Float32Array([cl,-sa*sl,ca*sl,0,0,ca,sa,0,-sl,-sa*cl,ca*cl,0,0,0,0,1]));gl.uniform1f(selected,selectedIndex+1);gl.uniform1f(scale,1);gl.uniform1f(atmosphere,0);gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.depthMask(false);gl.uniform1f(scale,1.025);gl.uniform1f(atmosphere,1);gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);gl.depthMask(true);
    }
    return {draw:draw};
  }
  window.GIMGlobe3D={create:create};
}());

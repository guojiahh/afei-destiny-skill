/* Original Cihou hero scene v4. No copied benchmark artwork.
 * Reference observations: Nomadic n10 (diagonal planes / tracked subject),
 * Kaizen k05/k14/k16 (quiet world before scale change), Wayfinder (small walker).
 * Three.js r160 is bundled alongside this file under its MIT license.
 */
(function (global) {
  'use strict';
  var T=global.THREE,PI=Math.PI,TAU=2*PI;
  var clamp=function(x,a,b){return Math.max(a,Math.min(b,x));};
  var smooth=function(x){x=clamp(x,0,1);return x*x*(3-2*x);};
  var lerp=function(a,b,t){return a+(b-a)*t;};
  var seed=75217;
  function rand(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}

  function Scene(container,options){
    this.container=container;this.options=options||{};this.resources=[];
    this.progress=this.targetProgress=0;this.exit=this.targetExit=0;this.time=0;this.gaitTime=0;this.wind=this.targetWind=0;this.travel=0;this.last=0;this.active=true;this.paused=false;this.destroyed=false;
    this.reducedMotion=this.options.reducedMotion===undefined?!!(global.matchMedia&&global.matchMedia('(prefers-reduced-motion: reduce)').matches):!!this.options.reducedMotion;
    this._tick=this._tick.bind(this);this.resize=this.resize.bind(this);
    this.mode='webgl';
    try{if(!T)throw new Error('Three.js unavailable');this._init();}
    catch(error){this.mode='canvas';this.error=String(error.message||error);if(this.renderer){this.renderer.dispose();this.renderer.domElement.remove();}this._fallback();}
    if(global.ResizeObserver){this.observer=new ResizeObserver(this.resize);this.observer.observe(container);}else global.addEventListener('resize',this.resize);
    this.resize();this.raf=requestAnimationFrame(this._tick);
    if(this.options.spriteUrl)this.setSprite(this.options.spriteUrl,this.options);
    if(this.options.onReady)this.options.onReady({mode:this.mode});
  }
  Scene.prototype._own=function(item){this.resources.push(item);return item;};
  Scene.prototype.surface=function(u,v){
    // A smooth localized half-turn is still one Möbius surface. Concentrating
    // the turn creates a place she can actually approach, cross, and remember.
    var cycle=Math.floor((u+PI)/TAU),wrapped=u-cycle*TAU;
    var angle=PI*(cycle+smooth((wrapped+.24)/.48));
    var radial=Math.cos(angle);
    return new T.Vector3((7.4+v*radial)*Math.cos(u),2.1+v*Math.sin(angle),(11.2+v*radial)*Math.sin(u))
      .applyAxisAngle(new T.Vector3(1,0,0),.025).applyAxisAngle(new T.Vector3(0,0,1),-.035);
  };
  Scene.prototype.basis=function(u){
    var p=this.surface(u,0),t=this.surface(u+.0005,0).sub(p).normalize(),a=this.surface(u,.0005).sub(p).normalize();
    return{p:p,t:t,a:a,n:new T.Vector3().crossVectors(t,a).normalize()};
  };
  Scene.prototype._geometry=function(){
    var vertices=[],uv=[],indices=[],steps=500,rows=20;
    for(var i=0;i<=steps;i++)for(var j=0;j<=rows;j++){
      var p=this.surface(i/steps*TAU,(j/rows*2-1)*1.26);vertices.push(p.x,p.y,p.z);uv.push(i/steps,j/rows);
    }
    for(var a=0;a<steps;a++)for(var b=0;b<rows;b++){var k=a*(rows+1)+b;indices.push(k,k+rows+1,k+1,k+1,k+rows+1,k+rows+2);}
    var geo=this._own(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;
  };
  Scene.prototype._material=function(){
    this.uniforms={ink:{value:new T.Color('#405879')},paper:{value:new T.Color('#dfafa8')},outline:{value:new T.Color('#283b50')},paint:{value:this._own(new T.DataTexture(new Uint8Array([64,88,121,255]),1,1))},paintReady:{value:0}};
    this.uniforms.paint.value.needsUpdate=true;return this._own(new T.ShaderMaterial({side:T.DoubleSide,uniforms:this.uniforms,
      vertexShader:'varying vec2 vUv;varying vec3 vNormal;void main(){vUv=uv;vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:[
        'precision highp float;varying vec2 vUv;varying vec3 vNormal;uniform vec3 ink;uniform vec3 paper;uniform vec3 outline;uniform sampler2D paint;uniform float paintReady;',
        'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
        'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
        'void main(){vec3 norm=normalize(vNormal);if(!gl_FrontFacing)norm=-norm;',
        'float light=.90+.10*max(dot(norm,normalize(vec3(-.4,1.,.45))),0.);',
        'float grain=(h(gl_FragCoord.xy)-.5)*.014;',
        'float distance=min(vUv.y,1.-vUv.y);',
        'float dry=.019+n(vec2(vUv.x*1000.,0.))*.0025;',
        'float edge=1.-smoothstep(dry,dry+.0015,distance);',
        'float line=1.-smoothstep(.001,.0028,distance);',
        'vec3 painted=texture2D(paint,vec2(vUv.x*14.,vUv.y)).rgb;vec3 surface=mix(ink,painted,paintReady*.27)*light;vec3 col=mix(mix(surface,paper*light,edge),outline,line)+grain;',
        'gl_FragColor=vec4(col,1.);',
        '#include <colorspace_fragment>',
        '}'
      ].join('\n')
    }));
  };
  Scene.prototype._init=function(){
    this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(2,global.devicePixelRatio||1));this.renderer.setClearColor('#f1eade',1);this.renderer.outputColorSpace=T.SRGBColorSpace;
    this.renderer.domElement.setAttribute('aria-hidden','true');this.renderer.domElement.style.cssText='display:block;width:100%;height:100%;pointer-events:none;';this.container.appendChild(this.renderer.domElement);
    this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-8,8,5,-5,.1,80);
    this.scene.add(new T.HemisphereLight('#fbf6dd','#67746a',2.3));
    var sun=new T.DirectionalLight('#fff7dd',1);sun.position.set(-8,12,-3);this.scene.add(sun);
    this.ribbon=new T.Mesh(this._geometry(),this._material());this.scene.add(this.ribbon);
    this._ground();this._marks();this._walker();this._loadRoadPaint();
  };
  Scene.prototype._ground=function(){
    var geo=this.ribbon.geometry.clone(),positions=geo.attributes.position;
    for(var i=0;i<positions.count;i++){
      var height=positions.getY(i)+1.1;positions.setXYZ(i,positions.getX(i)+height*.32,-1.1,positions.getZ(i)+height*.17);
    }
    positions.needsUpdate=true;
    var mat=this._own(new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:'varying vec2 vUv;void main(){float a=smoothstep(0.,.025,vUv.y)*smoothstep(1.,.975,vUv.y);gl_FragColor=vec4(.20,.24,.29,a*.018);}'
    }));this._own(geo);this.scene.add(new T.Mesh(geo,mat));
    var points=[];for(var j=0;j<=1000;j++)points.push(this.surface(j/1000*TAU*2,1.26));
    var curve=new T.CatmullRomCurve3(points,false,'centripetal');
    this.scene.add(new T.Mesh(this._own(new T.TubeGeometry(curve,1000,.008,3,false)),this._own(new T.MeshBasicMaterial({color:'#283b50'}))));
  };
  Scene.prototype._loadRoadPaint=function(){
    var self=this,image=new Image();image.onload=function(){if(self.destroyed)return;var texture=self._own(new T.Texture(image));texture.colorSpace=T.SRGBColorSpace;texture.wrapS=T.RepeatWrapping;texture.wrapT=T.ClampToEdgeWrapping;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.needsUpdate=true;self.uniforms.paint.value=texture;self.uniforms.paintReady.value=1;self.render();};image.src=this.options.roadTextureUrl||'paper-road-v1.png';
  };
  Scene.prototype._marks=function(){
    var points=[],start=-TAU-.27,end=.08;
    for(var i=0;i<=900;i++){var u=lerp(start,end,i/900),b=this.basis(u);points.push(this.surface(u,-.075+Math.sin(u*8)*.017).addScaledVector(b.n,.021));}
    this.trace=new T.Line(this._own(new T.BufferGeometry().setFromPoints(points)),this._own(new T.LineBasicMaterial({color:'#d6bf7d',transparent:true,opacity:.54,depthWrite:false})));
    this.trace.geometry.setDrawRange(0,850);this.scene.add(this.trace);
    this.markerAnchor=this.surface(-.205,-1.17);this.markerBasis=this.basis(-.205);
    this.markerShadow=new T.Mesh(this._own(new T.CircleGeometry(.30,24)),this._own(new T.MeshBasicMaterial({color:'#263a4f',transparent:true,opacity:.19,side:T.DoubleSide,depthWrite:false})));
    this.markerShadow.position.copy(this.markerAnchor).addScaledVector(this.markerBasis.n,.02).addScaledVector(this.markerBasis.t,-.12);this.markerShadow.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),this.markerBasis.n);this.markerShadow.scale.set(.50,1,1);this.scene.add(this.markerShadow);
    if(this.options.markerUrl)this.setMarkerImage(this.options.markerUrl,this.options.markerMetadata);
  };
  Scene.prototype.setMarkerImage=function(url,metadata){
    var self=this,img=new Image();metadata=metadata||{alphaBBox8:[394,142,1266,900],basePx:[780,895],alphaTest:.035};
    img.onload=function(){if(self.destroyed)return;var box=metadata.alphaBBox8||[0,0,img.width,img.height],width=box[2]-box[0],height=box[3]-box[1],base=metadata.basePx||[(box[0]+box[2])*.5,box[3]-3];
      var texture=self._own(new T.Texture(img));texture.colorSpace=T.SRGBColorSpace;texture.minFilter=texture.magFilter=T.LinearFilter;texture.repeat.set(width/img.width,height/img.height);texture.offset.set(box[0]/img.width,1-box[3]/img.height);texture.needsUpdate=true;
      var sprite=new T.Sprite(self._own(new T.SpriteMaterial({map:texture,transparent:true,alphaTest:metadata.alphaTest||.035,depthWrite:false})));sprite.center.set((base[0]-box[0])/width,(box[3]-base[1])/height);self.marker=sprite;self.markerImage={width:width,height:height};self.scene.add(sprite);self.render();};img.src=url;return this;
  };
  Scene.prototype.setRig=function(rig){this.rig=rig;if(this.mode!=='webgl')return this;this.figure.visible=false;if(this.sprite)this.sprite.visible=false;this.walkerRoot.add(rig.group);rig.group.position.set(0,0,0);this.render();return this;};
  Scene.prototype._exitPath=function(){
    var b=this.basis(.08),side=b.a.dot(new T.Vector3(1,0,1))>0?1:-1;
    var start=b.p.clone().addScaledVector(b.n,.03),rim=this.surface(.08,side*1.26).addScaledVector(b.n,.03);
    var outward=b.a.clone().multiplyScalar(side),end=rim.clone().addScaledVector(outward,3.0).addScaledVector(b.t,1.0);end.y=1.0;
    this.exitCurve=new T.CatmullRomCurve3([start,rim,rim.clone().addScaledVector(outward,1.0),end],false,'centripetal');
    var vertices=[],uv=[],indices=[],steps=120;
    for(var i=0;i<=steps;i++){var at=i/steps,p=this.exitCurve.getPointAt(at),t=this.exitCurve.getTangentAt(at),cross=new T.Vector3().crossVectors(t,new T.Vector3(0,1,0)).normalize();if(cross.lengthSq()<.001)cross.copy(b.t);var width=.30*(.85+.15*Math.sin(PI*at));var a=p.clone().addScaledVector(cross,-width),c=p.clone().addScaledVector(cross,width);vertices.push(a.x,a.y,a.z,c.x,c.y,c.z);uv.push(at,0,at,1);if(i<steps){var k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
    var geo=this._own(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();geo.setDrawRange(0,0);
    this.exitPaper=new T.Mesh(geo,this._own(new T.MeshBasicMaterial({color:'#e7cfbb',side:T.DoubleSide})));this.scene.add(this.exitPaper);this.exitEdges=[];for(var side=0;side<2;side++){var points=[];for(var at=side;at<vertices.length/3;at+=2)points.push(new T.Vector3(vertices[at*3],vertices[at*3+1]+.002,vertices[at*3+2]));var line=new T.Line(this._own(new T.BufferGeometry().setFromPoints(points)),this._own(new T.LineBasicMaterial({color:'#566071',transparent:true,opacity:.55})));line.geometry.setDrawRange(0,0);this.scene.add(line);this.exitEdges.push(line);}
  };
  Scene.prototype._shape=function(points,color){var shape=new T.Shape();shape.moveTo(points[0][0],points[0][1]);for(var i=1;i<points.length;i++)shape.lineTo(points[i][0],points[i][1]);shape.closePath();return new T.Mesh(this._own(new T.ShapeGeometry(shape)),this._own(new T.MeshBasicMaterial({color:color,side:T.DoubleSide})));};
  Scene.prototype._walker=function(){
    this.walkerRoot=new T.Group();this.scene.add(this.walkerRoot);
    this.figure=new T.Group();this.walkerRoot.add(this.figure);
    this.legs=[];this.arms=[];
    var dark='#3b332e',skin='#d4b68c',red='#ad4f37';
    // Placeholder drawn from original simple shapes. The replaceable image API
    // below deliberately does not depend on this provisional character style.
    for(var i=0;i<2;i++){
      var leg=new T.Mesh(this._own(new T.PlaneGeometry(.027,.16)),this._own(new T.MeshBasicMaterial({color:dark,side:T.DoubleSide})));
      leg.position.set((i?1:-1)*.047,.08,0);this.figure.add(leg);this.legs.push(leg);
      var arm=new T.Mesh(this._own(new T.PlaneGeometry(.025,.17)),this._own(new T.MeshBasicMaterial({color:skin,side:T.DoubleSide})));
      arm.position.set((i?1:-1)*.11,.29,.002);this.figure.add(arm);this.arms.push(arm);
    }
    this.dress=this._shape([[-.072,.37],[.055,.37],[.12,.14],[-.135,.14]],red);this.dress.position.z=.005;this.figure.add(this.dress);
    var head=new T.Mesh(this._own(new T.CircleGeometry(.071,20)),this._own(new T.MeshBasicMaterial({color:skin,side:T.DoubleSide})));head.position.set(-.006,.445,.008);this.figure.add(head);
    this.hair=this._shape([[-.086,.42],[-.086,.48],[-.05,.52],[.024,.52],[.066,.48],[.061,.433],[.033,.42],[.02,.478],[-.038,.48],[-.035,.41]],'#44372e');this.hair.position.z=.012;this.figure.add(this.hair);
    this.shadowRoot=new T.Group();this.scene.add(this.shadowRoot);
    this.contact=new T.Mesh(this._own(new T.CircleGeometry(.13,24)),this._own(new T.MeshBasicMaterial({color:'#263a50',transparent:true,opacity:.32,side:T.DoubleSide,depthWrite:false})));
    this.contact.scale.set(1,.30,1);this.shadowRoot.add(this.contact);
    var shadowDress=this._shape([[-.045,0],[.065,0],[.16,.35],[-.08,.35]],'#263a50');shadowDress.material.transparent=true;shadowDress.material.opacity=.17;shadowDress.material.depthWrite=false;this.shadowRoot.add(shadowDress);
    var shadowHead=new T.Mesh(this._own(new T.CircleGeometry(.075,18)),this._own(new T.MeshBasicMaterial({color:'#263a50',transparent:true,opacity:.17,side:T.DoubleSide,depthWrite:false})));shadowHead.position.set(.05,.4,0);this.shadowRoot.add(shadowHead);
  };
  Scene.prototype.setSprite=function(url,metadata){
    var self=this,m=metadata||{},img=new Image();img.onload=function(){if(self.destroyed)return;self.spriteImage=img;self.spriteMetadata=m;
      if(self.mode==='webgl'){
        var tex=self._own(new T.Texture(img));tex.colorSpace=T.SRGBColorSpace;tex.minFilter=tex.magFilter=T.LinearFilter;tex.generateMipmaps=false;tex.needsUpdate=true;
        var columns=m.spriteColumns||m.columns||8,rows=m.spriteRows||m.rows||1;tex.repeat.set(1/columns,1/rows);
        var sprite=new T.Sprite(self._own(new T.SpriteMaterial({map:tex,transparent:true,depthWrite:false})));sprite.center.set(.5,.02);self.sprite=sprite;self.spriteTexture=tex;self.walkerRoot.add(sprite);self.figure.visible=false;
      }self.render();if(self.options.onSpriteReady)self.options.onSpriteReady();};img.onerror=function(){if(self.options.onError)self.options.onError('sprite-load');};img.src=url;
  };
  Scene.prototype._camera=function(b,raw){
    var follow=smooth(raw/.25),turn=smooth((raw-.25)/.40),reveal=smooth((raw-.65)/.35),e=smooth(this.exit);
    var normal=b.n.clone(),across=new T.Vector3().crossVectors(normal,b.t).normalize();
    var closeUp=b.t.clone().multiplyScalar(.50).addScaledVector(across,.866).normalize();
    var eye=b.p.clone().addScaledVector(normal,10).addScaledVector(b.t,-2.8),target=b.p.clone().addScaledVector(closeUp,.18);
    target.addScaledVector(b.t,turn*.75);eye.addScaledVector(b.t,-turn*.5);
    var farEye=new T.Vector3(-15,12,22),farTarget=new T.Vector3(0,2,0);
    eye.lerp(farEye,reveal);target.lerp(farTarget,reveal);this.camera.up.copy(closeUp).lerp(new T.Vector3(0,1,0),reveal).normalize();
    if(e>0&&this.exitCurve){var exitPoint=this.exitCurve.getPointAt(smooth((this.exit-.10)/.90));target.lerp(exitPoint,e*.68);eye.lerp(exitPoint.clone().add(new T.Vector3(5,7,9)),e*.55);}
    this.camera.position.copy(eye);this.camera.lookAt(target);this.camera.updateMatrixWorld();
    var right=new T.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0),up=new T.Vector3().setFromMatrixColumn(this.camera.matrixWorld,1),minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(var i=0;i<100;i++)for(var side=-1;side<=1;side+=2){var pt=this.surface(i/100*TAU,side*1.26),xx=pt.dot(right),yy=pt.dot(up);minX=Math.min(minX,xx);maxX=Math.max(maxX,xx);minY=Math.min(minY,yy);maxY=Math.max(maxY,yy);}
    var aspect=this.width/this.height,farHeight=Math.max((maxY-minY)/.68,(maxX-minX)/(aspect*.71));
    var height=lerp(lerp(3.8,4.2,follow)+turn*2.0,farHeight,reveal);height=lerp(height,8.8,e*.48);this.viewHeight=height;this.reveal=reveal;
    this.camera.left=-height*aspect*.5;this.camera.right=height*aspect*.5;this.camera.top=height*.5;this.camera.bottom=-height*.5;this.camera.updateProjectionMatrix();
  };
  Scene.prototype.render=function(){
    if(this.destroyed)return;if(this.mode!=='webgl'){this._drawFallback();return;}
    var u=-.27+.35*smooth(this.progress/.68),b=this.basis(u),exit=this.exit;
    if(exit>0&&!this.exitCurve)this._exitPath();this._camera(b,this.progress);
    var point=b.p.clone().addScaledVector(b.n,.026),normal=b.n.clone(),tangent=b.t.clone();
    if(exit>0){var walk=smooth((exit-.10)/.90);point.copy(this.exitCurve.getPointAt(walk));tangent.copy(this.exitCurve.getTangentAt(walk));normal.lerp(new T.Vector3(0,1,0),smooth(exit/.6)).normalize();this.exitPaper.geometry.setDrawRange(0,Math.floor(smooth(exit/.62)*120)*6);this.exitEdges.forEach(function(line){line.geometry.setDrawRange(0,Math.floor(smooth(exit/.62)*120)+1);});}else if(this.exitPaper){this.exitPaper.geometry.setDrawRange(0,0);this.exitEdges.forEach(function(line){line.geometry.setDrawRange(0,0);});}
    this.walkerRoot.position.copy(point);
    var facingCamera=this.camera.position.clone().sub(point).normalize(),cameraUp=new T.Vector3().setFromMatrixColumn(this.camera.matrixWorld,1),surfaceUp=normal.clone().addScaledVector(facingCamera,-normal.dot(facingCamera));
    if(surfaceUp.lengthSq()<.04)surfaceUp.copy(cameraUp);surfaceUp.normalize();var up=cameraUp.lerp(surfaceUp,smooth((this.progress-.28)/.65)*.90).normalize();
    if(exit>0)up.lerp(new T.Vector3(0,1,0),smooth(exit/.6)).normalize();
    var right=new T.Vector3().crossVectors(up,facingCamera).normalize();up.crossVectors(facingCamera,right).normalize();this.walkerRoot.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,facingCamera));
    var planeHeight=this.viewHeight*lerp(.112,.050,this.reveal);if(exit>0)planeHeight=this.viewHeight*lerp(.05,.085,smooth(exit));
    if(this.rig){this.walkerRoot.scale.setScalar(planeHeight/this.rig.height);this.rig.update(this.gaitTime,.85+this.wind*.5);this.rig.setFacing(tangent.dot(right)>=0?1:-1);}
    else{this.walkerRoot.scale.setScalar(planeHeight/.56);var phase=this.time*TAU;this.legs.forEach(function(leg,i){leg.rotation.z=Math.sin(phase+i*PI)*.3;});this.arms.forEach(function(arm,i){arm.rotation.z=-Math.sin(phase+i*PI)*.2;});}
    this.shadowRoot.position.copy(point).addScaledVector(normal,-.006);var shadowUp=tangent.clone().multiplyScalar(-1),shadowRight=new T.Vector3().crossVectors(shadowUp,normal).normalize();this.shadowRoot.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(shadowRight,shadowUp,normal));this.shadowRoot.scale.setScalar(planeHeight/.56);
    if(this.marker){var size=this.viewHeight*lerp(.105,.034,this.reveal);this.marker.position.copy(this.markerAnchor).addScaledVector(this.markerBasis.n,.03);this.marker.scale.set(size*this.markerImage.width/this.markerImage.height,size,1);}
    var count=Math.floor((u+TAU+.27)/(TAU+.35)*900)+1;this.trace.geometry.setDrawRange(0,count);
    this.renderer.render(this.scene,this.camera);
  };
  Scene.prototype._fallback=function(){this.canvas=document.createElement('canvas');this.canvas.style.cssText='display:block;width:100%;height:100%;';this.container.appendChild(this.canvas);this.context=this.canvas.getContext('2d');};
  Scene.prototype._drawFallback=function(){
    var c=this.context;if(!c)return;var w=this.width,h=this.height,p=smooth(this.progress);c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#f1eade';c.fillRect(0,0,w,h);c.save();c.translate(w/2,h/2);c.rotate(-.62*(1-p));c.strokeStyle='#dfafa8';c.lineWidth=lerp(h*.40,h*.08,p)+4;c.beginPath();if(p<.02){c.moveTo(-w,0);c.lineTo(w,0);}else c.ellipse(0,0,lerp(w*2,Math.min(w*.34,h*.47),p),lerp(0,h*.17,p),0,0,TAU);c.stroke();c.strokeStyle='#405879';c.lineWidth-=4;c.stroke();c.restore();c.fillStyle='#ad4f37';c.beginPath();c.moveTo(w/2-5,h/2-20);c.lineTo(w/2+4,h/2-20);c.lineTo(w/2+8,h/2);c.lineTo(w/2-8,h/2);c.fill();c.fillStyle='#44372e';c.beginPath();c.arc(w/2,h/2-25,5,0,TAU);c.fill();
  };
  Scene.prototype.resize=function(){var r=this.container.getBoundingClientRect();this.width=Math.max(1,r.width);this.height=Math.max(1,r.height);this.dpr=Math.min(2,global.devicePixelRatio||1);if(this.renderer){this.renderer.setPixelRatio(this.dpr);this.renderer.setSize(this.width,this.height,false);}else{this.canvas.width=this.width*this.dpr;this.canvas.height=this.height*this.dpr;}this.render();};
  Scene.prototype._tick=function(now){
    this.raf=0;if(this.destroyed)return;
    var dt=this.last?Math.min(.05,(now-this.last)/1000):0;this.last=now;
    if(this.active&&!this.paused){
      var changed=Math.abs(this.targetProgress-this.progress)>.00001||Math.abs(this.targetExit-this.exit)>.00001;
      if(!this.reducedMotion){this.wind=lerp(this.wind,this.targetWind,1-Math.exp(-dt*5));this.time+=dt;this.gaitTime+=dt*(.85+this.wind*.24);this.travel+=dt*(.022+this.wind*.032);}
      if(changed){var weight=this.reducedMotion?1:1-Math.exp(-dt*7);this.progress=lerp(this.progress,this.targetProgress,weight);this.exit=lerp(this.exit,this.targetExit,weight);}
      if(changed||!this.reducedMotion||!this.firstRendered){this.render();this.firstRendered=true;}
      this.raf=requestAnimationFrame(this._tick);
    }
  };
  Scene.prototype.setProgress=function(value){this.targetProgress=clamp(Number(value)||0,0,1);if(this.reducedMotion){this.progress=this.targetProgress;this.render();}return this;};
  Scene.prototype.setExit=function(value){this.targetExit=clamp(Number(value)||0,0,1);if(this.reducedMotion){this.exit=this.targetExit;this.render();}return this;};
  Scene.prototype.setInteraction=function(value){this.targetWind=clamp(Number(value)||0,0,1);return this;};
  Scene.prototype.setPaused=function(value){this.paused=!!value;this.last=0;if(this.paused){cancelAnimationFrame(this.raf);this.raf=0;}else if(this.active&&!this.raf)this.raf=requestAnimationFrame(this._tick);return this;};
  Scene.prototype.setActive=function(value){this.active=!!value;this.last=0;if(!this.active){cancelAnimationFrame(this.raf);this.raf=0;}else if(!this.paused&&!this.raf)this.raf=requestAnimationFrame(this._tick);return this;};
  Scene.prototype.destroy=function(){this.destroyed=true;if(this.rig)this.rig.dispose();cancelAnimationFrame(this.raf);if(this.observer)this.observer.disconnect();else global.removeEventListener('resize',this.resize);if(this.renderer){this.renderer.dispose();this.renderer.domElement.remove();}if(this.canvas)this.canvas.remove();this.resources.forEach(function(r){r.dispose();});};
  global.CihouHeroSceneV4=Scene;
})(window);

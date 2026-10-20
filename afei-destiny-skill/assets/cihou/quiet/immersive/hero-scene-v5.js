/* Original Cihou hero scene v5. No copied benchmark artwork.
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
    this.progress=this.targetProgress=0;this.exit=this.targetExit=0;this.distance=0;this.exitDistance=0;this.exitAge=0;this.actorWorldHeight=.42;this.eventStart=-1;this.eventPhase=0;this.revealReady=false;this.exitMode=false;this.time=0;this.gaitTime=0;this.wind=this.targetWind=0;this.travel=0;this.last=0;this.active=true;this.paused=false;this.destroyed=false;
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
    // A complete, evenly distributed half-turn; no pinched local corner.
    var a=u*.5,c=Math.cos(a);
    return new T.Vector3((7.0+v*c)*Math.cos(u),1.65+v*Math.sin(a),(7.8+v*c)*Math.sin(u))
      .applyAxisAngle(new T.Vector3(1,0,0),.045).applyAxisAngle(new T.Vector3(0,0,1),-.035);
  };
  Scene.prototype._makeRoute=function(){
    this.route=[];var previous=null,distance=0;for(var i=0;i<=1600;i++){var u=-.32+i/1600*TAU,p=this.surface(u,0);if(previous)distance+=p.distanceTo(previous);this.route.push({u:u,d:distance});previous=p;}this.routeLength=distance;this.markerU=-.245;
    var before=this.surface(-.32,0),after=this.surface(this.markerU,0);this.markerDistance=before.distanceTo(after);this.markerAnchor=this.surface(this.markerU,-.96);this.markerBasis=this.basis(this.markerU);
  };
  Scene.prototype._routeU=function(distance){var cycles=Math.floor(distance/this.routeLength),d=((distance%this.routeLength)+this.routeLength)%this.routeLength,low=0,high=this.route.length-1;while(high-low>1){var mid=(low+high)>>1;if(this.route[mid].d<d)low=mid;else high=mid;}var a=this.route[low],b=this.route[high];return lerp(a.u,b.u,(d-a.d)/(b.d-a.d))+cycles*TAU;};
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
    this.uniforms={ink:{value:new T.Color('#405879')},paper:{value:new T.Color('#dfafa8')},outline:{value:new T.Color('#283b50')},paint:{value:this._own(new T.DataTexture(new Uint8Array([64,88,121,255]),1,1))},paintReady:{value:0},warm:{value:0},eventU:{value:(TAU-.245)/TAU}};
    this.uniforms.paint.value.needsUpdate=true;return this._own(new T.ShaderMaterial({side:T.DoubleSide,uniforms:this.uniforms,
      vertexShader:'varying vec2 vUv;varying vec3 vNormal;void main(){vUv=uv;vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:[
        'precision highp float;varying vec2 vUv;varying vec3 vNormal;uniform vec3 ink;uniform vec3 paper;uniform vec3 outline;uniform sampler2D paint;uniform float paintReady;uniform float warm;uniform float eventU;',
        'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
        'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
        'void main(){vec3 norm=normalize(vNormal);if(!gl_FrontFacing)norm=-norm;',
        'float light=.90+.10*max(dot(norm,normalize(vec3(-.4,1.,.45))),0.);',
        'float grain=(h(gl_FragCoord.xy)-.5)*.014;',
        'float distance=min(vUv.y,1.-vUv.y);',
        'float dry=.019+n(vec2(vUv.x*1000.,0.))*.0025;',
        'float edge=1.-smoothstep(dry,dry+.0015,distance);',
        'float line=1.-smoothstep(.001,.0028,distance);',
        'vec3 painted=texture2D(paint,vec2(vUv.x*14.,vUv.y)).rgb;vec3 surface=mix(ink,painted,paintReady*.24)*light;float travelled=step(fract(vUv.x-eventU),warm);float lane=exp(-pow((vUv.y-.5)*17.,2.));surface=mix(surface,surface+vec3(.028,.017,-.004),travelled*lane*.70);vec3 col=mix(mix(surface,paper*light,edge),outline,line)+grain;',
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
    this._makeRoute();this._ground();this._marks();this._walker();this._loadRoadPaint();
  };
  Scene.prototype._ground=function(){
    // Broken dry-brush shadows, with no smooth grey ellipse beneath the object.
    seed=59231;var positions=[],colors=[],indices=[];for(var i=0;i<66;i++){
      var u=i/66*TAU,b=this.basis(u),point=this.surface(u,(rand()-.5)*1.2),length=.18+rand()*.65,width=.12+rand()*.32;
      point.x+=(point.y+.3)*.26;point.z+=(point.y+.3)*.10;point.y=-.30;
      var t=b.t.clone();t.y=0;t.normalize();var side=new T.Vector3(-t.z,0,t.x);var offset=positions.length/3;
      var corners=[[-1,-1],[1,-.7],[1,.4],[-1,1]];corners.forEach(function(c){var p=point.clone().addScaledVector(t,c[0]*length).addScaledVector(side,c[1]*width);positions.push(p.x,p.y,p.z);});indices.push(offset,offset+1,offset+2,offset,offset+2,offset+3);
    }
    var geo=this._own(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);this.scene.add(new T.Mesh(geo,this._own(new T.MeshBasicMaterial({color:'#7f8b8b',transparent:true,opacity:.035,depthWrite:false,side:T.DoubleSide}))));
    var points=[];for(var j=0;j<=1000;j++)points.push(this.surface(j/1000*TAU*2,1.26));this.scene.add(new T.Mesh(this._own(new T.TubeGeometry(new T.CatmullRomCurve3(points,false,'centripetal'),1000,.006,3,false)),this._own(new T.MeshBasicMaterial({color:'#46536b'}))));
  };
  Scene.prototype._loadRoadPaint=function(){
    var self=this,image=new Image();image.onload=function(){if(self.destroyed)return;var texture=self._own(new T.Texture(image));texture.colorSpace=T.SRGBColorSpace;texture.wrapS=T.RepeatWrapping;texture.wrapT=T.ClampToEdgeWrapping;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.needsUpdate=true;self.uniforms.paint.value=texture;self.uniforms.paintReady.value=1;self.render();};image.src=this.options.roadTextureUrl||'paper-road-v1.png';
  };
  Scene.prototype._marks=function(){
    var points=[];for(var i=0;i<=1000;i++){var u=this.markerU+i/1000*TAU,b=this.basis(u);points.push(this.surface(u,Math.sin(u*9)*.012).addScaledVector(b.n,.021));}
    this.trace=new T.Line(this._own(new T.BufferGeometry().setFromPoints(points)),this._own(new T.LineBasicMaterial({color:'#cfb36c',transparent:true,opacity:.64,depthWrite:false})));this.trace.geometry.setDrawRange(0,0);this.scene.add(this.trace);
    this.markerShadow=new T.Mesh(this._own(new T.CircleGeometry(.24,24)),this._own(new T.MeshBasicMaterial({color:'#263a4f',transparent:true,opacity:.16,side:T.DoubleSide,depthWrite:false})));
    this.markerShadow.position.copy(this.markerAnchor).addScaledVector(this.markerBasis.n,.018).addScaledVector(this.markerBasis.t,-.10);this.markerShadow.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),this.markerBasis.n);this.markerShadow.scale.set(.55,1,1);this.scene.add(this.markerShadow);
    this.thread=new T.Line(this._own(new T.BufferGeometry().setFromPoints(Array.from({length:18},function(){return new T.Vector3();}))),this._own(new T.LineBasicMaterial({color:'#d6b65e',transparent:true,opacity:0,depthWrite:false})));this.thread.frustumCulled=false;this.scene.add(this.thread);
    if(this.options.markerUrl)this.setMarkerImage(this.options.markerUrl,this.options.markerMetadata);
  };
  Scene.prototype.setMarkerImage=function(url,metadata){
    var self=this,img=new Image();metadata=metadata||{alphaBBox8:[394,142,1266,900],basePx:[780,895],alphaTest:.035};
    img.onload=function(){if(self.destroyed)return;var box=metadata.alphaBBox8||[0,0,img.width,img.height],width=box[2]-box[0],height=box[3]-box[1],base=metadata.basePx||[(box[0]+box[2])*.5,box[3]-3];
      var texture=self._own(new T.Texture(img));texture.colorSpace=T.SRGBColorSpace;texture.minFilter=texture.magFilter=T.LinearFilter;texture.repeat.set(width/img.width,height/img.height);texture.offset.set(box[0]/img.width,1-box[3]/img.height);texture.needsUpdate=true;
      self.pickedUniform={value:0};var material=self._own(new T.SpriteMaterial({map:texture,transparent:true,alphaTest:metadata.alphaTest||.035,depthWrite:false}));material.onBeforeCompile=function(shader){shader.uniforms.picked=self.pickedUniform;shader.fragmentShader='uniform float picked;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat head=step(956.0/1536.0,vMapUv.x)*step(vMapUv.x,1098.0/1536.0)*step(1.0-271.0/1024.0,vMapUv.y)*step(vMapUv.y,1.0-142.0/1024.0);diffuseColor.a*=1.0-head*picked;');};material.customProgramCacheKey=function(){return'cihou-picked-flower-v5'};
      var sprite=new T.Sprite(material);sprite.center.set((base[0]-box[0])/width,(box[3]-base[1])/height);self.marker=sprite;self.markerImage={width:width,height:height};self.scene.add(sprite);
      var flowerTexture=self._own(new T.Texture(img));flowerTexture.colorSpace=T.SRGBColorSpace;flowerTexture.minFilter=flowerTexture.magFilter=T.LinearFilter;flowerTexture.repeat.set(142/img.width,129/img.height);flowerTexture.offset.set(956/img.width,1-271/img.height);flowerTexture.needsUpdate=true;
      self.flower=new T.Sprite(self._own(new T.SpriteMaterial({map:flowerTexture,transparent:true,alphaTest:.035,depthWrite:false})));self.flower.visible=false;self.flower.renderOrder=95;self.scene.add(self.flower);self.render();};img.src=url;return this;
  };
  Scene.prototype.setRig=function(rig){this.rig=rig;if(this.mode!=='webgl')return this;this.figure.visible=false;if(this.sprite)this.sprite.visible=false;this.walkerRoot.add(rig.group);rig.group.position.set(0,0,0);this.render();return this;};
  Scene.prototype._exitPath=function(){
    var u=this._routeU(this.distance),b=this.basis(u),v=this.currentV===undefined?-.78:this.currentV,start=this.surface(u,v).addScaledVector(b.n,.03),rim=this.surface(u,-1.26).addScaledVector(b.n,.03),outward=b.a.clone().negate();outward.y=0;outward.normalize();
    var lead=rim.clone().addScaledVector(outward,.9).addScaledVector(b.t,.45),end=rim.clone().addScaledVector(outward,5).addScaledVector(b.t,4);lead.y=start.y;end.y=start.y;
    this.exitCurve=new T.CatmullRomCurve3([start,rim,lead,end],false,'centripetal');this.exitCurveLength=this.exitCurve.getLength();this.exitEnd=this.exitCurve.getPoint(1);this.exitRay=this.exitCurve.getTangent(1).normalize();this.exitDistance=0;this.exitAge=0;this.exitMode=true;this._buildExitPaper(42);
  };
  Scene.prototype._exitPoint=function(distance){return distance<=this.exitCurveLength?this.exitCurve.getPointAt(Math.max(0,distance)/this.exitCurveLength):this.exitEnd.clone().addScaledVector(this.exitRay,distance-this.exitCurveLength);};
  Scene.prototype._buildExitPaper=function(length){
    if(this.exitPaper)this.scene.remove(this.exitPaper);if(this.exitEdges)this.exitEdges.forEach(function(line){this.scene.remove(line);},this);this.paperLength=length;var steps=420,vertices=[],indices=[],left=[],right=[],gold=[];
    for(var i=0;i<=steps;i++){var at=i/steps*length,p=this._exitPoint(at),next=this._exitPoint(at+.01),t=next.sub(p).normalize(),cross=new T.Vector3().crossVectors(t,new T.Vector3(0,1,0)).normalize(),width=.25;var a=p.clone().addScaledVector(cross,-width),b=p.clone().addScaledVector(cross,width);vertices.push(a.x,a.y,a.z,b.x,b.y,b.z);left.push(a);right.push(b);gold.push(p.clone().add(new T.Vector3(0,.006,0)));if(i<steps){var k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
    var geo=this._own(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.setDrawRange(0,0);this.exitPaper=new T.Mesh(geo,this._own(new T.MeshBasicMaterial({color:'#e8d5b9',side:T.DoubleSide})));this.scene.add(this.exitPaper);this.exitEdges=[];
    [left,right,gold].forEach(function(points,index){var line=new T.Line(this._own(new T.BufferGeometry().setFromPoints(points)),this._own(new T.LineBasicMaterial({color:index===2?'#d0b36f':'#697083',transparent:true,opacity:index===2?.72:.40})));line.geometry.setDrawRange(0,0);this.scene.add(line);this.exitEdges.push(line);},this);
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
  Scene.prototype._camera=function(b,raw,point){
    var follow=smooth(raw/.25),near=smooth((raw-.25)/.40),reveal=smooth((raw-.65)/.35),e=smooth(this.exitAge/3);
    var n=b.n.clone();if(n.y<0)n.negate();var across=new T.Vector3().crossVectors(n,b.t).normalize(),closeUp=b.t.clone().multiplyScalar(.50).addScaledVector(across,.866).normalize();
    var eye=point.clone().addScaledVector(n,10).addScaledVector(b.t,-2.8),target=point.clone().addScaledVector(closeUp,.18);target.addScaledVector(b.t,near*.22);
    var farEye=new T.Vector3(2,23,13),farTarget=new T.Vector3(0,1.60,0);eye.lerp(farEye,reveal);target.lerp(farTarget,reveal);this.camera.up.copy(closeUp).lerp(new T.Vector3(0,1,0),reveal).normalize();
    if(this.exitMode){var forward=this._exitPoint(this.exitDistance+.1).sub(point).normalize();if(forward.lengthSq()<.1)forward.copy(this.exitRay);var side=new T.Vector3().crossVectors(new T.Vector3(0,1,0),forward).normalize(),exitUp=forward.clone().multiplyScalar(.50).addScaledVector(side,.866).normalize();var exitEye=point.clone().add(new T.Vector3(0,9,0)).addScaledVector(forward,-2.8);eye.lerp(exitEye,e);target.lerp(point.clone().addScaledVector(exitUp,.20),e);this.camera.up.lerp(exitUp,e).normalize();}
    this.camera.position.copy(eye);this.camera.lookAt(target);this.camera.updateMatrixWorld();
    var right=new T.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0),up=new T.Vector3().setFromMatrixColumn(this.camera.matrixWorld,1),minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(var i=0;i<100;i++)for(var side=-1;side<=1;side+=2){var pt=this.surface(i/100*TAU,side*1.26),xx=pt.dot(right),yy=pt.dot(up);minX=Math.min(minX,xx);maxX=Math.max(maxX,xx);minY=Math.min(minY,yy);maxY=Math.max(maxY,yy);}
    var aspect=this.width/this.height,farHeight=Math.max((maxY-minY)/.68,(maxX-minX)/(aspect*.72));
    var encounter=this.eventPhase>0&&this.eventPhase<1?Math.sin(this.eventPhase*PI):0;var closeHeight=lerp(3.8,4.25,near)-encounter*.25;var height=lerp(closeHeight,farHeight,reveal);height=lerp(height,4.8,e);this.viewHeight=height;this.reveal=reveal;
    this.camera.left=-height*aspect*.5;this.camera.right=height*aspect*.5;this.camera.top=height*.5;this.camera.bottom=-height*.5;this.camera.updateProjectionMatrix();
  };
  Scene.prototype.render=function(){
    if(this.destroyed)return;if(this.mode!=='webgl'){this._drawFallback();return;}
    var u=this._routeU(this.distance),b=this.basis(u),approach=smooth((this.distance-(this.markerDistance-.30))/.30),v=-.90*approach;this.currentV=v;
    var normal=b.n.clone();if(normal.y<0)normal.negate();var point=this.surface(u,v).addScaledVector(normal,.025),tangent=b.t.clone();
    var display=this.eventPhase>=1?this.progress:Math.min(this.progress,.62);this.displayProgress=display;
    if(this.exitMode){point=this._exitPoint(this.exitDistance);tangent=this._exitPoint(this.exitDistance+.03).sub(point).normalize();normal.set(0,1,0);}
    this._camera(b,display,point);this.walkerRoot.position.copy(point);this.walkerRoot.quaternion.copy(this.camera.quaternion);
    var height=this.viewHeight*lerp(.108,.054,this.reveal);if(this.exitMode)height=this.viewHeight*lerp(.054,.10,smooth(this.exitAge/3));this.actorWorldHeight=height;
    var reach=this.eventPhase>0&&this.eventPhase<1?Math.sin(smooth(this.eventPhase/.80)*PI):0;
    if(this.rig){this.walkerRoot.scale.setScalar(height/this.rig.height);var screenRight=new T.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0),screenUp=new T.Vector3().setFromMatrixColumn(this.camera.matrixWorld,1),direction=tangent.dot(screenRight);this.facing=this.facing||1;if(Math.abs(direction)>.20)this.facing=direction>=0?1:-1;this.rig.setFacing(this.facing);this.walkerRoot.updateMatrixWorld(true);var sourceHand=this.markerAnchor.clone().addScaledVector(this.markerBasis.n,.02).addScaledVector(screenRight,.34*872/758*.282).addScaledVector(screenUp,.34*.91),localHand=this.rig.group.worldToLocal(sourceHand);this.rig.update(this.gaitTime,.85+this.wind*.5,{reach:reach,handTarget:[localHand.x,localHand.y]});}
    else{this.walkerRoot.scale.setScalar(height/.56);var phase=this.time*TAU;this.legs.forEach(function(leg,i){leg.rotation.z=Math.sin(phase+i*PI)*.3;});}
    this.walkerRoot.updateMatrixWorld(true);this.shadowRoot.position.copy(point).addScaledVector(normal,-.007);var shadowUp=tangent.clone().multiplyScalar(-1),shadowRight=new T.Vector3().crossVectors(shadowUp,normal).normalize();this.shadowRoot.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(shadowRight,shadowUp,normal));this.shadowRoot.scale.setScalar(height/.56);
    if(this.marker){var markerSize=lerp(.34,this.viewHeight*.036,this.reveal);this.marker.position.copy(this.markerAnchor).addScaledVector(this.markerBasis.n,.02);this.marker.scale.set(markerSize*this.markerImage.width/this.markerImage.height,markerSize,1);}
    if(this.rig&&this.flower&&this.marker){
      var phase=this.eventPhase,hand=this.rig.group.localToWorld(this.rig.getAttachment('hand')),bag=this.rig.group.localToWorld(this.rig.getAttachment('bag'));this.flower.visible=phase>=.34;this.pickedUniform.value=smooth((phase-.34)/.07);
      var cameraRight=new T.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0),cameraUp=new T.Vector3().setFromMatrixColumn(this.camera.matrixWorld,1),source=this.marker.position.clone().addScaledVector(cameraRight,this.marker.scale.x*.282).addScaledVector(cameraUp,this.marker.scale.y*.91);
      if(phase<.52)this.flower.position.copy(source).lerp(hand,smooth((phase-.34)/.18));else this.flower.position.copy(hand).lerp(bag,smooth((phase-.52)/.42));
      var size=lerp(.058,height*.105,smooth((phase-.52)/.42));this.flower.scale.set(size*1.10,size,1);this.flower.material.rotation=Math.sin(this.gaitTime*TAU)*.035;
      var threadOpacity=phase>=.82&&phase<1.6?Math.sin(clamp((phase-.82)/.78,0,1)*PI)*.60:0;this.thread.material.opacity=threadOpacity;
      var attr=this.thread.geometry.attributes.position;for(var i=0;i<18;i++){var t=i/17,p=bag.clone().lerp(point,t);p.addScaledVector(tangent,-Math.sin(t*PI)*.045);attr.setXYZ(i,p.x,p.y,p.z);}attr.needsUpdate=true;
    }
    var warm=this.eventStart<0?0:smooth((this.time-this.eventStart-1.20)/2.4);this.trace.geometry.setDrawRange(0,Math.floor(warm*1000)+1);this.uniforms.warm.value=warm;
    if(this.exitMode){var visible=this.exitDistance+lerp(.2,12,smooth(this.exit)),needed=visible+12;if(needed>this.paperLength)this._buildExitPaper(this.paperLength*2);var count=Math.min(420,Math.ceil(visible/this.paperLength*420));this.exitPaper.geometry.setDrawRange(0,count*6);this.exitEdges.forEach(function(line){line.geometry.setDrawRange(0,count+1);});}
    this.renderer.render(this.scene,this.camera);
    if(!this.revealReady&&this.progress>.998&&this.eventPhase>=1&&warm>.95){this.revealReady=true;if(this.options.onRevealReady)this.options.onRevealReady();}
  };
  Scene.prototype._fallback=function(){this.canvas=document.createElement('canvas');this.canvas.style.cssText='display:block;width:100%;height:100%;';this.container.appendChild(this.canvas);this.context=this.canvas.getContext('2d');};
  Scene.prototype._drawFallback=function(){
    var c=this.context;if(!c)return;var w=this.width,h=this.height,p=smooth(this.progress);c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#f1eade';c.fillRect(0,0,w,h);c.save();c.translate(w/2,h/2);c.rotate(-.62*(1-p));c.strokeStyle='#dfafa8';c.lineWidth=lerp(h*.40,h*.08,p)+4;c.beginPath();if(p<.02){c.moveTo(-w,0);c.lineTo(w,0);}else c.ellipse(0,0,lerp(w*2,Math.min(w*.34,h*.47),p),lerp(0,h*.17,p),0,0,TAU);c.stroke();c.strokeStyle='#405879';c.lineWidth-=4;c.stroke();c.restore();c.fillStyle='#ad4f37';c.beginPath();c.moveTo(w/2-5,h/2-20);c.lineTo(w/2+4,h/2-20);c.lineTo(w/2+8,h/2);c.lineTo(w/2-8,h/2);c.fill();c.fillStyle='#44372e';c.beginPath();c.arc(w/2,h/2-25,5,0,TAU);c.fill();
  };
  Scene.prototype.resize=function(){var r=this.container.getBoundingClientRect();this.width=Math.max(1,r.width);this.height=Math.max(1,r.height);this.dpr=Math.min(2,global.devicePixelRatio||1);if(this.renderer){this.renderer.setPixelRatio(this.dpr);this.renderer.setSize(this.width,this.height,false);}else{this.canvas.width=this.width*this.dpr;this.canvas.height=this.height*this.dpr;}this.render();};
  Scene.prototype._tick=function(now){
    this.raf=0;if(this.destroyed)return;var dt=this.last?Math.min(.05,(now-this.last)/1000):0;this.last=now;
    if(this.active&&!this.paused){
      var changed=Math.abs(this.targetProgress-this.progress)>.00001||Math.abs(this.targetExit-this.exit)>.00001;
      if(!this.reducedMotion){this.wind=lerp(this.wind,this.targetWind,1-Math.exp(-dt*5));this.time+=dt;var rate=.82+this.wind*.45;if(this.eventPhase>0&&this.eventPhase<.80)rate*=.66;this.gaitTime+=dt*rate;var velocity=this.actorWorldHeight*.18/.62*.92*rate;if(this.exitMode){this.exitAge+=dt;this.exitDistance+=dt*velocity;}else this.distance+=dt*velocity;if(this.eventStart<0&&this.distance>=this.markerDistance-.025)this.eventStart=this.time;if(this.eventStart>=0)this.eventPhase=(this.time-this.eventStart)/1.45;}
      if(changed){var weight=this.reducedMotion?1:1-Math.exp(-dt*7);this.progress=lerp(this.progress,this.targetProgress,weight);this.exit=lerp(this.exit,this.targetExit,weight);}
      if(changed||!this.reducedMotion||!this.firstRendered){this.render();this.firstRendered=true;}this.raf=requestAnimationFrame(this._tick);
    }
  };
  Scene.prototype.setProgress=function(value){this.targetProgress=clamp(Number(value)||0,0,1);if(this.reducedMotion){this.progress=this.targetProgress;if(this.progress>0){this.eventStart=0;this.eventPhase=2;this.time=8;this.distance=this.markerDistance+.2;}this.render();}return this;};
  Scene.prototype.setExit=function(value){var next=clamp(Number(value)||0,0,1);if(next>0&&!this.exitMode&&this.mode==='webgl')this._exitPath();if(next===0&&this.exitMode)this.reset();this.targetExit=next;if(this.reducedMotion){this.exit=next;if(next>0){this.exitAge=3;this.exitDistance=1.2;}this.render();}return this;};
  Scene.prototype.reset=function(){this.distance=0;this.exitDistance=0;this.exitAge=0;this.time=0;this.gaitTime=0;this.eventStart=-1;this.eventPhase=0;this.revealReady=false;this.exitMode=false;this.exit=this.targetExit=0;if(this.exitPaper)this.exitPaper.geometry.setDrawRange(0,0);if(this.exitEdges)this.exitEdges.forEach(function(line){line.geometry.setDrawRange(0,0)});if(this.pickedUniform)this.pickedUniform.value=0;return this;};
  Scene.prototype.setInteraction=function(value){this.targetWind=clamp(Number(value)||0,0,1);return this;};
  Scene.prototype.setPaused=function(value){this.paused=!!value;this.last=0;if(this.paused){cancelAnimationFrame(this.raf);this.raf=0;}else if(this.active&&!this.raf)this.raf=requestAnimationFrame(this._tick);return this;};
  Scene.prototype.setActive=function(value){this.active=!!value;this.last=0;if(!this.active){cancelAnimationFrame(this.raf);this.raf=0;}else if(!this.paused&&!this.raf)this.raf=requestAnimationFrame(this._tick);return this;};
  Scene.prototype.destroy=function(){this.destroyed=true;if(this.rig)this.rig.dispose();cancelAnimationFrame(this.raf);if(this.observer)this.observer.disconnect();else global.removeEventListener('resize',this.resize);if(this.renderer){this.renderer.dispose();this.renderer.domElement.remove();}if(this.canvas)this.canvas.remove();this.resources.forEach(function(r){r.dispose();});};
  global.CihouHeroSceneV5=Scene;
})(window);

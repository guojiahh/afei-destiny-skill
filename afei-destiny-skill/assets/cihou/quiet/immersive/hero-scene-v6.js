/* Cihou illustrated stage v6: a 2.5D camera over one authored painting.
 * The road is the original world-keyart-v1.png, not reconstructed geometry.
 * All manually calibrated path coordinates below are source-image pixels.
 * This file is independent of v4/v5 and does not mutate their shared modules.
 */
(function(global){
  'use strict';
  var T=global.THREE,clamp=function(v,a,b){return Math.max(a,Math.min(b,v));},mix=function(a,b,t){return a+(b-a)*t;},smooth=function(v){v=clamp(v,0,1);return v*v*(3-2*v);};
  function Scene(container,options){
    this.container=container;this.options=options||{};this.resources=[];this.progress=this.targetProgress=0;this.exit=this.targetExit=0;this.interaction=this.targetInteraction=0;this.travel=0;this.time=0;this.gaitTime=0;this.last=0;this.active=true;this.paused=false;this.destroyed=false;this.exitDistance=0;
    this.reducedMotion=this.options.reducedMotion===undefined?!!(global.matchMedia&&global.matchMedia('(prefers-reduced-motion: reduce)').matches):!!this.options.reducedMotion;
    this._tick=this._tick.bind(this);this.resize=this.resize.bind(this);this._init();
    if(global.ResizeObserver){this.observer=new ResizeObserver(this.resize);this.observer.observe(container);}else global.addEventListener('resize',this.resize);
    this.resize();this.raf=requestAnimationFrame(this._tick);
  }
  Scene.prototype._own=function(resource){this.resources.push(resource);return resource;};
  Scene.prototype._init=function(){
    if(!T)throw new Error('Three.js is required by illustrated stage v6');
    this.mode='illustrated-2.5d';this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setClearColor('#f1eade',1);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.setPixelRatio(Math.min(global.devicePixelRatio||1,2));this.renderer.domElement.style.cssText='display:block;width:100%;height:100%;pointer-events:none';this.renderer.domElement.setAttribute('aria-hidden','true');this.container.appendChild(this.renderer.domElement);
    this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-400,400,260,-260,.1,100);this.camera.position.set(930,-666,50);this.camera.lookAt(930,-666,0);
    this.world=new T.Group();this.scene.add(this.world);this.walkerRoot=new T.Group();this.walkerRoot.position.z=5;this.scene.add(this.walkerRoot);
    var calibrated=[[930,690],[1115,613],[1270,484],[1350,338],[1353,242],[1262,181],[1118,197],[941,239],[777,262],[585,243],[409,229],[258,246],[170,316],[136,428],[182,556],[309,666],[491,747],[697,776],[839,739]];
    this.path=new T.CatmullRomCurve3(calibrated.map(function(p){return new T.Vector3(p[0],-p[1],0);}),true,'centripetal');this.path.arcLengthDivisions=2400;this.pathLength=this.path.getLength();
    this.markerDistance=143;this.markerPoint=this.path.getPointAt(this.markerDistance/this.pathLength);this.markerTangent=this.path.getTangentAt(this.markerDistance/this.pathLength);this.markerBase=this.markerPoint.clone().add(new T.Vector3(-7,-5,0));
    this._loadImage(this.options.worldTextureUrl||this.options.worldUrl||'world-keyart-v1.png',function(texture,image){
      var material=this._own(new T.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.04,depthWrite:false,toneMapped:false}));var mesh=new T.Mesh(this._own(new T.PlaneGeometry(1536,1024)),material);mesh.position.set(768,-512,0);mesh.renderOrder=0;this.world.add(mesh);this.painting=mesh;this.paintingMaterial=material;this.worldReady=true;if(this.options.onReady)this.options.onReady({mode:this.mode});
    });
    this._createShadow();this._createTrace();this._createMarker();this._createExit();
  };
  Scene.prototype._loadImage=function(url,fn){var self=this,image=new Image();image.onload=function(){if(self.destroyed)return;var texture=self._own(new T.Texture(image));texture.colorSpace=T.SRGBColorSpace;texture.minFilter=texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;fn.call(self,texture,image);self.render();};image.onerror=function(){if(self.options.onError)self.options.onError('Image could not load: '+url);};image.src=url;};
  Scene.prototype._createShadow=function(){
    var shape=new T.Shape();shape.moveTo(-8,0);shape.bezierCurveTo(-6,3,8,4,12,0);shape.bezierCurveTo(8,-3,-7,-3,-8,0);
    this.shadow=new T.Mesh(this._own(new T.ShapeGeometry(shape)),this._own(new T.MeshBasicMaterial({color:'#253c51',transparent:true,opacity:.23,depthWrite:false})));this.shadow.renderOrder=15;this.shadow.position.z=2;this.scene.add(this.shadow);
  };
  Scene.prototype._createTrace=function(){
    this.tracePoints=[];for(var i=0;i<=1000;i++){var p=this.path.getPointAt(i/1000);p.z=1.6;this.tracePoints.push(p);}this.trace=new T.Line(this._own(new T.BufferGeometry().setFromPoints(this.tracePoints)),this._own(new T.LineBasicMaterial({color:'#d5b665',transparent:true,opacity:.47,depthWrite:false})));this.trace.renderOrder=12;this.trace.geometry.setDrawRange(0,0);this.world.add(this.trace);
  };
  Scene.prototype._createMarker=function(){
    this.markerGroup=new T.Group();this.markerGroup.position.copy(this.markerBase);this.markerGroup.position.z=3;this.markerGroup.visible=false;this.scene.add(this.markerGroup);var self=this;
    this._loadImage(this.options.markerUrl||'flower-stone-v1.png',function(texture,image){
      var crop=texture.clone();this._own(crop);crop.repeat.set(872/1536,758/1024);crop.offset.set(394/1536,1-900/1024);crop.needsUpdate=true;
      var geo=this._own(new T.PlaneGeometry(52*872/758,52));geo.translate(0,25.65,0);this.marker=new T.Mesh(geo,this._own(new T.MeshBasicMaterial({map:crop,transparent:true,alphaTest:.04,depthWrite:false,toneMapped:false})));this.marker.renderOrder=20;this.markerGroup.add(this.marker);
      // One physical painted blossom cut from the same authored plant sheet.
      var flower=texture.clone();this._own(flower);flower.repeat.set(162/1536,135/1024);flower.offset.set(949/1536,1-272/1024);flower.needsUpdate=true;
      this.flower=new T.Mesh(this._own(new T.PlaneGeometry(9.5,8)),this._own(new T.MeshBasicMaterial({map:flower,transparent:true,alphaTest:.045,depthWrite:false,toneMapped:false})));this.flower.renderOrder=80;this.flower.visible=false;this.scene.add(this.flower);
    });
  };
  Scene.prototype._createExit=function(){
    var count=400,positions=new Float32Array((count+1)*6),uv=new Float32Array((count+1)*4),indices=[];for(var i=0;i<=count;i++){uv[i*4]=0;uv[i*4+1]=i/count;uv[i*4+2]=1;uv[i*4+3]=i/count;if(i<count){var k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
    var geometry=this._own(new T.BufferGeometry());geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('uv',new T.BufferAttribute(uv,2));geometry.setIndex(indices);geometry.setDrawRange(0,0);
    this.exitPaper=new T.Mesh(geometry,this._own(new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{opacity:{value:1}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float opacity;varying vec2 vUv;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){float edge=min(vUv.x,1.-vUv.x);float pencil=1.-smoothstep(.012,.025,edge);float grain=(h(gl_FragCoord.xy)-.5)*.025;vec3 c=mix(vec3(.86,.76,.64),vec3(.29,.34,.37),pencil*.44)+grain;gl_FragColor=vec4(c,opacity);\n#include <colorspace_fragment>\n}'})));this.exitPaper.renderOrder=11;this.scene.add(this.exitPaper);this.exitSteps=count;
  };
  Scene.prototype._exitPoint=function(distance){var p=this.exitStart.clone().addScaledVector(this.exitDirection,distance);var n=new T.Vector3(-this.exitDirection.y,this.exitDirection.x,0);p.addScaledVector(n,Math.sin(distance/900)*Math.min(distance*.05,35));return p;};
  Scene.prototype._updateExitPaper=function(){
    if(!this.exitStart)return;var length=Math.max(2000,this.exitDistance+2000),pos=this.exitPaper.geometry.attributes.position;
    for(var i=0;i<=this.exitSteps;i++){var d=i/this.exitSteps*length,p=this._exitPoint(d),t=this._exitPoint(d+1).sub(p).normalize(),across=new T.Vector3(-t.y,t.x,0),width=20+Math.sin(d*.017)*.35;pos.setXYZ(i*2,p.x-across.x*width,p.y-across.y*width,2.2);pos.setXYZ(i*2+1,p.x+across.x*width,p.y+across.y*width,2.2);}pos.needsUpdate=true;this.exitPaper.geometry.computeBoundingSphere();var revealed=this.exit>=.95?1:smooth(this.exit/.65);this.exitPaper.geometry.setDrawRange(0,Math.floor(this.exitSteps*revealed)*6);
  };
  Scene.prototype.setRig=function(rig){this.rig=rig;this.walkerRoot.add(rig.group);rig.group.position.set(0,0,0);this.walkerRoot.scale.setScalar(48/rig.height);this.render();return this;};
  Scene.prototype._transformPoint=function(point){return point.clone().sub(new T.Vector3(768,-512,0)).applyAxisAngle(new T.Vector3(0,0,1),this.worldAngle||0).add(new T.Vector3(768,-512,0));};
  Scene.prototype._camera=function(point){
    var p=smooth(this.progress),aspect=this.width/this.height,angle=this.worldAngle||0,farWidth=1490*Math.abs(Math.cos(angle))+830*Math.abs(Math.sin(angle)),farContentHeight=1490*Math.abs(Math.sin(angle))+830*Math.abs(Math.cos(angle));var farHeight=Math.max(farContentHeight/.78,farWidth/(aspect*.86)),height=mix(520,farHeight,p),center=point.clone().add(new T.Vector3(0,24,0));center.lerp(new T.Vector3(768,-512,0),p*.90);
    if(this.exit>0){var follow=smooth((this.exit-.12)/.88);height=mix(height,600,follow);center.lerp(point.clone().add(new T.Vector3(0,24,0)),follow);}
    this.viewHeight=height;this.camera.left=-height*aspect*.5;this.camera.right=height*aspect*.5;this.camera.top=height*.5;this.camera.bottom=-height*.5;this.camera.position.set(center.x,center.y,50);this.camera.lookAt(center.x,center.y,0);this.camera.updateProjectionMatrix();
  };
  Scene.prototype.render=function(){
    if(this.destroyed||!this.renderer)return;var at=(this.travel%this.pathLength)/this.pathLength,aspect=this.width/this.height;this.worldAngle=Math.PI*.49*smooth((.93-aspect)/.36)*smooth(this.progress);this.world.rotation.z=this.worldAngle;var c=Math.cos(this.worldAngle),s=Math.sin(this.worldAngle);this.world.position.set(768-(768*c+512*s),-512-(768*s-512*c),0);var point=this._transformPoint(this.path.getPointAt(at)),tangent=this.path.getTangentAt(at).applyAxisAngle(new T.Vector3(0,0,1),this.worldAngle),reach=0;
    if(this.eventTime!==undefined){var elapsed=this.time-this.eventTime;reach=smooth(elapsed/.45)*(1-smooth((elapsed-1.05)/.7));}
    if(this.exit>0&&this.exitStart){point=this._exitPoint(this.exitDistance);tangent=this._exitPoint(this.exitDistance+1).sub(point).normalize();this._updateExitPaper();}
    this._camera(point);this.figureHeight=mix(48,Math.max(48,this.viewHeight*.042),smooth(this.progress));if(this.rig)this.walkerRoot.scale.setScalar(this.figureHeight/this.rig.height);this.walkerRoot.position.set(point.x,point.y,5);this.shadow.position.set(point.x+3,point.y-.8,2);this.shadow.scale.setScalar(this.figureHeight/48);var markerPosition=this._transformPoint(this.markerBase);this.markerGroup.position.set(markerPosition.x,markerPosition.y,3);
    if(this.rig){this.rig.update(this.gaitTime,.8+this.interaction*.35,{reach:reach});if(reach&&!this.rig.getAttachment&&this.rig.parts){var arm=this.rig.parts.leftArm,torso=this.rig.parts.torso,head=this.rig.parts.head;if(arm)arm.mesh.rotation.z+=reach*1.85;if(torso)torso.mesh.rotation.z-=reach*.055;if(head)head.mesh.rotation.z-=reach*.045;}this.rig.setFacing(tangent.x>=0?1:-1);this.walkerRoot.rotation.z=Math.max(-.035,Math.min(.035,tangent.y*.028));}
    if(this.paintingMaterial)this.paintingMaterial.opacity=1-smooth((this.exit-.26)/.70);this.markerGroup.visible=!!this.markerArmed;if(this.marker)this.marker.material.opacity=smooth((this.time-(this.markerBornAt||0))/.55)*(1-smooth((this.exit-.26)/.70));this.trace.material.opacity=.47*(1-smooth((this.exit-.26)/.70));
    this.trace.geometry.setDrawRange(0,this.collected?Math.max(1,Math.floor(Math.min(this.travel,this.pathLength)/this.pathLength*1000)):0);
    if(this.flower&&this.eventTime!==undefined){var elapsed=this.time-this.eventTime;this.flower.visible=true;var bag=this.rig&&this.rig.getAttachment?this.rig.getAttachment('bag').multiplyScalar(this.figureHeight/this.rig.height):new T.Vector3(-this.figureHeight*.13,this.figureHeight*.51,0);bag.applyAxisAngle(new T.Vector3(0,0,1),this.walkerRoot.rotation.z);bag.add(point);var from=markerPosition.clone().add(new T.Vector3(10,47,0)),fly=smooth((elapsed-.40)/1.0);this.flower.position.copy(from.lerp(bag,fly));this.flower.position.y+=Math.sin(Math.PI*fly)*12;this.flower.position.z=7;this.flower.rotation.z=Math.sin(Math.PI*fly)*.65;this.flower.scale.setScalar(mix(1,.47,fly));}
    this.container.dataset.cihouTravel=this.travel.toFixed(2);this.container.dataset.cihouEvent=this.collected?'carried':this.markerArmed?'approaching':'waiting';this.renderer.render(this.scene,this.camera);
  };
  Scene.prototype._tick=function(now){
    // Active/paused transitions reset last; a slow visible frame must retain its
    // complete elapsed time rather than silently slowing the story and walking.
    this.raf=0;if(this.destroyed)return;var dt=this.last?Math.max(0,(now-this.last)/1000):0;this.last=now;
    if(this.active&&!this.paused){var k=this.reducedMotion?1:1-Math.exp(-dt*7);this.progress=mix(this.progress,this.targetProgress,k);this.exit=mix(this.exit,this.targetExit,k);this.interaction=mix(this.interaction,this.targetInteraction,k);
      if(!this.reducedMotion){var previousTime=this.time,previousTravel=this.travel;this.time+=dt;var speed=32+this.interaction*12;this.gaitTime+=dt*(.84+this.interaction*.16);if(this.exitStart){this.exitDistance+=dt*speed*smooth(this.exit/.18);}else this.travel+=dt*speed;
        if(this.markerArmed&&!this.collected&&this.travel>=this.markerDistance-10){this.collected=true;this.eventTime=previousTime+clamp((this.markerDistance-10-previousTravel)/Math.max(.001,speed),0,dt);if(this.options.onEvent)this.options.onEvent('flower');}
      }
      this.render();this.raf=requestAnimationFrame(this._tick);
    }
  };
  Scene.prototype.setProgress=function(value){this.targetProgress=clamp(Number(value)||0,0,1);if(this.reducedMotion){this.progress=this.targetProgress;this.render();}return this;};
  Scene.prototype.setExit=function(value){value=clamp(Number(value)||0,0,1);if(value>0&&!this.exitStart){var at=(this.travel%this.pathLength)/this.pathLength;this.exitStart=this._transformPoint(this.path.getPointAt(at));this.exitDirection=this.path.getTangentAt(at).applyAxisAngle(new T.Vector3(0,0,1),this.worldAngle||0);this.exitDirection.x=Math.abs(this.exitDirection.x)+.25;this.exitDirection.y=Math.abs(this.exitDirection.y)+.25;this.exitDirection.normalize();this.exitDistance=0;}if(value===0&&this.exitStart){this.exitStart=null;this.exitDistance=0;this.exitPaper.geometry.setDrawRange(0,0);}this.targetExit=value;if(this.reducedMotion){this.exit=value;this.render();}return this;};
  Scene.prototype.setInteraction=function(value){this.targetInteraction=clamp(Number(value)||0,0,1);if(this.targetInteraction>0&&!this.markerArmed&&!this.exitStart){this.markerArmed=true;this.markerBornAt=this.time;this.markerDistance=this.travel+115;var at=(this.markerDistance%this.pathLength)/this.pathLength;this.markerPoint=this.path.getPointAt(at);this.markerTangent=this.path.getTangentAt(at);this.markerBase=this.markerPoint.clone().add(new T.Vector3(-7,-5,0));}return this;};
  Scene.prototype.setPaused=function(value){this.paused=!!value;this.last=0;if(this.paused){cancelAnimationFrame(this.raf);this.raf=0;}else if(this.active&&!this.raf)this.raf=requestAnimationFrame(this._tick);return this;};
  Scene.prototype.setActive=function(value){this.active=!!value;this.last=0;if(!this.active){cancelAnimationFrame(this.raf);this.raf=0;}else if(!this.paused&&!this.raf)this.raf=requestAnimationFrame(this._tick);return this;};
  Scene.prototype.reset=function(){this.setExit(0);this.exit=0;this.travel=this.time=this.gaitTime=0;this.collected=false;this.markerArmed=false;this.markerBornAt=0;this.eventTime=undefined;if(this.flower)this.flower.visible=false;this.progress=this.targetProgress=0;this.render();return this;};
  Scene.prototype.resize=function(){var r=this.container.getBoundingClientRect();this.width=Math.max(1,r.width);this.height=Math.max(1,r.height);this.renderer.setPixelRatio(Math.min(global.devicePixelRatio||1,2));this.renderer.setSize(this.width,this.height,false);this.render();};
  Scene.prototype.destroy=function(){this.destroyed=true;cancelAnimationFrame(this.raf);if(this.observer)this.observer.disconnect();else global.removeEventListener('resize',this.resize);if(this.rig)this.rig.dispose();this.resources.forEach(function(r){r.dispose();});this.renderer.dispose();this.renderer.domElement.remove();};
  global.CihouHeroSceneV6=Scene;
})(window);

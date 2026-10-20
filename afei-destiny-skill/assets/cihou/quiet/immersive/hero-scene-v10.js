/* Cihou v10: a small, traversable paper world.
 * The closed paper bridge is a narrative loop, not a mathematical Mobius surface.
 * All positions use metres, Y is up, and the actor is an upright paper cutout.
 * Original scene and geometry; Three.js r160 is bundled under its MIT licence.
 */
(function(global){
  'use strict';
  var T=global.THREE,PI=Math.PI,TAU=PI*2;
  var clamp=function(v,a,b){return Math.max(a,Math.min(b,v));};
  var smooth=function(v){v=clamp(v,0,1);return v*v*(3-2*v);};
  var mix=function(a,b,t){return a+(b-a)*t;};
  var V=function(x,y,z){return new T.Vector3(x||0,y||0,z||0);};
  var UP=T?V(0,1,0):null;
  function Scene(container,options){
    this.container=container;this.options=options||{};this.resources=[];
    this.apiVersion=10;this.interactionMode='world';this.mode='webgl';
    this.reducedMotion=this.options.reducedMotion===undefined?!!(global.matchMedia&&global.matchMedia('(prefers-reduced-motion: reduce)').matches):!!this.options.reducedMotion;
    this.time=0;this.travel=0;this.gaitTime=0;this.interaction=this.targetInteraction=0;this.progress=this.targetProgress=0;
    this.phase='walking';this.phaseAge=0;this.actionProgress=0;this.holdAge=0;this.impulse=0;this.intent=false;this.picked=false;this.recognized=false;this.revealDone=false;this.exitComplete=false;
    this.last=0;this.active=true;this.paused=false;this.destroyed=false;this._tick=this._tick.bind(this);this.resize=this.resize.bind(this);
    try{this._init();}catch(error){this.mode='fallback';this.error=String(error.message||error);if(this.renderer){this.renderer.dispose();this.renderer.domElement.remove();}this._fallback();}
    if(global.ResizeObserver){this.observer=new ResizeObserver(this.resize);this.observer.observe(container);}else global.addEventListener('resize',this.resize);
    this.resize();this.raf=requestAnimationFrame(this._tick);
    if(this.options.onReady)setTimeout(function(){if(!this.destroyed)this.options.onReady({mode:this.mode,apiVersion:10});}.bind(this),0);
  }
  Scene.prototype._own=function(resource){this.resources.push(resource);return resource;};
  Scene.prototype._material=function(color,more){return this._own(new T.MeshStandardMaterial(Object.assign({color:color,roughness:1,metalness:0},more||{})));};
  Scene.prototype._init=function(){
    if(!T)throw new Error('Three.js is unavailable');
    this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setClearColor('#eee8d9',1);this.renderer.outputColorSpace=T.SRGBColorSpace;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.renderer.domElement.style.cssText='display:block;width:100%;height:100%;pointer-events:none';this.renderer.domElement.setAttribute('aria-hidden','true');this.container.appendChild(this.renderer.domElement);
    this.scene=new T.Scene();this.scene.background=new T.Color('#eee8d9');this.scene.fog=new T.Fog('#eee8d9',10,19);
    this.camera=new T.PerspectiveCamera(40,1,.05,90);
    this.scene.add(new T.HemisphereLight('#ffffff','#b9c1c6',2.45));
    this.sun=new T.DirectionalLight('#ffffff',.82);this.sun.position.set(-7,12,5);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);this.sun.shadow.camera.left=-12;this.sun.shadow.camera.right=12;this.sun.shadow.camera.top=12;this.sun.shadow.camera.bottom=-12;this.sun.shadow.camera.near=.1;this.sun.shadow.camera.far=35;this.sun.shadow.normalBias=.055;this.sun.shadow.bias=.00020;this.sun.shadow.radius=4;this.lightTarget=new T.Object3D();this.scene.add(this.lightTarget);this.sun.target=this.lightTarget;this.scene.add(this.sun);
    this._makeRoute();this._makeTerrain();this._makeRoad();this._makeLandmark();this._makeActor();this._makeExit();this._loadPaint();
  };
  Scene.prototype.routePoint=function(u){return V(4.4*Math.sin(u),.10+1.52*Math.pow((1+Math.cos(u))*.5,2),2.45*Math.sin(2*u));};
  Scene.prototype._makeRoute=function(){
    this.route=[];this.routeStart=-.66;var previous=null,d=0;
    for(var i=0;i<=1800;i++){var u=this.routeStart+TAU*i/1800,p=this.routePoint(u);if(previous)d+=p.distanceTo(previous);this.route.push({u:u,d:d});previous=p;}
    this.routeLength=d;this.markerU=-.18;this.markerDistance=this._distanceAtU(this.markerU);this.nextMarker=this.markerDistance;
  };
  Scene.prototype._distanceAtU=function(u){var f=(u-this.routeStart)/TAU*(this.route.length-1),i=clamp(Math.floor(f),0,this.route.length-2),a=this.route[i],b=this.route[i+1];return mix(a.d,b.d,clamp(f-i,0,1));};
  Scene.prototype._uAtDistance=function(distance){var cycle=Math.floor(distance/this.routeLength),d=((distance%this.routeLength)+this.routeLength)%this.routeLength,low=0,high=this.route.length-1;while(high-low>1){var mid=(low+high)>>1;if(this.route[mid].d<d)low=mid;else high=mid;}var a=this.route[low],b=this.route[high];return mix(a.u,b.u,(d-a.d)/(b.d-a.d))+cycle*TAU;};
  Scene.prototype._basis=function(distance){var u=this._uAtDistance(distance),p=this.routePoint(u),t=this.routePoint(u+.0002).sub(p).normalize(),side=new T.Vector3().crossVectors(t,UP).normalize(),normal=new T.Vector3().crossVectors(side,t).normalize();return{p:p,t:t,side:side,n:normal,u:u};};
  Scene.prototype._point=function(distance,lane){var b=this._basis(distance);return b.p.addScaledVector(b.side,lane||0);};
  Scene.prototype._makeTerrain=function(){
    this.groundMaterial=this._own(new T.MeshBasicMaterial({color:'#eee8d9'}));
    var ground=new T.Mesh(this._own(new T.PlaneGeometry(1000,1000)),this.groundMaterial);ground.rotation.x=-PI*.5;ground.position.y=-.075;this.scene.add(ground);
    var shadowGround=new T.Mesh(this._own(new T.PlaneGeometry(1000,1000)),this._own(new T.ShadowMaterial({color:'#58606b',transparent:true,opacity:.17,depthWrite:false})));shadowGround.rotation.x=-PI*.5;shadowGround.position.y=-.072;shadowGround.receiveShadow=true;this.scene.add(shadowGround);
    this.foreground=new T.Group();this.foreground.position.set(-4.7,.03,-1.9);var grassMat=this._material('#8a927d',{side:T.DoubleSide});
    [[-.06,.45,.02],[.08,.32,.02],[.19,.25,-.04]].forEach(function(spec,i){var blade=new T.Mesh(this._own(new T.PlaneGeometry(.023,spec[1])),grassMat);blade.position.set(spec[0],spec[1]*.5,spec[2]);blade.rotation.z=(i-1)*.18;blade.rotation.y=i*.7;blade.castShadow=true;this.foreground.add(blade);},this);this.scene.add(this.foreground);
    new T.TextureLoader().load(this.options.terrainTextureUrl||'paper-terrain-v10.png',function(texture){if(this.destroyed){texture.dispose();return;}this._own(texture);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.MirroredRepeatWrapping;texture.repeat.set(125,125);texture.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());this.groundMaterial.map=texture;this.groundMaterial.color.set('#ffffff');this.groundMaterial.needsUpdate=true;var stoneTexture=this._own(texture.clone());stoneTexture.repeat.set(1,1);stoneTexture.needsUpdate=true;this.stoneMaterial.map=stoneTexture;this.stoneMaterial.color.set('#c3c7c6');this.stoneMaterial.needsUpdate=true;this.render();}.bind(this),undefined,function(){/* A quiet untextured paper plane remains usable. */});
  };
  Scene.prototype._stripGeometry=function(pointAt,length,width,steps){
    var vertices=[],uv=[],indices=[];
    for(var i=0;i<=steps;i++){var d=i/steps*length,p=pointAt(d),t=pointAt(d+.002).sub(p).normalize(),cross=new T.Vector3().crossVectors(t,UP).normalize(),w=width*(1+.018*Math.sin(d*2.2)+.009*Math.sin(d*5.1));
      for(var side=-1;side<=1;side+=2){var q=p.clone().addScaledVector(cross,side*w*.5);vertices.push(q.x,q.y,q.z);uv.push(side<0?0:1,d/6);}
      if(i<steps){var k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
    var geometry=this._own(new T.BufferGeometry());geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
  };
  Scene.prototype._makeRoad=function(){
    this.roadMaterial=this._material('#506983',{side:T.DoubleSide});this.roadMaterial.polygonOffset=true;this.roadMaterial.polygonOffsetFactor=-1;
    this.road=new T.Mesh(this._stripGeometry(function(d){return this._point(d);}.bind(this),this.routeLength,1.55,620),this.roadMaterial);this.road.castShadow=true;this.road.receiveShadow=true;this.scene.add(this.road);
    var underGeo=this._stripGeometry(function(d){return this._point(d).add(V(0,-.035,0));}.bind(this),this.routeLength,1.555,620);
    this.underRoad=new T.Mesh(underGeo,this._material('#ded5c2',{side:T.DoubleSide,fog:false}));this.underRoad.castShadow=true;this.underRoad.receiveShadow=true;this.scene.add(this.underRoad);
    // Thickness follows the real paper edges. There is no outline drawn around
    // every polygon and no screen-space layer pretending to be a bridge.
    var edgeVertices=[],edgeIndices=[];for(var i=0;i<=620;i++){var d=i/620*this.routeLength,b=this._basis(d),width=.775*(1+.018*Math.sin(d*2.2)+.009*Math.sin(d*5.1));for(var s=-1;s<=1;s+=2){var p=b.p.clone().addScaledVector(b.side,s*width);edgeVertices.push(p.x,p.y,p.z,p.x,p.y-.036,p.z);}if(i<620){var k=i*4;edgeIndices.push(k,k+4,k+1,k+1,k+4,k+5,k+2,k+3,k+6,k+3,k+7,k+6);}}
    var edgeGeo=this._own(new T.BufferGeometry());edgeGeo.setAttribute('position',new T.Float32BufferAttribute(edgeVertices,3));edgeGeo.setIndex(edgeIndices);edgeGeo.computeVertexNormals();this.scene.add(new T.Mesh(edgeGeo,this._material('#c9c7b5',{side:T.DoubleSide})));
  };
  Scene.prototype._loadPaint=function(){
    var loader=new T.TextureLoader();loader.load(this.options.roadTextureUrl||'paper-road-v10.png',function(texture){if(this.destroyed){texture.dispose();return;}this._own(texture);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.MirroredRepeatWrapping;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());this.roadMaterial.color.set('#ffffff');this.roadMaterial.map=texture;this.roadMaterial.needsUpdate=true;if(this.exitMaterial){this.exitMaterial.map=texture;this.exitMaterial.color.set('#ffffff');this.exitMaterial.needsUpdate=true;}this.render();}.bind(this));
  };
  Scene.prototype._makeLandmark=function(){
    var b=this._basis(this.markerDistance);this.landmark=new T.Group();this.landmark.position.copy(b.p).addScaledVector(b.side,.70);this.landmark.rotation.y=Math.atan2(-b.t.z,b.t.x);this.scene.add(this.landmark);
    var stoneShape=new T.Shape();stoneShape.moveTo(-.33,-.13);stoneShape.lineTo(-.17,-.23);stoneShape.lineTo(.18,-.20);stoneShape.lineTo(.32,-.02);stoneShape.lineTo(.21,.18);stoneShape.lineTo(-.19,.22);stoneShape.closePath();
    var geo=this._own(new T.ExtrudeGeometry(stoneShape,{depth:.19,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:1,steps:1,curveSegments:1}));geo.rotateX(-PI*.5);geo.translate(0,.035,0);var positions=geo.attributes.position;for(var i=0;i<positions.count;i++){var x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);positions.setXYZ(i,x*.86,y+.06*x-.04*z,z*.65);}geo.computeVertexNormals();
    this.stoneMaterial=this._material('#c3c7c6',{flatShading:true});this.stone=new T.Mesh(geo,this.stoneMaterial);this.stone.rotation.y=.15;this.stone.castShadow=true;this.stone.receiveShadow=true;this.landmark.add(this.stone);
    var crack=new T.Line(this._own(new T.BufferGeometry().setFromPoints([V(-.18,.257,-.05),V(-.02,.258,.02),V(.07,.260,.08)])),this._own(new T.LineBasicMaterial({color:'#7d8787',transparent:true,opacity:.45})));crack.rotation.y=.15;this.landmark.add(crack);
    this.stemRoot=b.p.clone().addScaledVector(b.side,.53);this.stemRoot.y+=.28;
    var stubCurve=new T.CatmullRomCurve3([V(0,0,0),V(.025,.10,0),V(.035,.19,.01)]);
    this.emptyStem=new T.Mesh(this._own(new T.TubeGeometry(stubCurve,16,.009,5,false)),this._material('#6e785b'));this.emptyStem.position.copy(this.stemRoot);this.emptyStem.castShadow=true;this.scene.add(this.emptyStem);
    this.flowerOrigin=this.stemRoot.clone().add(V(.035,.15,.01));this.flowerGrip=.14;this.flower=this._flower();this.flower.position.copy(this.flowerOrigin);this.scene.add(this.flower);
  };
  Scene.prototype._flower=function(){
    var group=new T.Group();group.name='one-specific-golden-flower';
    var curve=new T.CatmullRomCurve3([V(0,0,0),V(.012,.15,0),V(.035,.29,0),V(.058,.38,0)]),stem=new T.Mesh(this._own(new T.TubeGeometry(curve,22,.0085,5,false)),this._material('#71805d'));stem.castShadow=true;group.add(stem);
    var leafShape=new T.Shape();leafShape.moveTo(0,0);leafShape.quadraticCurveTo(-.14,.05,-.16,.15);leafShape.quadraticCurveTo(-.04,.15,0,0);var leaf=new T.Mesh(this._own(new T.ShapeGeometry(leafShape,10)),this._material('#788468',{side:T.DoubleSide}));leaf.position.set(.012,.13,0);leaf.rotation.y=-.25;leaf.castShadow=true;group.add(leaf);
    var bloom=new T.Group();bloom.position.set(.058,.38,0);group.add(bloom);this.bloom=bloom;
    for(var i=0;i<3;i++){var shape=new T.Shape();shape.moveTo(0,0);shape.bezierCurveTo(-.038,.038,-.061,.112,-.018,.142);shape.bezierCurveTo(.006,.147,.048,.095,.019,.015);shape.quadraticCurveTo(.014,.006,0,0);var petal=new T.Mesh(this._own(new T.ShapeGeometry(shape,12)),this._material(i===1?'#dfb55c':'#d1a14b',{side:T.DoubleSide}));petal.rotation.z=(i-1)*.73;petal.rotation.y=(i-1)*.18;petal.castShadow=true;bloom.add(petal);}
    var centre=new T.Mesh(this._own(new T.SphereGeometry(.018,8,6)),this._material('#76603d'));centre.position.set(0,.013,.012);bloom.add(centre);return group;
  };
  Scene.prototype._makeActor=function(){
    this.actor=new T.Group();this.scene.add(this.actor);this.figureHeight=1.15;this.footShadows=[];
    for(var i=0;i<2;i++){var shadow=new T.Mesh(this._own(new T.CircleGeometry(.10,18)),this._own(new T.MeshBasicMaterial({color:'#4c5966',transparent:true,opacity:.22,depthWrite:false})));shadow.rotation.x=-PI*.5;shadow.scale.set(1,.50,1);this.scene.add(shadow);this.footShadows.push(shadow);}
  };
  Scene.prototype.setRig=function(rig){this.rig=rig;if(this.mode!=='webgl')return this;this.actor.add(rig.group);rig.group.scale.setScalar(this.figureHeight/rig.height);rig.group.traverse(function(part){if(part.isMesh){part.castShadow=true;part.receiveShadow=false;part.material.depthTest=true;var material=part.material;part.customDepthMaterial=this._own(new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:material.map,alphaTest:.08,side:T.DoubleSide}));}}.bind(this));this.render();return this;};
  Scene.prototype._makeExit=function(){
    this.exitMaterial=this._material('#506983',{side:T.DoubleSide,fog:false});this.exitLength=0;this.exitDistance=0;this.exitMeshes=[];this.prints=[];this.lastStance=[0,0];
    for(var i=0;i<36;i++){var print=new T.Mesh(this._own(new T.PlaneGeometry(.054,.12)),this._own(new T.MeshBasicMaterial({color:'#314558',transparent:true,opacity:0,depthWrite:false})));print.rotation.x=-PI*.5;print.visible=false;this.scene.add(print);this.prints.push({mesh:print,born:-100});}this.printIndex=0;
  };
  Scene.prototype._exitPoint=function(distance){var d=Math.max(0,distance),side=new T.Vector3().crossVectors(this.exitDirection,UP).normalize(),point=this.edgePoint.clone().addScaledVector(this.exitDirection,d);point.addScaledVector(side,.20*Math.sin(d/4)*smooth(d/2));point.y=mix(this.edgePoint.y,.12,smooth(d/14));return point;};
  Scene.prototype._buildExit=function(){
    this.exitMeshes.forEach(function(mesh){this.scene.remove(mesh);},this);this.exitMeshes=[];
    this.exitWindowStart=0;this.exitMesh=new T.Mesh(this._stripGeometry(this._exitPoint.bind(this),100,1.5,1200),this.exitMaterial);this.exitMesh.castShadow=true;this.exitMesh.receiveShadow=true;this.exitMesh.geometry.setDrawRange(0,0);this.scene.add(this.exitMesh);this.exitMeshes.push(this.exitMesh);
    var underside=new T.Mesh(this._stripGeometry(function(d){return this._exitPoint(d).add(V(0,-.028,0));}.bind(this),100,1.51,1200),this._material('#ded5c2',{side:T.DoubleSide,fog:false}));underside.castShadow=true;underside.receiveShadow=true;underside.geometry.setDrawRange(0,0);this.scene.add(underside);this.exitMeshes.push(underside);
  };
  Scene.prototype._updateExitWindow=function(start){
    this.exitWindowStart=start;this.exitMeshes.forEach(function(mesh,index){var geometry=mesh.geometry,positions=geometry.attributes.position,uv=geometry.attributes.uv;
      for(var i=0;i<=1200;i++){var d=start+i/1200*100,p=this._exitPoint(d),t=this._exitPoint(d+.002).sub(p).normalize(),cross=new T.Vector3().crossVectors(t,UP).normalize(),width=(index?1.51:1.5)*(1+.018*Math.sin(d*2.2)+.009*Math.sin(d*5.1));if(index)p.y-=.028;for(var s=0;s<2;s++){var q=p.clone().addScaledVector(cross,(s?1:-1)*width*.5);positions.setXYZ(i*2+s,q.x,q.y,q.z);uv.setXY(i*2+s,s,d/6);}}
      positions.needsUpdate=true;uv.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();},this);
  };
  Scene.prototype._actorPoint=function(){
    if(this.edgePoint){if(this.edgeApproach<1)return this.exitFrom.clone().lerp(this.edgePoint,this.edgeApproach);return this._exitPoint(this.exitDistance||0);}
    var gap=this.nextMarker-this.travel,lane=(this.phase==='picking'||this.phase==='reconsidering')?.30:.30*(1-smooth((gap-1.0)/2.0));if(this.phase==='returning')lane*=1-smooth((.10-gap)/.80);else if(gap<-.15)lane=0;if(this.phase==='returning'&&this.returnStart!==undefined)lane=Math.max(lane,.30*(1-smooth((this.travel-this.returnStart)/1.2)));if(this.phase==='revealing')lane=(this.revealLane||0)*(1-smooth((this.travel-this.revealStart)/1.2));
    return this._point(this.travel,lane);
  };
  Scene.prototype._camera=function(point,basis,dt){
    var close=this.phase==='picking'||this.phase==='reconsidering'||this.phase==='revealing'||this.phase==='choice'||this.phase==='placing'||this.phase==='crossing',closeWeight=close?1:(this.approachKind?.72:0),scale=mix(1,.60,closeWeight),t=basis.t.clone();t.y=0;t.normalize();var side=new T.Vector3().crossVectors(t,UP).normalize();
    var sideDistance=5.2*scale;if(this.edgePoint&&this.phase!=='placing'&&this.phase!=='crossing')sideDistance*=clamp(Math.pow((this.width/this.height)/1.78,.9),.24,1);var eye=point.clone().addScaledVector(t,-5.6*scale).addScaledVector(side,sideDistance).add(V(0,5.4*scale,0)),target=point.clone().add(V(0,.54,0)).addScaledVector(t,.45);
    if(this.phase==='reconsidering'||this.phase==='revealing'||this.phase==='choice'){eye=point.clone().addScaledVector(t,-2.5).addScaledVector(side,4.4).add(V(0,2.8,0));target=point.clone().add(V(0,.52,0));}
    if(!this.edgePoint&&this.phase==='returning'){var angle=((basis.u%TAU)+TAU)%TAU,underpass=1-smooth((Math.abs(angle-PI)-.16)/.36);eye.y=mix(eye.y,point.y+2.05,underpass);eye.addScaledVector(side,underpass*1.4);}
    if((this.phase==='placing'||this.phase==='crossing')&&this.edgeApproach>=1){eye=point.clone().addScaledVector(side,4.3).add(V(0,2.8,0));target=point.clone().add(V(0,.48,0));}
    this.overviewWeight=0;if(this.phase==='revealing'||this.staticOverview){var age=this.phaseAge,w=this.staticOverview?1:smooth(age/.85)*(1-smooth((age-2.0)/.85)),phone=this.width/this.height<.8;eye.lerp(phone?V(14.8,17.5,1.8):V(9.8,10.4,12.4),w);target.lerp(V(0,.55,0),w);this.overviewWeight=w;}
    var damping=this.cameraReady?1-Math.exp(-Math.max(dt||.016,.001)*5):1;if(!this.cameraEye)this.cameraEye=eye.clone();else this.cameraEye.lerp(eye,damping);if(!this.cameraAim)this.cameraAim=target.clone();else this.cameraAim.lerp(target,damping);this.camera.position.copy(this.cameraEye);this.camera.up.copy(UP);this.camera.lookAt(this.cameraAim);this.camera.updateMatrixWorld();this.cameraReady=true;
  };
  Scene.prototype._footContacts=function(point){
    if(!this.rig)return;var feet=this.rig.getFootContacts(),scale=this.figureHeight/this.rig.height;
    for(var i=0;i<2;i++){var foot=feet[i],shadow=this.footShadows[i];if(!foot){shadow.visible=false;continue;}var world=this.actor.localToWorld(V(foot.x*scale,0,0));shadow.visible=true;shadow.position.set(world.x,point.y+.016,world.z);shadow.material.opacity=.23*clamp(foot.stance||0,0,1);}
  };
  Scene.prototype._pose=function(){
    var pose={intent:this.interaction,impulse:this.impulse,hasFlower:this.picked,renderFlower:false};if(this.phase==='choice'||this.phase==='revealing'){pose.lockFeet=1;pose.look=.35;pose.carry=.15;}
    if(this.phase==='picking'||this.phase==='reconsidering'||(this.phase==='placing'&&this.edgeApproach>=1)||this.phase==='crossing'){
      pose.action=this.phase==='picking'?'pick':this.phase==='reconsidering'?'reconsider':this.phase==='placing'?'place':'cross';pose.progress=this.actionProgress;
      var grip=V(.012,this.flowerGrip,0).applyAxisAngle(UP,this.actor.rotation.y),target=(this.phase==='placing'?this.flowerGround:this.flowerOrigin).clone().add(grip);
      if(this.phase==='reconsidering')target=this.stemRoot.clone().add(V(.03,.16,0));
      if(this.rig){var local=this.rig.group.worldToLocal(target);pose.flowerTarget=[local.x,local.y];}
    }
    return pose;
  };
  Scene.prototype._attachFlower=function(){
    var ownership=this.picked?'bag':'stem';if(this.rig&&this.rig.getActionState){var state=this.rig.getActionState();ownership=state.flowerOwnership||ownership;}
    if(this.phase==='placing'&&this.edgeApproach>=1&&this.actionProgress>.01&&this.actionProgress<.78)ownership='hand';
    if(this.phase==='crossing'||this.phase==='leaving'||this.phase==='complete')ownership='ground';this.flowerOwnership=ownership;
    var angle=ownership==='bag'?.45:ownership==='hand'?-.40:0,p=this.actionProgress;
    if(this.phase==='picking'&&p>.67)angle=mix(-.40,.45,smooth((p-.67)/.19));
    if(this.phase==='reconsidering'&&p>.72)angle=mix(-.40,.45,smooth((p-.72)/.22));
    if(this.phase==='placing'&&this.edgeApproach>=1&&p<.78)angle=mix(mix(.45,-.40,smooth(p/.20)),0,smooth((p-.48)/.30));
    this.flower.rotation.set(0,this.actor.rotation.y,angle);var point;
    if(ownership==='stem')point=this.flowerOrigin.clone();else if(ownership==='ground')point=this.flowerGround?this.flowerGround.clone():this.flowerOrigin.clone();
    else if(this.rig){point=this.rig.group.localToWorld(this.rig.getAttachment(ownership==='bag'?'bag':'hand'));point.sub(V(.012,this.flowerGrip,0).applyQuaternion(this.flower.quaternion));point.addScaledVector(this.camera.position.clone().sub(this.cameraAim).setY(0).normalize(),.018);}
    if(point)this.flower.position.copy(point);
  };
  Scene.prototype._renderPrints=function(){
    for(var i=0;i<this.prints.length;i++){var print=this.prints[i],age=this.time-print.born;if(age>22)print.mesh.visible=false;if(print.mesh.visible)print.mesh.material.opacity=.16*smooth((age-.25)/.35)*(1-smooth((age-14)/8));}
    if(!this.rig||!this.edgePoint)return;var feet=this.rig.getFootContacts();
    feet.forEach(function(foot,index){var last=this.lastStance[index]||0;if((this.phase==='leaving'||this.phase==='complete')&&foot.stance>.80&&last<.5){var at=this.rig.group.localToWorld(V(foot.x,0,foot.z||0)),print=this.prints[this.printIndex++%this.prints.length];print.mesh.position.set(at.x,this._exitPoint(this.exitDistance).y+.018,at.z);print.mesh.rotation.set(-PI*.5,0,-Math.atan2(this.exitDirection.x,this.exitDirection.z));print.mesh.visible=true;print.born=this.time;}this.lastStance[index]=foot.stance;},this);
  };
  Scene.prototype.render=function(dt){
    if(this.destroyed)return;if(this.mode!=='webgl'){this._drawFallback();return;}
    var point=this._actorPoint(),basis=this.edgePoint?{t:this.exitDirection,side:new T.Vector3().crossVectors(this.exitDirection,UP).normalize()}:this._basis(this.travel);this._camera(point,basis,dt);
    this.actor.position.copy(point);this.actor.rotation.set(0,Math.atan2(this.camera.position.x-point.x,this.camera.position.z-point.z),0);this.actor.updateMatrixWorld(true);
    var screenRight=V().setFromMatrixColumn(this.camera.matrixWorld,0);this.facing=basis.t.dot(screenRight)>=0?1:-1;
    var moving=['walking','returning','leaving','complete'].indexOf(this.phase)>=0||(this.phase==='placing'&&this.edgeApproach<1&&this.edgeMoving);
    if(this.rig){this.rig.setFacing(this.facing);this.rig.update(this.gaitTime,moving?1:0,this._pose());this.actor.updateMatrixWorld(true);this._footContacts(point);}
    this._attachFlower();this._renderPrints();
    if(this.exitMesh){if(this.exitDistance-this.exitWindowStart>24)this._updateExitWindow(Math.max(0,this.exitDistance-12));var count=Math.min(1200,Math.floor(Math.max(0,this.exitLength-this.exitWindowStart)/100*1200));this.exitMeshes.forEach(function(mesh){mesh.geometry.setDrawRange(0,count*6);});}
    this.scene.fog.near=mix(10,35,this.overviewWeight||0);this.scene.fog.far=mix(19,55,this.overviewWeight||0);this.lightTarget.position.copy(point);this.sun.position.copy(point).add(V(-7,12,5));this.lightTarget.updateMatrixWorld();
    var a=point.clone().project(this.camera),b=point.clone().add(V(0,this.figureHeight,0)).project(this.camera);this.actorScreenHeight=Math.abs(b.y-a.y)*this.height*.5;
    this.renderer.render(this.scene,this.camera);this.container.dataset.cihouPhase=this.phase;this.container.dataset.cihouTravel=this.travel.toFixed(3);this.container.dataset.cihouExitDistance=(this.exitDistance||0).toFixed(3);this.container.dataset.cihouOwnership=this.flowerOwnership;this.container.dataset.cihouActorPixels=this.actorScreenHeight.toFixed(1);this.container.dataset.cihouActionProgress=this.actionProgress.toFixed(5);
  };
  Scene.prototype._setPhase=function(phase){if(this.phase===phase)return;this.phase=phase;if(phase==='revealing'){this.revealStart=this.travel;this.revealLane=0;}this.phaseAge=0;this.actionProgress=0;this.safeActionTarget=0;this.gaitTime=Math.round(this.gaitTime*.92)/.92;this._emitState(true);};
  Scene.prototype._emitState=function(force){
    if(!force&&this.time-(this.lastStateAt||0)<.10)return;this.lastStateAt=this.time;var state=this.getState(),key=[state.phase,state.canExit,state.exitComplete,Math.round(state.holdProgress*100),Math.round(state.exitProgress*100),state.interacting].join(':');if(force||key!==this.stateKey){this.stateKey=key;if(this.options.onStateChange)this.options.onStateChange(state);}
  };
  Scene.prototype._move=function(distance){
    if(distance<=0)return;var metrics=this.rig&&this.rig.getGaitMetrics?this.rig.getGaitMetrics(1,this.interaction):null,worldStride=metrics?metrics.travelPerGaitSecond*this.figureHeight/this.rig.height:this.figureHeight*.20;this.gaitTime+=distance/worldStride;
  };
  Scene.prototype._step=function(dt){
    this.time+=dt;this.phaseAge+=dt;this.interaction=mix(this.interaction,this.targetInteraction,1-Math.exp(-dt*6));this.impulse=Math.max(0,this.impulse-dt/.42);
    if(this.targetInteraction>0)this.holdAge+=dt;else this.holdAge=0;if(this.holdAge>.65)this.intent=true;
    var speed=mix(.40,.90,this.interaction),movement=0;
    if(this.phase==='walking'||this.phase==='returning'){
      if(this.phase==='walking'||this.phase==='returning'){
        while(this.travel>this.nextMarker+(this.phase==='returning'?1.05:.16))this.nextMarker+=this.routeLength;
        var gap=this.nextMarker-this.travel,requested=this.phase==='returning'||this.intent;
        this.approachKind=requested&&gap<1.9?(this.picked?'return':'pick'):null;
        if(this.approachKind&&gap<.45)speed*=.34;
        movement=speed*dt;var stopGap=this.phase==='returning'?-.90:.214;if(this.approachKind&&gap-movement<=stopGap){movement=Math.max(0,gap-stopGap);this.travel+=movement;this._move(movement);
          if(this.rig&&this.actorScreenHeight>=this.height*.19){this.pickAt=this.travel;this._setPhase(this.picked?'reconsidering':'picking');this.approachKind=null;}movement=0;
        }else this.travel+=movement;
      }else{movement=speed*dt;this.travel+=movement;}
      this._move(movement);
    }else if(this.phase==='revealing'||this.phase==='choice'){this.gaitTime+=dt*.16;if(this.phase==='revealing'&&this.phaseAge>=3.60){this.revealDone=true;this._setPhase('choice');if(this.options.onRevealReady)this.options.onRevealReady(this.getState());}
    }else if(this.phase==='picking'){
      this.actionProgress=clamp(this.phaseAge/3.80,0,1);if(this.actionProgress>=1){this.picked=true;this.returnStart=this.travel;this.nextMarker+=this.routeLength;this._setPhase('returning');}
    }else if(this.phase==='reconsidering'){
      this.actionProgress=clamp(this.phaseAge/3.2,0,1);if(this.actionProgress>=1){this.recognized=true;this.approachKind=null;this._setPhase('revealing');}
    }else if(this.phase==='placing'){
      if(this.edgeApproach<1){var left=this.edgeDistance*(1-this.edgeApproach),allowed=this.targetInteraction>0?speed*dt:Math.min(this.edgeCoast||0,.4*dt);movement=Math.min(left,allowed);this.edgeCoast=Math.max(0,(this.edgeCoast||0)-movement);this.edgeApproach=Math.min(1,this.edgeApproach+movement/this.edgeDistance);this.edgeMoving=movement>.00001;this._move(movement);if(this.edgeApproach>=1)this.gaitTime=Math.round(this.gaitTime*.92)/.92;}
      else{this.edgeMoving=false;var target=this.targetInteraction>0?1:(this.safeActionTarget||0);this.actionProgress=Math.min(target,this.actionProgress+dt/3.6);if(this.actionProgress>=.78)this.exitLength=Math.max(this.exitLength,.78);if(this.actionProgress>=1)this._setPhase('crossing');}
    }else if(this.phase==='crossing'){
      var target=this.targetInteraction>0?1:(this.safeActionTarget||0);this.actionProgress=Math.min(target,this.actionProgress+dt/4.0);var p=this.actionProgress;this.exitDistance=this.figureHeight*(.19*smooth((p-.40)/.27)+.11*smooth((p-.88)/.12));this.exitLength=Math.max(this.exitLength,.78+70*smooth((p-.40)/.60));if(p>=1)this._setPhase('leaving');
    }else if(this.phase==='leaving'||this.phase==='complete'){
      movement=Math.min(speed*dt,Math.max(0,this.exitLength-this.exitDistance-.50));this.exitDistance+=movement;this._move(movement);if(this.phase==='complete')this.exitLength=Math.max(this.exitLength,this.exitDistance+70);if(!this.exitComplete&&this.exitDistance>=2.35){this.exitComplete=true;this._setPhase('complete');if(this.options.onExitComplete)this.options.onExitComplete(this.getState());}
    }
    if(this.edgePoint&&this.targetInteraction>0&&(this.actionProgress>=.78||this.phase==='crossing'||this.phase==='leaving'||this.phase==='complete'))this.exitLength=this.exitLength+dt*3.2*this.targetInteraction;
    this._emitState(false);
  };
  Scene.prototype.getStoryProgress=function(){
    if(this.phase==='walking')return .12*clamp(this.travel/Math.max(.1,this.markerDistance),0,1);if(this.phase==='picking')return .12+.13*this.actionProgress;if(this.phase==='returning')return .25+.40*clamp((this.travel-this.returnStart)/this.routeLength,0,1);if(this.phase==='reconsidering')return .65+.13*this.actionProgress;if(this.phase==='revealing')return .78+.22*clamp(this.phaseAge/3.6,0,1);return 1;
  };
  Scene.prototype.getState=function(){
    var exit=0;if(this.phase==='placing')exit=.08*this.edgeApproach+.27*this.actionProgress;else if(this.phase==='crossing')exit=.35+.40*this.actionProgress;else if(this.phase==='leaving')exit=.75+.25*clamp((this.exitDistance-this.figureHeight*.30)/(2.35-this.figureHeight*.30),0,1);else if(this.exitComplete)exit=1;
    return{phase:this.phase,holdProgress:this.getStoryProgress(),exitProgress:exit,canExit:this.phase==='choice',exitComplete:this.exitComplete,interacting:this.targetInteraction>0,actionProgress:this.actionProgress,flowerOwnership:this.flowerOwnership||(this.picked?'bag':'stem'),travel:this.travel,routeLength:this.routeLength||0,reducedMotion:this.reducedMotion};
  };
  Scene.prototype.setProgress=function(value){
    this.targetProgress=clamp(Number(value)||0,0,1);if(this.reducedMotion&&this.targetProgress>0){this.picked=this.recognized=this.revealDone=true;this.travel=(this.markerDistance||0)+(this.routeLength||0);this.nextMarker=this.travel;this.phase='choice';this.phaseAge=0;this.actionProgress=0;this.staticOverview=true;this.render();this._emitState(true);if(this.options.onRevealReady)this.options.onRevealReady(this.getState());}return this;
  };
  Scene.prototype.setInteraction=function(value){
    var next=clamp(Number(value)||0,0,1);if(next>0&&this.targetInteraction===0){this.impulse=1;this.holdAge=0;}
    if(next===0&&this.targetInteraction>0){if(this.phase==='crossing')this.safeActionTarget=this.rig&&this.rig.nextSafeStop?this.rig.nextSafeStop(this.actionProgress):this.actionProgress<.4?.4:this.actionProgress<.67?.67:1;else if(this.phase==='placing'){var stops=[0,.20,.48,.78,1];this.safeActionTarget=1;for(var i=0;i<stops.length;i++)if(stops[i]>=this.actionProgress-.00001){this.safeActionTarget=stops[i];break;}if(this.edgeApproach<1)this.edgeCoast=.08;}}
    this.targetInteraction=next;this._emitState(true);return this;
  };
  Scene.prototype.setExit=function(value){
    value=clamp(Number(value)||0,0,1);if(this.mode!=='webgl'){if(value>0&&this.phase==='choice'){this.exitComplete=true;this.phase='complete';this.render();this._emitState(true);if(this.options.onExitComplete)this.options.onExitComplete(this.getState());}return this;}if(value===0&&this.edgePoint){this.reset();return this;}if(value<=0||this.phase!=='choice')return this;
    var b=this._basis(this.travel);this.exitFrom=this._actorPoint();this.exitDirection=b.side.clone();this.edgePoint=this.exitFrom.clone().addScaledVector(this.exitDirection,.78);this.edgeDistance=this.exitFrom.distanceTo(this.edgePoint);this.edgeApproach=0;this.exitDistance=this.exitLength=0;this.edgeCoast=0;this.flowerGround=this.edgePoint.clone().addScaledVector(this.exitDirection,.19);this._buildExit();this.staticOverview=false;this._setPhase('placing');
    if(this.reducedMotion){this.edgeApproach=1;this.exitDistance=2.35;this.exitLength=35;this.exitComplete=true;this.phase='complete';this.render();this._emitState(true);if(this.options.onExitComplete)this.options.onExitComplete(this.getState());}return this;
  };
  Scene.prototype.reset=function(){
    this.time=this.travel=this.gaitTime=0;this.phase='walking';this.phaseAge=this.actionProgress=0;this.interaction=this.targetInteraction=this.progress=this.targetProgress=this.holdAge=this.impulse=0;this.intent=this.picked=this.recognized=this.revealDone=this.exitComplete=false;this.nextMarker=this.markerDistance||0;this.approachKind=this.flowerGround=this.edgePoint=this.exitFrom=null;this.exitDistance=this.exitLength=0;this.edgeApproach=0;this.safeActionTarget=0;this.staticOverview=false;this.cameraReady=false;this.last=0;(this.exitMeshes||[]).forEach(function(mesh){mesh.geometry.setDrawRange(0,0);});(this.prints||[]).forEach(function(print){print.mesh.visible=false;print.born=-100;});this.lastStance=[0,0];this.printIndex=0;this.render();this._emitState(true);return this;
  };
  Scene.prototype._tick=function(now){this.raf=0;if(this.destroyed)return;var dt=this.last?Math.max(0,(now-this.last)/1000):0;this.last=now;if(this.active&&!this.paused){if(!this.reducedMotion){var remain=dt;while(remain>0){var step=Math.min(1/40,remain);remain-=step;this._step(step);}}this.render(dt);this.raf=requestAnimationFrame(this._tick);}};
  Scene.prototype.setPaused=function(value){value=!!value;if(value===this.paused)return this;this.paused=value;this.last=0;if(value){cancelAnimationFrame(this.raf);this.raf=0;}else if(this.active&&!this.raf)this.raf=requestAnimationFrame(this._tick);return this;};
  Scene.prototype.setActive=function(value){value=!!value;if(value===this.active)return this;this.active=value;this.last=0;if(!value){cancelAnimationFrame(this.raf);this.raf=0;}else if(!this.paused&&!this.raf)this.raf=requestAnimationFrame(this._tick);return this;};
  Scene.prototype.resize=function(){var box=this.container.getBoundingClientRect();this.width=Math.max(1,box.width);this.height=Math.max(1,box.height);if(this.renderer){this.renderer.setPixelRatio(Math.min(global.devicePixelRatio||1,1.5));this.renderer.setSize(this.width,this.height,false);this.camera.aspect=this.width/this.height;this.camera.updateProjectionMatrix();}else if(this.canvas){this.canvas.width=this.width;this.canvas.height=this.height;}this.render();};
  Scene.prototype._fallback=function(){this.reducedMotion=true;this.canvas=document.createElement('canvas');this.canvas.style.cssText='display:block;width:100%;height:100%';this.container.appendChild(this.canvas);this.context=this.canvas.getContext('2d');};
  Scene.prototype._drawFallback=function(){var c=this.context;if(!c)return;var w=this.width,h=this.height;c.fillStyle='#eee8d9';c.fillRect(0,0,w,h);c.strokeStyle='#506983';c.lineWidth=Math.min(w*.25,h*.20);c.beginPath();c.moveTo(-40,h+40);c.bezierCurveTo(w*.3,h*.58,w*.65,h*.28,w+40,-40);c.stroke();};
  Scene.prototype.destroy=function(){this.destroyed=true;cancelAnimationFrame(this.raf);if(this.observer)this.observer.disconnect();else global.removeEventListener('resize',this.resize);if(this.rig)this.rig.dispose();this.resources.forEach(function(resource){resource.dispose();});if(this.renderer){this.renderer.dispose();this.renderer.domElement.remove();}if(this.canvas)this.canvas.remove();};
  global.CihouHeroSceneV10=Scene;
})(window);

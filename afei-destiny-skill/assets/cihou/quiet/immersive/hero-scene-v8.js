/* Cihou v8: authored painting, tracked paper puppet, and a three-shot story.
 * Independent of all earlier scene versions. Source artwork is original.
 * Coordinates of the walking curve are manually calibrated source pixels.
 */
(function(global){
  'use strict';
  var T=global.THREE,PI=Math.PI;
  var clamp=function(v,a,b){return Math.max(a,Math.min(b,v));};
  var mix=function(a,b,t){return a+(b-a)*t;};
  var smooth=function(v){v=clamp(v,0,1);return v*v*(3-2*v);};
  var V=function(x,y,z){return new T.Vector3(x,y,z||0);};
  var center=function(){return V(768,-512);};
  var turn=function(a,b,t){var delta=Math.atan2(Math.sin(b-a),Math.cos(b-a));return a+delta*t;};
  function Scene(container,options){
    this.container=container;this.options=options||{};this.resources=[];
    this.progress=this.targetProgress=0;this.exit=this.targetExit=0;
    this.interaction=this.targetInteraction=0;this.time=this.travel=this.gaitTime=0;
    this.last=0;this.active=true;this.paused=false;this.destroyed=false;
    this.reducedMotion=this.options.reducedMotion===undefined?!!(global.matchMedia&&global.matchMedia('(prefers-reduced-motion: reduce)').matches):!!this.options.reducedMotion;
    this._tick=this._tick.bind(this);this.resize=this.resize.bind(this);
    this._init();
    if(global.ResizeObserver){this.observer=new ResizeObserver(this.resize);this.observer.observe(container);}else global.addEventListener('resize',this.resize);
    this.resize();this.raf=requestAnimationFrame(this._tick);
  }
  Scene.prototype._own=function(r){this.resources.push(r);return r;};
  Scene.prototype._image=function(url,callback){var self=this,image=new Image();image.onload=function(){if(self.destroyed)return;var texture=self._own(new T.Texture(image));texture.colorSpace=T.SRGBColorSpace;texture.minFilter=texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;callback.call(self,texture,image);self.render();};image.onerror=function(){if(self.options.onError)self.options.onError('Could not load '+url);};image.src=url;};
  Scene.prototype._init=function(){
    if(!T)throw new Error('Three.js is required by Cihou v8');
    this.mode='illustrated-2.5d';
    this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.setClearColor('#f1eade',1);
    this.renderer.domElement.style.cssText='display:block;width:100%;height:100%;pointer-events:none';
    this.renderer.domElement.setAttribute('aria-hidden','true');this.container.appendChild(this.renderer.domElement);
    this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-400,400,250,-250,.1,100);
    this.camera.position.set(930,-666,50);this.camera.lookAt(930,-666,0);
    this.world=new T.Group();this.scene.add(this.world);
    // Keep at least 75 source pixels away from the upper-right rock cluster.
    var points=[[930,690],[1115,613],[1265,480],[1312,380],[1290,300],[1250,240],[1170,215],[1050,224],[905,245],[777,246],[585,243],[409,229],[258,246],[170,316],[136,428],[182,556],[309,666],[491,747],[697,776],[839,739]];
    this.path=new T.CatmullRomCurve3(points.map(function(p){return V(p[0],-p[1]);}),true,'centripetal');
    this.path.arcLengthDivisions=2400;this.pathLength=this.path.getLength();
    this._painting();this._marker();this._walker();this._trace();this._exitRoad();this._footprints();
  };
  Scene.prototype._painting=function(){
    this.quietUniforms={walker:{value:new T.Vector2(.5,.5)},strength:{value:.40}};
    this._image(this.options.worldTextureUrl||'world-keyart-v3.png',function(texture){
      var self=this,material=this._own(new T.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.04,depthWrite:false,toneMapped:false}));
      material.onBeforeCompile=function(shader){
        shader.uniforms.cihouWalker=self.quietUniforms.walker;shader.uniforms.cihouQuiet=self.quietUniforms.strength;
        shader.fragmentShader='uniform vec2 cihouWalker;uniform float cihouQuiet;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',[
          '#include <map_fragment>',
          'vec2 quietOffset=vec2(12./1536.,12./1024.);',
          'vec3 broad=texture2D(map,vMapUv+quietOffset).rgb+texture2D(map,vMapUv-quietOffset).rgb;',
          'broad+=texture2D(map,vMapUv+vec2(quietOffset.x,-quietOffset.y)).rgb+texture2D(map,vMapUv+vec2(-quietOffset.x,quietOffset.y)).rgb;',
          'float quiet=1.-smoothstep(.15,1.,length((vMapUv-cihouWalker)*vec2(1536./85.,1024./90.)));',
          'diffuseColor.rgb=mix(diffuseColor.rgb,broad*.25,quiet*cihouQuiet);'
        ].join('\n'));
      };
      this.painting=new T.Mesh(this._own(new T.PlaneGeometry(1536,1024)),material);
      this.painting.position.set(768,-512,0);this.painting.renderOrder=0;this.world.add(this.painting);
      if(this.options.onReady)this.options.onReady({mode:this.mode});
    });
  };
  Scene.prototype._marker=function(){
    this.markerGroup=new T.Group();this.markerGroup.visible=false;this.scene.add(this.markerGroup);
    this.markerUniform={value:0};this.markerSpec={height:40,bbox:[394,142,1266,900],base:[780,895],flower:[949,137,162,135]};
    this._image(this.options.markerUrl||'flower-stone-v1.png',function(texture){
      var crop=this._own(texture.clone());crop.repeat.set(872/1536,758/1024);crop.offset.set(394/1536,1-900/1024);crop.needsUpdate=true;
      var material=this._own(new T.MeshBasicMaterial({map:crop,transparent:true,alphaTest:.04,depthWrite:false,toneMapped:false})),self=this;
      material.onBeforeCompile=function(shader){shader.uniforms.cihouPicked=self.markerUniform;shader.fragmentShader='uniform float cihouPicked;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nif(cihouPicked>.5&&vMapUv.x>949./1536.&&vMapUv.x<1111./1536.&&vMapUv.y>1.-272./1024.&&vMapUv.y<1.-137./1024.)discard;');};
      var spec=this.markerSpec,bbox=spec.bbox,scale=spec.height/(bbox[3]-bbox[1]),width=(bbox[2]-bbox[0])*scale;
      var geometry=this._own(new T.PlaneGeometry(width,spec.height));geometry.translate(((bbox[0]+bbox[2])*.5-spec.base[0])*scale,(spec.base[1]-(bbox[1]+bbox[3])*.5)*scale,0);
      this.marker=new T.Mesh(geometry,material);this.marker.renderOrder=20;this.markerGroup.add(this.marker);
      var petal=this._own(texture.clone());petal.repeat.set(162/1536,135/1024);petal.offset.set(949/1536,1-272/1024);petal.needsUpdate=true;
      this.markerFlowerLocal=V((spec.flower[0]+spec.flower[2]*.5-spec.base[0])*scale,(spec.base[1]-spec.flower[1]-spec.flower[3]*.5)*scale);this.flowerWorldHeight=spec.flower[3]*scale;
      this.flower=new T.Mesh(this._own(new T.PlaneGeometry(spec.flower[2]*scale,this.flowerWorldHeight)),this._own(new T.MeshBasicMaterial({map:petal,transparent:true,alphaTest:.04,depthWrite:false,toneMapped:false})));
      this.flower.renderOrder=80;this.flower.visible=false;this.scene.add(this.flower);
    });
  };
  Scene.prototype._walker=function(){
    this.walkerRoot=new T.Group();this.scene.add(this.walkerRoot);
    var shape=new T.Shape();shape.moveTo(-7,0);shape.bezierCurveTo(-5,2.2,7,2.5,10,0);shape.bezierCurveTo(7,-2,-6,-2,-7,0);
    this.shadow=new T.Mesh(this._own(new T.ShapeGeometry(shape)),this._own(new T.MeshBasicMaterial({color:'#253c51',transparent:true,opacity:.22,depthWrite:false})));
    this.shadow.renderOrder=18;this.scene.add(this.shadow);
  };
  Scene.prototype._trace=function(){
    this.traceGeometry=this._own(new T.BufferGeometry().setFromPoints(Array.from({length:101},function(){return V(0,0);})));
    this.trace=new T.Line(this.traceGeometry,this._own(new T.LineBasicMaterial({color:'#d8b460',transparent:true,opacity:.56,depthWrite:false})));this.trace.renderOrder=12;this.trace.visible=false;this.world.add(this.trace);
  };
  Scene.prototype._exitRoad=function(){
    this.exitGeometry=this._own(new T.BufferGeometry());var count=420,positions=new Float32Array((count+1)*6),uv=new Float32Array((count+1)*4),indices=[];
    for(var i=0;i<count;i++){var k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
    this.exitGeometry.setAttribute('position',new T.BufferAttribute(positions,3));this.exitGeometry.setAttribute('uv',new T.BufferAttribute(uv,2));this.exitGeometry.setIndex(indices);
    var pixel=this._own(new T.DataTexture(new Uint8Array([64,88,121,255]),1,1));pixel.colorSpace=T.SRGBColorSpace;pixel.needsUpdate=true;
    this.roadUniforms={paint:{value:pixel}};
    this.exitMaterial=this._own(new T.ShaderMaterial({side:T.DoubleSide,transparent:true,depthWrite:false,uniforms:this.roadUniforms,
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:[
        'uniform sampler2D paint;varying vec2 vUv;',
        'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
        'void main(){float edge=min(vUv.x,1.-vUv.x);float dry=(h(floor(vec2(vUv.y*1900.,vUv.x*180.)))-.5)*.007;',
        'if(edge<.004+dry)discard;',
        'vec3 ink=texture2D(paint,vec2(fract(vUv.y),vUv.x)).rgb;ink=mix(ink,vec3(.051,.097,.187),.42);',
        'float border=1.-smoothstep(.022+dry,.032+dry,edge);',
        'vec3 col=mix(ink,vec3(.79,.59,.53),border);',
        'float pencil=1.-smoothstep(.004,.009,edge);col=mix(col,vec3(.14,.17,.19),pencil*.48);',
        'gl_FragColor=vec4(col,1.);',
        '#include <colorspace_fragment>',
        '}'
      ].join('\n')
    }));
    this.exitPaper=new T.Mesh(this.exitGeometry,this.exitMaterial);this.exitPaper.renderOrder=10;this.exitPaper.visible=false;this.scene.add(this.exitPaper);this.exitSteps=count;
    this._image(this.options.roadTextureUrl||'paper-road-v1.png',function(texture){texture.wrapS=T.RepeatWrapping;this.roadUniforms.paint.value=texture;});
    this.goldenGeometry=this._own(new T.BufferGeometry().setFromPoints(Array.from({length:count+1},function(){return V(0,0);})));this.goldenLine=new T.Line(this.goldenGeometry,this._own(new T.LineBasicMaterial({color:'#d8af57',transparent:true,opacity:.90,depthWrite:false})));this.goldenLine.visible=false;this.goldenLine.renderOrder=15;this.scene.add(this.goldenLine);
    var seedShape=new T.Shape();seedShape.moveTo(-1.4,0);seedShape.bezierCurveTo(-1,-2,1.1,-2,1.6,.2);seedShape.bezierCurveTo(.3,2.5,-.5,2,-1.4,0);
    this.seed=new T.Mesh(this._own(new T.ShapeGeometry(seedShape)),this._own(new T.MeshBasicMaterial({color:'#b78b31',side:T.DoubleSide,depthWrite:false})));this.seed.renderOrder=90;this.seed.visible=false;this.scene.add(this.seed);
  };
  Scene.prototype._footprints=function(){
    this.prints=[];var shape=new T.Shape();shape.moveTo(-.6,0);shape.bezierCurveTo(-.9,1.4,.5,1.8,.9,.5);shape.bezierCurveTo(.9,-.8,-.6,-.9,-.6,0);
    var geometry=this._own(new T.ShapeGeometry(shape));for(var i=0;i<22;i++){var material=this._own(new T.MeshBasicMaterial({color:'#253a4d',transparent:true,opacity:0,depthWrite:false})),mesh=new T.Mesh(geometry,material);mesh.visible=false;mesh.renderOrder=16;this.scene.add(mesh);this.prints.push({mesh:mesh,born:-100});}this.printIndex=0;this.lastPrintDistance=0;
  };
  Scene.prototype._point=function(distance){return this.path.getPointAt(((distance%this.pathLength)+this.pathLength)%this.pathLength/this.pathLength);};
  Scene.prototype._tangent=function(distance){return this.path.getTangentAt(((distance%this.pathLength)+this.pathLength)%this.pathLength/this.pathLength);};
  Scene.prototype._transform=function(point){return point.clone().sub(center()).applyAxisAngle(V(0,0,1),this.worldAngle||0).add(center());};
  Scene.prototype._reveal=function(){return smooth((this.progress-.5)/.5);};
  Scene.prototype._exitPhase=function(){return !this.exitStart?0:this.reducedMotion?this.exit:clamp((this.time-this.exitBegan)/6.5,0,1);};
  Scene.prototype._exitPoint=function(distance){var point=this.exitStart.clone().addScaledVector(this.exitDirection,distance),normal=V(-this.exitDirection.y,this.exitDirection.x);point.addScaledVector(normal,Math.sin(distance/190)*28+Math.sin(distance/430)*8);return point;};
  Scene.prototype._camera=function(point,reveal,exitPhase){
    var eventAge=this.eventTime===undefined?-1:this.time-this.eventTime,encounter=eventAge>=0?smooth(eventAge/.4)*(1-smooth((eventAge-.9)/.5)):0;
    var aspect=this.width/this.height,nearHeight=mix(500,420,encounter),height=nearHeight,figure=48,target=point.clone().add(V(0,24));
    // Near shots follow exactly. The overview can follow softly, bounded to
    // the central 23% of the viewport, so an extreme back-rim position cannot
    // shrink the complete illustration into a postage stamp.
    if(reveal>0&&!this.exitStart){
      var bounds=[V(28,-100),V(1518,-100),V(1518,-930),V(28,-930)].map(this._transform.bind(this)),minX=Infinity,maxX=-Infinity;
      for(var b=0;b<bounds.length;b++){minX=Math.min(minX,bounds[b].x);maxX=Math.max(maxX,bounds[b].x);}
      var width=maxX-minX,minHeight=width/(aspect*.85),maxHeight=width/(aspect*.70),far=width/(aspect*.78),farTarget,needed;
      for(var iteration=0;iteration<4;iteration++){
        var body=point.clone().add(V(0,Math.max(48,far*.05)*.5));farTarget=body.clone().lerp(center(),.55);
        farTarget.x=clamp(farTarget.x,body.x-far*aspect*.115,body.x+far*aspect*.115);farTarget.y=clamp(farTarget.y,body.y-far*.115,body.y+far*.115);needed=minHeight;
        for(var i=0;i<bounds.length;i++){var offset=bounds[i].clone().sub(farTarget);needed=Math.max(needed,offset.y>0?offset.y/.43:-offset.y/.32,Math.abs(offset.x)/(aspect*.46));}
        far=clamp(needed,minHeight,maxHeight);
      }
      height=mix(nearHeight,far,reveal);figure=mix(48,Math.max(48,height*.05),reveal);
      var currentBody=point.clone().add(V(0,figure*.5));target=currentBody.clone().lerp(farTarget,reveal);
      target.x=clamp(target.x,currentBody.x-height*aspect*.115,currentBody.x+height*aspect*.115);target.y=clamp(target.y,currentBody.y-height*.115,currentBody.y+height*.115);
      this.container.dataset.cihouOverviewCropped=needed>maxHeight+.01?'true':'false';
    }
    if(this.exitStart){var approach=smooth(exitPhase/.18);height=mix(this.exitCameraHeight||nearHeight,nearHeight,approach);figure=mix(this.exitFigureHeight||48,48,approach);target=(this.exitCameraTarget||point.clone().add(V(0,figure*.5))).clone().lerp(point.clone().add(V(0,figure*.5)),approach);}
    this.viewHeight=height;this.figureHeight=figure;
    this.cameraTarget=target.clone();this.camera.position.set(target.x,target.y,50);this.camera.lookAt(target.x,target.y,0);
    this.camera.left=-height*aspect*.5;this.camera.right=height*aspect*.5;this.camera.top=height*.5;this.camera.bottom=-height*.5;this.camera.updateProjectionMatrix();
  };
  Scene.prototype._attachment=function(name,point){var local=this.rig?this.rig.getAttachment(name):V(name==='bag'?-6:14,name==='bag'?25:37);if(this.rig){local.x*=this.facing;local.multiplyScalar(this.figureHeight/this.rig.height);}return local.add(point);};
  Scene.prototype._handTarget=function(world,point){var local=world.clone().sub(point).multiplyScalar(this.rig.height/this.figureHeight);local.x*=this.facing;return[local.x,local.y];};
  Scene.prototype._restoreArm=function(){if(!this.armPosed||!this.rig)return;var part=this.rig.parts.leftArm,positions=part.mesh.geometry.attributes.position;for(var i=0;i<positions.count;i++)positions.setXY(i,part.base[i*2],part.base[i*2+1]);positions.needsUpdate=true;this.armPosed=false;};
  Scene.prototype._poseArmToTarget=function(target,reach){
    if(!this.rig||!target||reach<=0)return;var part=this.rig.parts.leftArm,shoulder=new T.Vector2(part.mesh.position.x,part.mesh.position.y),handTarget=new T.Vector2(target[0],target[1]),direction=handTarget.clone().sub(shoulder);
    var upper=this.rig.height*.14,lower=this.rig.height*.135,distance=clamp(direction.length(),Math.abs(upper-lower)+.0001,upper+lower-.0001);direction.normalize();var along=(upper*upper+distance*distance-lower*lower)/(2*distance),bend=Math.sqrt(Math.max(0,upper*upper-along*along));
    var elbow=direction.clone().multiplyScalar(along).add(new T.Vector2(direction.y,-direction.x).multiplyScalar(bend)),end=direction.clone().multiplyScalar(distance),upperDirection=elbow.clone().normalize(),lowerDirection=end.clone().sub(elbow).normalize();
    var sourcePoint=this.rig._point(part.meta,'elbowPx'),sourceElbow=new T.Vector2((sourcePoint.x-part.pivot.x)*part.scale,(part.pivot.y-sourcePoint.y)*part.scale),sourceUpper=sourceElbow.clone().normalize(),sourceLower=part.vector.clone().sub(sourceElbow).normalize(),sourceUpperLength=sourceElbow.length(),sourceLowerLength=part.vector.clone().sub(sourceElbow).length();
    var positions=part.mesh.geometry.attributes.position,rotation=part.mesh.rotation.z,cos=Math.cos(rotation),sin=Math.sin(rotation);
    for(var i=0;i<positions.count;i++){
      var x=part.base[i*2],y=part.base[i*2+1],vertex=new T.Vector2(x,y),fromElbow=vertex.clone().sub(sourceElbow),uAlong=vertex.dot(sourceUpper)*upper/sourceUpperLength,uAcross=sourceUpper.x*y-sourceUpper.y*x,lAlong=fromElbow.dot(sourceLower)*lower/sourceLowerLength,lAcross=sourceLower.x*fromElbow.y-sourceLower.y*fromElbow.x;
      var upperPoint=upperDirection.clone().multiplyScalar(uAlong).add(new T.Vector2(-upperDirection.y,upperDirection.x).multiplyScalar(uAcross)),lowerPoint=elbow.clone().addScaledVector(lowerDirection,lAlong).add(new T.Vector2(-lowerDirection.y,lowerDirection.x).multiplyScalar(lAcross)),weight=smooth((vertex.dot(sourceElbow)/sourceElbow.lengthSq()-.80)/.40);upperPoint.lerp(lowerPoint,weight);
      positions.setXY(i,mix(x*cos-y*sin,upperPoint.x,reach),mix(x*sin+y*cos,upperPoint.y,reach));
    }
    positions.needsUpdate=true;part.mesh.geometry.computeBoundingSphere();part.mesh.rotation.z=0;this.armPosed=true;
    var rest=this.rig.getAttachment('hand'),exact=shoulder.clone().add(end);this.rig.attachments.hand=V(mix(rest.x,exact.x,reach),mix(rest.y,exact.y,reach),.014);
  };
  Scene.prototype._renderTrace=function(){
    if(this.contactTravel===undefined){this.trace.visible=false;return;}var start=Math.max(this.contactTravel,this.travel-260),end=this.travel,positions=this.traceGeometry.attributes.position;for(var i=0;i<=100;i++){var p=this._point(mix(start,end,i/100));positions.setXYZ(i,p.x,p.y,1.8);}positions.needsUpdate=true;this.traceGeometry.computeBoundingSphere();this.trace.visible=end>start+.1;
  };
  Scene.prototype._renderExit=function(phase,point){
    if(!this.exitStart)return;var land=this._exitPoint(18),drop=smooth(phase/.16),from=this.exitBagStart.clone();this.seed.visible=true;this.seed.position.copy(from.lerp(land,drop));this.seed.position.y+=Math.sin(PI*drop)*12;this.seed.position.z=8;this.seed.rotation.z=drop*1.2;
    var grown=smooth((phase-.15)/.44),front=mix(18,2100,grown),back=mix(-4,-1300,smooth((phase-.19)/.38)),positions=this.exitGeometry.attributes.position,uv=this.exitGeometry.attributes.uv;
    this.exitPaper.visible=phase>.19;this.goldenLine.visible=phase>.15;var goldenPositions=this.goldenGeometry.attributes.position;
    for(var j=0;j<=this.exitSteps;j++){
      var distance=mix(back,front,j/this.exitSteps),p=this._exitPoint(distance),t=this._exitPoint(distance+.1).sub(p).normalize(),across=V(-t.y,t.x),leftWidth=23+2*Math.sin(distance/110)+.6*Math.sin(distance/29),rightWidth=22+1.7*Math.sin(distance/151+.8)+.7*Math.sin(distance/37+1.2);
      positions.setXYZ(j*2,p.x-across.x*leftWidth,p.y-across.y*leftWidth,2.4);positions.setXYZ(j*2+1,p.x+across.x*rightWidth,p.y+across.y*rightWidth,2.4);uv.setXY(j*2,0,distance/460);uv.setXY(j*2+1,1,distance/460);
      var gold=this._exitPoint(mix(18,front,j/this.exitSteps));goldenPositions.setXYZ(j,gold.x,gold.y,2.7);
    }
    positions.needsUpdate=true;uv.needsUpdate=true;goldenPositions.needsUpdate=true;this.exitGeometry.computeBoundingSphere();this.goldenGeometry.computeBoundingSphere();this.goldenLine.material.opacity=.90*(1-smooth((phase-.42)/.34));
    if(this.exitDistance-this.lastPrintDistance>4.2&&phase>.26){this.lastPrintDistance=this.exitDistance;var print=this.prints[this.printIndex++%this.prints.length],foot=this._exitPoint(this.exitDistance-3),side=this.printIndex%2?1:-1;foot.add(V(-this.exitDirection.y,this.exitDirection.x).multiplyScalar(side*2));print.mesh.position.set(foot.x,foot.y,2.8);print.mesh.rotation.z=Math.atan2(this.exitDirection.y,this.exitDirection.x)-PI*.5;print.born=this.time;print.mesh.visible=true;}
    this.prints.forEach(function(print){var age=this.time-print.born;print.mesh.material.opacity=.23*smooth((age-.25)/.4)*(1-smooth((age-12)/8));if(age>20)print.mesh.visible=false;},this);
  };
  Scene.prototype.render=function(){
    if(this.destroyed||!this.renderer)return;
    var reveal=this._reveal(),rawPoint=this._point(this.travel),rawTangent=this._tangent(this.travel),aspect=this.width/this.height;
    // Keep the authored plants and rock lighting upright. The camera follows
    // translation; it no longer rotates the entire painting around each bend.
    var nearAngle=PI*.04,farAngle=0;
    this.worldAngle=this.exitStart?this.exitWorldAngle:turn(nearAngle,farAngle,reveal);
    this.world.rotation.z=this.worldAngle;var c=Math.cos(this.worldAngle),s=Math.sin(this.worldAngle);
    var base=V(768-(768*c+512*s),-512-(768*s-512*c));
    var phase=this._exitPhase(),retreat=this.exitStart?smooth((phase-.25)/.75):0,oldScale=this.exitStart?mix(1,.38,smooth((phase-.14)/.66)):1,retreatDistance=this.exitStart?retreat*120+Math.max(0,this.time-this.exitBegan-6.5)*9:0;
    // Painted memory recedes behind the newly unfolded path, rather than fading
    // into an empty rectangle. The original loop stays visible while it leaves.
    if(this.exitStart)base.multiplyScalar(oldScale).addScaledVector(this.exitStart,1-oldScale).addScaledVector(this.exitDirection,-retreatDistance);
    this.world.scale.setScalar(oldScale);this.world.position.copy(base);
    var point=this.exitStart?this._exitPoint(this.exitDistance):this._transform(rawPoint),tangent=this.exitStart?this.exitDirection.clone():rawTangent.clone().applyAxisAngle(V(0,0,1),this.worldAngle);
    this._camera(point,reveal,phase);this.walkerRoot.position.set(point.x,point.y,5);this.walkerRoot.scale.setScalar(this.rig?this.figureHeight/this.rig.height:1);this.shadow.position.set(point.x+2,point.y-.6,2);this.shadow.scale.setScalar(this.figureHeight/48);
    var markerFacing=this.markerFacing||1,flowerLocal=this.markerFlowerLocal||V(13.19,36.44),markerPosition=this.markerFootPoint?this._transform(this.markerFootPoint).add(V((6.5-flowerLocal.x)*markerFacing,8)):point.clone(),flowerOrigin=markerPosition.clone().add(V(flowerLocal.x*markerFacing,flowerLocal.y));this.markerGroup.scale.x=markerFacing;
    if(this.exitStart)markerPosition.sub(this.exitStart).multiplyScalar(oldScale).add(this.exitStart).addScaledVector(this.exitDirection,-retreatDistance);
    this.markerGroup.position.set(markerPosition.x,markerPosition.y,3);this.markerGroup.scale.set(markerFacing*oldScale,oldScale,oldScale);this.markerGroup.visible=!!this.markerArmed;
    if(this.marker)this.marker.material.opacity=smooth((this.time-(this.markerBornAt||0))/.35);
    var eventAge=this.eventTime===undefined?-1:this.time-this.eventTime,reach=0,handTarget;
    this.facing=tangent.x>=0?1:-1;
    if(this.rig){
      this._restoreArm();this.rig.setFacing(this.facing);
      if(eventAge>=0&&eventAge<1.25&&!this.exitStart){reach=smooth(eventAge/.45)*(1-smooth((eventAge-.95)/.30));var target=flowerOrigin.clone(),bagTarget=point.clone().add(V(-this.figureHeight*.13*this.facing,this.figureHeight*.53));target.lerp(bagTarget,smooth((eventAge-.60)/.38));handTarget=this._handTarget(target,point);}
      this.rig.update(this.gaitTime,.8,{reach:reach,handTarget:handTarget});
      this._poseArmToTarget(handTarget,reach);
      if(eventAge>=0&&eventAge<1.25){var look=smooth(eventAge/.25)*(1-smooth((eventAge-.90)/.35));this.rig.parts.head.mesh.rotation.z+=look*.16;this.rig.parts.head.mesh.rotation.y=look*.13;}
      else{this.rig.parts.head.mesh.rotation.y=0;if(this.revealReadyAt!==undefined){var glance=this.time-this.revealReadyAt;this.rig.parts.head.mesh.rotation.z-=Math.sin(PI*clamp(glance/1.2,0,1))*.18;}}
    }
    var hand=this._attachment('hand',point),bag=this._attachment('bag',point);this.lastBag=bag.clone();
    if(this.flower){
      this.flower.visible=eventAge>=.45;this.markerUniform.value=eventAge>=.45?1:0;
      if(this.flower.visible){var carry=smooth((eventAge-.90)/.35),flowerScale=mix(1,Math.max(.68,this.figureHeight*.15/(this.flowerWorldHeight||7.12)),carry);this.flower.position.copy(hand.lerp(bag,carry));this.flower.position.z=7;this.flower.rotation.z=mix(.12,-.18,carry);this.flower.scale.set(flowerScale*markerFacing,flowerScale,1);}
    }
    this.quietUniforms.walker.value.set(rawPoint.x/1536,1+rawPoint.y/1024);this.quietUniforms.strength.value=.40*(1-reveal*.55)*(this.exitStart?0:1);
    this._renderTrace();this._renderExit(phase,point);
    this.container.dataset.cihouTravel=this.travel.toFixed(2);this.container.dataset.cihouEvent=eventAge>=1.25?'carried':eventAge>=.45?'in-hand':eventAge>=0?'reaching':this.markerArmed?'approaching':'waiting';
    this.container.dataset.cihouShot=this.exitStart?'seed-and-new-road':reveal>0?'overview':'encounter';
    this.renderer.render(this.scene,this.camera);
  };
  Scene.prototype._advance=function(dt){
    // Integrating visible elapsed time in small steps prevents skipped contacts
    // on a slow frame without stretching 6.5 real seconds into half a minute.
    var remaining=dt;while(remaining>0){var step=Math.min(1/30,remaining);remaining-=step;this.time+=step;
      var age=this.eventTime===undefined?-1:this.time-this.eventTime,walking=!(age>=0&&age<1.25),speed=10;
      if(this.revealReadyAt!==undefined&&this.time-this.revealReadyAt<1.2)speed*=.63;
      if(this.exitStart){var phase=this._exitPhase();walking=phase>.19;if(walking)this.exitDistance+=speed*step;}
      else if(walking){this.travel+=speed*step;if(this.markerArmed&&this.eventTime===undefined&&this.travel>=this.markerDistance-10){this.travel=this.markerDistance-10;this.eventTime=this.time;this.contactTravel=this.travel;this.gaitTime=Math.round(this.gaitTime*.92)/.92;if(this.options.onEvent)this.options.onEvent('flower-contact');}}
      if(walking){var height=this.figureHeight||48;this.gaitTime+=step*speed/(height*.173*.92/.62);}
    }
  };
  Scene.prototype._tick=function(now){
    this.raf=0;if(this.destroyed)return;var dt=this.last?Math.max(0,(now-this.last)/1000):0;this.last=now;
    if(this.active&&!this.paused){var weight=this.reducedMotion?1:1-Math.exp(-dt*8);this.progress=mix(this.progress,this.targetProgress,weight);this.exit=mix(this.exit,this.targetExit,weight);this.interaction=mix(this.interaction,this.targetInteraction,weight);if(!this.reducedMotion)this._advance(dt);
      if(this.progress>.998&&this.eventTime!==undefined&&this.time-this.eventTime>=1.25&&this.revealReadyAt===undefined){this.revealReadyAt=this.time;if(this.options.onRevealReady)this.options.onRevealReady();}
      this.render();this.raf=requestAnimationFrame(this._tick);
    }
  };
  Scene.prototype.setRig=function(rig){this.rig=rig;this.walkerRoot.add(rig.group);rig.group.position.set(0,0,0);this.render();return this;};
  Scene.prototype.setProgress=function(value){this.targetProgress=clamp(Number(value)||0,0,1);if(this.reducedMotion){this.progress=this.targetProgress;this.render();}return this;};
  Scene.prototype.setInteraction=function(value){this.targetInteraction=clamp(Number(value)||0,0,1);if(this.targetInteraction>0&&!this.markerArmed&&!this.exitStart){this.markerArmed=true;this.markerBornAt=this.time;this.markerDistance=this.travel+30;this.markerPoint=this._point(this.markerDistance);this.markerFootPoint=this._point(this.markerDistance-10);var tangent=this._tangent(this.markerDistance-10).applyAxisAngle(V(0,0,1),PI*.04);this.markerFacing=tangent.x>=0?1:-1;if(this.reducedMotion){this.eventTime=this.time-1.25;this.contactTravel=this.travel;}}return this;};
  Scene.prototype.setExit=function(value){value=clamp(Number(value)||0,0,1);if(value>0&&!this.exitStart){this.exitStart=this._transform(this._point(this.travel));this.exitDirection=V(Math.cos(PI*.205),Math.sin(PI*.205));this.exitWorldAngle=this.worldAngle;this.exitBegan=this.time;this.exitDistance=0;this.exitBagStart=this.lastBag?this.lastBag.clone():this.exitStart.clone().add(V(-6,25));this.exitCameraHeight=this.viewHeight;this.exitFigureHeight=this.figureHeight;this.exitCameraTarget=this.cameraTarget?this.cameraTarget.clone():this.exitStart.clone().add(V(0,this.figureHeight*.5));}if(value===0&&this.exitStart){this.exitStart=null;this.exitDistance=0;this.exitPaper.visible=this.goldenLine.visible=this.seed.visible=false;this.prints.forEach(function(print){print.mesh.visible=false;print.born=-100;});}this.targetExit=value;if(this.reducedMotion){this.exit=value;this.exitDistance=value>0?54:0;this.render();}return this;};
  Scene.prototype.setPaused=function(value){this.paused=!!value;this.last=0;if(this.paused){cancelAnimationFrame(this.raf);this.raf=0;}else if(this.active&&!this.raf)this.raf=requestAnimationFrame(this._tick);return this;};
  Scene.prototype.setActive=function(value){this.active=!!value;this.last=0;if(!this.active){cancelAnimationFrame(this.raf);this.raf=0;}else if(!this.paused&&!this.raf)this.raf=requestAnimationFrame(this._tick);return this;};
  Scene.prototype.reset=function(){this.setExit(0);this.exit=0;this.time=this.travel=this.gaitTime=0;this.markerArmed=false;this.markerPoint=this.markerFootPoint=null;this.eventTime=this.contactTravel=this.revealReadyAt=undefined;this.markerUniform.value=0;if(this.flower)this.flower.visible=false;this.progress=this.targetProgress=0;this.lastPrintDistance=this.printIndex=0;this.render();return this;};
  Scene.prototype.resize=function(){var box=this.container.getBoundingClientRect();this.width=Math.max(1,box.width);this.height=Math.max(1,box.height);this.renderer.setPixelRatio(Math.min(global.devicePixelRatio||1,1.5));this.renderer.setSize(this.width,this.height,false);this.render();};
  Scene.prototype.destroy=function(){this.destroyed=true;cancelAnimationFrame(this.raf);if(this.observer)this.observer.disconnect();else global.removeEventListener('resize',this.resize);if(this.rig)this.rig.dispose();this.resources.forEach(function(r){r.dispose();});this.renderer.dispose();this.renderer.domElement.remove();};
  /* v8 story layer. Earlier helpers are retained for the authored painting,
   * material ownership and the optional v5 rig adapter. No v7 file is loaded.
   * Encounter: 1.4s approach, then look/lower/reach/stow over 3.5s.
   * Exit: close drop, visible contact, perspective road, one growing plant.
   */
  var paintingInit=Scene.prototype._init,paintingReset=Scene.prototype.reset;
  Scene.prototype._init=function(){
    paintingInit.call(this);this.markerSpec.height=28;this.storyExitDuration=9.5;
    this.footShadows=[];
    for(var i=0;i<2;i++){var mesh=new T.Mesh(this._own(new T.CircleGeometry(2.1,18)),this._own(new T.MeshBasicMaterial({color:'#263b50',transparent:true,opacity:0,depthWrite:false})));mesh.scale.set(1,.32,1);mesh.renderOrder=19;this.scene.add(mesh);this.footShadows.push(mesh);}
    this.shadow.material.opacity=.08;this.seed.scale.setScalar(1.35);
    this._makePlant();
  };
  Scene.prototype._makePlant=function(){
    this.plant=new T.Group();this.plant.visible=false;this.scene.add(this.plant);
    var points=[V(0,0),V(.6,6),V(-.2,13),V(1.1,20),V(.4,29)];
    this.stemCurve=new T.CatmullRomCurve3(points);this.stemGeometry=this._own(new T.TubeGeometry(this.stemCurve,48,.31,5,false));
    this.stem=new T.Mesh(this.stemGeometry,this._own(new T.MeshBasicMaterial({color:'#69735c',side:T.DoubleSide,depthWrite:false})));this.stem.renderOrder=31;this.plant.add(this.stem);
    var outer=new T.Mesh(this._own(new T.TubeGeometry(this.stemCurve,48,.46,5,false)),this._own(new T.MeshBasicMaterial({color:'#3d4639',side:T.DoubleSide,depthWrite:false})));outer.position.z=-.002;outer.renderOrder=30;this.plant.add(outer);this.stemOutline=outer;
    this.leaves=[];this.petals=[];
    this._image(this.options.markerUrl||'flower-stone-v1.png',function(texture){
      var leafTexture=this._own(texture.clone());leafTexture.repeat.set(195/1536,171/1024);leafTexture.offset.set(886/1536,1-518/1024);leafTexture.needsUpdate=true;
      for(var side=0;side<2;side++){
        var group=new T.Group(),geometry=this._own(new T.PlaneGeometry(13,11.4));geometry.translate(-5.05,4.3,0);
        var leaf=new T.Mesh(geometry,this._own(new T.MeshBasicMaterial({map:leafTexture,transparent:true,alphaTest:.04,depthWrite:false,toneMapped:false})));leaf.renderOrder=33+side;group.add(leaf);group.position.set(.3,side?19:12,.02);this.plant.add(group);this.leaves.push(group);
      }
      var gold=this._own(texture.clone());gold.repeat.set(30/1536,38/1024);gold.offset.set(988/1536,1-195/1024);gold.needsUpdate=true;
      this.bloom=new T.Group();this.bloom.position.set(.4,29,.04);this.plant.add(this.bloom);
      for(var i=0;i<5;i++){
        var petalShape=new T.Shape();petalShape.moveTo(0,0);petalShape.bezierCurveTo(-2.8,1.5,-3.3,6.2,-.3,8.3);petalShape.bezierCurveTo(2.1,8.1,3.2,3.7,0,0);
        var petalGeometry=this._own(new T.ShapeGeometry(petalShape,14));petalGeometry.computeBoundingBox();var petalBounds=petalGeometry.boundingBox,petalPositions=petalGeometry.attributes.position,petalUv=petalGeometry.attributes.uv;for(var v=0;v<petalPositions.count;v++)petalUv.setXY(v,(petalPositions.getX(v)-petalBounds.min.x)/(petalBounds.max.x-petalBounds.min.x),(petalPositions.getY(v)-petalBounds.min.y)/(petalBounds.max.y-petalBounds.min.y));petalUv.needsUpdate=true;
        var petal=new T.Mesh(petalGeometry,this._own(new T.MeshBasicMaterial({map:gold,color:i%2?'#ebbd4f':'#e5ae37',side:T.DoubleSide,transparent:true,alphaTest:.015,depthWrite:false,toneMapped:false})));petal.renderOrder=36+i;this.bloom.add(petal);this.petals.push(petal);
      }
      var centre=new T.Mesh(this._own(new T.CircleGeometry(1.25,13)),this._own(new T.MeshBasicMaterial({color:'#695137',side:T.DoubleSide,depthWrite:false})));centre.position.set(0,1.25,.08);centre.renderOrder=45;this.bloom.add(centre);this.bloomCentre=centre;
    });
  };
  Scene.prototype._reveal=function(){return smooth((this.progress-.52)/.48);};
  Scene.prototype._exitAge=function(){return !this.exitStart?0:this.reducedMotion?this.storyExitDuration*this.exit:Math.max(0,this.time-this.exitBegan);};
  Scene.prototype._exitPhase=function(){return clamp(this._exitAge()/this.storyExitDuration,0,1);};
  Scene.prototype._perspectiveParameters=function(){
    var height=this.viewHeight||470,aspect=this.width/this.height,delta=V(height*aspect*.36,height*.28),depth=delta.length();
    this.forward=delta.clone().normalize();this.forwardNormal=V(-this.forward.y,this.forward.x);this.forwardDepth=depth;
  };
  Scene.prototype._projectionScale=function(relative){var depth=this.forwardDepth||300;return relative>=0?depth/(depth+relative):Math.min(2.4,Math.sqrt(1-relative/220));};
  Scene.prototype._roadCurve=function(distance){var seeded=-8*smooth(distance/90)*(1-smooth((distance-90)/200));return 11*Math.sin(distance/330)+4*Math.sin(distance/620)+seeded;};
  Scene.prototype._lane=function(distance){return 17*Math.sin(PI*clamp((distance-5)/42,0,1));};
  Scene.prototype._perspectivePoint=function(distance,side){
    var travelled=this.exitDistance||0,relative=distance-travelled,depth=this.forwardDepth||300,scale=this._projectionScale(relative),along=relative>=0?depth*relative/(depth+relative):relative*(1-relative/1000),lateral=(this._roadCurve(distance)-this._roadCurve(travelled)-this._lane(travelled)+(side||0))*scale;
    return this.exitStart.clone().addScaledVector(this.forward,along).addScaledVector(this.forwardNormal,lateral);
  };
  Scene.prototype._camera=function(point,reveal,exitPhase){
    var aspect=this.width/this.height,close=smooth((this.progress-.12)/.13)*(1-reveal),nearHeight=mix(500,235,close),height=nearHeight,figure=48,target=point.clone().add(V(0,24));
    if(reveal>0&&!this.exitStart){
      var bounds=[V(28,-95),V(1518,-95),V(1518,-932),V(28,-932)].map(this._transform.bind(this)),minX=Infinity,maxX=-Infinity;
      for(var b=0;b<bounds.length;b++){minX=Math.min(minX,bounds[b].x);maxX=Math.max(maxX,bounds[b].x);}
      var width=maxX-minX,minHeight=width/(aspect*.85),maxHeight=width/(aspect*.70),far=width/(aspect*.78),farTarget,needed;
      for(var iteration=0;iteration<4;iteration++){
        var body=point.clone().add(V(0,Math.max(48,far*.05)*.5));farTarget=body.clone().lerp(center(),.55);farTarget.x=clamp(farTarget.x,body.x-far*aspect*.115,body.x+far*aspect*.115);farTarget.y=clamp(farTarget.y,body.y-far*.115,body.y+far*.115);needed=minHeight;
        for(var i=0;i<bounds.length;i++){var offset=bounds[i].clone().sub(farTarget);needed=Math.max(needed,offset.y>0?offset.y/.43:-offset.y/.32,Math.abs(offset.x)/(aspect*.46));}far=clamp(needed,minHeight,maxHeight);
      }
      height=mix(nearHeight,far,reveal);figure=mix(48,Math.max(48,height*.05),reveal);var currentBody=point.clone().add(V(0,figure*.5));target=currentBody.clone().lerp(farTarget,reveal);target.x=clamp(target.x,currentBody.x-height*aspect*.115,currentBody.x+height*aspect*.115);target.y=clamp(target.y,currentBody.y-height*.115,currentBody.y+height*.115);
    }
    if(this.exitStart){
      var age=this._exitAge(),inward=smooth(age/.95),outward=smooth((age-3.0)/3.0),storyHeight=mix(235,470,outward);height=mix(this.exitCameraHeight||nearHeight,storyHeight,inward);figure=mix(this.exitFigureHeight||48,48,inward);target=(this.exitCameraTarget||point.clone().add(V(0,24))).clone().lerp(point.clone().add(V(0,24)),inward);
      if(this.seedScreenPoint&&age>1.6&&age<3.3){var follow=smooth((age-1.6)/.4)*(1-smooth((age-2.9)/.4));target.lerp(this.seedScreenPoint.clone().add(V(0,13)),follow*.24);}
    }
    this.viewHeight=height;this.figureHeight=figure;this.cameraTarget=target.clone();this.camera.position.set(target.x,target.y,50);this.camera.lookAt(target.x,target.y,0);this.camera.left=-height*aspect*.5;this.camera.right=height*aspect*.5;this.camera.top=height*.5;this.camera.bottom=-height*.5;this.camera.updateProjectionMatrix();
    if(this.exitStart)this._perspectiveParameters();
  };
  Scene.prototype._eventPose=function(age,point,flowerOrigin){
    var pose={speed:.8,lockFeet:0},target;
    if(age>=0&&age<3.5&&!this.exitStart){
      pose.speed=0;pose.lockFeet=1;pose.look=smooth(age/.35)*(1-smooth((age-3.0)/.5));pose.crouch=smooth((age-.65)/.45)*(1-smooth((age-2.35)/.6));pose.reach=smooth((age-1.25)/.65)*(1-smooth((age-2.65)/.45));pose.carry=smooth((age-2.05)/.7)*(1-smooth((age-3.05)/.45));pose.nod=Math.sin(PI*clamp((age-3.0)/.5,0,1))*.8;
      if(age<2.05)target=flowerOrigin;else{var bag=this.lastBag||point.clone().add(V(-6,25));target=flowerOrigin.clone().lerp(bag,smooth((age-2.05)/.75));}
    }
    if(this.exitStart){
      var t=this._exitAge(),confirm=smooth((t-6.9)/.25)*(1-smooth((t-8.0)/.35));pose.speed=t<4.75||confirm>.1?0:.8;pose.lockFeet=pose.speed===0?1:0;pose.look=smooth((t-.75)/.3)*(1-smooth((t-3.1)/.4));pose.drop=smooth((t-.85)/.5)*(1-smooth((t-2.2)/.55));pose.carry=smooth(t/.3)*(1-smooth((t-.65)/.5));pose.crouch=pose.drop*.3;pose.lookBack=confirm*.9;pose.nod=Math.sin(PI*clamp((t-7.1)/.9,0,1))*.85;
      if(t<2.55){var dropTarget=point.clone().add(V(this.figureHeight*.24*this.facing,this.figureHeight*.34));target=(this.lastBag||point.clone().add(V(-6,25))).clone().lerp(dropTarget,smooth((t-.55)/.8));}else if(confirm>.1&&this.plantScreenPoint)target=this.plantScreenPoint.clone().add(V(0,20));
    }
    if(target){pose.handTarget=this._handTarget(target,point);pose.lookTarget=pose.handTarget;}pose.targetSide='left';return pose;
  };
  Scene.prototype._renderFootShadows=function(point){
    var feet=this.rig&&this.rig.getFootContacts?this.rig.getFootContacts():[],scale=this.rig?this.figureHeight/this.rig.height:1;
    for(var i=0;i<this.footShadows.length;i++){var foot=feet[i],shadow=this.footShadows[i];shadow.visible=!!foot;if(!foot)continue;var weight=typeof foot.stance==='boolean'?(foot.stance?1:0):foot.stance;shadow.position.set(point.x+foot.x*scale*this.facing+1,point.y+.3,3.8);shadow.scale.set(this.figureHeight/48,.32*this.figureHeight/48,1);shadow.material.opacity=.32*clamp(weight||0,0,1);}
  };
  Scene.prototype._renderPlant=function(age){
    if(!this.exitStart)return;var seedDistance=20,point=this._perspectivePoint(seedDistance),relative=seedDistance-this.exitDistance,scale=this._projectionScale(relative);this.plantScreenPoint=point.clone();this.plant.visible=age>=2.7;this.plant.position.set(point.x,point.y,4);this.plant.scale.setScalar(scale);
    var stem=smooth((age-2.95)/1.35),leaves=smooth((age-4.05)/1.4),flower=smooth((age-5.25)/1.55);this.stem.geometry.setDrawRange(0,Math.floor(48*stem)*5*6);this.stemOutline.geometry.setDrawRange(0,Math.floor(48*stem)*5*6);
    for(var i=0;i<this.leaves.length;i++){var progress=smooth((age-4.0-i*.35)/1.15),leaf=this.leaves[i];leaf.visible=progress>0;leaf.scale.set((i?-1:1)*Math.max(.001,progress),Math.max(.001,progress),1);leaf.rotation.z=(i?-.35:.15)+(1-progress)*(i?-.85:.85);}
    if(this.bloom){this.bloom.visible=flower>0;for(var p=0;p<this.petals.length;p++){var petal=this.petals[p],opening=smooth((age-5.25-p*.08)/1.1);petal.rotation.z=mix(0,(p-2)*.52,opening);petal.rotation.y=(1-opening)*1.38;petal.scale.setScalar(mix(.15,1,opening));}if(this.bloomCentre)this.bloomCentre.scale.setScalar(Math.max(.01,flower));}
  };
  Scene.prototype._renderExit=function(phase,point){
    if(!this.exitStart)return;var age=this._exitAge(),land=this._perspectivePoint(20),released=age>=1.65,drop=smooth((age-1.65)/1.05);this.seedScreenPoint=land.clone();
    if(released&&!this.seedReleased){this.seedReleased=true;this.seedReleasePoint=(this.lastHand||this.lastBag||point.clone().add(V(10,18))).clone();}
    this.seed.visible=released;var origin=this.seedReleasePoint||this.lastHand||point;this.seed.position.copy(origin.clone().lerp(land,drop));this.seed.position.y+=Math.sin(PI*drop)*8;this.seed.position.z=8;this.seed.rotation.z=drop*1.1;
    var paper=smooth((age-3.25)/1.35),front=mix(20,this.exitDistance+8000,smooth((age-2.95)/1.6)),back=mix(20,this.exitDistance-500,smooth((age-2.95)/.9)),nearEnd=Math.min(this.exitDistance+300,front),positions=this.exitGeometry.attributes.position,uv=this.exitGeometry.attributes.uv,golden=this.goldenGeometry.attributes.position;
    this.exitPaper.visible=paper>0;this.goldenLine.visible=age>2.95;this.goldenLine.material.opacity=.9*(1-smooth((age-4.65)/1.0));
    for(var j=0;j<=this.exitSteps;j++){
      var fraction=j/this.exitSteps,distance=fraction<.6?mix(back,nearEnd,fraction/.6):mix(nearEnd,front,Math.pow((fraction-.6)/.4,1.5)),p=this._perspectivePoint(distance),cross=this.forwardNormal,projected=this._projectionScale(distance-this.exitDistance),left=(58+3*Math.sin(distance/115))*projected*paper,right=(55+2.7*Math.sin(distance/137+.8))*projected*paper;
      positions.setXYZ(j*2,p.x-cross.x*left,p.y-cross.y*left,2.4);positions.setXYZ(j*2+1,p.x+cross.x*right,p.y+cross.y*right,2.4);uv.setXY(j*2,0,distance/460);uv.setXY(j*2+1,1,distance/460);
      var trail=this._perspectivePoint(mix(back,front,fraction));golden.setXYZ(j,trail.x,trail.y,2.7);
    }
    positions.needsUpdate=true;uv.needsUpdate=true;golden.needsUpdate=true;this.exitGeometry.computeBoundingSphere();this.goldenGeometry.computeBoundingSphere();
    if(this.exitDistance-this.lastPrintDistance>4.0&&age>4.75){this.lastPrintDistance=this.exitDistance;var print=this.prints[this.printIndex++%this.prints.length];print.distance=this.exitDistance-2.5;print.side=this._lane(print.distance)+(this.printIndex%2?1:-1)*2.3;print.born=this.time;print.mesh.visible=true;}
    this.prints.forEach(function(print){var elapsed=this.time-print.born;if(!print.mesh.visible)return;var at=this._perspectivePoint(print.distance,print.side),t=this._perspectivePoint(print.distance+.1,print.side).sub(at).normalize(),scale=this._projectionScale(print.distance-this.exitDistance);print.mesh.position.set(at.x,at.y,2.8);print.mesh.rotation.z=Math.atan2(t.y,t.x)-PI*.5;print.mesh.scale.setScalar(scale);print.mesh.material.opacity=.23*smooth((elapsed-.2)/.35)*(1-smooth((elapsed-12)/8));if(elapsed>20)print.mesh.visible=false;},this);
    this._renderPlant(age);
  };
  Scene.prototype.render=function(){
    if(this.destroyed||!this.renderer)return;var reveal=this._reveal(),rawPoint=this._point(this.travel),rawTangent=this._tangent(this.travel);this.worldAngle=this.exitStart?this.exitWorldAngle:mix(PI*.04,0,reveal);this.world.rotation.z=this.worldAngle;
    var c=Math.cos(this.worldAngle),s=Math.sin(this.worldAngle),base=V(768-(768*c+512*s),-512-(768*s-512*c)),age=this._exitAge(),scale=this.exitStart?mix(1,.18,smooth(age/1.4)):1,retreat=this.exitStart?240*smooth(age/1.6)+this.exitDistance:0;
    if(this.exitStart)base.multiplyScalar(scale).addScaledVector(this.exitStart,1-scale).addScaledVector(this.exitDirection,-retreat);this.world.scale.setScalar(scale);this.world.position.copy(base);
    var point=this.exitStart?this.exitStart.clone():this._transform(rawPoint),tangent=this.exitStart?this.exitDirection:rawTangent.clone().applyAxisAngle(V(0,0,1),this.worldAngle);this._camera(point,reveal,this._exitPhase());
    this.walkerRoot.position.set(point.x,point.y,5);this.walkerRoot.scale.setScalar(this.rig?this.figureHeight/this.rig.height:1);this.shadow.position.set(point.x+2,point.y-.6,2);this.shadow.scale.setScalar(this.figureHeight/48);
    var markerFacing=this.markerFacing||1,flowerLocal=this.markerFlowerLocal||V(9.23,25.51),markerPosition=this.markerFootPoint?this._transform(this.markerFootPoint).add(V((12-flowerLocal.x)*markerFacing,5)):point.clone(),flowerOrigin=markerPosition.clone().add(V(flowerLocal.x*markerFacing,flowerLocal.y));
    if(this.exitStart)markerPosition.sub(this.exitStart).multiplyScalar(scale).add(this.exitStart).addScaledVector(this.exitDirection,-retreat);this.markerGroup.position.set(markerPosition.x,markerPosition.y,3);this.markerGroup.scale.set(markerFacing*scale,scale,scale);this.markerGroup.visible=!!this.markerArmed;if(this.marker)this.marker.material.opacity=smooth((this.time-(this.markerBornAt||0))/.35);
    var eventAge=this.eventTime===undefined?-1:this.time-this.eventTime;this.facing=this.exitStart?1:tangent.x>=0?1:-1;var pose=this._eventPose(eventAge,point,flowerOrigin);
    if(this.rig){this.rig.setFacing(this.facing);if(this.rig.version!==8)this._restoreArm();this.rig.update(this.gaitTime,pose.speed,pose);if(this.rig.version!==8)this._poseArmToTarget(pose.handTarget,pose.reach||0);}
    var hand=this._attachment('hand',point),bag=this._attachment('bag',point);this.lastHand=hand.clone();this.lastBag=bag.clone();this._renderFootShadows(point);
    if(this.flower){this.flower.visible=eventAge>=2.0;this.markerUniform.value=eventAge>=2.0?1:0;if(this.flower.visible){var carry=smooth((eventAge-2.65)/.55),flowerScale=mix(1,Math.max(.8,this.figureHeight*.15/(this.flowerWorldHeight||5)),carry);this.flower.position.copy(hand.clone().lerp(bag,carry));this.flower.position.z=7;this.flower.rotation.z=mix(.12,-.18,carry);this.flower.scale.set(flowerScale*markerFacing,flowerScale,1);}}
    this.quietUniforms.walker.value.set(rawPoint.x/1536,1+rawPoint.y/1024);this.quietUniforms.strength.value=.16*(1-reveal*.55)*(this.exitStart?0:1);this._renderTrace();this._renderExit(this._exitPhase(),point);
    this.container.dataset.cihouTravel=this.travel.toFixed(2);this.container.dataset.cihouExitDistance=(this.exitDistance||0).toFixed(2);this.container.dataset.cihouEvent=eventAge>=3.5?'carried':eventAge>=2.0?'in-hand':eventAge>=1.25?'reaching':eventAge>=.65?'lowering':eventAge>=0?'looking':this.markerArmed?'approaching':'waiting';this.container.dataset.cihouShot=this.exitStart?'forward-road':reveal>0?'overview':closeShot(this.progress)?'flower-close':'walking';
    this.renderer.render(this.scene,this.camera);
  };
  function closeShot(progress){return progress>.17&&progress<.57;}
  Scene.prototype._advance=function(dt){
    var remaining=dt;while(remaining>0){var step=Math.min(1/30,remaining);remaining-=step;this.time+=step;var age=this.eventTime===undefined?-1:this.time-this.eventTime,walking=!(age>=0&&age<3.5),speed=10;
      if(this.exitStart){var t=this._exitAge();walking=t>4.75&&!(t>6.9&&t<8.3);if(walking)this.exitDistance+=speed*step;}
      else if(walking){this.travel+=speed*step;if(this.markerArmed&&this.eventTime===undefined&&this.travel>=this.markerDistance-10){this.travel=this.markerDistance-10;this.eventTime=this.time;this.contactTravel=this.travel;this.gaitTime=Math.round(this.gaitTime*.92)/.92;if(this.options.onEvent)this.options.onEvent('flower-contact');}}
      if(walking)this.gaitTime+=step*speed/((this.figureHeight||48)*.173*.92/.62);
    }
  };
  Scene.prototype.setInteraction=function(value){this.targetInteraction=clamp(Number(value)||0,0,1);if(this.targetInteraction>0&&!this.markerArmed&&!this.exitStart){this.markerArmed=true;this.markerBornAt=this.time;this.markerDistance=this.travel+24;this.markerPoint=this._point(this.markerDistance);this.markerFootPoint=this._point(this.markerDistance-10);var tangent=this._tangent(this.markerDistance-10).applyAxisAngle(V(0,0,1),PI*.04);this.markerFacing=tangent.x>=0?1:-1;if(this.reducedMotion){this.eventTime=this.time-3.5;this.contactTravel=this.travel;}}return this;};
  Scene.prototype.setExit=function(value){value=clamp(Number(value)||0,0,1);if(value>0&&!this.exitStart){this.exitStart=this._transform(this._point(this.travel));this.exitDirection=V(Math.cos(PI*.205),Math.sin(PI*.205));this.exitWorldAngle=this.worldAngle;this.exitBegan=this.time;this.exitDistance=0;this.seedReleased=false;this.seedReleasePoint=null;this.exitCameraHeight=this.viewHeight;this.exitFigureHeight=this.figureHeight;this.exitCameraTarget=this.cameraTarget?this.cameraTarget.clone():this.exitStart.clone().add(V(0,24));this.gaitTime=Math.round(this.gaitTime*.92)/.92;}if(value===0&&this.exitStart){this.exitStart=null;this.exitDistance=0;this.exitPaper.visible=this.goldenLine.visible=this.seed.visible=this.plant.visible=false;this.prints.forEach(function(print){print.mesh.visible=false;print.born=-100;});}this.targetExit=value;if(this.reducedMotion){this.exit=value;this.exitDistance=value>0?35.5:0;this.render();}return this;};
  Scene.prototype.reset=function(){paintingReset.call(this);this.seedReleased=false;this.seedReleasePoint=this.seedScreenPoint=this.plantScreenPoint=null;if(this.plant)this.plant.visible=false;return this;};
  global.CihouHeroSceneV8=Scene;
})(window);

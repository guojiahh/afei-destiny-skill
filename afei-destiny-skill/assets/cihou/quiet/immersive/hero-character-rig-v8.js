/* Original hand-painted paper-puppet rig. Three.js r160 compatible.
 * CihouCharacterRigV8.create({atlasUrl, metadata, height:.8}) -> Promise<Rig>
 * rig.group: THREE.Group, anchored at the ground between the feet.
 * rig.update(gaitTimeSeconds, speed=1, event={}): deterministic acting + gait.
 * event: reach, look, crouch, carry, drop, nod, lockFeet in [0,1]; lookBack [-1,1].
 * handTarget / lookTarget: unmirrored rig-local [x,y] or {x,y}; feet at y=0.
 * targetSide: left (front painted arm, default) or right. setFacing mirrors all.
 * getAttachment: hand, leftHand, rightHand, bag (actual painted bag opening),
 * head, neck, hip, leftFoot, rightFoot, leftKnee, rightKnee.
 * getFootContacts: local actual alpha-bottom points + continuous stance weights.
 * Caller freezes gaitTime during acting; event motion never advances its own clock.
 * Caller advances the gait clock continuously; speed controls stride / cloth energy.
 * All contact calculations use actual heel / toe coordinates from the metadata.
 */
(function(global){
  'use strict';
  var T=global.THREE,TAU=Math.PI*2;
  var clamp=function(x,a,b){return Math.max(a,Math.min(b,x));};
  var smooth=function(x){x=clamp(x,0,1);return x*x*(3-2*x);};
  var mix=function(a,b,t){return a+(b-a)*t;};
  var rotate=function(v,a){var c=Math.cos(a),s=Math.sin(a);return new T.Vector2(v.x*c-v.y*s,v.x*s+v.y*c);};
  var pair=function(x){return new T.Vector2(Number(x[0]),Number(x[1]));};
  var defaults={head:0,torso:1,leftArm:2,rightArm:3,leftThigh:4,leftShin:5,rightThigh:6,rightShin:7};
  function Rig(options){
    if(!T)throw new Error('CihouCharacterRig requires Three.js');
    this.version=8;this.isV8=true;this.options=options||{};this.height=this.options.height||.8;this.group=new T.Group();this.group.name='cihou-acting-walker-v8';
    this.resources=[];this.parts={};this.feet=[];this.ready=this._load();
  }
  Rig.create=function(options){var rig=new Rig(options);return rig.ready.then(function(){return rig;});};
  Rig.prototype._own=function(item){this.resources.push(item);return item;};
  Rig.prototype._load=function(){
    var self=this;
    var metadata=this.options.metadata;
    var metaPromise=typeof metadata==='object'?Promise.resolve(metadata):fetch(this.options.metadataUrl||metadata).then(function(r){if(!r.ok)throw new Error('rig metadata '+r.status);return r.json();});
    return metaPromise.then(function(meta){self.meta=JSON.parse(JSON.stringify(meta));self.meta.coordinateSpace=self.meta.coordinateSpace||'atlas';if(self.meta.parts.dress&&!self.meta.parts.torso){self.meta.parts.torso=self.meta.parts.dress;self.meta.parts.torso.pivotPx=self.meta.parts.dress.shoulderCenterPx||self.meta.parts.dress.pivotPx;}var d=self.meta.dimensionsRelativeToStandingHeight||{};self.meta.proportions=self.meta.proportions||Object.assign({},d,{torsoHeight:d.dressHeight,hipWidth:d.hipSeparation,shoulderWidth:d.shoulderSeparation,armLength:(d.upperArmLength||.14)+(d.forearmLength||.135)});return new Promise(function(resolve,reject){var image=new Image();image.onload=function(){self.image=image;resolve();};image.onerror=function(){reject(new Error('rig atlas could not load'));};image.src=self.options.atlasUrl||meta.atlasUrl||meta.atlas;});}).then(function(){
      var texture=self._own(new T.Texture(self.image));texture.colorSpace=T.SRGBColorSpace;texture.minFilter=texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;self.texture=texture;try{var analysis=document.createElement('canvas');analysis.width=self.image.width;analysis.height=self.image.height;var ctx=analysis.getContext('2d',{willReadFrequently:true});ctx.drawImage(self.image,0,0);self.alphaPixels=ctx.getImageData(0,0,self.image.width,self.image.height).data;}catch(error){self.alphaPixels=null;}
      self.material=self._own(new T.MeshBasicMaterial({map:texture,transparent:true,alphaTest:(self.meta.recommendedAlphaTest||.03),depthWrite:false,side:T.DoubleSide,toneMapped:false}));
      self._build();self.loaded=true;self.update(0,1);return self;
    });
  };
  Rig.prototype._point=function(meta,key,fallback){
    var raw=meta[key]||(meta.joints&&meta.joints[key])||fallback,point=pair(raw),space=meta.coordinateSpace||this.meta.coordinateSpace||'rect';
    if(space==='atlas'){point.x-=meta.sourceRect[0];point.y-=meta.sourceRect[1];}
    if(space==='cell'){point.x+=(meta.cellOrigin||[0,0])[0]-meta.sourceRect[0];point.y+=(meta.cellOrigin||[0,0])[1]-meta.sourceRect[1];}
    return point;
  };
  Rig.prototype._part=function(name,length,bone){
    var meta=this.meta.parts[name];if(!meta)throw new Error('Missing rig part '+name);
    if(!Array.isArray(meta.sourceRect))throw new Error('Missing sourceRect for '+name);
    var rect=meta.sourceRect,w=rect[2],h=rect[3],pivot=this._point(meta,'pivotPx',[w*.5,h*.13]);
    var end=this._point(meta,'endPx',meta.anklePx||meta.kneePx||meta.handPx||[w*.5,h*.83]);
    var scale=length/(bone?Math.max(1,pivot.distanceTo(end)):h);
    var axis=new T.Vector2(end.x-pivot.x,pivot.y-end.y).normalize(),widthScale=meta.widthScale||(name.indexOf('Thigh')>=0?.43:1);
    var geometry=this._own(new T.PlaneGeometry(w*scale,h*scale,18,24)),positions=geometry.attributes.position,uv=geometry.attributes.uv,base=[];
    for(var i=0;i<positions.count;i++){
      var sourceX=(positions.getX(i)/(w*scale)+.5)*w,sourceY=(.5-positions.getY(i)/(h*scale))*h;
      var x=(sourceX-pivot.x)*scale,y=(pivot.y-sourceY)*scale;if(bone&&widthScale!==1){var along=x*axis.x+y*axis.y,across=-x*axis.y+y*axis.x;x=along*axis.x-across*axis.y*widthScale;y=along*axis.y+across*axis.x*widthScale;}positions.setXYZ(i,x,y,0);base.push(x,y);
      uv.setXY(i,(rect[0]+sourceX)/this.image.width,1-(rect[1]+sourceY)/this.image.height);
    }
    positions.needsUpdate=true;uv.needsUpdate=true;
    var mesh=new T.Mesh(geometry,this.material);mesh.name=name;mesh.frustumCulled=false;this.group.add(mesh);
    var vector=new T.Vector2((end.x-pivot.x)*scale,(pivot.y-end.y)*scale);
    var part={name:name,meta:meta,mesh:mesh,base:base,scale:scale,pivot:pivot,end:end,vector:vector,sourceAngle:Math.atan2(vector.y,vector.x),length:vector.length()};
    if(meta.bagBBoxPx){var box=meta.bagBBoxPx,corner=this._point(meta,'_bagCorner',[box[0],box[1]]);part.bagRect={x:corner.x,y:corner.y,w:box[2],h:box[3]};}
    this.parts[name]=part;return part;
  };
  Rig.prototype._build=function(){
    var h=this.height,m=this.meta.proportions||{};
    this.thighLength=h*(m.thighLength||.215);this.shinLength=h*(m.shinLength||.215);
    this.hipHeight=h*(m.hipHeight||.415);this.hipWidth=h*(m.hipWidth||.070);
    this.shoulderHeight=h*(m.shoulderHeight||.705);this.shoulderWidth=h*(m.shoulderWidth||.19);
    this.neckHeight=h*(m.neckHeight||.795);
    this._part('head',h*(m.headHeight||.265),false);
    this._part('torso',h*(m.torsoHeight||.43),false);
    this._part('leftArm',h*(m.armLength||.31),true);this._part('rightArm',h*(m.armLength||.31),true);
    this._part('leftThigh',this.thighLength,true);this._part('rightThigh',this.thighLength,true);
    this._part('leftShin',this.shinLength,true);this._part('rightShin',this.shinLength,true);
    // The metadata's heel and toe remain independent of the shin rotation. The
    // lower-leg mesh is skinned across the ankle, allowing the sole to stay flat.
    ['leftShin','rightShin'].forEach(function(name){
      var part=this.parts[name],meta=part.meta,rect=meta.sourceRect;
      var ankle=this._point(meta,'anklePx',meta.endPx||[rect[2]*.45,rect[3]*.78]);
      var heel=this._point(meta,'heelPx',[rect[2]*.32,rect[3]*.94]);
      var toe=this._point(meta,'toePx',[rect[2]*.80,rect[3]*.94]);
      part.ankle=new T.Vector2((ankle.x-part.pivot.x)*part.scale,(part.pivot.y-ankle.y)*part.scale);
      part.heel=new T.Vector2((heel.x-ankle.x)*part.scale,(ankle.y-heel.y)*part.scale);
      part.toe=new T.Vector2((toe.x-ankle.x)*part.scale,(ankle.y-toe.y)*part.scale);
      part.footSourceAngle=Math.atan2(part.toe.y-part.heel.y,part.toe.x-part.heel.x);
      part.sourceAngle=Math.atan2(part.ankle.y,part.ankle.x);part.length=part.ankle.length();
      part.contactContour=[];if(this.alphaPixels){var pixels=this.alphaPixels,imgWidth=this.image.width;for(var xx=0;xx<rect[2];xx+=2){for(var yy=rect[3]-1;yy>ankle.y+5;yy--){var alpha=pixels[((rect[1]+yy)*imgWidth+rect[0]+xx)*4+3];if(alpha>32){part.contactContour.push(new T.Vector2((xx-ankle.x)*part.scale,(ankle.y-yy)*part.scale));break;}}}}
      if(!part.contactContour.length)part.contactContour=[part.heel,part.toe];
    },this);
    var order={rightArm:0,rightThigh:1,rightShin:2,leftThigh:3,leftShin:4,torso:5,leftArm:6,head:7};
    Object.keys(this.parts).forEach(function(name){var mesh=this.parts[name].mesh;mesh.renderOrder=50+order[name];mesh.position.z=order[name]*.0008;},this);
    // A paper-puppet head has a second profile, made from the same original
    // painting. A short crossfade is clearer than narrowing a flat head to an
    // edge-on sliver; both profiles stay anchored at the exact painted neck.
    var frontHead=this.parts.head.mesh;frontHead.material=this._own(this.material.clone());
    this.headBackMesh=new T.Mesh(frontHead.geometry,this._own(this.material.clone()));
    this.headBackMesh.name='head-backward-profile';this.headBackMesh.frustumCulled=false;this.headBackMesh.renderOrder=frontHead.renderOrder+.01;this.headBackMesh.scale.x=-1;this.headBackMesh.visible=false;this.group.add(this.headBackMesh);
  };
  // Each source silhouette sample is retained in atlas coordinates. Contact
  // shadows can therefore be placed under the painted sole, rather than under
  // an inferred ankle or a large generic ellipse.
  Rig.prototype._foot=function(phase,stride,lift,part,lockFeet){
    var duty=.62,isStance=phase<duty,q=isStance?phase/duty:(phase-duty)/(1-duty);
    var x=isStance?mix(stride*.5,-stride*.5,q):mix(-stride*.5,stride*.5,smooth(q));
    var angle=isStance?(q<.08?mix(.035,0,q/.08):q>.92?mix(0,-.055,(q-.92)/.08):0):mix(-.075,.035,smooth(q));
    angle*=1-lockFeet;
    var footRotation=angle-part.footSourceAngle,heel=rotate(part.heel,footRotation),toe=rotate(part.toe,footRotation);
    var soleLow=Infinity,lowest=part.heel,lowestRotated=heel;
    part.contactContour.forEach(function(point){var transformed=rotate(point,footRotation);if(transformed.y<soleLow){soleLow=transformed.y;lowest=point;lowestRotated=transformed;}});
    var swingLift=isStance?0:lift*Math.pow(Math.sin(Math.PI*q),1.2)*(1-lockFeet),y=-soleLow+swingLift;
    var support=isStance?smooth(q/.085)*(1-smooth((q-.91)/.09)):0;
    support=mix(support,1,lockFeet);
    return{x:x,y:y,angle:footRotation,isStance:isStance||lockFeet>.98,stance:support,phase:phase,heel:heel,toe:toe,contactX:lowestRotated.x,contactY:y+soleLow,sourceAlphaPoint:[part.meta.sourceRect[0]+part.ankle.x/part.scale+part.pivot.x+lowest.x/part.scale,part.meta.sourceRect[1]+part.pivot.y-part.ankle.y/part.scale-lowest.y/part.scale]};
  };
  Rig.prototype._leg=function(side,phase,speed,bob,pose){
    var upper=this.parts[side+'Thigh'],lower=this.parts[side+'Shin'],h=this.height;
    var stride=h*.173,lift=h*(.020+.006*speed),lockFeet=pose.lockFeet||0;
    var foot=this._foot(phase,stride,lift,lower,lockFeet),sideSign=side==='left'?1:-1;
    var hip=new T.Vector2(sideSign*this.hipWidth*.5+pose.hipX,this.hipHeight+bob-pose.sink),ankle=new T.Vector2(foot.x+sideSign*this.hipWidth*.5,foot.y);
    var dir=ankle.clone().sub(hip),distance=clamp(dir.length(),.0001,upper.length+lower.length-.000001);dir.normalize();
    var along=(upper.length*upper.length-lower.length*lower.length+distance*distance)/(2*distance),kneeBend=Math.sqrt(Math.max(0,upper.length*upper.length-along*along));
    var knee=hip.clone().addScaledVector(dir,along).add(new T.Vector2(-dir.y,dir.x).multiplyScalar(kneeBend));
    upper.mesh.position.set(hip.x,hip.y,upper.mesh.position.z);upper.mesh.rotation.z=Math.atan2(knee.y-hip.y,knee.x-hip.x)-upper.sourceAngle;
    var shinAngle=Math.atan2(ankle.y-knee.y,ankle.x-knee.x)-lower.sourceAngle;
    var pos=lower.mesh.geometry.attributes.position,a=lower.ankle,lenSq=a.lengthSq();
    for(var i=0;i<pos.count;i++){
      var vertex=new T.Vector2(lower.base[i*2],lower.base[i*2+1]),alongFraction=vertex.dot(a)/lenSq,weight=smooth((alongFraction-.66)/.36);
      // The atlas intentionally supplies a broad round knee. Slim only its
      // upper-shin silhouette; restore full transverse width before the ankle,
      // so the independently measured painted shoe remains physically intact.
      if(lower.meta.kneeWidthScale!==undefined){var axis=a.clone().normalize(),along=vertex.dot(axis),across=axis.x*vertex.y-axis.y*vertex.x,slim=mix(lower.meta.kneeWidthScale,1,smooth((alongFraction-(lower.meta.kneeSlimUntil||.55))/((lower.meta.kneeSlimEnd||.98)-(lower.meta.kneeSlimUntil||.55))));vertex.set(axis.x*along-axis.y*across*slim,axis.y*along+axis.x*across*slim);}
      var fromKnee=rotate(vertex,shinAngle).add(knee),fromFoot=rotate(vertex.clone().sub(a),foot.angle).add(ankle);
      pos.setXY(i,mix(fromKnee.x,fromFoot.x,weight),mix(fromKnee.y,fromFoot.y,weight));
    }
    pos.needsUpdate=true;lower.mesh.geometry.computeBoundingSphere();
    this.feet.push({side:side,x:ankle.x+foot.contactX,y:foot.contactY,z:.006,ankleX:ankle.x,ankleY:ankle.y,heelY:ankle.y+foot.heel.y,toeY:ankle.y+foot.toe.y,stance:foot.stance,isStance:foot.isStance,phase:phase,contactY:foot.contactY,sourceAlphaPoint:foot.sourceAlphaPoint});
    this.attachments[side+'Foot']=new T.Vector3(ankle.x+foot.contactX,foot.contactY,.006);
    this.attachments[side+'Knee']=new T.Vector3(knee.x,knee.y,.006);
  };
  Rig.prototype._cloth=function(part,phase,energy,kind){
    var pos=part.mesh.geometry.attributes.position,base=part.base;
    var minY=Infinity,maxY=-Infinity;for(var j=1;j<base.length;j+=2){minY=Math.min(minY,base[j]);maxY=Math.max(maxY,base[j]);}
    for(var i=0;i<pos.count;i++){
      var x=base[i*2],y=base[i*2+1],down=(maxY-y)/Math.max(.001,maxY-minY),weight=smooth((down-.35)/.65);
      var dx=kind==='hair'?Math.sin(phase-.85)*.006*energy*weight:Math.sin(phase-.62+down*.35)*.011*energy*weight;
      var dy=kind==='hair'?Math.cos(phase-.45)*.0025*energy*weight:Math.sin(phase*2-.8)*.0025*energy*weight;
      if(part.bagRect&&kind==='dress'){var box=part.bagRect,sx=x/part.scale+part.pivot.x,sy=part.pivot.y-y/part.scale;var bx=clamp(Math.min(sx-box.x,box.x+box.w-sx)/(box.w*.20),0,1),by=clamp(Math.min(sy-box.y,box.y+box.h-sy)/(box.h*.20),0,1);var bagWeight=bx*by;dx+=Math.sin(phase-.95)*.003*energy*bagWeight;dy+=Math.cos(phase-.65)*.0014*energy*bagWeight;}
      pos.setXY(i,x+dx,y+dy);
    }pos.needsUpdate=true;
  };
  Rig.prototype._target=function(target,fallback){
    if(Array.isArray(target))return new T.Vector2(Number(target[0])||0,Number(target[1])||0);
    if(target&&typeof target==='object')return new T.Vector2(Number(target.x)||0,Number(target.y)||0);
    return fallback.clone();
  };
  Rig.prototype._restoreArm=function(part,rotation){
    var positions=part.mesh.geometry.attributes.position;
    for(var i=0;i<positions.count;i++)positions.setXY(i,part.base[i*2],part.base[i*2+1]);
    positions.needsUpdate=true;part.mesh.rotation.z=rotation;
    return rotate(part.vector,rotation).add(new T.Vector2(part.mesh.position.x,part.mesh.position.y));
  };
  // A continuous two-bone deformation of the original one-piece painted arm.
  // The returned hand is the solved end effector, including reach clamping.
  Rig.prototype._armToTarget=function(part,target,reach,restRotation){
    var shoulder=new T.Vector2(part.mesh.position.x,part.mesh.position.y),direction=target.clone().sub(shoulder);
    var proportions=this.meta.dimensionsRelativeToStandingHeight||{},upper=this.height*(proportions.upperArmLength||.14),lower=this.height*(proportions.forearmLength||.135);
    var distance=clamp(direction.length(),Math.abs(upper-lower)+.0001,upper+lower-.0001);if(direction.lengthSq()<.000001)direction.set(0,-1);else direction.normalize();
    var along=(upper*upper+distance*distance-lower*lower)/(2*distance),bend=Math.sqrt(Math.max(0,upper*upper-along*along));
    var elbow=direction.clone().multiplyScalar(along).add(new T.Vector2(direction.y,-direction.x).multiplyScalar(bend)),end=direction.clone().multiplyScalar(distance),upperDirection=elbow.clone().normalize(),lowerDirection=end.clone().sub(elbow).normalize();
    var elbowPx=this._point(part.meta,'elbowPx'),sourceElbow=new T.Vector2((elbowPx.x-part.pivot.x)*part.scale,(part.pivot.y-elbowPx.y)*part.scale),sourceUpper=sourceElbow.clone().normalize(),sourceLower=part.vector.clone().sub(sourceElbow).normalize(),sourceUpperLength=sourceElbow.length(),sourceLowerLength=part.vector.clone().sub(sourceElbow).length();
    var positions=part.mesh.geometry.attributes.position;
    for(var i=0;i<positions.count;i++){
      var vertex=new T.Vector2(part.base[i*2],part.base[i*2+1]),fromElbow=vertex.clone().sub(sourceElbow);
      var upperAlong=vertex.dot(sourceUpper)*upper/sourceUpperLength,upperAcross=sourceUpper.x*vertex.y-sourceUpper.y*vertex.x,lowerAlong=fromElbow.dot(sourceLower)*lower/sourceLowerLength,lowerAcross=sourceLower.x*fromElbow.y-sourceLower.y*fromElbow.x;
      var fromUpper=upperDirection.clone().multiplyScalar(upperAlong).add(new T.Vector2(-upperDirection.y,upperDirection.x).multiplyScalar(upperAcross)),fromLower=elbow.clone().addScaledVector(lowerDirection,lowerAlong).add(new T.Vector2(-lowerDirection.y,lowerDirection.x).multiplyScalar(lowerAcross));
      var weight=smooth((vertex.dot(sourceElbow)/sourceElbow.lengthSq()-.78)/.44);fromUpper.lerp(fromLower,weight);
      var rest=rotate(vertex,restRotation);positions.setXY(i,mix(rest.x,fromUpper.x,reach),mix(rest.y,fromUpper.y,reach));
    }
    positions.needsUpdate=true;part.mesh.geometry.computeBoundingSphere();part.mesh.rotation.z=0;
    var restingHand=rotate(part.vector,restRotation),hand=restingHand.lerp(end,reach).add(shoulder);
    this.attachments[part.name.replace('Arm','Elbow')]=new T.Vector3(shoulder.x+elbow.x,shoulder.y+elbow.y,.014);
    return hand;
  };
  Rig.prototype._clothPoint=function(part,point,phase,energy,kind){
    var x=point.x,y=point.y,minY=Infinity,maxY=-Infinity;
    for(var j=1;j<part.base.length;j+=2){minY=Math.min(minY,part.base[j]);maxY=Math.max(maxY,part.base[j]);}
    var down=(maxY-y)/Math.max(.001,maxY-minY),weight=smooth((down-.35)/.65);
    var dx=kind==='hair'?Math.sin(phase-.85)*.006*energy*weight:Math.sin(phase-.62+down*.35)*.011*energy*weight;
    var dy=kind==='hair'?Math.cos(phase-.45)*.0025*energy*weight:Math.sin(phase*2-.8)*.0025*energy*weight;
    if(part.bagRect&&kind==='dress'){var box=part.bagRect,sx=x/part.scale+part.pivot.x,sy=part.pivot.y-y/part.scale,bx=clamp(Math.min(sx-box.x,box.x+box.w-sx)/(box.w*.20),0,1),by=clamp(Math.min(sy-box.y,box.y+box.h-sy)/(box.h*.20),0,1),bagWeight=bx*by;dx+=Math.sin(phase-.95)*.003*energy*bagWeight;dy+=Math.cos(phase-.65)*.0014*energy*bagWeight;}
    return new T.Vector2(x+dx,y+dy);
  };
  Rig.prototype._bagPoint=function(torso,phase,energy){
    var box=torso.bagRect||{x:torso.pivot.x-this.height*.13/torso.scale,y:torso.pivot.y+this.height*.15/torso.scale,w:0,h:0};
    var opening=torso.meta.bagOpeningPx?this._point(torso.meta,'bagOpeningPx'):new T.Vector2(box.x+box.w*.5,box.y+box.h*.20);
    var local=new T.Vector2((opening.x-torso.pivot.x)*torso.scale,(torso.pivot.y-opening.y)*torso.scale);
    local=this._clothPoint(torso,local,phase,energy,'dress');local=rotate(local,torso.mesh.rotation.z).add(new T.Vector2(torso.mesh.position.x,torso.mesh.position.y));
    return new T.Vector3(local.x,local.y,.018);
  };
  Rig.prototype.update=function(time,speed,event){
    if(!this.loaded)return this;event=event||{};speed=speed===undefined?1:clamp(speed,0,2);
    var h=this.height,clock=Math.max(0,time||0)*.92,cycle=clock%1,phase=clock*TAU;
    var reach=clamp(event.reach||0,0,1),look=clamp(event.look||0,0,1),crouch=clamp(event.crouch||0,0,1),carry=clamp(event.carry||0,0,1),drop=clamp(event.drop||0,0,1),nod=clamp(event.nod||0,0,1),lookBack=clamp(event.lookBack||0,-1,1),lockFeet=clamp(event.lockFeet||0,0,1);
    var energy=(.45+speed*.45)*(1-lockFeet*.70),walkEnergy=clamp(speed,0,1)*(1-lockFeet),bob=h*.025+h*.0032*Math.cos(phase*2+.3)*walkEnergy,sway=h*.004*Math.sin(phase)*walkEnergy;
    var sink=h*(.105*crouch+.025*drop),lean=clamp(.14*reach+.10*crouch+.18*drop,0,.25),hipX=sway-h*.017*crouch,hip=new T.Vector2(hipX,this.hipHeight+bob-sink);
    this.attachments={};this.feet=[];var pose={sink:sink,hipX:hipX,lockFeet:lockFeet};
    this._leg('right',(cycle+.5)%1,speed,bob,pose);this._leg('left',cycle,speed,bob,pose);
    var torso=this.parts.torso,head=this.parts.head,bodyAngle=Math.sin(phase-.18)*.006*walkEnergy-lean;
    var shoulder=rotate(new T.Vector2(0,this.shoulderHeight-this.hipHeight),bodyAngle).add(hip);
    torso.mesh.position.set(shoulder.x,shoulder.y,torso.mesh.position.z);torso.mesh.rotation.z=bodyAngle;
    this._cloth(torso,phase,energy,'dress');this._cloth(head,phase,energy,'hair');
    var neck=rotate(new T.Vector2(0,this.neckHeight-this.shoulderHeight),bodyAngle).add(shoulder);
    var target=this._target(event.lookTarget||event.handTarget,new T.Vector2(h*.30,h*.55)),direction=target.clone().sub(neck),lookPitch=clamp(Math.atan2(direction.y,direction.x)*.14,-.20,.16);
    var attention=Math.max(look,reach*.8,drop),headAngle=bodyAngle*.48+Math.sin(phase-.5)*.008*walkEnergy+lookPitch*attention-nod*.085+lookBack*.16;
    head.mesh.position.set(neck.x+h*.005*look,neck.y+h*.002*Math.sin(phase-.3)*walkEnergy,head.mesh.position.z);head.mesh.rotation.z=headAngle;head.mesh.rotation.y=attention*.16-lookBack*.29;
    var backwardProfile=smooth((Math.abs(lookBack)-.38)/.30);head.mesh.material.opacity=1-backwardProfile;head.mesh.visible=backwardProfile<.999;this.headBackMesh.material.opacity=backwardProfile;this.headBackMesh.visible=backwardProfile>.001;this.headBackMesh.position.copy(head.mesh.position);this.headBackMesh.rotation.copy(head.mesh.rotation);
    this.attachments.head=new T.Vector3(neck.x,neck.y+h*.15,.014);this.attachments.neck=new T.Vector3(neck.x,neck.y,.014);this.attachments.hip=new T.Vector3(hip.x,hip.y,.006);
    var bag=this._bagPoint(torso,phase,energy);this.attachments.bag=bag;
    var activeSide=event.targetSide==='right'?'right':'left',self=this;
    ['left','right'].forEach(function(side){
      var part=self.parts[side+'Arm'],sign=side==='left'?1:-1,anchor=rotate(new T.Vector2(sign*self.shoulderWidth*.5,0),bodyAngle).add(shoulder);
      part.mesh.position.set(anchor.x,anchor.y,part.mesh.position.z);
      var swing=Math.sin(phase+(side==='left'?Math.PI:0)-.15)*(.15+.035*speed)*walkEnergy,rest=-Math.PI*.5+swing-part.sourceAngle+bodyAngle*.36;
      var weight=side===activeSide?Math.max(reach,carry,drop):0,hand;
      if(weight>0){var aim=self._target(event.handTarget,new T.Vector2(h*.29,h*.55));if(!event.handTarget&&carry>0)aim.set(bag.x,bag.y);if(!event.handTarget&&drop>0)aim.set(h*.24,h*.32);hand=self._armToTarget(part,aim,weight,rest);}else hand=self._restoreArm(part,rest);
      part.mesh.renderOrder=side===activeSide&&weight>0?58:(side==='left'?56:50);
      self.attachments[side+'Hand']=new T.Vector3(hand.x,hand.y,.020);
    });
    this.attachments.hand=this.attachments[activeSide+'Hand'].clone();this.state={reach:reach,look:look,crouch:crouch,carry:carry,drop:drop,nod:nod,lookBack:lookBack,lockFeet:lockFeet};
    return this;
  };
  Rig.prototype.getAttachment=function(name){return this.attachments&&this.attachments[name]?this.attachments[name].clone():new T.Vector3(0,this.height*.5,0);};
  Rig.prototype.getFootContacts=function(){return this.feet.map(function(foot){var copy=Object.assign({},foot);copy.sourceAlphaPoint=foot.sourceAlphaPoint.slice();return copy;});};
  Rig.prototype.setFacing=function(sign){this.group.scale.x=Math.abs(this.group.scale.x)*(sign<0?-1:1);return this;};
  Rig.prototype.dispose=function(){this.resources.forEach(function(item){item.dispose();});this.group.clear();this.loaded=false;};
  global.CihouCharacterRigV8=Rig;
})(window);

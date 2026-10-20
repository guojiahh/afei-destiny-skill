/* Original hand-painted paper-puppet rig. Three.js r160 compatible.
 * CihouCharacterRigV10.create({atlasUrl, metadata, height:.8}) -> Promise<Rig>
 * rig.group: THREE.Group, anchored at the ground between the feet.
 * rig.update(gaitTimeSeconds, speed=1, event={}): deterministic acting + gait.
 * event.action: pick / reconsider / place / cross, event.progress in [0,1].
 * World scene owns its flower: use renderFlower:false and getAttachment('flower').
 * flowerTarget is an unmirrored rig-local contact point, in the same units as height.
 * intent changes stride/body purpose; impulse supplies one small deliberate response.
 * getActionState(): flowerOwnership, rootTravel, safeStops, nextSafeStop, feet.
 * Cross rootTravel must move group in the travel direction; internal feet subtract it.
 * Legacy event: reach, look, crouch, carry, drop, nod, lockFeet in [0,1].
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
    this.version=10;this.isV10=true;this.options=options||{};this.height=this.options.height||.8;this.group=new T.Group();this.group.name='cihou-acting-walker-v10';
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
    this._buildFlower();
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
    var stride=pose.stride===undefined?h*.173:pose.stride,lift=h*(.018+.006*speed),lockFeet=pose.lockFeet||0;
    var foot=this._foot(phase,stride,lift,lower,lockFeet),sideSign=side==='left'?1:-1;
    var fixed=pose.footTargets&&pose.footTargets[side];if(fixed){var angle=(fixed.angle||0)-lower.footSourceAngle,low=Infinity,point=lower.heel,rotated=rotate(point,angle);lower.contactContour.forEach(function(v){var r=rotate(v,angle);if(r.y<low){low=r.y;point=v;rotated=r;}});foot.angle=angle;foot.heel=rotate(lower.heel,angle);foot.toe=rotate(lower.toe,angle);foot.contactX=rotated.x;foot.contactY=fixed.y||0;foot.x=fixed.x-rotated.x-sideSign*this.hipWidth*.5;foot.y=foot.contactY-low;foot.stance=fixed.stance===undefined?1:fixed.stance;foot.isStance=foot.stance>.05;foot.sourceAlphaPoint=[lower.meta.sourceRect[0]+lower.pivot.x+(lower.ankle.x+point.x)/lower.scale,lower.meta.sourceRect[1]+lower.pivot.y-(lower.ankle.y+point.y)/lower.scale];}
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
      var point=new T.Vector2(x+dx,y+dy);if(kind==='dress')point=this._gravityPoint(part,point);pos.setXY(i,point.x,point.y);
    }pos.needsUpdate=true;
  };
  Rig.prototype._gravityPoint=function(part,point){
    var angle=this.currentBodyAngle||0;if(Math.abs(angle)<.04)return point;
    var waistPx=this._point(part.meta,'waistPx',part.meta.pivotPx),waist=new T.Vector2((waistPx.x-part.pivot.x)*part.scale,(part.pivot.y-waistPx.y)*part.scale),down=smooth((waist.y-point.y)/(this.height*.30));
    point=rotate(point.clone().sub(waist),-angle*.80*down).add(waist);
    var world=rotate(point,angle).add(new T.Vector2(part.mesh.position.x,part.mesh.position.y)),floor=this.height*.024;
    if(world.y<floor)point.add(rotate(new T.Vector2(0,floor-world.y),-angle));return point;
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
    var point=new T.Vector2(x+dx,y+dy);return kind==='dress'?this._gravityPoint(part,point):point;
  };
  Rig.prototype._bagPoint=function(torso,phase,energy){
    var box=torso.bagRect||{x:torso.pivot.x-this.height*.13/torso.scale,y:torso.pivot.y+this.height*.15/torso.scale,w:0,h:0};
    var opening=torso.meta.bagOpeningPx?this._point(torso.meta,'bagOpeningPx'):new T.Vector2(box.x+box.w*.5,box.y+box.h*.20);
    var local=new T.Vector2((opening.x-torso.pivot.x)*torso.scale,(torso.pivot.y-opening.y)*torso.scale);
    local=this._clothPoint(torso,local,phase,energy,'dress');local=rotate(local,torso.mesh.rotation.z).add(new T.Vector2(torso.mesh.position.x,torso.mesh.position.y));
    return new T.Vector3(local.x,local.y,.018);
  };
  Rig.prototype._buildFlower=function(){
    var self=this,h=this.height,group=new T.Group();group.name='actor-preview-flower';
    function material(color){return self._own(new T.MeshBasicMaterial({color:color,side:T.DoubleSide,transparent:true,depthWrite:false}));}
    var stemGeo=this._own(new T.BufferGeometry().setFromPoints([new T.Vector3(0,-h*.14,0),new T.Vector3(h*.004,h*.008,0),new T.Vector3(-h*.004,h*.041,0)]));
    var stem=new T.Line(stemGeo,this._own(new T.LineBasicMaterial({color:'#514f3e',transparent:true,depthWrite:false})));stem.renderOrder=61;group.add(stem);
    var petalMaterial=material('#d5aa52');
    [[-.008,.046,-.5],[.008,.050,.38],[.018,.039,.95]].forEach(function(v){var shape=new T.Shape();shape.moveTo(0,-h*.008);shape.bezierCurveTo(-h*.016,-h*.006,-h*.020,h*.020,0,h*.023);shape.bezierCurveTo(h*.014,h*.014,h*.014,0,0,-h*.008);var mesh=new T.Mesh(self._own(new T.ShapeGeometry(shape,7)),petalMaterial);mesh.position.set(h*v[0],h*v[1],.001);mesh.rotation.z=v[2];mesh.renderOrder=62;group.add(mesh);});
    var core=new T.Mesh(this._own(new T.CircleGeometry(h*.006,9)),material('#564c36'));core.position.set(-h*.001,h*.041,.002);core.renderOrder=63;group.add(core);
    var leafShape=new T.Shape();leafShape.moveTo(0,0);leafShape.quadraticCurveTo(h*.027,h*.020,h*.029,h*.005);leafShape.quadraticCurveTo(h*.015,-h*.006,0,0);var leaf=new T.Mesh(this._own(new T.ShapeGeometry(leafShape,5)),material('#7c8663'));leaf.position.set(0,-h*.005,.001);leaf.renderOrder=62;group.add(leaf);
    group.visible=false;this.group.add(group);this.flowerMesh=group;
  };
  var interval=function(p,a,b){return smooth((p-a)/(b-a));};
  var between=function(p,a,b){return interval(p,a,b)*(1-interval(p,b,Math.min(1,b+.16)));};
  Rig.prototype.getGaitMetrics=function(speed,intent){
    speed=clamp(speed===undefined?1:speed,0,1);intent=clamp(intent||0,0,1);
    var stride=this.height*mix(.130,.190,intent)*speed;
    return{cycleSeconds:1/.92,stanceFraction:.62,stride:stride,travelPerGaitSecond:stride/.62*.92};
  };
  Rig.prototype.nextSafeStop=function(progress){var p=clamp(progress,0,1),stops=[0,.40,.67,1];for(var i=0;i<stops.length;i++)if(stops[i]>=p-.00001)return stops[i];return 1;};
  Rig.prototype._actionPose=function(event){
    var h=this.height,p=clamp(event.progress||0,0,1),action=event.action||'',target=this._target(event.flowerTarget,new T.Vector2(h*.245,h*.50));
    var pose={lockFeet:1,reach:0,look:0,crouch:0,carry:0,drop:0,nod:0,lookBack:0,bodyTilt:0,hipShift:0,shoulderLift:0,rootTravel:0,flowerOwnership:event.hasFlower?'bag':'stem',safeStops:[0,1],contact:false,phase:action,lookTarget:target,handTarget:target};
    if(action==='pick'){
      var reach=interval(p,.18,.43),inspect=interval(p,.45,.64),stow=interval(p,.67,.86),rise=interval(p,.86,1);
      pose.look=interval(p,0,.13)*(1-rise*.6);pose.crouch=interval(p,.18,.39)*(1-interval(p,.45,.66))*.92;
      pose.reach=reach*(1-interval(p,.86,1));pose.bodyTilt=-.035*interval(p,.05,.18);pose.hipShift=-h*.024*pose.crouch;
      var held=new T.Vector2(h*.19,h*.67),bag=this.attachments&&this.attachments.bag?new T.Vector2(this.attachments.bag.x,this.attachments.bag.y):new T.Vector2(-h*.105,h*.55);
      pose.handTarget=target.clone().lerp(held,inspect).lerp(bag,stow);pose.lookTarget=target.clone().lerp(held,inspect).lerp(bag,stow);
      pose.flowerOwnership=p<.43?'stem':p<.86?'hand':'bag';pose.contact=p>=.425&&p<=.45;pose.phase=p<.18?'notice':p<.43?'reach':p<.67?'inspect':p<.86?'stow':'rise';
    }else if(action==='reconsider'){
      var lift=interval(p,0,.23),returnToBag=interval(p,.72,.98),turn=interval(p,.25,.48),decide=interval(p,.76,.98);
      var bag=this.attachments&&this.attachments.bag?new T.Vector2(this.attachments.bag.x,this.attachments.bag.y):new T.Vector2(-h*.105,h*.55),held=new T.Vector2(h*.17,h*.68);
      pose.reach=.94*(1-returnToBag*.15);pose.carry=1;pose.handTarget=bag.clone().lerp(held,lift*(1-returnToBag));
      pose.look=1;pose.lookTarget=held.clone().lerp(target,turn).lerp(new T.Vector2(h*.40,h*.72),decide);pose.lookBack=.80*turn*(1-decide);
      pose.bodyTilt=.105*turn*(1-decide)-.05*decide;pose.hipShift=-h*.030*turn*(1-decide);pose.shoulderLift=h*.012*between(p,.39,.67);pose.crouch=.11*turn*(1-decide);
      pose.flowerOwnership=p<.08?'bag':p<.94?'hand':'bag';pose.phase=p<.25?'remember':p<.56?'recognise':p<.78?'hesitate':'decide';pose.safeStops=[0,1];
    }else if(action==='place'){
      var take=interval(p,0,.20),lower=interval(p,.48,.78),withdraw=interval(p,.80,1),held=new T.Vector2(h*.17,h*.65),ground=this._target(event.flowerTarget,new T.Vector2(h*.22,h*.14));
      var bag=this.attachments&&this.attachments.bag?new T.Vector2(this.attachments.bag.x,this.attachments.bag.y):new T.Vector2(-h*.105,h*.55);
      pose.reach=interval(p,0,.12)*(1-withdraw);pose.carry=1-withdraw;pose.look=1-withdraw*.45;pose.crouch=interval(p,.48,.74)*(1-withdraw)*1.10;
      pose.handTarget=bag.clone().lerp(held,take).lerp(ground,lower);pose.lookTarget=held.clone().lerp(ground,lower);pose.bodyTilt=-.06*lower*(1-withdraw);pose.hipShift=-h*.022*lower*(1-withdraw);
      pose.flowerOwnership=p<.20?'bag':p<.78?'hand':'ground';pose.contact=p>=.775&&p<=.80;pose.phase=p<.20?'take':p<.48?'confirm':p<.78?'place':'withdraw';
    }else if(action==='cross'){
      var probe=interval(p,0,.22),press=interval(p,.22,.40),transfer=interval(p,.40,.67),follow=interval(p,.67,.88),settle=interval(p,.88,1);
      var travel=h*(.19*transfer+.11*settle),frontWorld=h*mix(.035,.255,probe),rearWorld=h*mix(-.035,.355,follow);
      var frontLift=p<.22?h*.043*Math.sin(Math.PI*clamp(p/.22,0,1)):0,rearLift=p<.67?0:h*.045*Math.sin(Math.PI*clamp((p-.67)/.21,0,1));
      pose.footTargets={left:{x:frontWorld-travel,y:frontLift,stance:p<.015?1:p<.22?0:interval(p,.22,.40),angle:-.045*probe*(1-press)},right:{x:rearWorld-travel,y:rearLift,stance:p<.67?1:p<.88?0:interval(p,.88,.96),angle:.025*follow*(1-settle)}};
      pose.rootTravel=travel;pose.hipShift=h*(-.025*probe*(1-transfer)+.012*transfer*(1-settle));pose.crouch=.18*probe*(1-transfer)+.05*follow*(1-settle);pose.look=.95*(1-settle*.4);pose.lookTarget=new T.Vector2(h*.36,h*.08);pose.bodyTilt=-.055*probe-.035*transfer*(1-settle);
      pose.flowerOwnership='ground';pose.phase=p<.22?'probe':p<.40?'press':p<.67?'transfer':p<.88?'follow':'settle';pose.safeStops=[0,.40,.67,1];pose.contact=(p>=.39&&p<=.41)||(p>=.88&&p<=.90);
    }else return null;
    return pose;
  };
  Rig.prototype.update=function(time,speed,event){
    if(!this.loaded)return this;var original=event||{},acting=this._actionPose(original);event=Object.assign({},original,acting||{});speed=speed===undefined?1:clamp(speed,0,2);
    if(acting)speed=0;
    var h=this.height,clock=Math.max(0,time||0)*.92,cycle=clock%1,phase=clock*TAU,intent=clamp(event.intent||0,0,1),impulse=clamp(event.impulse||0,0,1),impulseEnvelope=Math.sin(Math.PI*impulse);
    var reach=clamp(event.reach||0,0,1),look=clamp(event.look||0,0,1),crouch=clamp(event.crouch||0,0,1.2),carry=clamp(event.carry||0,0,1),drop=clamp(event.drop||0,0,1),nod=clamp(event.nod||0,0,1),lookBack=clamp(event.lookBack||0,-1,1),lockFeet=clamp(event.lockFeet||0,0,1);
    var energy=(.25+speed*.45)*(1-lockFeet*.70)+impulseEnvelope*.12,walkEnergy=clamp(speed,0,1)*(1-lockFeet),bob=h*.025+h*mix(.0024,.0040,intent)*Math.cos(phase*2+.3)*walkEnergy,sway=h*.004*Math.sin(phase)*walkEnergy;
    var sink=h*(.105*crouch+.025*drop)+h*.008*impulseEnvelope,lean=clamp(.14*reach+.10*crouch+.18*drop,0,.25),hipX=sway-h*.017*crouch+(event.hipShift||0)-h*.006*impulseEnvelope;
    if(original.action==='place'){var bend=interval(original.progress||0,.48,.74)*(1-interval(original.progress||0,.80,1));sink=h*.235*bend;}
    var hip=new T.Vector2(hipX,this.hipHeight+bob-sink);this.attachments={};this.feet=[];
    var stride=this.getGaitMetrics(speed,intent).stride,pose={sink:sink,hipX:hipX,lockFeet:lockFeet,stride:stride,footTargets:event.feetTargets||event.footTargets};
    this._leg('right',(cycle+.5)%1,speed,bob,pose);this._leg('left',cycle,speed,bob,pose);
    var torso=this.parts.torso,head=this.parts.head,bodyAngle=Math.sin(phase-.18)*.006*walkEnergy-lean+(event.bodyTilt||0)-intent*.035*walkEnergy-.025*impulseEnvelope;
    if(original.action==='place'){var bend=interval(original.progress||0,.48,.74)*(1-interval(original.progress||0,.80,1));bodyAngle=-.98*bend;}
    var shoulder=rotate(new T.Vector2(0,this.shoulderHeight-this.hipHeight),bodyAngle).add(hip);shoulder.y+=event.shoulderLift||0;
    torso.mesh.position.set(shoulder.x,shoulder.y,torso.mesh.position.z);torso.mesh.rotation.z=bodyAngle;this.currentBodyAngle=bodyAngle;
    this._cloth(torso,phase,energy,'dress');this._cloth(head,phase,energy,'hair');
    var neck=rotate(new T.Vector2(0,this.neckHeight-this.shoulderHeight),bodyAngle).add(shoulder);
    var target=this._target(event.lookTarget||event.handTarget,new T.Vector2(h*.30,h*.55)),direction=target.clone().sub(neck),lookPitch=clamp(Math.atan2(direction.y,direction.x)*.18,-.30,.18);
    var attention=Math.max(look,reach*.8,drop),headAngle=bodyAngle*.48+Math.sin(phase-.5)*.008*walkEnergy+lookPitch*attention-nod*.085+lookBack*.10;
    head.mesh.position.set(neck.x+h*.005*look,neck.y+h*.002*Math.sin(phase-.3)*walkEnergy,head.mesh.position.z);head.mesh.rotation.z=headAngle;head.mesh.rotation.y=attention*.10-lookBack*.18;
    var backwardProfile=smooth((Math.abs(lookBack)-.38)/.30);head.mesh.material.opacity=1-backwardProfile;head.mesh.visible=backwardProfile<.999;this.headBackMesh.material.opacity=backwardProfile;this.headBackMesh.visible=backwardProfile>.001;this.headBackMesh.position.copy(head.mesh.position);this.headBackMesh.rotation.copy(head.mesh.rotation);
    this.attachments.head=new T.Vector3(neck.x,neck.y+h*.15,.014);this.attachments.neck=new T.Vector3(neck.x,neck.y,.014);this.attachments.hip=new T.Vector3(hip.x,hip.y,.006);
    var bag=this._bagPoint(torso,phase,energy);this.attachments.bag=bag;
    var activeSide=event.targetSide==='right'?'right':'left',self=this;
    ['left','right'].forEach(function(side){
      var part=self.parts[side+'Arm'],sign=side==='left'?1:-1,anchor=rotate(new T.Vector2(sign*self.shoulderWidth*.5,0),bodyAngle).add(shoulder);
      part.mesh.position.set(anchor.x,anchor.y,part.mesh.position.z);
      var swing=Math.sin(phase+(side==='left'?Math.PI:0)-.15)*mix(.12,.21,intent)*walkEnergy,rest=-Math.PI*.5+swing-part.sourceAngle+bodyAngle*.36;
      var weight=side===activeSide?Math.max(reach,carry,drop):0,hand;
      if(weight>0){var aim=self._target(event.handTarget,new T.Vector2(h*.29,h*.55));if(!event.handTarget&&carry>0)aim.set(bag.x,bag.y);if(!event.handTarget&&drop>0)aim.set(h*.24,h*.32);hand=self._armToTarget(part,aim,weight,rest);}else hand=self._restoreArm(part,rest);
      part.mesh.renderOrder=side===activeSide&&weight>0?58:(side==='left'?56:50);
      self.attachments[side+'Hand']=new T.Vector3(hand.x,hand.y,.020);
    });
    this.attachments.hand=this.attachments[activeSide+'Hand'].clone();
    var ownership=acting?acting.flowerOwnership:(original.hasFlower?'bag':'stem'),flowerAt=ownership==='bag'?bag.clone():ownership==='hand'?this.attachments.hand.clone():this._target(original.flowerTarget,new T.Vector2(h*.245,h*.50));
    this.attachments.flower=new T.Vector3(flowerAt.x,flowerAt.y,.026);
    this.flowerMesh.visible=original.renderFlower!==false&&(ownership==='bag'||ownership==='hand');this.flowerMesh.position.copy(this.attachments.flower);this.flowerMesh.rotation.z=ownership==='bag'?-.20:.12;
    this.state={action:original.action||'',progress:clamp(original.progress||0,0,1),phase:acting?acting.phase:'walk',reach:reach,look:look,crouch:crouch,carry:carry,drop:drop,nod:nod,lookBack:lookBack,lockFeet:lockFeet,flowerOwnership:ownership,rootTravel:acting?acting.rootTravel:0,safeStops:acting?acting.safeStops:[0,1],nextSafeStop:original.action==='cross'?this.nextSafeStop(original.progress||0):1,contact:acting?acting.contact:false};
    return this;
  };
  Rig.prototype.getActionState=function(){var copy=Object.assign({},this.state);copy.safeStops=(copy.safeStops||[0,1]).slice();copy.feet=this.getFootContacts();copy.hand=this.getAttachment('hand');copy.bag=this.getAttachment('bag');copy.flower=this.getAttachment('flower');return copy;};
  Rig.prototype.getAttachment=function(name){return this.attachments&&this.attachments[name]?this.attachments[name].clone():new T.Vector3(0,this.height*.5,0);};
  Rig.prototype.getFootContacts=function(){return this.feet.map(function(foot){var copy=Object.assign({},foot);copy.sourceAlphaPoint=foot.sourceAlphaPoint.slice();return copy;});};
  Rig.prototype.setFacing=function(sign){this.group.scale.x=Math.abs(this.group.scale.x)*(sign<0?-1:1);return this;};
  Rig.prototype.dispose=function(){this.resources.forEach(function(item){item.dispose();});this.group.clear();this.loaded=false;};
  global.CihouCharacterRigV10=Rig;
})(window);

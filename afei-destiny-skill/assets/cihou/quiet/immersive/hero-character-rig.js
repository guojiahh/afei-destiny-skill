/* Original hand-painted paper-puppet rig. Three.js r160 compatible.
 * CihouCharacterRig.create({atlasUrl, metadata, height:.8}) -> Promise<Rig>
 * rig.group: THREE.Group, anchored at the ground between the feet.
 * rig.update(gaitTimeSeconds, speed=1): deterministic pose, no random/inertial state.
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
    this.options=options||{};this.height=this.options.height||.8;this.group=new T.Group();this.group.name='cihou-hand-painted-walker';
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
  };
  Rig.prototype._foot=function(phase,stride,lift,part){
    var duty=.62,stance=phase<duty,q=stance?phase/duty:(phase-duty)/(1-duty);
    var x=stance?mix(stride*.5,-stride*.5,q):mix(-stride*.5,stride*.5,smooth(q));
    var angle=stance?(q<.08?mix(.045,0,q/.08):q>.92?mix(0,-.075,(q-.92)/.08):0):mix(-.10,.045,smooth(q));
    var footRotation=angle-part.footSourceAngle,heel=rotate(part.heel,footRotation),toe=rotate(part.toe,footRotation);
    var soleLow=Math.min(heel.y,toe.y);if(part.contactContour)part.contactContour.forEach(function(point){soleLow=Math.min(soleLow,rotate(point,footRotation).y);});var y=-soleLow+(stance?0:lift*Math.pow(Math.sin(Math.PI*q),1.2));
    return{x:x,y:y,angle:footRotation,stance:stance,phase:phase,heel:heel,toe:toe,contactY:y+soleLow};
  };
  Rig.prototype._leg=function(side,phase,speed,bob){
    var upper=this.parts[side+'Thigh'],lower=this.parts[side+'Shin'];
    var stride=this.height*(.145+.035*clamp(speed,0,1.6)),lift=this.height*(.022+.007*speed);
    var foot=this._foot(phase,stride,lift,lower),sideSign=side==='left'?1:-1;
    var hip=new T.Vector2(sideSign*this.hipWidth*.5,this.hipHeight+bob),ankle=new T.Vector2(foot.x+sideSign*this.hipWidth*.5,foot.y);
    var dir=ankle.clone().sub(hip),distance=clamp(dir.length(),.0001,upper.length+lower.length-.000001);dir.normalize();
    var along=(upper.length*upper.length-lower.length*lower.length+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upper.length*upper.length-along*along));
    var knee=hip.clone().addScaledVector(dir,along).add(new T.Vector2(-dir.y,dir.x).multiplyScalar(height));
    upper.mesh.position.set(hip.x,hip.y,upper.mesh.position.z);upper.mesh.rotation.z=Math.atan2(knee.y-hip.y,knee.x-hip.x)-upper.sourceAngle;
    var shinAngle=Math.atan2(ankle.y-knee.y,ankle.x-knee.x)-lower.sourceAngle;
    var pos=lower.mesh.geometry.attributes.position,a=lower.ankle,lenSq=a.lengthSq();
    for(var i=0;i<pos.count;i++){
      var v=new T.Vector2(lower.base[i*2],lower.base[i*2+1]);
      var weight=smooth((v.dot(a)/lenSq-.66)/.36);
      var fromKnee=rotate(v,shinAngle).add(knee),fromFoot=rotate(v.clone().sub(a),foot.angle).add(ankle);
      pos.setXY(i,mix(fromKnee.x,fromFoot.x,weight),mix(fromKnee.y,fromFoot.y,weight));
    }
    pos.needsUpdate=true;lower.mesh.geometry.computeBoundingSphere();
    this.feet.push({side:side,x:ankle.x,y:foot.y,heelY:ankle.y+foot.heel.y,toeY:ankle.y+foot.toe.y,stance:foot.stance,phase:phase,contactY:foot.contactY});
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
  Rig.prototype.update=function(time,speed){
    if(!this.loaded)return this;speed=speed===undefined?1:clamp(speed,0,2);var clock=Math.max(0,time||0)*(.92),cycle=clock%1,phase=clock*TAU;
    var bob=this.height*.0035*Math.cos(phase*2+.3)+this.height*.025,sway=this.height*.004*Math.sin(phase),energy=.6+speed*.45;
    this.feet=[];this._leg('right',(cycle+.5)%1,speed,bob);this._leg('left',cycle,speed,bob);
    var torso=this.parts.torso,head=this.parts.head;
    torso.mesh.position.set(sway,this.shoulderHeight+bob,torso.mesh.position.z);torso.mesh.rotation.z=Math.sin(phase-.18)*.007;
    head.mesh.position.set(sway*.65,this.neckHeight+bob+this.height*.002*Math.sin(phase-.3),head.mesh.position.z);head.mesh.rotation.z=Math.sin(phase-.5)*.010;
    this._cloth(torso,phase,energy,'dress');this._cloth(head,phase,energy,'hair');
    ['left','right'].forEach(function(side){var arm=this.parts[side+'Arm'],sign=side==='left'?1:-1,angle=Math.sin(phase+(side==='left'?Math.PI:0)-.15)*(.16+.05*speed);arm.mesh.position.set(sign*this.shoulderWidth*.5+sway,this.shoulderHeight+bob,arm.mesh.position.z);arm.mesh.rotation.z=-Math.PI*.5+angle-arm.sourceAngle;},this);
    return this;
  };
  Rig.prototype.getFootContacts=function(){return this.feet.map(function(foot){return Object.assign({},foot);});};
  Rig.prototype.setFacing=function(sign){this.group.scale.x=Math.abs(this.group.scale.x)*(sign<0?-1:1);return this;};
  Rig.prototype.dispose=function(){this.resources.forEach(function(item){item.dispose();});this.group.clear();this.loaded=false;};
  global.CihouCharacterRig=Rig;
})(window);

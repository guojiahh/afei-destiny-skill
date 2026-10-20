/* Original Cihou hero scene v3. No copied benchmark artwork.
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
    this.progress=this.targetProgress=0;this.time=0;this.wind=this.targetWind=0;this.travel=0;this.last=0;this.active=true;this.paused=false;this.destroyed=false;
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
    // Smooth classical half-twist, without the straightened corners of v2.
    var radial=Math.cos(u*.5),r=7.4+v*radial;
    return new T.Vector3(r*Math.cos(u),2.1+v*Math.sin(u*.5),(11.2+v*radial)*Math.sin(u))
      .applyAxisAngle(new T.Vector3(1,0,0),.05).applyAxisAngle(new T.Vector3(0,0,1),-.035);
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
    this.uniforms={ink:{value:new T.Color('#405879')},paper:{value:new T.Color('#dfafa8')},outline:{value:new T.Color('#283b50')}};
    return this._own(new T.ShaderMaterial({side:T.DoubleSide,uniforms:this.uniforms,
      vertexShader:'varying vec2 vUv;varying vec3 vNormal;void main(){vUv=uv;vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:[
        'precision highp float;varying vec2 vUv;varying vec3 vNormal;uniform vec3 ink;uniform vec3 paper;uniform vec3 outline;',
        'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
        'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
        'void main(){vec3 norm=normalize(vNormal);if(!gl_FrontFacing)norm=-norm;',
        'float light=.90+.10*max(dot(norm,normalize(vec3(-.4,1.,.45))),0.);',
        'float grain=(h(gl_FragCoord.xy)-.5)*.014;',
        'float distance=min(vUv.y,1.-vUv.y);',
        'float dry=.019+n(vec2(vUv.x*1000.,0.))*.0025;',
        'float edge=1.-smoothstep(dry,dry+.0015,distance);',
        'float line=1.-smoothstep(.001,.0028,distance);',
        'vec3 col=mix(mix(ink*light,paper*light,edge),outline,line)+grain;',
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
    this._ground();this._marks();this._scenery();this._walker();
  };
  Scene.prototype._ground=function(){
    var geo=this.ribbon.geometry.clone(),positions=geo.attributes.position;
    for(var i=0;i<positions.count;i++){
      var height=positions.getY(i)+1.1;positions.setXYZ(i,positions.getX(i)+height*.32,-1.1,positions.getZ(i)+height*.17);
    }
    positions.needsUpdate=true;
    var mat=this._own(new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:'varying vec2 vUv;void main(){float a=smoothstep(0.,.025,vUv.y)*smoothstep(1.,.975,vUv.y);gl_FragColor=vec4(.20,.24,.29,a*.075);}'
    }));this._own(geo);this.scene.add(new T.Mesh(geo,mat));
    var points=[];for(var j=0;j<=1000;j++)points.push(this.surface(j/1000*TAU*2,1.26));
    var curve=new T.CatmullRomCurve3(points,false,'centripetal');
    this.scene.add(new T.Mesh(this._own(new T.TubeGeometry(curve,1000,.008,3,false)),this._own(new T.MeshBasicMaterial({color:'#283b50'}))));
  };
  Scene.prototype._marks=function(){
    seed=98117;
    var palette=['#96b8c5','#e4d886','#dfafa8','#283b50'],vertices=[],colors=[],indices=[];
    // Small groups of parallel dry pigment strokes. Each is a world-space strip
    // on the road, not a screen overlay or unrelated particle system.
    for(var group=0;group<240;group++){
      var centerU=rand()*TAU,centerV=(rand()*2-1)*1.08,count=3+Math.floor(rand()*7);
      for(var j=0;j<count;j++){
        var u=centerU+(rand()-.5)*.13,v=clamp(centerV+(rand()-.5)*.30,-1.17,1.17);
        var length=.05+Math.pow(rand(),2)*1.05,width=.004+Math.pow(rand(),2)*.025;
        var choice=rand(),color=new T.Color(palette[choice<.53?0:choice<.78?1:choice<.84?2:3]);
        var opacity=choice<.78?.60:choice<.84?.48:.36;color.multiplyScalar(opacity);
        var offset=vertices.length/3,segments=4;
        for(var k=0;k<=segments;k++){
          var t=k/segments,at=u+(t-.5)*length/6.9,localWidth=width*Math.sin(PI*t)*(.75+rand()*.4);
          var b=this.basis(at),a=this.surface(at,v-localWidth).addScaledVector(b.n,.014),bb=this.surface(at,v+localWidth).addScaledVector(b.n,.014);
          vertices.push(a.x,a.y,a.z,bb.x,bb.y,bb.z);
          // Blend the dry pigment into the base blue without alpha sorting seams.
          var base=new T.Color('#405879'),mixed=base.lerp(new T.Color(palette[choice<.53?0:choice<.78?1:choice<.84?2:3]),opacity);
          colors.push(mixed.r,mixed.g,mixed.b,mixed.r,mixed.g,mixed.b);
          if(k<segments){var x=offset+k*2;indices.push(x,x+1,x+2,x+1,x+3,x+2);}
        }
      }
    }
    var geo=this._own(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);
    this.scene.add(new T.Mesh(geo,this._own(new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide,depthWrite:false}))));
  };
  Scene.prototype._scenery=function(){
    seed=64237;this.plants=[];
    var outline=this._own(new T.LineBasicMaterial({color:'#283b50',transparent:true,opacity:.8}));
    for(var i=0;i<20;i++){
      var u=i/20*TAU+.035,v=(i%2?1:-1)*1.16,b=this.basis(u),root=new T.Group();root.position.copy(this.surface(u,v)).addScaledVector(b.n,.02);
      var up=b.n.clone(),right=b.a.clone(),face=new T.Vector3().crossVectors(right,up).normalize();root.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,face));
      for(var j=0;j<3;j++){
        var height=.11+rand()*.14,x=(j-1)*.055;
        var points=[new T.Vector3(x,0,0),new T.Vector3(x-.035,height*.6,0),new T.Vector3(x+.005,height,0),new T.Vector3(x+.026,height*.46,0),new T.Vector3(x,0,0)];
        var shape=new T.Shape(points.map(function(pt){return new T.Vector2(pt.x,pt.y)}));
        var leaf=new T.Mesh(this._own(new T.ShapeGeometry(shape)),this._own(new T.MeshBasicMaterial({color:j===1?'#96b8c5':'#7692a1',side:T.DoubleSide})));leaf.position.z=j*.002;root.add(leaf);
        var lineGeo=this._own(new T.BufferGeometry().setFromPoints(points));var line=new T.Line(lineGeo,outline);line.position.z=.004+j*.002;root.add(line);
      }
      root.userData.phase=rand()*TAU;this.scene.add(root);this.plants.push(root);
      var shadow=new T.Mesh(this._own(new T.CircleGeometry(.23,5)),this._own(new T.MeshBasicMaterial({color:'#273c50',transparent:true,opacity:.20,side:T.DoubleSide,depthWrite:false})));
      shadow.position.copy(root.position).addScaledVector(b.t,-.13).addScaledVector(b.n,.006);shadow.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),b.n);shadow.scale.set(.45,1,1);this.scene.add(shadow);
    }
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
    this.contact=new T.Mesh(this._own(new T.CircleGeometry(.13,24)),this._own(new T.MeshBasicMaterial({color:'#253b32',transparent:true,opacity:.32,side:T.DoubleSide,depthWrite:false})));
    this.contact.scale.set(1,.30,1);this.shadowRoot.add(this.contact);
    var shadowDress=this._shape([[-.045,0],[.065,0],[.16,.35],[-.08,.35]],'#263d32');shadowDress.material.transparent=true;shadowDress.material.opacity=.17;shadowDress.material.depthWrite=false;this.shadowRoot.add(shadowDress);
    var shadowHead=new T.Mesh(this._own(new T.CircleGeometry(.075,18)),this._own(new T.MeshBasicMaterial({color:'#263d32',transparent:true,opacity:.17,side:T.DoubleSide,depthWrite:false})));shadowHead.position.set(.05,.4,0);this.shadowRoot.add(shadowHead);
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
    var one=smooth(raw/.25),two=smooth((raw-.25)/.40),three=smooth((raw-.65)/.35);
    var normal=b.n.clone();if(normal.y<0)normal.negate();
    var across=new T.Vector3().crossVectors(normal,b.t).normalize();
    var nearUp=b.t.clone().multiplyScalar(.50).addScaledVector(across,.866).normalize();
    var nearPosition=b.p.clone().addScaledVector(normal,10).addScaledVector(b.t,-2.8);
    var lookAhead=b.p.clone().addScaledVector(b.t,.45*one+1.30*two);
    var midPosition=b.p.clone().addScaledVector(normal,9.5).addScaledVector(b.t,-4.3).addScaledVector(across,1.0);
    var farPosition=new T.Vector3(12.5,13.2,17.8),farTarget=new T.Vector3(0,2.0,0);
    var target=b.p.clone().addScaledVector(nearUp,.18);target.lerp(lookAhead,two*.58);target.lerp(farTarget,three);
    this.camera.position.copy(nearPosition).lerp(midPosition,two).lerp(farPosition,three);
    this.camera.up.copy(nearUp).lerp(new T.Vector3(0,1,0),three).normalize();this.camera.lookAt(target);this.camera.updateMatrixWorld();
    var right=new T.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0),up=new T.Vector3().setFromMatrixColumn(this.camera.matrixWorld,1);
    var minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(var i=0;i<80;i++)for(var side=-1;side<=1;side+=2){var pt=this.surface(i/80*TAU,side*1.26),xx=pt.dot(right),yy=pt.dot(up);minX=Math.min(minX,xx);maxX=Math.max(maxX,xx);minY=Math.min(minY,yy);maxY=Math.max(maxY,yy);}
    var aspect=this.width/this.height,farHeight=Math.max((maxY-minY)/.70,(maxX-minX)/(aspect*.71));
    var nearHeight=lerp(3.8,4.4,one),midHeight=lerp(nearHeight,6.7,two),viewHeight=lerp(midHeight,farHeight,three);
    this.viewHeight=viewHeight;this.reveal=three;this.camera.left=-viewHeight*aspect*.5;this.camera.right=viewHeight*aspect*.5;this.camera.top=viewHeight*.5;this.camera.bottom=-viewHeight*.5;this.camera.updateProjectionMatrix();
  };
  Scene.prototype.render=function(){
    if(this.destroyed)return;if(this.mode!=='webgl'){this._drawFallback();return;}
    var u=-.16+this.travel,b=this.basis(u);this._camera(b,this.progress);
    var toward=this.camera.position.clone().sub(b.p),n=b.n.clone();if(n.dot(toward)<0)n.negate();
    this.walkerRoot.position.copy(b.p).addScaledVector(n,.024);this.walkerRoot.quaternion.copy(this.camera.quaternion);
    var step=this.reducedMotion?0:this.time*TAU*(.85+this.wind*.26);
    this.legs.forEach(function(leg,i){leg.rotation.z=Math.sin(step+i*PI)*.29;leg.position.y=.08+Math.max(0,Math.sin(step+i*PI))*.012;});
    this.arms.forEach(function(arm,i){arm.rotation.z=Math.sin(step+i*PI)*.22;});this.dress.rotation.z=Math.sin(step+.6)*.016;this.hair.rotation.z=Math.sin(step-.5)*.015;
    // Character size is deliberately art directed across the camera reveal:
    // readable near / middle, then small but still legible at the complete loop.
    var planeHeight=this.viewHeight*lerp(.112,.050,this.reveal),figureScale=planeHeight/.56;
    this.walkerRoot.scale.setScalar(figureScale);
    this.shadowRoot.position.copy(b.p).addScaledVector(n,.018);
    var shadowUp=b.t.clone().multiplyScalar(-1),shadowRight=new T.Vector3().crossVectors(shadowUp,n).normalize();
    this.shadowRoot.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(shadowRight,shadowUp,n));this.shadowRoot.scale.setScalar(figureScale*1.12);
    if(this.sprite){
      var m=this.spriteMetadata,columns=m.spriteColumns||m.columns||4,rows=m.spriteRows||m.rows||2,frames=m.spriteFrames||columns*rows;
      var frame=Math.floor(this.time*(m.spriteFps||8)*(1+this.wind*.22))%frames;this.spriteTexture.offset.set((frame%columns)/columns,1-(Math.floor(frame/columns)+1)/rows);
      var ratio=(this.spriteImage.width/columns)/(this.spriteImage.height/rows),right=new T.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0),facing=b.t.dot(right)>=0?1:-1;
      this.sprite.scale.set(.56*ratio*facing,.56,1);
    }
    if(this.plants)this.plants.forEach(function(plant){plant.scale.x=1+Math.sin(this.time*1.4+plant.userData.phase)*(.015+this.wind*.025);},this);
    this.renderer.render(this.scene,this.camera);
  };
  Scene.prototype._fallback=function(){this.canvas=document.createElement('canvas');this.canvas.style.cssText='display:block;width:100%;height:100%;';this.container.appendChild(this.canvas);this.context=this.canvas.getContext('2d');};
  Scene.prototype._drawFallback=function(){
    var c=this.context;if(!c)return;var w=this.width,h=this.height,p=smooth(this.progress);c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#f1eade';c.fillRect(0,0,w,h);c.save();c.translate(w/2,h/2);c.rotate(-.62*(1-p));c.strokeStyle='#dfafa8';c.lineWidth=lerp(h*.40,h*.08,p)+4;c.beginPath();if(p<.02){c.moveTo(-w,0);c.lineTo(w,0);}else c.ellipse(0,0,lerp(w*2,Math.min(w*.34,h*.47),p),lerp(0,h*.17,p),0,0,TAU);c.stroke();c.strokeStyle='#405879';c.lineWidth-=4;c.stroke();c.restore();c.fillStyle='#ad4f37';c.beginPath();c.moveTo(w/2-5,h/2-20);c.lineTo(w/2+4,h/2-20);c.lineTo(w/2+8,h/2);c.lineTo(w/2-8,h/2);c.fill();c.fillStyle='#44372e';c.beginPath();c.arc(w/2,h/2-25,5,0,TAU);c.fill();
  };
  Scene.prototype.resize=function(){var r=this.container.getBoundingClientRect();this.width=Math.max(1,r.width);this.height=Math.max(1,r.height);this.dpr=Math.min(2,global.devicePixelRatio||1);if(this.renderer){this.renderer.setPixelRatio(this.dpr);this.renderer.setSize(this.width,this.height,false);}else{this.canvas.width=this.width*this.dpr;this.canvas.height=this.height*this.dpr;}this.render();};
  Scene.prototype._tick=function(now){if(this.destroyed)return;var dt=this.last?Math.min(.05,(now-this.last)/1000):0;this.last=now;var changed=Math.abs(this.targetProgress-this.progress)>.00001;if(this.active){if(!this.paused&&!this.reducedMotion){this.wind=lerp(this.wind,this.targetWind,1-Math.exp(-dt*5));this.time+=dt;this.travel+=dt*(.022+this.wind*.032);}if(changed)this.progress=lerp(this.progress,this.targetProgress,this.reducedMotion?1:1-Math.exp(-dt*7));if(!this.paused||changed)this.render();}this.raf=requestAnimationFrame(this._tick);};
  Scene.prototype.setProgress=function(value){this.targetProgress=clamp(Number(value)||0,0,1);if(this.reducedMotion)this.progress=this.targetProgress;return this;};
  Scene.prototype.setInteraction=function(value){this.targetWind=clamp(Number(value)||0,0,1);return this;};
  Scene.prototype.setPaused=function(value){this.paused=!!value;this.last=0;return this;};
  Scene.prototype.setActive=function(value){this.active=!!value;this.last=0;return this;};
  Scene.prototype.destroy=function(){this.destroyed=true;cancelAnimationFrame(this.raf);if(this.observer)this.observer.disconnect();else global.removeEventListener('resize',this.resize);if(this.renderer){this.renderer.dispose();this.renderer.domElement.remove();}if(this.canvas)this.canvas.remove();this.resources.forEach(function(r){r.dispose();});};
  global.CihouHeroSceneV3=Scene;
})(window);

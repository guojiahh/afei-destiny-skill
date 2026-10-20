/* Original Cihou hero scene v2. No copied benchmark artwork.
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
    this.progress=this.targetProgress=0;this.time=0;this.last=0;this.active=true;this.paused=false;this.destroyed=false;
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
  Scene.prototype._center=function(u){
    var wrapped=((u+PI)%TAU+TAU)%TAU-PI;
    // A long straight approach belongs to the closed loop itself. Its ends
    // round away outside the first framing, so the reveal needs no geometry swap.
    var round=smooth((Math.abs(wrapped)-.78)/.55);
    return new T.Vector3(lerp(4.3,4.3*Math.cos(u),round),1.38,6.4*Math.sin(u));
  };
  Scene.prototype.surface=function(u,v){
    var center=this._center(u),tangent=this._center(u+.0001).sub(center).normalize();
    var across=new T.Vector3(tangent.z,0,-tangent.x).normalize();
    center.addScaledVector(across,v*Math.cos(u*.5));center.y+=v*Math.sin(u*.5);
    return center.applyAxisAngle(new T.Vector3(1,0,0),.10).applyAxisAngle(new T.Vector3(0,0,1),-.06);
  };
  Scene.prototype.basis=function(u){
    var p=this.surface(u,0),t=this.surface(u+.0005,0).sub(p).normalize(),a=this.surface(u,.0005).sub(p).normalize();
    return{p:p,t:t,a:a,n:new T.Vector3().crossVectors(t,a).normalize()};
  };
  Scene.prototype._geometry=function(){
    var vertices=[],uv=[],indices=[],steps=500,rows=20;
    for(var i=0;i<=steps;i++)for(var j=0;j<=rows;j++){
      var p=this.surface(i/steps*TAU,(j/rows*2-1)*1.12);vertices.push(p.x,p.y,p.z);uv.push(i/steps,j/rows);
    }
    for(var a=0;a<steps;a++)for(var b=0;b<rows;b++){var k=a*(rows+1)+b;indices.push(k,k+rows+1,k+1,k+1,k+rows+1,k+rows+2);}
    var geo=this._own(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;
  };
  Scene.prototype._material=function(){
    this.uniforms={ink:{value:new T.Color('#596c64')},paper:{value:new T.Color('#e4ddc8')},air:{value:new T.Color('#e9e8dc')}};
    return this._own(new T.ShaderMaterial({side:T.DoubleSide,uniforms:this.uniforms,
      vertexShader:'varying vec2 vUv;varying vec3 vNormal;void main(){vUv=uv;vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:[
        'precision highp float;varying vec2 vUv;varying vec3 vNormal;uniform vec3 ink;uniform vec3 paper;uniform vec3 air;',
        'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
        'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
        'void main(){vec3 norm=normalize(vNormal);if(!gl_FrontFacing)norm=-norm;',
        'float light=.88+.12*max(dot(norm,normalize(vec3(-.4,1.,.45))),0.);',
        'float pigment=(n(vUv*vec2(120.,20.))-.5)*.018;',
        'float grain=(h(gl_FragCoord.xy)-.5)*.022;',
        'float edge=1.-smoothstep(.014,.018,min(vUv.y,1.-vUv.y));',
        'vec3 col=mix(ink*light+pigment,paper*light,edge)+grain;',
        'gl_FragColor=vec4(col,1.);',
        '#include <colorspace_fragment>',
        '}'
      ].join('\n')
    }));
  };
  Scene.prototype._init=function(){
    this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(2,global.devicePixelRatio||1));this.renderer.setClearColor('#e9e8dc',1);this.renderer.outputColorSpace=T.SRGBColorSpace;
    this.renderer.domElement.setAttribute('aria-hidden','true');this.renderer.domElement.style.cssText='display:block;width:100%;height:100%;pointer-events:none;';this.container.appendChild(this.renderer.domElement);
    this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-8,8,5,-5,.1,80);
    this.scene.add(new T.HemisphereLight('#fbf6dd','#67746a',2.3));
    var sun=new T.DirectionalLight('#fff7dd',1);sun.position.set(-8,12,-3);this.scene.add(sun);
    this.ribbon=new T.Mesh(this._geometry(),this._material());this.scene.add(this.ribbon);
    this._ground();this._marks();this._walker();
  };
  Scene.prototype._ground=function(){
    var geo=this.ribbon.geometry.clone(),positions=geo.attributes.position;
    for(var i=0;i<positions.count;i++){
      var y=positions.getY(i);positions.setXYZ(i,positions.getX(i)+y*.30,-1.02,positions.getZ(i)+y*.16);
    }
    positions.needsUpdate=true;
    var mat=this._own(new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:'varying vec2 vUv;void main(){float a=smoothstep(0.,.28,vUv.y)*smoothstep(1.,.72,vUv.y);gl_FragColor=vec4(.29,.34,.29,a*.075);}'
    }));this._own(geo);this.scene.add(new T.Mesh(geo,mat));
  };
  Scene.prototype._marks=function(){
    seed=75217;this.markGroup=new T.Group();this.scene.add(this.markGroup);
    var colors=['#89958a','#a5a88d','#d0cbb1'];
    // Tangible pigment and a small number of grass blades, all anchored to the
    // same surface. These provide parallax instead of unrelated screen particles.
    var lineGeometries=[[],[],[]];
    for(var i=0;i<138;i++){
      var u=rand()*TAU,v=(rand()*2-1)*1.04,b=this.basis(u),p=this.surface(u,v).addScaledVector(b.n,.008),q=this.surface(u+.008+rand()*.027,v+.002).addScaledVector(b.n,.009);
      var a=lineGeometries[i%3];a.push(p.x,p.y,p.z,q.x,q.y,q.z);
    }
    lineGeometries.forEach(function(values,index){var geo=this._own(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(values,3));var mat=this._own(new T.LineBasicMaterial({color:colors[index],transparent:true,opacity:index===2?.23:.38}));this.markGroup.add(new T.LineSegments(geo,mat));},this);
    var stems=[],tips=[];
    for(var j=0;j<26;j++){
      var uu=rand()*TAU,side=j%2?1:-1,bb=this.basis(uu),base=this.surface(uu,side*(1.03+rand()*.05));
      for(var k=0;k<3;k++){
        var height=.06+rand()*.11,top=base.clone().addScaledVector(bb.n,height).addScaledVector(bb.t,(rand()-.5)*.08);
        stems.push(base.x,base.y,base.z,top.x,top.y,top.z);tips.push(top);
      }
    }
    var stemGeo=this._own(new T.BufferGeometry());stemGeo.setAttribute('position',new T.Float32BufferAttribute(stems,3));this.markGroup.add(new T.LineSegments(stemGeo,this._own(new T.LineBasicMaterial({color:'#3b5144',transparent:true,opacity:.48}))));
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
      }self.render();};img.src=url;
  };
  Scene.prototype._camera=function(b,p){
    var normal=b.n.clone();if(normal.y<0)normal.negate();
    var nearPosition=b.p.clone().addScaledVector(normal,9).addScaledVector(b.t,-3.3);
    var nearUp=b.t.clone().multiplyScalar(.50).addScaledVector(b.a,.866).normalize();
    var farPosition=new T.Vector3(8.5,8.2,12.8),farTarget=new T.Vector3(.0,1.25,0);
    this.camera.position.copy(nearPosition).lerp(farPosition,p);this.camera.up.copy(nearUp).lerp(new T.Vector3(0,1,0),p).normalize();this.camera.lookAt(b.p.clone().addScaledVector(nearUp,.19*(1-p)).lerp(farTarget,p));
    this.camera.updateMatrixWorld();
    // Fit the actual projected band bounds, so the full ring cannot crop in
    // square and portrait viewports. The close view remains a wide diagonal.
    var right=new T.Vector3(),up=new T.Vector3();right.setFromMatrixColumn(this.camera.matrixWorld,0);up.setFromMatrixColumn(this.camera.matrixWorld,1);
    var minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(var i=0;i<64;i++)for(var side=-1;side<=1;side+=2){var pt=this.surface(i/64*TAU,side*1.12);var xx=pt.dot(right),yy=pt.dot(up);minX=Math.min(minX,xx);maxX=Math.max(maxX,xx);minY=Math.min(minY,yy);maxY=Math.max(maxY,yy);}
    var aspect=this.width/this.height,farHeight=Math.max((maxY-minY)/.70,(maxX-minX)/(aspect*.74));
    var viewHeight=lerp(5.3,farHeight,p);this.viewHeight=viewHeight;this.camera.left=-viewHeight*aspect*.5;this.camera.right=viewHeight*aspect*.5;this.camera.top=viewHeight*.5;this.camera.bottom=-viewHeight*.5;this.camera.updateProjectionMatrix();
  };
  Scene.prototype.render=function(){
    if(this.destroyed)return;
    if(this.mode!=='webgl'){this._drawFallback();return;}
    var p=smooth(this.progress),u=-.24+this.time*.038,b=this.basis(u);this._camera(b,p);
    this.walkerRoot.position.copy(b.p).addScaledVector(b.n,.014);this.walkerRoot.quaternion.copy(this.camera.quaternion);
    // Her feet are at local y=0, exactly on the sampled road. The tiny heel lift
    // changes the legs, rather than bouncing the whole girl above the surface.
    var step=this.reducedMotion?0:this.time*TAU*.9;
    this.legs.forEach(function(leg,i){leg.rotation.z=Math.sin(step+i*PI)*.29;leg.position.y=.08+Math.max(0,Math.sin(step+i*PI))*.012;});
    this.arms.forEach(function(arm,i){arm.rotation.z=Math.sin(step+i*PI)*.22;});
    this.dress.rotation.z=Math.sin(step+.6)*.016;this.hair.rotation.z=Math.sin(step-.5)*.015;
    var farScale=clamp(this.viewHeight/10,1,1.7),figureScale=lerp(.75,farScale,p);this.walkerRoot.scale.setScalar(figureScale);
    var n=b.n.clone();this.shadowRoot.position.copy(b.p).addScaledVector(n,.011);
    var shadowUp=b.t.clone().multiplyScalar(-1),shadowRight=b.a.clone();var matrix=new T.Matrix4().makeBasis(shadowRight,shadowUp,n);this.shadowRoot.quaternion.setFromRotationMatrix(matrix);this.shadowRoot.scale.setScalar(figureScale);
    if(this.sprite){var m=this.spriteMetadata,columns=m.spriteColumns||m.columns||8,rows=m.spriteRows||m.rows||1,frames=m.spriteFrames||columns*rows,frame=Math.floor(this.time*(m.spriteFps||8))%frames;this.spriteTexture.offset.set((frame%columns)/columns,1-(Math.floor(frame/columns)+1)/rows);var ratio=(this.spriteImage.width/columns)/(this.spriteImage.height/rows);this.sprite.scale.set(.56*ratio,.56,1);}
    this.renderer.render(this.scene,this.camera);
  };
  Scene.prototype._fallback=function(){this.canvas=document.createElement('canvas');this.canvas.style.cssText='display:block;width:100%;height:100%;';this.container.appendChild(this.canvas);this.context=this.canvas.getContext('2d');};
  Scene.prototype._drawFallback=function(){
    var c=this.context;if(!c)return;var w=this.width,h=this.height,p=smooth(this.progress);c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#e9e8dc';c.fillRect(0,0,w,h);c.save();c.translate(w/2,h/2);c.rotate(-.62*(1-p));c.strokeStyle='#d7d2bc';c.lineWidth=lerp(h*.40,h*.08,p)+4;c.beginPath();if(p<.02){c.moveTo(-w,0);c.lineTo(w,0);}else c.ellipse(0,0,lerp(w*2,Math.min(w*.34,h*.47),p),lerp(0,h*.17,p),0,0,TAU);c.stroke();c.strokeStyle='#596c64';c.lineWidth-=4;c.stroke();c.restore();c.fillStyle='#ad4f37';c.beginPath();c.moveTo(w/2-5,h/2-20);c.lineTo(w/2+4,h/2-20);c.lineTo(w/2+8,h/2);c.lineTo(w/2-8,h/2);c.fill();c.fillStyle='#44372e';c.beginPath();c.arc(w/2,h/2-25,5,0,TAU);c.fill();
  };
  Scene.prototype.resize=function(){var r=this.container.getBoundingClientRect();this.width=Math.max(1,r.width);this.height=Math.max(1,r.height);this.dpr=Math.min(2,global.devicePixelRatio||1);if(this.renderer){this.renderer.setPixelRatio(this.dpr);this.renderer.setSize(this.width,this.height,false);}else{this.canvas.width=this.width*this.dpr;this.canvas.height=this.height*this.dpr;}this.render();};
  Scene.prototype._tick=function(now){if(this.destroyed)return;var dt=this.last?Math.min(.05,(now-this.last)/1000):0;this.last=now;var changed=Math.abs(this.targetProgress-this.progress)>.00001;if(this.active){if(!this.paused&&!this.reducedMotion)this.time+=dt;if(changed)this.progress=lerp(this.progress,this.targetProgress,this.reducedMotion?1:1-Math.exp(-dt*7));if(!this.paused||changed)this.render();}this.raf=requestAnimationFrame(this._tick);};
  Scene.prototype.setProgress=function(value){this.targetProgress=clamp(Number(value)||0,0,1);if(this.reducedMotion)this.progress=this.targetProgress;return this;};
  Scene.prototype.setPaused=function(value){this.paused=!!value;this.last=0;return this;};
  Scene.prototype.setActive=function(value){this.active=!!value;this.last=0;return this;};
  Scene.prototype.destroy=function(){this.destroyed=true;cancelAnimationFrame(this.raf);if(this.observer)this.observer.disconnect();else global.removeEventListener('resize',this.resize);if(this.renderer){this.renderer.dispose();this.renderer.domElement.remove();}if(this.canvas)this.canvas.remove();this.resources.forEach(function(r){r.dispose();});};
  global.CihouHeroSceneV2=Scene;
})(window);

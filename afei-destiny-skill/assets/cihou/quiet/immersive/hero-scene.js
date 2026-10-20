/* Cihou immersive hero. Original scene / camera / material implementation.
 * Requires the bundled Three.js r160 runtime, or falls back to Canvas 2D.
 * No document event handlers: the report owns every user interaction.
 */
(function (global) {
  'use strict';

  var TAU = Math.PI * 2;
  var clamp = function (x, a, b) { return Math.max(a, Math.min(b, x)); };
  var smooth = function (x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  var mix = function (a, b, t) { return a + (b - a) * t; };
  var reduced = function () { return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches; };
  var seed = 43291;
  function random() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  function CihouHeroScene(container, options) {
    if (!container || !container.appendChild) throw new Error('CihouHeroScene needs a DOM container.');
    this.container = container;
    this.options = options || {};
    this.reducedMotion = this.options.reducedMotion === undefined ? reduced() : !!this.options.reducedMotion;
    this.progress = this.targetProgress = 0;
    this.exit = this.targetExit = 0;
    this.paused = false;
    this.active = true;
    this.destroyed = false;
    this.elapsed = 0;
    this.lastTime = 0;
    this.resources = [];
    this.mode = 'canvas';
    this.ready = false;
    this.spriteFrames = Math.max(1, this.options.spriteFrames || 8);
    this.spriteColumns = Math.max(1, this.options.spriteColumns || this.options.columns || this.spriteFrames);
    this.spriteRows = Math.max(1, this.options.spriteRows || this.options.rows || 1);
    this.spriteFps = this.options.spriteFps || 10;
    this.spriteAspect = this.options.spriteAspect || .57;
    this.spriteImage = null;
    this._frame = this._frame.bind(this);
    this._resize = this._resize.bind(this);
    this._onContextLost = this._onContextLost.bind(this);
    try {
      if (!global.THREE) throw new Error('Three.js unavailable');
      this._initWebGL();
      this.mode = 'webgl';
    } catch (error) {
      this.webglError = String(error && error.message || error);
      if (this.renderer) { this.renderer.dispose(); this.renderer.domElement.remove(); }
      this.renderer = null;
      this._initCanvas();
    }
    this._loadSprite();
    if (global.ResizeObserver) { this.resizeObserver = new ResizeObserver(this._resize); this.resizeObserver.observe(container); }
    else global.addEventListener('resize', this._resize);
    this._resize();
    this.ready = true;
    this.raf = global.requestAnimationFrame(this._frame);
    if (typeof this.options.onReady === 'function') this.options.onReady({ mode: this.mode });
  }

  CihouHeroScene.prototype._resource = function (resource) { this.resources.push(resource); return resource; };

  CihouHeroScene.prototype._surface = function (u, v, target) {
    var T = global.THREE;
    target = target || new T.Vector3();
    var half = u * .5, r = 4.55 + v * Math.cos(half);
    target.set(r * Math.cos(u), 2.4 + v * Math.sin(half) + .18 * Math.sin(u), r * Math.sin(u) * .91);
    // A slight tilt gives the paper sculpture an asymmetric, human composition.
    target.applyAxisAngle(this.axisZ, -.13);
    return target;
  };

  CihouHeroScene.prototype._basis = function (u) {
    var T = global.THREE;
    var point = this._surface(u, 0);
    var tangent = this._surface(u + .001, 0).sub(point).normalize();
    var across = this._surface(u, .001).sub(point).normalize();
    var normal = new T.Vector3().crossVectors(tangent, across).normalize();
    return { point: point, tangent: tangent, across: across, normal: normal };
  };

  CihouHeroScene.prototype._ribbonGeometry = function () {
    var T = global.THREE, count = 420, lanes = 28, width = 1.13;
    var positions = [], uvs = [], indices = [];
    for (var i = 0; i <= count; i++) {
      var u = i / count * TAU;
      for (var j = 0; j <= lanes; j++) {
        var v = (j / lanes * 2 - 1) * width;
        var p = this._surface(u, v);
        positions.push(p.x, p.y, p.z);
        uvs.push(i / count, j / lanes);
      }
    }
    for (var a = 0; a < count; a++) for (var b = 0; b < lanes; b++) {
      var q = a * (lanes + 1) + b;
      indices.push(q, q + lanes + 1, q + 1, q + 1, q + lanes + 1, q + lanes + 2);
    }
    var geometry = this._resource(new T.BufferGeometry());
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  };

  CihouHeroScene.prototype._ribbonMaterial = function () {
    var T = global.THREE;
    this.paperUniforms = {
      uTime: { value: 0 }, uReveal: { value: 0 }, uExit: { value: 0 },
      uPaper: { value: new T.Color('#eee9d8') }, uInk: { value: new T.Color('#414b43') },
      uSage: { value: new T.Color('#71816f') }, uFog: { value: new T.Color('#eceee3') }
    };
    return this._resource(new T.ShaderMaterial({
      uniforms: this.paperUniforms, side: T.DoubleSide,
      vertexShader: [
        'varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorld; varying float vDepth;',
        'void main(){vUv=uv; vNormal=normalize(mat3(modelMatrix)*normal);',
        'vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;',
        'vec4 mv=viewMatrix*p;vDepth=-mv.z;gl_Position=projectionMatrix*mv;}'
      ].join('\n'),
      fragmentShader: [
        'precision highp float;',
        'varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorld; varying float vDepth;',
        'uniform float uTime; uniform float uReveal; uniform float uExit;',
        'uniform vec3 uPaper; uniform vec3 uInk; uniform vec3 uSage; uniform vec3 uFog;',
        'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}',
        'float noise(vec2 p){vec2 i=floor(p), f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}',
        'float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<4;i++){n+=a*noise(p);p=p*2.07+vec2(4.1,9.2);a*=.5;}return n;}',
        'void main(){',
        // World anchored pigment and fine screen grain make motion tactile without sparkles.
        'vec2 uv=vUv; float flow=uTime*.0022*(1.-uReveal*.85);',
        'float pigment=fbm(vec2((uv.x-flow)*54.,uv.y*8.));',
        'float fiber=noise(vec2((uv.x-flow)*1200.,uv.y*230.));',
        'float grain=hash(gl_FragCoord.xy);',
        'vec3 n=normalize(vNormal); if(!gl_FrontFacing)n=-n;',
        'float light=.73+.22*max(dot(n,normalize(vec3(-.5,1.,.6))),0.);',
        'vec3 ink=mix(uInk,uSage,.14+pigment*.25);',
        'ink*=light+(pigment-.5)*.16+(fiber-.5)*.045;',
        'float side=min(uv.y,1.-uv.y);',
        'float roughEdge=.025+noise(vec2(uv.x*320.,0.))*.003;',
        'float edge=1.-smoothstep(roughEdge,roughEdge+.006,side);',
        'vec3 paper=uPaper*(.9+.12*light)+(pigment-.5)*.025;',
        'vec3 color=mix(ink,paper,edge);',
        'float whisper=smoothstep(.996,.9995,noise(vec2((uv.x-flow)*790.,uv.y*27.)));',
        'color+=whisper*.012;',
        'float air=smoothstep(8.,24.,vDepth)*(.23+.12*uReveal);',
        'color=mix(color,uFog,air);color+=(grain-.5)*.025;',
        'gl_FragColor=vec4(color,1.);',
        '#include <tonemapping_fragment>',
        '#include <colorspace_fragment>',
        '}'
      ].join('\n')
    }));
  };

  CihouHeroScene.prototype._softTexture = function (type) {
    var T = global.THREE, canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    var ctx = canvas.getContext('2d'), g;
    if (type === 'shadow') {
      g = ctx.createRadialGradient(128,128,5,128,128,125);
      g.addColorStop(0,'rgba(55,66,52,.22)'); g.addColorStop(.45,'rgba(55,66,52,.10)'); g.addColorStop(1,'rgba(55,66,52,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,256,256);
    } else {
      g = ctx.createRadialGradient(128,128,0,128,128,125);
      g.addColorStop(0,'rgba(86,106,76,.16)');g.addColorStop(.6,'rgba(86,106,76,.065)');g.addColorStop(1,'rgba(86,106,76,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,256,256);
    }
    var tex=this._resource(new T.CanvasTexture(canvas));tex.colorSpace=T.SRGBColorSpace;return tex;
  };

  CihouHeroScene.prototype._initWebGL = function () {
    var T=global.THREE;
    this.axisZ=new T.Vector3(0,0,1);
    this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance',premultipliedAlpha:true});
    this.renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1,2));
    this.renderer.outputColorSpace=T.SRGBColorSpace;
    this.renderer.toneMapping=T.NoToneMapping;
    this.renderer.setClearColor('#f0f0e6',0);
    this.renderer.domElement.className='cihou-scene-canvas';
    this.renderer.domElement.setAttribute('aria-hidden','true');
    this.renderer.domElement.style.cssText='display:block;width:100%;height:100%;pointer-events:none;';
    this.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.addEventListener('webglcontextlost',this._onContextLost,false);
    this.scene=new T.Scene();
    this.camera=new T.PerspectiveCamera(38,1,.1,100);
    this.scene.add(new T.HemisphereLight('#faf5dc','#6c7d68',2));
    var key=new T.DirectionalLight('#fff5d8',2.1);key.position.set(-7,10,6);this.scene.add(key);
    this.ribbon=new T.Mesh(this._ribbonGeometry(),this._ribbonMaterial());this.scene.add(this.ribbon);
    this._makePaperEdge();
    var shadowMaterial=this._resource(new T.MeshBasicMaterial({map:this._softTexture('shadow'),transparent:true,depthWrite:false,opacity:.78}));
    this.groundShadow=new T.Mesh(this._resource(new T.PlaneGeometry(12,8.5)),shadowMaterial);
    this.groundShadow.rotation.x=-Math.PI/2;this.groundShadow.position.set(0,-.35,.5);this.scene.add(this.groundShadow);
    this._makeScenery();
    this.girlMaterial=this._resource(new T.SpriteMaterial({transparent:true,depthTest:true,depthWrite:false,color:0xffffff}));
    this.girl=new T.Sprite(this.girlMaterial);this.girl.center.set(.5,.02);this.girl.renderOrder=4;this.girl.visible=false;this.scene.add(this.girl);
    this.contactShadow=new T.Mesh(this._resource(new T.PlaneGeometry(.52,.30)),this._resource(new T.MeshBasicMaterial({map:this._softTexture('shadow'),transparent:true,opacity:.75,depthWrite:false,side:T.DoubleSide})));
    this.scene.add(this.contactShadow);
    this._target=new T.Vector3();this._up=new T.Vector3();
  };

  CihouHeroScene.prototype._makePaperEdge = function () {
    var T=global.THREE, points=[], width=1.13;
    // The two apparent rims form one continuous boundary on a Möbius band.
    for(var i=0;i<=840;i++) points.push(this._surface(i/840*TAU*2,width));
    var curve=new T.CatmullRomCurve3(points,false,'centripetal');
    var geometry=this._resource(new T.TubeGeometry(curve,840,.016,4,false));
    var material=this._resource(new T.MeshLambertMaterial({color:'#ddd4bc',side:T.DoubleSide}));
    this.rim=new T.Mesh(geometry,material);this.scene.add(this.rim);
  };

  CihouHeroScene.prototype._makeScenery = function () {
    var T=global.THREE;this.scenery=[];seed=43291;
    // Sparse, slightly irregular brush leaves. These are placed on the road,
    // rather than being a decorative particle system detached from the world.
    var palette=['#99a184','#899879','#b7aa7d','#7a8b72'];
    var leafShape=new T.Shape();leafShape.moveTo(0,0);leafShape.bezierCurveTo(.12,.035,.13,.12,0,.23);leafShape.bezierCurveTo(-.045,.11,-.035,.035,0,0);
    var leafGeometry=this._resource(new T.ShapeGeometry(leafShape,9));
    for(var i=0;i<23;i++){
      var u=i/23*TAU+.05+random()*.13;
      var side=i%2 ? -1 : 1;var b=this._basis(u);var p=this._surface(u,side*(.91+random()*.14));
      var leaves=new T.Group();leaves.position.copy(p).addScaledVector(b.normal,.012);
      var mat=this._resource(new T.MeshLambertMaterial({color:palette[i%palette.length],side:T.DoubleSide,transparent:true,opacity:.8}));
      for(var j=0;j<3;j++){
        var leaf=new T.Mesh(leafGeometry,mat);leaf.rotation.z=(j-1)*.7;leaf.scale.setScalar(.6+random()*.55);leaves.add(leaf);
      }
      // Face the tuft outward from the ribbon, giving it a paper-cut silhouette.
      leaves.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),b.across);
      leaves.userData.phase=random()*TAU;this.scene.add(leaves);this.scenery.push(leaves);
    }
    this.fallen=[];
    var fallenGeometry=this._resource(new T.CircleGeometry(.045,5));
    var fallenMat=this._resource(new T.MeshBasicMaterial({color:'#d1b58b',side:T.DoubleSide,transparent:true,opacity:.7}));
    for(var k=0;k<13;k++){
      var angle=random()*TAU;var basis=this._basis(angle);
      var fallen=new T.Mesh(fallenGeometry,fallenMat);fallen.position.copy(this._surface(angle,(random()-.5)*1.7)).addScaledVector(basis.normal,.018);
      fallen.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),basis.normal);fallen.rotateZ(random()*TAU);fallen.scale.y=.45+random()*.4;this.scene.add(fallen);this.fallen.push(fallen);
    }
  };

  CihouHeroScene.prototype._makeExitPath = function () {
    var T=global.THREE;
    this.exitStartU=this.currentU === undefined ? -.65+this.elapsed*.043 : this.currentU;
    var basis=this._basis(this.exitStartU),side=basis.across.y<0 ? 1 : -1;
    var rim=this._surface(this.exitStartU,side*1.12);
    var outward=basis.across.clone().multiplyScalar(side);
    var landing=rim.clone().addScaledVector(outward,1.15);landing.y=-.25;
    // The path unfolds from the actual edge beneath her feet; there is no
    // teleport to an unrelated ground coordinate when the final gesture starts.
    var end=landing.clone().add(new T.Vector3(1.45,0,1.15));
    this.exitCurve=new T.CatmullRomCurve3([
      basis.point.clone().addScaledVector(basis.normal,.025),
      rim.clone().addScaledVector(basis.normal,.025),
      rim.clone().addScaledVector(outward,.42).add(new T.Vector3(0,-.2,.1)),
      landing,end
    ],false,'centripetal');
    var positions=[],indices=[],steps=80;
    // The branch begins at the edge (roughly the first fifth of the route).
    for(var i=0;i<=steps;i++){
      var at=.19+(i/steps)*.81,point=this.exitCurve.getPoint(at),tangent=this.exitCurve.getTangent(at);
      var cross=new T.Vector3().crossVectors(tangent,new T.Vector3(0,1,0)).normalize();
      if(cross.lengthSq()<.01)cross.copy(basis.tangent);
      var taper=.31*(1-smooth((i/steps-.7)/.3)*.8);
      var left=point.clone().addScaledVector(cross,-taper),right=point.clone().addScaledVector(cross,taper);
      positions.push(left.x,left.y,left.z,right.x,right.y,right.z);
      if(i<steps){var k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
    }
    var geometry=this._resource(new T.BufferGeometry());geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    var material=this._resource(new T.MeshLambertMaterial({color:'#d9dcc7',side:T.DoubleSide,transparent:true,opacity:0,depthWrite:false}));
    if(this.exitRibbon)this.scene.remove(this.exitRibbon);
    this.exitRibbon=new T.Mesh(geometry,material);this.exitRibbon.renderOrder=1;this.scene.add(this.exitRibbon);
  };

  CihouHeroScene.prototype._loadSprite = function () {
    var self=this,url=this.options.spriteUrl;
    if(!url)return;
    var image=new Image();
    image.onload=function(){
      if(self.destroyed)return;
      self.spriteImage=image;
      self.spriteAspect=self.options.spriteAspect || (image.naturalWidth/self.spriteColumns)/(image.naturalHeight/self.spriteRows);
      if(self.mode==='webgl'){
        var T=global.THREE,texture=self._resource(new T.Texture(image));
        texture.colorSpace=T.SRGBColorSpace;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearFilter;texture.generateMipmaps=false;
        texture.wrapS=texture.wrapT=T.ClampToEdgeWrapping;texture.repeat.set(1/self.spriteColumns,1/self.spriteRows);texture.needsUpdate=true;
        self.girlTexture=texture;self.girlMaterial.map=texture;self.girlMaterial.needsUpdate=true;self.girl.visible=true;
      }
      if(typeof self.options.onSpriteReady==='function')self.options.onSpriteReady();
      self._render(0);
    };
    image.onerror=function(){if(typeof self.options.onError==='function')self.options.onError('sprite-load');};
    image.src=url;
  };

  CihouHeroScene.prototype._setSpriteFrame = function (frame) {
    frame=Math.floor(frame)%this.spriteFrames;this.currentFrame=frame;
    if(this.girlTexture){var col=frame%this.spriteColumns,row=Math.floor(frame/this.spriteColumns);this.girlTexture.offset.set(col/this.spriteColumns,1-(row+1)/this.spriteRows);}
  };

  CihouHeroScene.prototype._updateWebGL = function () {
    var T=global.THREE,p=smooth(this.progress),e=smooth(this.exit),time=this.elapsed;
    var u=this.exitCurve && this.targetExit>0 ? this.exitStartU : -.65+time*.043;
    this.currentU=u;
    // The close camera travels with her. Pulling back progressively releases
    // that tracking camera and reveals that the long road has been a loop.
    var b=this._basis(u),n=b.normal.clone();
    if(n.y<0)n.negate();
    var nearTarget=b.point.clone().addScaledVector(n,.24);
    var nearPosition=b.point.clone().addScaledVector(n,6.75).addScaledVector(b.tangent,-3.5);
    var nearUp=b.tangent.clone().multiplyScalar(.79).addScaledVector(b.across,.61).normalize();
    var portrait=Math.max(1,.93/Math.max(.4,this.width/this.height));
    var farPosition=new T.Vector3(8.2,8.0,11.5).multiplyScalar(portrait);
    var farTarget=new T.Vector3(-.05,2.25,0);
    this.camera.position.copy(nearPosition).lerp(farPosition,p);
    this._target.copy(nearTarget).lerp(farTarget,p);
    this._up.copy(nearUp).lerp(new T.Vector3(0,1,0),p).normalize();
    this.camera.up.copy(this._up);
    var girlPosition=b.point.clone().addScaledVector(n,.035);
    if(e>0){
      if(!this.exitCurve)this._makeExitPath();
      girlPosition.copy(this.exitCurve.getPointAt(e));
      this.exitRibbon.material.opacity=smooth(e/.16)*.85;
      this.camera.position.lerp(new T.Vector3(8.4,7.3,13.8).multiplyScalar(portrait),e*.5);
      this._target.lerp(new T.Vector3(1.5,1.7,1.2),e*.5);
    }
    this.camera.lookAt(this._target);
    this.camera.updateMatrixWorld();
    this.girl.position.copy(girlPosition);
    var size=mix(.61,.92,p)*(1-e*.12);
    this.girl.scale.set(size*this.spriteAspect,size,1);
    this.girlMaterial.opacity=1-smooth((e-.94)/.06);
    this.contactShadow.position.copy(girlPosition).addScaledVector(n,-.025);
    var shadowNormal=n.clone().lerp(new T.Vector3(0,1,0),smooth(e/.6)).normalize();
    this.contactShadow.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),shadowNormal);
    this.contactShadow.material.opacity=.7*(1-smooth((e-.94)/.06));
    this.contactShadow.scale.setScalar(mix(.65,1,p));
    this.paperUniforms.uTime.value=time;this.paperUniforms.uReveal.value=p;this.paperUniforms.uExit.value=e;
    this.scenery.forEach(function(tuft){tuft.scale.y=1+Math.sin(time*.9+tuft.userData.phase)*.015;});
    this._setSpriteFrame(this.reducedMotion ? 0 : time*this.spriteFps);
    this.renderer.render(this.scene,this.camera);
  };

  CihouHeroScene.prototype._initCanvas = function () {
    this.canvas=document.createElement('canvas');this.canvas.className='cihou-scene-canvas';this.canvas.setAttribute('aria-hidden','true');
    this.canvas.style.cssText='display:block;width:100%;height:100%;pointer-events:none;';this.container.appendChild(this.canvas);this.context=this.canvas.getContext('2d');
  };

  CihouHeroScene.prototype._updateCanvas = function () {
    var ctx=this.context,w=this.width,h=this.height,p=smooth(this.progress),e=smooth(this.exit),dpr=this.dpr;
    if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    var roadWidth=mix(Math.min(w,h)*.22,Math.min(w,h)*.085,p);
    ctx.save();ctx.translate(w*.5,h*.5);ctx.rotate(-.58*(1-p));
    ctx.lineCap='round';ctx.strokeStyle='#e1d9c4';ctx.lineWidth=roadWidth+5;
    var radius=Math.min(w,h)*.3;
    function path(){ctx.beginPath();if(p<.01){ctx.moveTo(-w,0);ctx.lineTo(w,0);}else{ctx.ellipse(0,0,mix(w*2,radius*1.45,p),mix(0,radius*.63,p),0,0,TAU);}}
    path();ctx.stroke();ctx.lineWidth=roadWidth;ctx.strokeStyle='#4c584b';path();ctx.stroke();
    ctx.restore();
    if(this.spriteImage){
      var frame=Math.floor(this.reducedMotion?0:this.elapsed*this.spriteFps)%this.spriteFrames;
      var sw=this.spriteImage.naturalWidth/this.spriteColumns,sh=this.spriteImage.naturalHeight/this.spriteRows;
      var gh=clamp(h*.075,42,78),gx=w*.5+e*w*.25,gy=h*.5+e*h*.23;
      ctx.globalAlpha=1-smooth((e-.86)/.14);
      ctx.drawImage(this.spriteImage,(frame%this.spriteColumns)*sw,Math.floor(frame/this.spriteColumns)*sh,sw,sh,gx-gh*this.spriteAspect*.5,gy-gh,gh*this.spriteAspect,gh);ctx.globalAlpha=1;
    }
  };

  CihouHeroScene.prototype._resize = function () {
    if(this.destroyed)return;var bounds=this.container.getBoundingClientRect();
    this.width=Math.max(1,bounds.width);this.height=Math.max(1,bounds.height);this.dpr=Math.min(global.devicePixelRatio||1,2);
    if(this.mode==='webgl'){this.renderer.setPixelRatio(this.dpr);this.renderer.setSize(this.width,this.height,false);this.camera.aspect=this.width/this.height;this.camera.updateProjectionMatrix();}
    else {this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);}
    if(this.ready)this._render(0);
  };
  CihouHeroScene.prototype._onContextLost = function (event) {event.preventDefault();this.active=false;if(typeof this.options.onError==='function')this.options.onError('webgl-context-lost');};
  CihouHeroScene.prototype._render = function () {if(this.destroyed)return;if(this.mode==='webgl')this._updateWebGL();else this._updateCanvas();};
  CihouHeroScene.prototype._frame = function (now) {
    if(this.destroyed)return;
    var dt=this.lastTime?Math.min(.05,(now-this.lastTime)/1000):0;this.lastTime=now;
    var animating=this.active&&!this.paused&&!this.reducedMotion;
    var difference=Math.abs(this.progress-this.targetProgress)+Math.abs(this.exit-this.targetExit);
    if(animating)this.elapsed+=dt;
    if(difference>.00001){
      var lerp=this.reducedMotion?1:1-Math.exp(-dt*5.5);
      this.progress=mix(this.progress,this.targetProgress,lerp);this.exit=mix(this.exit,this.targetExit,lerp);
    }
    if(this.active&&(animating||difference>.00001||!this.firstRendered)){this._render(dt);this.firstRendered=true;}
    this.raf=global.requestAnimationFrame(this._frame);
  };
  CihouHeroScene.prototype.setProgress = function (value) {this.targetProgress=clamp(Number(value)||0,0,1);if(this.reducedMotion)this.progress=this.targetProgress;this._render(0);return this;};
  CihouHeroScene.prototype.setExit = function (value) {var next=clamp(Number(value)||0,0,1);if(next>0&&this.targetExit===0&&this.mode==='webgl')this._makeExitPath();this.targetExit=next;if(next===0&&this.exitRibbon)this.exitRibbon.material.opacity=0;if(this.reducedMotion)this.exit=this.targetExit;this._render(0);return this;};
  CihouHeroScene.prototype.setPaused = function (value) {this.paused=!!value;this.lastTime=0;return this;};
  CihouHeroScene.prototype.setActive = function (value) {this.active=!!value;this.lastTime=0;if(value)this._render(0);return this;};
  CihouHeroScene.prototype.destroy = function () {
    this.destroyed=true;global.cancelAnimationFrame(this.raf);if(this.resizeObserver)this.resizeObserver.disconnect();else global.removeEventListener('resize',this._resize);
    if(this.renderer){this.renderer.domElement.removeEventListener('webglcontextlost',this._onContextLost);this.renderer.dispose();this.renderer.domElement.remove();}
    if(this.canvas)this.canvas.remove();this.resources.forEach(function(r){if(r&&r.dispose)r.dispose();});this.resources=[];
  };
  global.CihouHeroScene=CihouHeroScene;
})(window);

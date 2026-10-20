/* Cihou V15 — an original painted landscape with a genuinely closed walk.
 * No imagery, code, fonts, or geometry from reference websites is included.
 * The botanical cutouts, paper, washes and drifting seeds are drawn locally.
 * Public API deliberately separates choosing a landscape from taking a step.
 */
(function (global) {
  'use strict';
  var T = global.THREE, PI = Math.PI, TAU = PI * 2;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var mix = function (a, b, t) { return a + (b - a) * t; };
  var smooth = function (v) { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
  var wrap = function (v, length) { return ((v % length) + length) % length; };
  var V = function (x, y, z) { return new T.Vector3(x || 0, y || 0, z || 0); };
  var palettes = [
    { name: 'forest', paper: '#d8dfd0', ground: '#a7b3a0', ink: '#385e53', path: '#b7bc98', air: '#d1dccd', petal: '#e1cb96' },
    { name: 'meadow', paper: '#eeeadc', ground: '#e2d7b8', ink: '#82795e', path: '#d2c7a7', air: '#ece5d4', petal: '#c3a56f' },
    { name: 'moor', paper: '#e5e9e5', ground: '#ced7d1', ink: '#687c81', path: '#bec9c2', air: '#dfe6e1', petal: '#a9b7b5' }
  ];
  function random(seed) {
    var value = seed >>> 0;
    return function () { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
  }
  function Scene(container, options) {
    this.container = container; this.options = options || {}; this.resources = [];
    this.apiVersion = 15; this.interactionMode = 'world'; this.pointerSteering = true;
    this.choiceByHolding = false; this.mode = 'webgl'; this.active = true;
    this.paused = false; this.destroyed = false; this.last = 0; this.raf = 0;
    this.reducedMotion = this.options.reducedMotion === undefined
      ? !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches)
      : !!this.options.reducedMotion;
    this.figureHeight = 1.48; this.walkSpeed = 3.65; this.revealSeconds = 16;
    this._tick = this._tick.bind(this); this.resize = this.resize.bind(this);
    this._resetState();
    try { this._init(); } catch (error) {
      this.resources.forEach(function (resource) { resource.dispose(); }); this.resources.length = 0;
      if (this.scene) this.scene.clear();
      this._disposeRenderer(); this.mode = 'fallback'; this._fallback();
    }
    if (global.ResizeObserver) { this.observer = new ResizeObserver(this.resize); this.observer.observe(container); }
    else global.addEventListener('resize', this.resize);
    this.resize(); this._requestFrame();
    if (this.options.onReady) this.options.onReady({ mode: this.mode, apiVersion: this.apiVersion });
  }
  Scene.prototype._own = function (item) { this.resources.push(item); return item; };
  Scene.prototype._resetState = function () {
    this.time = 0; this.travel = 0; this.distanceWalked = 0; this.gaitTime = 0;
    this.progress = 0; this.targetInteraction = 0; this.steering = 0;
    this.velocity = 0; this.lastDirection = 1; this.phase = 'walking';
    this.chapter = 0; this.beat = 0; this.canExit = false;
    this.biome = 0; this.biomeWeights = [1, 0, 0]; this.biomeFrom = [1, 0, 0];
    this.transitionAge = 3; this.transitionDuration = 2.8; this.selectedChoice = null;
    this.exitProgress = 0; this.exitDistance = 0; this.exitAge = 0;
    this.exitComplete = false; this.presentationReady = false;
    this.exitOrigin = null; this.exitCurve = null; this.lastStateKey = '';
    this.cameraAnchor = null; this.lastFacing = 1;
  };
  Scene.prototype._canvas = function (width, height) {
    var canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; return canvas;
  };
  Scene.prototype._texture = function (canvas) {
    var texture = this._own(new T.CanvasTexture(canvas));
    texture.colorSpace = T.SRGBColorSpace; texture.minFilter = T.LinearMipmapLinearFilter;
    texture.magFilter = T.LinearFilter; texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    return texture;
  };
  Scene.prototype._paper = function () {
    var canvas = this._canvas(512, 512), ctx = canvas.getContext('2d'), rng = random(8415);
    ctx.fillStyle = '#f2f0e8'; ctx.fillRect(0, 0, 512, 512);
    for (var i = 0; i < 24000; i++) {
      var grey = 90 + Math.floor(rng() * 130);
      ctx.fillStyle = 'rgba(' + grey + ',' + grey + ',' + (grey - 8) + ',' + (.018 + rng() * .045) + ')';
      var x = rng() * 512, y = rng() * 512;
      ctx.fillRect(x, y, .4 + rng() * 1.4, .5 + rng() * 2.8);
    }
    for (var j = 0; j < 100; j++) {
      ctx.globalAlpha = .014; ctx.fillStyle = j % 2 ? '#798a76' : '#b0a37f';
      ctx.beginPath(); ctx.ellipse(rng() * 512, rng() * 512, 12 + rng() * 70, 4 + rng() * 35, rng() * TAU, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1; var texture = this._texture(canvas);
    texture.wrapS = texture.wrapT = T.RepeatWrapping; texture.repeat.set(22, 22); return texture;
  };
  Scene.prototype._leaf = function (ctx, x, y, rx, ry, angle, color, alpha, rng) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.fillStyle = color; ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.moveTo(-rx, 0);
    ctx.bezierCurveTo(-rx * .5, -ry * (1 + rng() * .5), rx * .55, -ry, rx, 0);
    ctx.bezierCurveTo(rx * .45, ry, -rx * .6, ry * .7, -rx, 0); ctx.fill(); ctx.restore();
  };
  Scene.prototype._treeTexture = function (variant, kind) {
    var canvas = this._canvas(512, 1024), ctx = canvas.getContext('2d'), rng = random(1921 + variant * 79 + kind * 307);
    var colors = kind === 1 ? ['#969168', '#b0a777', '#c4b789', '#d0c397']
      : variant === 2 ? ['#62785b', '#7d8a63', '#96a176', '#adb48d']
      : variant === 3 ? ['#345b54', '#52756a', '#729083', '#90a597']
      : ['#30564b', '#4b6e59', '#6e8869', '#93a27f'];
    var baseX = 253, lean = (rng() - .5) * 38, crown = 184 + rng() * 35;
    // An opaque, asymmetrical crown gives each tree the weight of a painted
    // cutout. Fine leaves alone made the previous scene look transparent.
    ctx.save(); ctx.beginPath();
    for (var edge = 0; edge < 2; edge++) {
      for (var j = 0; j <= 24; j++) {
        var fraction = edge ? 1 - j / 24 : j / 24, cy = 48 + fraction * 735;
        var breadth = variant % 2 ? Math.pow(Math.sin(fraction * PI * .78), .7) : Math.pow(Math.sin(fraction * PI), .42);
        var px = baseX + lean * (1 - fraction) + (edge ? -1 : 1) * (12 + crown * breadth * (.89 + rng() * .17));
        if (!edge && !j) ctx.moveTo(px, cy); else ctx.lineTo(px, cy + (rng() - .5) * 13);
      }
    }
    ctx.closePath(); ctx.fillStyle = colors[0]; ctx.fill(); ctx.clip();
    for (var band = 0; band < 26; band++) {
      var by = band * 31 + 30;
      ctx.fillStyle = colors[(band + variant) % 4]; ctx.globalAlpha = .16 + rng() * .25;
      ctx.beginPath(); ctx.moveTo(-20, by + 18);
      ctx.bezierCurveTo(135, by - 7, 350, by + 60, 540, by + 17);
      ctx.lineTo(540, by + 69); ctx.bezierCurveTo(330, by + 99, 145, by + 25, -20, by + 79); ctx.fill();
    }
    for (var n = 0; n < 3300; n++) {
      var markX = rng() * 512, markY = rng() * 850;
      ctx.strokeStyle = n % 4 ? colors[3] : '#213e35'; ctx.globalAlpha = .045 + rng() * .11;
      ctx.lineWidth = .6 + rng() * 2.4; ctx.beginPath(); ctx.moveTo(markX, markY);
      ctx.lineTo(markX + 3 + rng() * 21, markY + (rng() - .5) * 4); ctx.stroke();
    }
    ctx.restore(); ctx.globalAlpha = 1;
    ctx.lineCap = 'round'; ctx.strokeStyle = kind === 1 ? '#5f6650' : '#294b3e';
    ctx.lineWidth = 10 + rng() * 5; ctx.beginPath(); ctx.moveTo(baseX, 1012);
    ctx.bezierCurveTo(245, 828, baseX + lean, 480, baseX + lean, 150); ctx.stroke();
    for (var b = 0; b < 13; b++) {
      var branchY = 260 + b * 44, side = b % 2 ? 1 : -1, reach = (820 - branchY) * .16 + rng() * 58;
      ctx.lineWidth = 2.0 + b * .13; ctx.beginPath(); ctx.moveTo(baseX + lean * .55, branchY + 55);
      ctx.quadraticCurveTo(baseX + side * reach * .6, branchY + 55, baseX + side * reach, branchY + 14); ctx.stroke();
      for (var twig = 0; twig < 4; twig++) {
        var tx = mix(baseX, baseX + side * reach, .35 + twig * .16), ty = branchY + 52 - twig * 7;
        ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + side * 5, ty - 12 - rng() * 11); ctx.stroke();
      }
    }
    // A narrow pale scratch is a material detail, rather than a glossy rim.
    ctx.strokeStyle = '#c0c7a5'; ctx.globalAlpha = .25; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(baseX - 4, 995); ctx.quadraticCurveTo(245, 705, baseX + lean - 4, 300); ctx.stroke();
    ctx.globalAlpha = 1; return this._texture(canvas);
  };
  Scene.prototype._grassTexture = function (variant, biome) {
    var canvas = this._canvas(256, 256), ctx = canvas.getContext('2d'), rng = random(872 + variant * 211 + biome * 402);
    var colors = biome === 0 ? ['#4d735e', '#789371', '#b0b58b']
      : biome === 1 ? ['#a19666', '#b7ac76', '#cebf86'] : ['#829791', '#a4b3a7', '#6f8580'];
    ctx.lineCap = 'round';
    for (var i = 0; i < 48; i++) {
      var x = 26 + rng() * 204, height = 16 + Math.pow(rng(), 1.7) * 192, lean = (rng() - .5) * 95;
      ctx.globalAlpha = .34 + rng() * .5; ctx.strokeStyle = colors[i % 3]; ctx.lineWidth = 1.3 + rng() * 2.8;
      ctx.beginPath(); ctx.moveTo(x, 250); ctx.quadraticCurveTo(x + lean * .25, 250 - height * .6, x + lean, 250 - height); ctx.stroke();
      if (variant > 0 && i % 5 === 0) {
        for (var j = 0; j < 5; j++) this._leaf(ctx, x + lean * .8 + (j % 2 ? 3 : -3), 250 - height + j * 7, 2.5, 5, j % 2 ? -.7 : .7, colors[(i + 1) % 3], .55, rng);
      }
      if (biome === 0 && variant === 0 && i % 4 === 0) {
        for (var leaf = 0; leaf < 4; leaf++) {
          var amount = .3 + leaf * .15;
          this._leaf(ctx, x + lean * amount, 250 - height * amount, 6 + rng() * 5, 2.5 + rng() * 2,
            leaf % 2 ? -.65 : .65, colors[(i + leaf) % 3], .72, rng);
        }
      }
    }
    ctx.globalAlpha = 1; return this._texture(canvas);
  };
  Scene.prototype._rockTexture = function (variant) {
    var canvas = this._canvas(384, 256), ctx = canvas.getContext('2d'), rng = random(991 + variant * 71);
    var points = [[28, 235], [37, 145], [116, 54], [236, 40], [327, 102], [354, 221]];
    ctx.beginPath(); points.forEach(function (p, i) { if (!i) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0] + rng() * 12, p[1] + rng() * 12); }); ctx.closePath();
    ctx.fillStyle = variant ? '#9ba8a1' : '#b2b7a7'; ctx.fill(); ctx.clip();
    ctx.fillStyle = '#82958d'; ctx.globalAlpha = .37; ctx.beginPath(); ctx.moveTo(116, 54); ctx.lineTo(198, 156); ctx.lineTo(154, 256); ctx.lineTo(-10, 256); ctx.lineTo(-10, 0); ctx.fill();
    for (var n = 0; n < 1700; n++) {
      ctx.fillStyle = n % 2 ? '#e6e6d8' : '#576e6c'; ctx.globalAlpha = .025 + rng() * .06;
      ctx.fillRect(rng() * 384, rng() * 256, 1 + rng() * 8, .6 + rng() * 2);
    }
    ctx.globalAlpha = .22; ctx.strokeStyle = '#526f6d'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(116, 56); ctx.lineTo(195, 157); ctx.lineTo(154, 255); ctx.stroke();
    return this._texture(canvas);
  };
  Scene.prototype._washTexture = function () {
    var canvas = this._canvas(256, 256), ctx = canvas.getContext('2d'), rng = random(515);
    for (var i = 0; i < 100; i++) {
      var a = rng() * TAU, r = rng() * 73;
      ctx.fillStyle = 'rgba(74,96,85,' + (.008 + rng() * .012) + ')';
      ctx.beginPath(); ctx.ellipse(128 + Math.cos(a) * r, 128 + Math.sin(a) * r, 20 + rng() * 50, 15 + rng() * 45, 0, 0, TAU); ctx.fill();
    }
    return this._texture(canvas);
  };
  Scene.prototype._height = function (x, z) { return .10 * Math.sin(x * .24) * Math.cos(z * .21) + .035 * Math.sin(z * .71 + x * .13); };
  Scene.prototype._init = function () {
    if (!T) throw new Error('Three.js unavailable');
    this.renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = T.SRGBColorSpace; this.renderer.setPixelRatio(Math.min(1.8, global.devicePixelRatio || 1));
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none';
    this.container.appendChild(this.renderer.domElement);
    this.scene = new T.Scene(); this.scene.fog = new T.Fog(palettes[0].air, 38, 90);
    this.camera = new T.OrthographicCamera(-8, 8, 6, -6, .1, 180);
    this.world = new T.Group(); this.world.name = 'cihou-original-painted-world-v15'; this.scene.add(this.world);
    this.materialGroups = [[], [], []]; this.batches = []; this.swayUniform = { value: 0 };
    this._makeRoute(); this._ground(); this._road(); this._botanicals(); this._particles(); this._walker();
    this.camera.updateMatrixWorld();
  };
  Scene.prototype._makeRoute = function () {
    // The start is on a long diagonal. A traveller can return to this exact point.
    var points = [[8.6, 7.3], [13.6, 2.6], [13.4, -4.5], [8.0, -8.5], [.8, -8.0], [-6.0, -9.7], [-12.9, -6.3], [-14.1, -.2], [-10.4, 6.2], [-3.2, 9.0], [3.9, 9.1]];
    this.route = new T.CatmullRomCurve3(points.map(function (p) { return V(p[0], this._height(p[0], p[1]) + .035, p[1]); }, this), true, 'centripetal');
    this.route.arcLengthDivisions = 1200; this.routeLength = this.route.getLength();
    this.routeSamples = Array.from({ length: 120 }, function (_, index) { return this.route.getPointAt(index / 120); }, this);
  };
  Scene.prototype._point = function (distance) { return this.route.getPointAt(wrap(distance, this.routeLength) / this.routeLength); };
  Scene.prototype._tangent = function (distance) { return this.route.getTangentAt(wrap(distance, this.routeLength) / this.routeLength).setY(0).normalize(); };
  Scene.prototype._roadDistance = function (x, z) {
    var minimum = Infinity;
    for (var i = 0; i < this.routeSamples.length; i++) {
      var p = this.routeSamples[i], d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
      if (d < minimum) minimum = d;
    }
    return Math.sqrt(minimum);
  };
  Scene.prototype._ground = function () {
    this.paperTexture = this._paper();
    var geometry = this._own(new T.PlaneGeometry(180, 180, 70, 70)); geometry.rotateX(-PI / 2);
    var positions = geometry.attributes.position;
    for (var i = 0; i < positions.count; i++) positions.setY(i, this._height(positions.getX(i), positions.getZ(i)) - .045);
    geometry.computeVertexNormals();
    this.groundMaterial = this._own(new T.MeshBasicMaterial({ color: palettes[0].ground, map: this.paperTexture }));
    this.groundUniforms = { walker: { value: V(8.6, 0, 7.3) }, forest: { value: 1 } };
    var groundUniforms = this.groundUniforms;
    this.groundMaterial.onBeforeCompile = function (shader) {
      shader.uniforms.paintWalker = groundUniforms.walker; shader.uniforms.paintForest = groundUniforms.forest;
      shader.vertexShader = 'varying vec3 paintWorld;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\npaintWorld=(modelMatrix*vec4(position,1.)).xyz;');
      shader.fragmentShader = 'varying vec3 paintWorld;uniform vec3 paintWalker;uniform float paintForest;float brushHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', [
        '#include <map_fragment>',
        'float stroke=sin(paintWorld.z*13.+sin(paintWorld.x*.43)*.46);',
        'float broken=brushHash(floor(paintWorld.xz*vec2(1.1,19.)));',
        'float longBrush=smoothstep(.05,.85,broken)*stroke;',
        'float pool=exp(-dot(paintWorld.xz-paintWalker.xz,paintWorld.xz-paintWalker.xz)/48.);',
        'diffuseColor.rgb*=.88+.09*longBrush+.14*pool;',
        'diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.15,1.09,.86),pool*.55*paintForest);'
      ].join('\n'));
    };
    this.groundMesh = new T.Mesh(geometry, this.groundMaterial); this.world.add(this.groundMesh);
    var wash = this._washTexture(), rng = random(1552);
    var washMaterial = this._own(new T.MeshBasicMaterial({ map: wash, transparent: true, opacity: .45, depthWrite: false, color: '#3f6652' }));
    var washGeometry = this._own(new T.PlaneGeometry(1, 1)); washGeometry.rotateX(-PI / 2);
    var patches = new T.InstancedMesh(washGeometry, washMaterial, 90), matrix = new T.Object3D();
    for (var j = 0; j < 90; j++) {
      var x = (rng() - .5) * 70, z = (rng() - .5) * 55;
      matrix.position.set(x, this._height(x, z) - .025, z); matrix.rotation.y = rng() * TAU;
      matrix.scale.set(2 + rng() * 8, 1, 1 + rng() * 6); matrix.updateMatrix(); patches.setMatrixAt(j, matrix.matrix);
    }
    this.world.add(patches); this.washMaterial = washMaterial;
  };
  Scene.prototype._ribbon = function (curve, width, segments) {
    var vertices = [], uv = [], indices = [];
    for (var i = 0; i <= segments; i++) {
      var t = i / segments, p = curve.getPointAt(t), next = curve.getTangentAt(t).setY(0).normalize(), side = V(-next.z, 0, next.x);
      var breath = 1 + .085 * Math.sin(t * 43) + .043 * Math.sin(t * 107);
      for (var k = -1; k <= 1; k += 2) {
        var q = p.clone().addScaledVector(side, k * width * .5 * breath); q.y = this._height(q.x, q.z) + .025;
        vertices.push(q.x, q.y, q.z); uv.push(k < 0 ? 0 : 1, t * 12);
      }
      if (i < segments) { var v = i * 2; indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3); }
    }
    var geometry = this._own(new T.BufferGeometry()); geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
  };
  Scene.prototype._roadMaterial = function (color) {
    var material = this._own(new T.MeshBasicMaterial({ color: color, side: T.DoubleSide, map: this.paperTexture, transparent: true }));
    material.polygonOffset = true; material.polygonOffsetFactor = -1;
    material.onBeforeCompile = function (shader) {
      shader.vertexShader = 'varying vec2 cihouRoadUv;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\ncihouRoadUv=uv;');
      shader.fragmentShader = 'varying vec2 cihouRoadUv;float paperGrain(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\nfloat sideEdge=min(cihouRoadUv.x,1.-cihouRoadUv.x);float dry=paperGrain(floor(cihouRoadUv*vec2(170.,1800.)));float stroke=sin(cihouRoadUv.y*320.+sin(cihouRoadUv.x*13.)*.7);diffuseColor.rgb*=.94+.055*dry+.035*stroke;diffuseColor.a*=smoothstep(.001,.028+dry*.014,sideEdge);');
    }; return material;
  };
  Scene.prototype._road = function () {
    this.roadMaterial = this._roadMaterial(palettes[0].path);
    this.roadMesh = new T.Mesh(this._ribbon(this.route, 1.06, 260), this.roadMaterial); this.world.add(this.roadMesh);
    var linePoints = [];
    for (var i = 0; i <= 300; i++) {
      var p = this._point(i / 300 * this.routeLength), direction = this._tangent(i / 300 * this.routeLength);
      p.addScaledVector(V(-direction.z, 0, direction.x), .49 + .04 * Math.sin(i * .31)); p.y += .012; linePoints.push(p);
    }
    this.edgeMaterial = this._own(new T.LineBasicMaterial({ color: '#7a8575', transparent: true, opacity: .28 }));
    this.world.add(new T.Line(this._own(new T.BufferGeometry().setFromPoints(linePoints)), this.edgeMaterial));
    // Sparse flecks, not arrows or a reward trail, expose the ground scale.
    var fleckGeometry = this._own(new T.PlaneGeometry(.035, .12)); fleckGeometry.rotateX(-PI / 2);
    var fleckMaterial = this._own(new T.MeshBasicMaterial({ color: '#7b8877', transparent: true, opacity: .24, depthWrite: false }));
    var flecks = new T.InstancedMesh(fleckGeometry, fleckMaterial, 240), dummy = new T.Object3D(), rng = random(132);
    for (var k = 0; k < 240; k++) {
      var d = rng() * this.routeLength, at = this._point(d), tangent = this._tangent(d);
      at.addScaledVector(V(-tangent.z, 0, tangent.x), (rng() - .5) * .92); at.y += .018;
      dummy.position.copy(at); dummy.rotation.y = rng() * TAU; dummy.scale.setScalar(.4 + rng()); dummy.updateMatrix(); flecks.setMatrixAt(k, dummy.matrix);
    }
    this.world.add(flecks);
  };
  Scene.prototype._batch = function (texture, placements, biome, options) {
    options = options || {}; if (!placements.length) return;
    var geometry = this._own(new T.PlaneGeometry(1, 1)); geometry.translate(0, .5, 0);
    var material = this._own(new T.MeshBasicMaterial({ map: texture, side: T.DoubleSide, transparent: true,
      alphaTest: .065, depthWrite: true, color: options.tint || '#ffffff', opacity: biome === 0 ? 1 : 0 }));
    this.materialGroups[biome].push(material);
    if (options.sway) {
      var clock = this.swayUniform;
      material.onBeforeCompile = function (shader) {
        shader.uniforms.paintWind = clock;
        shader.vertexShader = 'uniform float paintWind;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.x+=sin(paintWind*.53+instanceMatrix[3].x*.37+instanceMatrix[3].z*.23)*pow(max(position.y,0.),2.)*.022;');
      };
    }
    var mesh = new T.InstancedMesh(geometry, material, placements.length), dummy = new T.Object3D();
    placements.forEach(function (p, index) {
      dummy.position.set(p.x, this._height(p.x, p.z), p.z); dummy.rotation.set(0, .57 + (p.angle || 0), p.tilt || 0);
      dummy.scale.set((p.flip || 1) * p.w, p.h, 1); dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix);
    }, this);
    mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); this.world.add(mesh); this.batches.push(mesh);
  };
  Scene.prototype._placements = function (count, seed, scale, minimumRoad, extent) {
    var rng = random(seed), list = [], tries = 0; extent = extent || 1;
    while (list.length < count && tries++ < count * 35) {
      var x = (rng() - .5) * 58 * extent, z = (rng() - .5) * 45 * extent, distance = this._roadDistance(x, z);
      if (distance < minimumRoad || distance > 13 || (x * x + z * z < 11 && minimumRoad > 1)) continue;
      // Leave irregular unplanted pockets, so neither the world nor the ring is a wall.
      var pocket = Math.sin(x * .32 + z * .17) + Math.cos(z * .46 - x * .11);
      if (pocket > 1.15 && rng() > .26) continue;
      var h = scale[0] + rng() * (scale[1] - scale[0]);
      list.push({ x: x, z: z, h: h, w: h * (.43 + rng() * .19), flip: rng() > .5 ? 1 : -1, tilt: (rng() - .5) * .035 });
    }
    return list;
  };
  Scene.prototype._botanicals = function () {
    var i, b;
    for (i = 0; i < 4; i++) {
      this._batch(this._treeTexture(i, 0), this._placements(28, 412 + i * 341, [3.0, 6.4], 1.6), 0, { sway: true });
      this._batch(this._treeTexture(i, 1), this._placements(3, 712 + i * 131, [2.8, 4.9], 1.7), 1, { sway: true, tint: '#f3eddb' });
    }
    for (b = 0; b < 3; b++) {
      for (i = 0; i < 3; i++) {
        var heights = b === 0 ? [.15, .95] : b === 1 ? [.18, 1.48] : [.17, 1.18];
        var grass = this._placements(310, 810 + i * 273 + b * 661, heights, .68);
        grass.forEach(function (p, index) { p.w = p.h * (1.15 + (index % 7) * .12); });
        this._batch(this._grassTexture(i, b), grass, b, { sway: true });
      }
      for (i = 0; i < 2; i++) {
        var rocks = this._placements(b === 2 ? 27 : 8, 398 + i * 159 + b * 241, b === 2 ? [.35, 1.25] : [.25, .72], 1.1);
        rocks.forEach(function (p) { p.w = p.h * 1.5; }); this._batch(this._rockTexture(i), rocks, b);
      }
    }
    // A few roots and reeds flank the beginning. Their long silhouettes frame
    // the paper character while keeping the first piece of path unobstructed.
    this._batch(this._grassTexture(2, 0), [{ x: 11.7, z: 10.3, h: 1.2, w: 1.3 }, { x: 6.8, z: 9.0, h: .85, w: .9 }], 0, { sway: true });
  };
  Scene.prototype._particles = function () {
    var count = 96, positions = new Float32Array(count * 3), seeds = [], rng = random(4512);
    for (var i = 0; i < count; i++) seeds.push({ x: (rng() - .5) * 38, y: .7 + rng() * 6, z: (rng() - .5) * 30, speed: .07 + rng() * .19, phase: rng() * TAU });
    this.particleSeeds = seeds; this.particleGeometry = this._own(new T.BufferGeometry()); this.particleGeometry.setAttribute('position', new T.BufferAttribute(positions, 3));
    var canvas = this._canvas(32, 32), ctx = canvas.getContext('2d'); ctx.fillStyle = '#e4d2a7'; ctx.beginPath(); ctx.ellipse(16, 16, 4, 9, -.6, 0, TAU); ctx.fill();
    this.particleMaterial = this._own(new T.PointsMaterial({ map: this._texture(canvas), color: palettes[0].petal, size: .19, sizeAttenuation: true, transparent: true, opacity: .58, depthWrite: false, alphaTest: .03 }));
    this.particles = new T.Points(this.particleGeometry, this.particleMaterial); this.scene.add(this.particles); this._updateParticles();
  };
  Scene.prototype._walker = function () {
    this.actor = new T.Group(); this.actor.name = 'cihou-original-paper-walker'; this.scene.add(this.actor);
    var wash = this._washTexture(), geometry = this._own(new T.PlaneGeometry(1.0, .57)); geometry.rotateX(-PI / 2);
    this.shadow = new T.Mesh(geometry, this._own(new T.MeshBasicMaterial({ map: wash, transparent: true, opacity: .65, color: '#476d63', depthWrite: false })));
    this.scene.add(this.shadow);
  };
  Scene.prototype.setRig = function (rig) {
    if (this.destroyed) { if (rig) rig.dispose(); return this; }
    this.rig = rig; this.actor.add(rig.group); rig.group.position.set(0, 0, 0);
    // The rig's paint layers retain their internal ordering. Foreground trees
    // already write alpha-tested depth, so those layers still pass behind it.
    rig.group.traverse(function (mesh) { if (mesh.isMesh && mesh.material) mesh.material.depthTest = true; });
    this.render(); return this;
  };
  Scene.prototype._mixedColor = function (key) {
    var color = new T.Color(0, 0, 0);
    for (var i = 0; i < 3; i++) color.add(new T.Color(palettes[i][key]).multiplyScalar(this.biomeWeights[i]));
    return color;
  };
  Scene.prototype._applyPalette = function () {
    for (var i = 0; i < 3; i++) {
      var weight = this.biomeWeights[i];
      this.materialGroups[i].forEach(function (material) { material.opacity = weight; material.visible = weight > .002; });
    }
    var paper = this._mixedColor('paper'); this.renderer.setClearColor(paper, 1); this.scene.background = paper;
    this.scene.fog.color.copy(this._mixedColor('air')); this.groundMaterial.color.copy(this._mixedColor('ground'));
    this.roadMaterial.color.copy(this._mixedColor('path')); this.edgeMaterial.color.copy(this._mixedColor('ink'));
    this.particleMaterial.color.copy(this._mixedColor('petal'));
  };
  Scene.prototype._updateParticles = function () {
    if (!this.particleGeometry) return;
    var positions = this.particleGeometry.attributes.position, transition = 1 - smooth(this.transitionAge / this.transitionDuration);
    for (var i = 0; i < this.particleSeeds.length; i++) {
      var seed = this.particleSeeds[i], time = this.reducedMotion ? 0 : this.time;
      positions.setXYZ(i, wrap(seed.x + time * seed.speed * (1 + transition * 4) + 24, 48) - 24,
        seed.y + .3 * Math.sin(time * .23 + seed.phase), seed.z + .7 * Math.sin(time * .13 + seed.phase));
    }
    positions.needsUpdate = true; this.particleMaterial.opacity = this.reducedMotion ? .25 : .44 + transition * .30;
  };
  Scene.prototype._actorPoint = function () {
    return this.exitCurve ? this.exitCurve.getPointAt(clamp(this.exitDistance / this.exitLength, 0, 1)) : this._point(this.travel);
  };
  Scene.prototype._camera = function (point, dt) {
    var reveal = smooth((this.progress - .12) / .88), aspect = this.width / this.height;
    var exitZoom = this.exitCurve ? smooth(this.exitProgress) : 0;
    var overviewHeight = Math.max(29.5, 45 / Math.max(.5, aspect));
    var viewHeight = mix(10.8, overviewHeight, reveal);
    viewHeight = mix(viewHeight, Math.max(14.0, 21 / Math.max(.65, aspect)), exitZoom * .58);
    var target = point.clone().add(V(0, .5, 0));
    var center = V(-.4, 0, -.2), overviewTarget = target.clone().lerp(center, .90);
    target.lerp(overviewTarget, reveal * (1 - exitZoom * .64));
    // Camera position is a constant isometric direction. Trees and puppet
    // therefore share one stable plane and remain rooted during the reveal.
    if (!this.cameraAnchor || this.reducedMotion || !dt) this.cameraAnchor = target;
    else this.cameraAnchor.lerp(target, 1 - Math.exp(-dt * 3.6));
    var cameraOffset = V(15.5, 23, 24); this.camera.position.copy(this.cameraAnchor).add(cameraOffset);
    this.camera.lookAt(this.cameraAnchor); this.camera.left = -viewHeight * aspect * .5; this.camera.right = viewHeight * aspect * .5;
    this.camera.top = viewHeight * .5; this.camera.bottom = -viewHeight * .5; this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
    this.viewHeight = viewHeight; this.overviewWeight = reveal;
    // Preserve legibility in the distant view without turning the traveller
    // into a screen overlay: she remains depth-tested in the same world.
    this.actorHeight = mix(this.figureHeight, Math.max(this.figureHeight, viewHeight * .040), reveal);
    var distance = this.camera.position.distanceTo(this.cameraAnchor);
    this.scene.fog.near = distance + mix(7, 14, reveal); this.scene.fog.far = distance + mix(31, 66, reveal);
  };
  Scene.prototype.render = function (dt) {
    if (this.destroyed) return;
    if (this.mode !== 'webgl') { this._drawFallback(); return; }
    var point = this._actorPoint(); this._camera(point, dt || 0); this._applyPalette();
    this.actor.position.copy(point); this.actor.position.y += .005;
    this.actor.rotation.set(0, Math.atan2(this.camera.position.x - this.cameraAnchor.x, this.camera.position.z - this.cameraAnchor.z), 0);
    this.actor.scale.setScalar(this.actorHeight / (this.rig ? this.rig.height : this.figureHeight));
    var direction = this.exitCurve ? this.exitCurve.getTangentAt(clamp(this.exitDistance / this.exitLength, 0, 1)).setY(0).normalize() : this._tangent(this.travel).multiplyScalar(this.lastDirection);
    var screenRight = V().setFromMatrixColumn(this.camera.matrixWorld, 0), facing = direction.dot(screenRight) >= 0 ? 1 : -1;
    if (Math.abs(this.velocity) > .015 || this.exitCurve) this.lastFacing = facing;
    if (this.rig) {
      this.rig.setFacing(this.lastFacing); this.rig.update(this.gaitTime, Math.min(1, Math.abs(this.velocity) / this.walkSpeed),
        { lockFeet: Math.abs(this.velocity) < .025 ? 1 : 0, look: this.selectedChoice !== null ? .22 : 0, carry: .05 });
    }
    this.shadow.position.set(point.x + .13, point.y + .008, point.z + .08); this.shadow.scale.setScalar(this.actorHeight / this.figureHeight);
    this.swayUniform.value = this.reducedMotion ? 0 : this.time; this._updateParticles();
    if (this.exitMesh) this.exitMesh.geometry.setDrawRange(0, Math.floor(180 * smooth((this.exitProgress + .08) / .45)) * 6);
    this.renderer.render(this.scene, this.camera);
    this.container.dataset.cihouPhase = this.phase; this.container.dataset.cihouBiome = palettes[this.biome].name;
    this.container.dataset.cihouTravel = this.travel.toFixed(3); this.container.dataset.cihouRouteLength = this.routeLength.toFixed(3);
    this.container.dataset.cihouHoldProgress = this.progress.toFixed(4); this.container.dataset.cihouExitProgress = this.exitProgress.toFixed(4);
    this.container.dataset.cihouLoopTurns = (this.travel / this.routeLength).toFixed(3);
    this.container.dataset.cihouPresentationReady = String(this.presentationReady);
  };
  Scene.prototype._step = function (dt) {
    this.time += dt;
    if (this.transitionAge < this.transitionDuration) {
      this.transitionAge = Math.min(this.transitionDuration, this.transitionAge + dt);
      var fade = smooth(this.transitionAge / this.transitionDuration);
      for (var b = 0; b < 3; b++) this.biomeWeights[b] = mix(this.biomeFrom[b], b === this.biome ? 1 : 0, fade);
    }
    var steering = Math.abs(this.steering) > .13 ? Math.sign(this.steering) * smooth((Math.abs(this.steering) - .13) / .65) : 0;
    var intent = steering || (this.targetInteraction > 0 ? this.lastDirection * this.targetInteraction : 0);
    if (intent) this.lastDirection = intent < 0 ? -1 : 1;
    var targetVelocity = intent * this.walkSpeed;
    if (this.exitComplete) targetVelocity = 0;
    this.velocity = mix(this.velocity, targetVelocity, 1 - Math.exp(-dt * (intent ? 6 : 11)));
    if (Math.abs(this.velocity) < .003) this.velocity = 0;
    var distance = this.velocity * dt;
    if (this.exitCurve) {
      // The chosen experiment can be paused, and the old circle stays visible.
      var previous = this.exitDistance; this.exitDistance = clamp(this.exitDistance + Math.abs(distance), 0, this.exitLength);
      var moved = this.exitDistance - previous; this.exitProgress = this.exitDistance / this.exitLength;
      this.gaitTime += moved / (.28 * this.actorHeight);
      if (!this.exitComplete && this.exitProgress >= 1) {
        this.exitComplete = true; this.velocity = 0; this.exitAge = 0; this.phase = 'complete';
        if (this.options.onExitComplete) this.options.onExitComplete(this.getState());
      }
      if (this.exitComplete) { this.exitAge += dt; if (this.exitAge >= .9) this.presentationReady = true; }
    } else {
      this.travel += distance; this.distanceWalked += Math.abs(distance);
      this.gaitTime += Math.abs(distance) / (.28 * (this.actorHeight || this.figureHeight));
      this.progress = Math.max(this.progress, Math.min(1, this.distanceWalked / (this.walkSpeed * this.revealSeconds)));
      this.beat = this.progress < .34 ? 0 : this.progress < .76 ? 1 : 2;
      if (!this.canExit && this.progress >= 1) {
        this.canExit = true; this.chapter = 1; this.phase = 'choice';
        if (this.options.onRevealReady) this.options.onRevealReady(this.getState());
      } else if (!this.canExit && this.progress >= .52) { this.chapter = 1; this.phase = 'revealing'; }
    }
    this._emitState();
  };
  Scene.prototype.getStoryProgress = function () { return this.progress; };
  Scene.prototype.getState = function () {
    return { phase: this.phase, chapter: this.chapter, beat: this.beat, biome: this.biome, biomeName: palettes[this.biome].name,
      selectedChoice: this.selectedChoice, canExit: this.canExit && !this.exitCurve, exitComplete: this.exitComplete,
      presentationReady: this.presentationReady, holdProgress: this.progress, exitProgress: this.exitProgress,
      transitionProgress: clamp(this.transitionAge / this.transitionDuration, 0, 1), interacting: Math.abs(this.velocity) > .015,
      travel: this.travel, routeLength: this.routeLength || 0, loopTurns: this.routeLength ? this.travel / this.routeLength : 0,
      reducedMotion: this.reducedMotion, pointerSteering: true };
  };
  Scene.prototype._emitState = function (force) {
    var state = this.getState();
    var key = [state.phase, state.chapter, state.beat, state.biome, state.canExit, state.exitComplete,
      state.presentationReady, state.selectedChoice, state.interacting, Math.floor(state.holdProgress * 20), Math.floor(state.exitProgress * 12)].join(':');
    if (force || key !== this.lastStateKey) { this.lastStateKey = key; if (this.options.onStateChange) this.options.onStateChange(state); }
  };
  Scene.prototype.setSteering = function (value) { this.steering = clamp(Number(value) || 0, -1, 1); this._requestFrame(); return this; };
  Scene.prototype.setInteraction = function (value) { this.targetInteraction = clamp(Number(value) || 0, 0, 1); this._requestFrame(); return this; };
  Scene.prototype.setProgress = function (value) {
    value = clamp(Number(value) || 0, 0, 1);
    this.progress = value; this.distanceWalked = value * this.walkSpeed * this.revealSeconds;
    this.beat = value < .34 ? 0 : value < .76 ? 1 : 2;
    this.canExit = value >= 1;
    if (!this.exitCurve) { this.chapter = value >= .52 ? 1 : 0; this.phase = this.canExit ? 'choice' : this.chapter ? 'revealing' : 'walking'; }
    if (this.reducedMotion) this.velocity = 0;
    this.cameraAnchor = null; this.render(); this._emitState(true);
    if (this.canExit && this.options.onRevealReady) this.options.onRevealReady(this.getState()); return this;
  };
  Scene.prototype.setChoice = function (value) {
    value = Number(value); if (!Number.isInteger(value) || value < 0 || value > 2 || this.exitCurve) return this;
    this.selectedChoice = value; this.biomeFrom = this.biomeWeights.slice(); this.biome = value;
    this.transitionAge = this.reducedMotion ? this.transitionDuration : 0;
    if (this.reducedMotion) this.biomeWeights = [0, 1, 2].map(function (i) { return i === value ? 1 : 0; });
    this.chapter = 2; this.beat = value; this.phase = 'choice';
    this.render(); this._emitState(true); this._requestFrame(); return this;
  };
  Scene.prototype.setExit = function (value) {
    value = clamp(Number(value) || 0, 0, 1);
    if (value === 0) {
      if (this.exitMesh) {
        this.world.remove(this.exitMesh); this.exitMesh.geometry.dispose(); this.exitMaterial.dispose();
        this.resources = this.resources.filter(function (resource) { return resource !== this.exitMesh.geometry && resource !== this.exitMaterial; }, this);
        this.exitMesh = null; this.exitMaterial = null;
      }
      this.exitCurve = null; this.exitOrigin = null; this.exitDistance = this.exitProgress = this.exitAge = 0;
      this.exitComplete = this.presentationReady = false; this.velocity = 0; this.targetInteraction = this.steering = 0;
      this.chapter = this.selectedChoice === null ? this.canExit ? 1 : 0 : 2;
      this.phase = this.canExit ? 'choice' : 'walking'; this.cameraAnchor = null;
      this.render(); this._emitState(true); return this;
    }
    if (!this.canExit || this.exitCurve) return this;
    if (this.selectedChoice === null) this.setChoice(this.biome);
    this.chapter = 2; this.phase = 'leaving'; this.exitOrigin = this.mode === 'webgl' ? this._point(this.travel) : null;
    if (this.mode === 'webgl') {
      var tangent = this._tangent(this.travel), outward = this.exitOrigin.clone().setY(0).normalize();
      if (outward.lengthSq() < .1) outward = V(tangent.z, 0, -tangent.x);
      var drift = (this.selectedChoice - 1) * .12, along = outward.clone().addScaledVector(tangent, drift).normalize(), start = this.exitOrigin;
      var points = [start.clone(), start.clone().addScaledVector(along, 2.6), start.clone().addScaledVector(along, 6).addScaledVector(tangent, .65), start.clone().addScaledVector(along, 10.4).addScaledVector(tangent, 1.05)];
      points.forEach(function (p) { p.y = this._height(p.x, p.z) + .035; }, this);
      this.exitCurve = new T.CatmullRomCurve3(points, false, 'centripetal'); this.exitLength = this.exitCurve.getLength();
      this.exitMaterial = this._roadMaterial(palettes[this.biome].path); this.exitMesh = new T.Mesh(this._ribbon(this.exitCurve, 1.23, 180), this.exitMaterial);
      this.world.add(this.exitMesh);
    } else { this.exitCurve = { fallback: true }; this.exitLength = 10; }
    if (this.reducedMotion || this.mode !== 'webgl') {
      this.exitDistance = this.exitLength; this.exitProgress = 1; this.exitComplete = this.presentationReady = true; this.phase = 'complete';
      if (this.options.onExitComplete) this.options.onExitComplete(this.getState());
    }
    this.render(); this._emitState(true); this._requestFrame(); return this;
  };
  Scene.prototype.reset = function () {
    if (this.exitMesh) {
      this.world.remove(this.exitMesh); this.exitMesh.geometry.dispose(); this.exitMaterial.dispose();
      this.resources = this.resources.filter(function (resource) { return resource !== this.exitMesh.geometry && resource !== this.exitMaterial; }, this);
      this.exitMesh = null; this.exitMaterial = null;
    }
    this._resetState(); this.render(); this._emitState(true); this._requestFrame(); return this;
  };
  Scene.prototype._fallback = function () {
    this.canvas = this._canvas(900, 600); this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none'; this.container.appendChild(this.canvas);
  };
  Scene.prototype._drawFallback = function () {
    if (!this.canvas) return; var ctx = this.canvas.getContext('2d'), w = this.canvas.width, h = this.canvas.height, palette = palettes[this.biome];
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = palette.paper; ctx.fillRect(0, 0, w, h);
    var rng = random(15); ctx.strokeStyle = palette.ink; ctx.globalAlpha = .07;
    for (var i = 0; i < 1700; i++) { var x = rng() * w, y = rng() * h; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rng() * 3, y + 1); ctx.stroke(); }
    ctx.globalAlpha = .7; ctx.strokeStyle = palette.path; ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(w * .5, h * .53, w * .29, h * .23, -.12, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1; ctx.globalAlpha = .25; ctx.strokeStyle = palette.ink; ctx.stroke();
    for (var j = 0; j < 72; j++) {
      var angle = rng() * TAU, radius = 1.2 + rng() * .25, px = w * .5 + Math.cos(angle) * w * .29 * radius, py = h * .53 + Math.sin(angle) * h * .23 * radius;
      ctx.strokeStyle = palette.ink; ctx.globalAlpha = .12 + rng() * .15; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + 5, py - 12, px + (rng() - .5) * 15, py - 20 - rng() * 25); ctx.stroke();
    }
    var ax = w * .70, ay = h * .67;
    if (this.exitComplete) { ctx.strokeStyle = palette.path; ctx.lineWidth = 14; ctx.globalAlpha = .8; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(w * .82, h * .72, w * .90, h * .52); ctx.stroke(); ax = w * .86; ay = h * .61; }
    ctx.globalAlpha = 1; ctx.fillStyle = '#a9554b'; ctx.beginPath(); ctx.moveTo(ax, ay - 20); ctx.lineTo(ax - 7, ay - 1); ctx.lineTo(ax + 7, ay - 1); ctx.fill();
    ctx.fillStyle = '#555e54'; ctx.beginPath(); ctx.arc(ax, ay - 25, 4.5, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  };
  Scene.prototype.resize = function () {
    if (this.destroyed) return;
    this.width = Math.max(1, this.container.clientWidth || 900); this.height = Math.max(1, this.container.clientHeight || 600);
    if (this.renderer) this.renderer.setSize(this.width, this.height, false);
    if (this.canvas) { this.canvas.width = this.width * Math.min(1.5, global.devicePixelRatio || 1); this.canvas.height = this.height * Math.min(1.5, global.devicePixelRatio || 1); }
    this.render();
  };
  Scene.prototype._requestFrame = function () {
    if (!this.destroyed && this.active && !this.paused && !this.raf && !this.reducedMotion && this.mode === 'webgl') this.raf = requestAnimationFrame(this._tick);
  };
  Scene.prototype._tick = function (now) {
    this.raf = 0; if (this.destroyed || !this.active || this.paused) { this.last = 0; return; }
    var dt = this.last ? clamp((now - this.last) / 1000, 0, .25) : 0; this.last = now;
    if (!this.reducedMotion) {
      var remaining = dt; while (remaining > 0) { var step = Math.min(1 / 40, remaining); this._step(step); remaining -= step; }
    }
    this.render(dt); this._requestFrame();
  };
  Scene.prototype.setPaused = function (value) {
    this._settleReduced();
    this.paused = !!value; this.last = 0;
    if (this.paused) { cancelAnimationFrame(this.raf); this.raf = 0; } else this._requestFrame(); return this;
  };
  Scene.prototype.setActive = function (value) {
    this._settleReduced();
    this.active = !!value; this.last = 0;
    if (!this.active) { cancelAnimationFrame(this.raf); this.raf = 0; } else this._requestFrame(); return this;
  };
  Scene.prototype._settleReduced = function () {
    if (!this.reducedMotion) return;
    this.velocity = 0; this.transitionAge = this.transitionDuration;
    this.biomeWeights = [0, 1, 2].map(function (i) { return i === this.biome ? 1 : 0; }, this);
    if (this.exitCurve && !this.exitComplete) {
      this.exitDistance = this.exitLength; this.exitProgress = 1; this.exitComplete = this.presentationReady = true;
      this.phase = 'complete'; if (this.options.onExitComplete) this.options.onExitComplete(this.getState());
    }
    this.render(); this._emitState();
  };
  Scene.prototype._disposeRenderer = function () {
    if (this.renderer) { this.renderer.dispose(); this.renderer.domElement.remove(); this.renderer = null; }
  };
  Scene.prototype.destroy = function () {
    if (this.destroyed) return; this.destroyed = true; cancelAnimationFrame(this.raf);
    if (this.observer) this.observer.disconnect(); else global.removeEventListener('resize', this.resize);
    if (this.rig) this.rig.dispose();
    var disposed = new Set(); this.resources.forEach(function (resource) { if (!disposed.has(resource)) { resource.dispose(); disposed.add(resource); } });
    this.resources.length = 0; this._disposeRenderer(); if (this.canvas) this.canvas.remove();
    if (this.scene) this.scene.clear();
  };
  global.CihouHeroSceneV15 = Scene;
})(window);

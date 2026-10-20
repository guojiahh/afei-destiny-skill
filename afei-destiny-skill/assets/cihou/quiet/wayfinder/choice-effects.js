/* Local adaptation of Wayfinder's shipped effects, https://wayfinder.nfb.ca/.
 * The published Parcel factories supply all geometry shaders and artwork:
 * XStd = systems/writing/Line3D; W91B = util/materials; yeV2 = util/Assets.
 * Path/orb settings follow TokenConstellationSystem.js:119-147, 649-778.
 * Inventory pulses follow TokenPaperFollowSystem.js:80-111 and feed the
 * unchanged HaikuFloraSystem.js:169-235. No poem generator or new art is used.
 */
(function (global) {
  'use strict';
  global.CihouChoiceEffects = function CihouChoiceEffects(context) {
    var world = context.world, tags = context.tags, THREE = context.THREE;
    if (!world || !tags || !THREE || typeof global.parcelRequire !== 'function') {
      throw new Error('Wayfinder effects require the initialized native world');
    }
    var Line3D = global.parcelRequire('XStd').default;
    var materials = global.parcelRequire('W91B');
    var Assets = global.parcelRequire('yeV2').default;
    var group = null, rootEntity = null, line = null, shadow = null, dotMap = null;
    var orbGeometry = null, orbs = [], owned = [], pulses = [], treeRecords = [];
    var baseline = null, inventory = null, environment = null, originalSolved = 0;
    var generation = 0, cardSent = false, solvedElapsed = 0;
    var state = freshState();

    function freshState() {
      return { active: false, mode: null, progress: 0, elapsed: 0, completed: false,
        orbsTotal: 0, orbsCollected: 0, paperCount: 0, floraCount: 0,
        treeStarted: false, treeAvailable: false, error: null };
    }
    function entities(selector) {
      if (!selector || (Array.isArray(selector) && selector.some(function (tag) { return !tag; }))) return [];
      var result = world.query(selector);
      return (result && result.entities ? result.entities : []).filter(function (entity) { return entity.alive !== false; });
    }
    function data(entity, tag) { return entity && tag && entity.alive !== false && entity.has(tag) ? entity.get(tag) : null; }
    function first(tag) { var list = entities(tag); return list.length ? list[0].get(tag) : null; }
    function detach(object) { if (object && object.parent) object.parent.remove(object); }
    function kill(entity) { if (entity && entity.alive !== false) entity.kill(); }
    function reference(entity) {
      // Native ALEC recycles Entity objects. Its ref() is invalidated by kill,
      // so a later cleanup cannot accidentally kill a reused animal/asset.
      return typeof entity.ref === 'function' ? entity.ref() : entity;
    }
    function own(entity) { owned.push(reference(entity)); return entity; }
    function vector(value, fallback) {
      if (value && typeof value.clone === 'function') return value.clone().setY(0);
      if (Array.isArray(value)) return new THREE.Vector3(Number(value[0]) || 0, 0, Number(value[2]) || 0);
      return fallback.clone();
    }
    function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
    function ease(value) { return Math.sin(clamp(value, 0, 1) * Math.PI / 2); }
    function expoOut(value) { return value >= 1 ? 1 : 1 - Math.pow(2, -10 * Math.max(0, value)); }
    function pulse(tag, position) {
      if (!tag) return null;
      var entity = own(world.entity('CihouChoiceNativePulse').add(tag));
      if (position && tags.ParticleEmit) {
        entity.add(tags.ParticleEmit);
        var particle = entity.get(tags.ParticleEmit);
        particle.position.copy(position); particle.elapsed = 0; particle.duration = .4;
      }
      pulses.push({ entity: entity, remaining: 1.1 });
      return entity;
    }
    function nativeCount(tag) {
      if (!baseline) return 0;
      return entities(tag).filter(function (entity) { return !isBaseline(entity); }).length;
    }
    function isBaseline(entity) {
      return baseline && baseline.has(entity) && baseline.get(entity).alive !== false;
    }
    function snapshotNativeEffects() {
      var snapshot = new Map();
      [tags.FloatingToken, tags.WaitingForTokenPaper, tags.SpawnedFlora].forEach(function (tag) {
        entities(tag).forEach(function (entity) { snapshot.set(entity, reference(entity)); });
      });
      return snapshot;
    }
    function makePath(mode, start, direction) {
      var side = new THREE.Vector3(-direction.z, 0, direction.x), points;
      if (mode === 'prepare') {
        var treePosition = new THREE.Vector3();
        var tree = entities([tags.SpriteAnimation, tags.SpriteAnimationOriginTreeTag, tags.Object3D])[0];
        if (tree) {
          var treeObject = tree.get(tags.Object3D);
          if (typeof treeObject.getWorldPosition === 'function') treeObject.getWorldPosition(treePosition);
          else treePosition.copy(treeObject.position);
          treePosition.y = 0;
        }
        var outward = start.clone().sub(treePosition).setY(0);
        if (outward.lengthSq() < 1) outward.copy(direction).negate();
        outward.normalize();
        var destination = treePosition.clone().addScaledVector(outward, 6);
        // End beside the original origin tree, rather than firing a distant
        // tree animation outside the camera. This route never teleports.
        if (start.distanceTo(destination) < 6) {
          var around = new THREE.Vector3(-outward.z, 0, outward.x);
          destination.copy(treePosition).addScaledVector(outward, 4).addScaledVector(around, 5);
        }
        var delta = destination.clone().sub(start);
        points = [start, start.clone().addScaledVector(delta, .28).addScaledVector(side, 3),
          start.clone().addScaledVector(delta, .72).addScaledVector(side, 2), destination];
      } else {
        var distance = mode === 'sustain' ? 26 : 20;
        points = [start, start.clone().addScaledVector(direction, distance * .3).addScaledVector(side, 4),
          start.clone().addScaledVector(direction, distance * .65).addScaledVector(side, -3),
          start.clone().addScaledVector(direction, distance)];
      }
      return points;
    }
    function createPathArtwork(curve) {
      group = new THREE.Group(); group.name = 'CihouNativeChoiceEffects';
      rootEntity = own(world.entity('CihouChoicePath').add(tags.Object3D, group));
      var rendered = curve.getSpacedPoints(60).map(function (point) { return point.clone().setY(1.25); });
      line = new Line3D(world, { taper: true, thickness: .35, dotted: true, filling: true,
        draw: 0, depthWrite: false, depthTest: false });
      line.updatePath(rendered, false, true); group.add(line);
      var shadowColor = new THREE.Color('#280422').lerp(new THREE.Color(1, 1, 1), .9);
      shadow = new Line3D(world, { bloom: 0, thickness: .75, blending: THREE.MultiplyBlending,
        color: shadowColor, geometry: line.geometry, filling: true, draw: 0 });
      // LineGeometry is shared with the original-style multiply shadow.
      shadow.material.uniforms.totalDistance.value = line.material.uniforms.totalDistance.value;
      var layers = first(tags.RenderLayers);
      if (layers && layers.shadow !== undefined) shadow.layers.set(layers.shadow);
      group.add(shadow);
      var renderer = first(tags.Renderer), task = Assets.createGPUTextureTask(renderer, 'image/data/compass-dot');
      dotMap = task[0];
      var texture = dotMap, run = generation;
      if (task[1] && typeof task[1].then === 'function') task[1].then(function () {
        if (run !== generation || texture !== dotMap) texture.dispose();
      }, function (error) {
        if (run === generation) state.error = String(error && error.message || error);
        texture.dispose();
      });
      orbGeometry = new THREE.PlaneBufferGeometry(1, 1, 1, 1);
      [.18, .42, .68, .9].forEach(function (phase, index) {
        var material = materials.createTokenMaterial(1, false);
        material.uniforms.map.value = dotMap;
        var mesh = new THREE.Mesh(orbGeometry, material);
        mesh.position.copy(curve.getPointAt(phase)).setY(1.25);
        mesh.renderOrder = 10; mesh.scale.setScalar(.00001); group.add(mesh);
        orbs.push({ mesh: mesh, phase: phase, index: index, hit: false, hitTime: 0,
          revealTime: index === 0 ? 0 : null });
      });
      state.orbsTotal = orbs.length;
    }
    function start(mode, startPosition, direction, texts) {
      clear();
      if (['attempt', 'prepare', 'sustain'].indexOf(mode) < 0) throw new Error('Unknown Wayfinder choice mode');
      state = freshState(); state.active = true; state.mode = mode;
      baseline = snapshotNativeEffects();
      var startPoint = vector(startPosition, new THREE.Vector3(42, 0, -28));
      var heading = vector(direction, new THREE.Vector3(1, 0, 0));
      if (heading.lengthSq() < .001) heading.set(1, 0, 0); heading.normalize();
      var points = makePath(mode, startPoint, heading);
      var curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
      curve.arcLengthDivisions = 1000;
      try {
        createPathArtwork(curve);
        if (tags.TokenIsCollecting) own(world.entity('CihouChoiceNoteSequence').add(tags.TokenIsCollecting));
        if (mode === 'sustain') {
          // This is the native inventory protocol, without FinishedPoem:
          // GameUISystem's random-poem popup requires both tags, while the
          // existing paper/flora systems intentionally listen to inventory.
          inventory = own(world.entity('CihouChoiceActionInventory').add(tags.HaikuInInventory));
        }
      } catch (error) {
        var message = String(error && error.message || error);
        clear(); state.error = message; throw error;
      }
      return { points: points.map(function (point) { return point.clone(); }), length: curve.getLength(),
        anchorProgress: [.18, .42, .68, .9], durationHint: mode === 'prepare' ? 12 : mode === 'sustain' ? 10 : 8,
        feedbackDurationHint: mode === 'prepare' ? 4.5 : 2.5 };
    }
    function startTree() {
      var trees = entities([tags.SpriteAnimation, tags.SpriteAnimationOriginTreeTag]);
      state.treeAvailable = trees.length > 0;
      trees.forEach(function (entity) {
        var animation = entity.get(tags.SpriteAnimation), saved = {};
        ['playing', 'finished', 'currentLoop', 'elapsed', 'frame', 'lastFrame', 'dirty',
          'delay', 'looping', 'loopStart', 'loopEnd', 'speed'].forEach(function (key) { saved[key] = animation[key]; });
        treeRecords.push({ entity: entity, animation: animation, saved: saved });
        animation.looping = false; animation.speed = 1; animation.start();
      });
      var environments = entities([tags.EnvironmentState, tags.ActiveEnvironmentState]);
      if (environments.length) {
        environment = environments[0]; originalSolved = environment.get(tags.EnvironmentState).solved || 0;
        solvedElapsed = 0;
      }
      state.treeStarted = trees.length > 0;
      if (tags.TriggerTreeTransitionAudio) pulse(tags.TriggerTreeTransitionAudio);
    }
    function finish() {
      if (!state.active || state.completed) return;
      state.completed = true; state.progress = 1;
      orbs.forEach(function (orb) { collectOrb(orb); });
      // CapeMesh's native dt timeline fades in/out and removes the timed tag.
      if (tags.CapeMagicalEffect && tags.AutoRemoveCapeMagicalEffect) {
        own(world.entity('CihouChoiceCompletionCape').add(tags.CapeMagicalEffect).add(tags.AutoRemoveCapeMagicalEffect));
      }
      if (state.mode === 'prepare') startTree();
    }
    function collectOrb(orb) {
      if (orb.hit) return;
      orb.hit = true; orb.hitTime = state.elapsed; state.orbsCollected++;
      pulse(tags.CollectTokenOrb, orb.mesh.position);
      var next = orbs[orb.index + 1];
      if (next && next.revealTime === null) next.revealTime = state.elapsed;
    }
    function update(dt, position, progress) {
      if (!state.active) return;
      dt = clamp(Number(dt) || 0, 0, .1);
      if (dt <= 0) return;
      state.elapsed += dt;
      state.progress = Math.max(state.progress, clamp(Number(progress) || 0, 0, 1));
      if (line) {
        var draw = ease(state.elapsed);
        line.material.uniforms.draw.value = draw; shadow.material.uniforms.draw.value = draw;
        line.material.uniforms.dottedFill.value = state.progress;
      }
      orbs.forEach(function (orb) {
        if (!orb.hit && state.progress >= orb.phase) collectOrb(orb);
        var reveal = orb.revealTime === null ? 0 : expoOut(state.elapsed - orb.revealTime);
        var fade = orb.hit ? 1 - expoOut(state.elapsed - orb.hitTime) : 1;
        var size = .45 * reveal * fade;
        orb.mesh.scale.setScalar(Math.max(.00001, size)); orb.mesh.visible = size > .0001;
      });
      // Wait for the real inventory listener to enqueue its paper before
      // emitting the one-frame save event. No arbitrary timeout or extra RAF.
      if (state.mode === 'sustain' && !cardSent && nativeCount(tags.WaitingForTokenPaper)) {
        pulse(tags.HaikuCardSaved); cardSent = true;
      }
      for (var i = pulses.length - 1; i >= 0; i--) {
        pulses[i].remaining -= dt;
        if (pulses[i].remaining <= 0) { kill(pulses[i].entity); pulses.splice(i, 1); }
      }
      if (environment && data(environment, tags.EnvironmentState)) {
        solvedElapsed += dt;
        environment.get(tags.EnvironmentState).solved = originalSolved + (1 - originalSolved) *
          (.5 - Math.cos(clamp(solvedElapsed / 4, 0, 1) * Math.PI) / 2);
      }
      state.paperCount = nativeCount(tags.FloatingToken); state.floraCount = nativeCount(tags.SpawnedFlora);
    }
    function clear() {
      generation++;
      if (baseline) {
        [tags.FloatingToken, tags.WaitingForTokenPaper].forEach(function (tag) {
          entities(tag).forEach(function (entity) {
            if (isBaseline(entity)) return;
            var object = data(entity, tags.Object3D); detach(object);
            // Paper's plane geometry belongs to the native system; only its
            // per-paper material is ours to retire. Cached textures stay live.
            if (tag === tags.FloatingToken && object && object.material) object.material.dispose();
            kill(entity);
          });
        });
        entities(tags.SpawnedFlora).forEach(function (entity) {
          if (isBaseline(entity)) return;
          var flora = entity.get(tags.SpawnedFlora), object = data(entity, tags.Object3D);
          // Let the native flora system return its own pooled mesh on its
          // next update. Hiding/detaching is immediate, even while paused.
          flora.duration = 0; flora.delay = 0; flora.time = 1;
          if (object) { object.visible = false; detach(object); }
        });
      }
      treeRecords.forEach(function (record) {
        if (record.entity.alive === false || !record.entity.has(tags.SpriteAnimation)) return;
        Object.keys(record.saved).forEach(function (key) { record.animation[key] = record.saved[key]; });
        record.animation.dirty = true;
      });
      if (environment && data(environment, tags.EnvironmentState)) environment.get(tags.EnvironmentState).solved = originalSolved;
      var geometries = new Set();
      [line, shadow].forEach(function (item) {
        if (!item) return;
        if (item.userData && item.userData.entity) kill(item.userData.entity);
        if (item.geometry) geometries.add(item.geometry);
        if (item.material) item.material.dispose(); detach(item);
      });
      orbs.forEach(function (orb) { orb.mesh.material.dispose(); detach(orb.mesh); });
      if (orbGeometry) geometries.add(orbGeometry);
      geometries.forEach(function (geometry) { geometry.dispose(); });
      if (dotMap) dotMap.dispose(); detach(group);
      owned.forEach(kill);
      group = rootEntity = line = shadow = dotMap = orbGeometry = inventory = environment = null;
      orbs = []; owned = []; pulses = []; treeRecords = []; baseline = null;
      cardSent = false; solvedElapsed = 0; state = freshState();
    }
    function getState() {
      var snapshot = {};
      Object.keys(state).forEach(function (key) { snapshot[key] = state[key]; });
      return snapshot;
    }
    return { start: start, update: update, finish: finish, clear: clear, getState: getState };
  };
})(window);

/* Local research adapter for the preserved Wayfinder client runtime.
 * Original runtime and artwork remain separate, unchanged reference assets.
 * Only player intent, a closed route, narrative anchors, and explicit biome
 * selection are adapted. The original character, ground, props, atmosphere,
 * post-processing, audio and leaf-video transition continue to run.
 */
(function (global) {
  'use strict';
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var smooth = function (v) { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
  var wrap = function (v, n) { return ((v % n) + n) % n; };
  var names = ['forest', 'grasslands', 'tundra'];
  var api = { ready: false, error: null };
  var world, tags, engine, template, THREE, route, routeLength, routeCenter, marker, focus;
  var moveState, originalMove, envState, originalEnvProcess, pendingBiome = null, biomeSwapSeen = false;
  var stoppedSystems = [], hint = null, stateKey = '', anchorKey = '', lastAnchorText = '', destroyed = false;
  var postRenderLease = null, hintLayouts = [], ownedHints = [];
  var choiceEffects = null, choiceRun = null;
  var choiceModes = ['attempt', 'prepare', 'sustain'];
  var reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)');
  var story = global.CIHOU_STORY_DATA || {};
  var state = { chapter: 0, beat: 0, biome: 0, biomeName: 'forest', selectedChoice: null,
    canExit: false, phase: 'road', holdProgress: 0, exitProgress: 0, exitComplete: false,
    presentationReady: false, transitioning: false, paused: false, active: true,
    travel: 0, loopTurns: 0, lapIndex: 0, lapPhase: 0, loopNodeId: null,
    waypointIndex: 0, anchorVisit: 0, anchorPosition: null, interacting: false, ready: false,
    choiceMode: null, choiceProgress: 0, choiceElapsed: 0, choiceStep: 0, choiceRunning: false, choiceRunId: 0 };
  var steering = 0, interaction = 0, velocity = 0, lastDirection = 1;
  var explored = 0, minimumTravel = 0, maximumTravel = 0, progressFloor = 0;
  var exitOrigin = null, exitDirection = null, exitDistance = 0;
  var speed = 4.4, revealDistance = speed * 16, exitLength = 12;
  var initialZoom = 15, finishing = 0, changedBiome = false;
  function emit(name, detail) { document.dispatchEvent(new CustomEvent('cihou:' + name, { detail: detail })); }
  function read(Tag) { return Tag ? world.findTag(Tag) : null; }
  function entities(Tag) { return Tag ? world.query(Tag).entities.slice() : []; }
  function killTags(Tag) { entities(Tag).forEach(function (entity) { entity.remove(Tag); }); }
  function clearTutorialArtifacts() {
    // Disabling a system preserves its entities. IntroTutorialSystem had
    // already installed this state while the original landing was loading.
    [tags.TutorialBarrenGround, tags.TutorialState, tags.TutorialTextHint,
      tags.CameraZoomOut, tags.ClearInputPress, tags.GameLandingCameraDrift,
      tags.CanSetIntroTags].forEach(function (Tag) { if (Tag) killTags(Tag); });
    entities(tags.TutorialMessage).forEach(function (entity) { entity.kill(); });
    // Removal triggers a native two-second tween. Pin only its tutorial mix
    // to the normal value; keep original biome maps, LUTs and colors intact.
    entities(tags.GroundPlaneLayer).forEach(function (entity) {
      var mesh = entity.get(tags.GroundPlaneLayer), uniforms = mesh && mesh.material && mesh.material.uniforms;
      if (uniforms && uniforms.tutorial) uniforms.tutorial.value = 0;
    });
  }
  function copyState() { return Object.assign({}, state); }
  function announce(force) {
    var key = [state.chapter, state.beat, state.biome, state.selectedChoice, state.canExit, state.phase,
      state.exitComplete, state.presentationReady, state.transitioning, state.paused, state.active,
      state.interacting, state.lapIndex, state.loopNodeId, state.anchorVisit,
      state.choiceRunId, state.choiceMode, state.choiceStep, state.choiceRunning, Math.floor(state.choiceProgress * 30),
      Math.floor(state.holdProgress * 20), Math.floor(state.exitProgress * 12), Math.floor(state.loopTurns * 20)].join(':');
    if (force || key !== stateKey) { stateKey = key; emit('state', copyState()); }
  }
  function sourceNode() {
    var stages = story.stages || story.hero_states || (story.presentation && story.presentation.hero_states) || [];
    var node = stages[state.chapter];
    if (node) return Array.isArray(node) ? { anchors: node } : typeof node === 'string' ? { lines: [node] } : node;
    var anchors = story.anchors && story.anchors[state.chapter];
    return anchors ? { anchors: Array.isArray(anchors) ? anchors : [anchors] } : null;
  }
  function waypointAnchor() {
    if (state.chapter === 2 && choiceRun) {
      var step = state.choiceStep, choiceText = choiceRun.lines[step];
      var choicePosition = choiceRun.curve.getPointAt([.13, .5, .86][step]).add(new THREE.Vector3(0, 3, 0));
      state.waypointIndex = step; state.loopNodeId = 'choice-' + step;
      state.anchorPosition = choicePosition.toArray();
      return {key: 'choice:' + state.choiceRunId + ':' + step, node: {text: choiceText},
        stage: sourceNode(), text: choiceText, position: choicePosition};
    }
    var stage = sourceNode();
    var nodes = state.chapter === 0 && story.loop_story && Array.isArray(story.loop_story.nodes)
      ? story.loop_story.nodes : stage && stage.anchors || story.anchors && story.anchors[state.chapter];
    if (!Array.isArray(nodes) || !nodes.length) nodes = [stage || {}];
    var cycling = state.chapter < 2;
    var segment = routeLength / nodes.length;
    // Nearest fixed landmark: its entry is half a segment before the point.
    // The unwrapped visit distinguishes the same landmark on later laps,
    // without creating another entity just because the lap boundary passed.
    var visit = cycling ? Math.floor(state.travel / segment + .5) : state.beat;
    var index = cycling ? wrap(visit, nodes.length) : Math.min(state.beat, nodes.length - 1);
    var node = nodes[index];
    if (typeof node === 'string') node = { text: node };
    node = node || {};
    var text = node.text || node.world_text || node.anchor || (Array.isArray(node.lines) ? node.lines.join('  ') : node.title) || '';
    var at;
    if (cycling) at = point(index * segment).add(new THREE.Vector3(0, 2.8, 0));
    else {
      var target = read(tags.UserTarget);
      at = target ? target.position.clone().add(new THREE.Vector3(0, 3, -1.6)) : point(state.travel).add(new THREE.Vector3(0, 3, 0));
    }
    if (cycling) state.beat = index;
    state.waypointIndex = index;
    state.loopNodeId = node.id || 'anchor-' + index;
    state.anchorPosition = at.toArray();
    return { key: state.chapter + ':' + visit, node: node, stage: stage, text: String(text), position: at };
  }
  function maintainHint() {
    if (!hint || !hint.alive) return;
    var data = hint.get(tags.TextHint);
    if (data) { data.killing = false; data.time = 0; }
    // DOMTextSystem deliberately assigns 14px regardless of TextHint.fontSize.
    // Style this adapter-owned projected sprite after its native creation.
    var sprite = tags.TextSprite3D && hint.has(tags.TextSprite3D) && hint.get(tags.TextSprite3D);
    if (sprite) { sprite.fontSize = 22; sprite.fontStyle = 'normal'; sprite.culling = false; }
  }
  function releaseHintLayout() {
    hintLayouts.forEach(restoreHintLayout); hintLayouts.length = 0;
  }
  function restoreHintLayout(record) {
    Object.keys(record.styles).forEach(function (key) { record.inner.style[key] = record.styles[key]; });
    // A native DOM slot can already belong to another entity after a query
    // removal. Restore its cached transform only while it is still our text.
    if (record.inner.textContent === record.text && record.outer.style.transform === record.appliedTransform) record.outer.style.transform = record.nativeTransform;
  }
  function clampHintToViewport() {
    if (destroyed || !api.ready) { releaseHintLayout(); return; }
    var now = (global.performance && typeof global.performance.now === 'function' ? global.performance.now() : Date.now()) / 1000;
    if (state.paused || !state.active || document.hidden) {
      hintLayouts.forEach(function (record) { record.lastTime = null; }); return;
    }
    ownedHints = ownedHints.filter(function (entity) { return entity.alive; });
    hintLayouts = hintLayouts.filter(function (record) {
      if (record.entity.alive && record.entity.has(tags.TextSprite3D)) return true;
      restoreHintLayout(record); return false;
    });
    if (typeof document.querySelectorAll !== 'function') return;
    // Text3DOverlay's writable view and DOM slots use the TextSprite3D query
    // order. Check both the entity index and its exact text before styling, so
    // native poem labels or a fading previous anchor are never changed.
    var sprites = entities(tags.TextSprite3D);
    var elements = document.querySelectorAll('.container.svelte-1bz0ho2 .text-sprite-3d-container');
    // Keep outgoing adapter words corrected through their native fade. Releasing
    // their transform at a waypoint boundary would visibly snap them backward.
    ownedHints.forEach(function (entity) {
      if (!entity.has(tags.TextSprite3D) || !entity.has(tags.TextHint)) return;
      var index = sprites.indexOf(entity); if (index < 0) return;
      var text = entity.get(tags.TextHint).text;
      var existing = hintLayouts.filter(function (item) { return item.entity === entity; })[0];
      var motion = null;
      var outer = elements[index], inner = outer && outer.querySelector('.text-sprite-3d');
      if (!inner || inner.textContent !== text) return;
      if (existing && existing.outer !== outer) {
        motion = { offsetX: existing.offsetX, offsetY: existing.offsetY, lastTime: existing.lastTime,
          targetX: existing.targetX, targetY: existing.targetY };
        restoreHintLayout(existing); hintLayouts.splice(hintLayouts.indexOf(existing), 1); existing = null;
      }
      if (!existing) {
        var saved = {};
        ['width', 'maxWidth', 'whiteSpace', 'overflowWrap', 'wordBreak', 'lineHeight'].forEach(function (key) { saved[key] = inner.style[key]; });
        existing = { entity: entity, text: text, outer: outer, inner: inner, styles: saved,
          nativeTransform: outer.style.transform, appliedTransform: null, offsetX: null, offsetY: null,
          targetX: null, targetY: null, lastTime: null };
        if (motion) { existing.offsetX = motion.offsetX; existing.offsetY = motion.offsetY; existing.lastTime = motion.lastTime; existing.targetX = motion.targetX; existing.targetY = motion.targetY; }
        hintLayouts.push(existing);
      }
      layoutHint(existing, now);
    });
  }
  function layoutHint(record, now) {
    var outer = record.outer, inner = record.inner;
    // The source overlay caches projected coordinates while stationary. Undo
    // our last correction before measuring rather than accumulating offsets.
    if (outer.style.transform === record.appliedTransform) outer.style.transform = record.nativeTransform;
    else record.nativeTransform = outer.style.transform;
    var app = read(tags.AppState), width = app && app.width || global.innerWidth, height = app && app.height || global.innerHeight;
    if (!(width > 0 && height > 0)) return;
    var scaleMatch = /scale\(\s*([-+\d.eE]+)/.exec(inner.style.transform || '');
    var scale = scaleMatch ? Math.max(.1, Math.abs(Number(scaleMatch[1]) || 1)) : 1;
    var narrow = width <= 700, right = width - 16;
    var top = Math.min(80, height * .18), bottom = narrow ? height * .55 : height - 44;
    var guidePanel = typeof document.querySelector === 'function' && document.querySelector('#story-guide');
    var guideRect = guidePanel && typeof guidePanel.getBoundingClientRect === 'function' && guidePanel.getBoundingClientRect();
    if (guideRect && guideRect.top > top + 60) bottom = Math.min(bottom, guideRect.top - 18);
    // The guidance version keeps the heading and explanation near the top.
    // On narrow screens the next world phrase belongs below those controls.
    if (guidePanel && narrow && state.chapter < 2) {
      var copyPanel = document.querySelector('.story-copy');
      var copyRect = copyPanel && typeof copyPanel.getBoundingClientRect === 'function' && copyPanel.getBoundingClientRect();
      if (copyRect) top = Math.min(copyRect.bottom + 14, bottom - 65);
    }
    if (state.chapter === 2 && choiceRun) {
      // Leave room for the choice controls throughout playback, including
      // the larger result card. The original world anchor is unchanged.
      top = Math.min(narrow ? 145 : 160, height * .24);
      var panel = typeof document.querySelector === 'function' && document.querySelector('#story-choices');
      var panelRect = panel && typeof panel.getBoundingClientRect === 'function' && panel.getBoundingClientRect();
      if (narrow) {
        if (panelRect && panelRect.top > top + 60) bottom = Math.min(bottom, panelRect.top - 18);
      } else {
        right = panelRect && panelRect.left > 80 ? panelRect.left - 24 :
          width * .95 - Math.min(380, width * .38) - 24;
      }
    }
    inner.style.width = 'max-content'; inner.style.maxWidth = Math.max(40, (right - 16) / scale) + 'px';
    inner.style.whiteSpace = 'normal'; inner.style.overflowWrap = 'anywhere'; inner.style.wordBreak = 'break-word'; inner.style.lineHeight = '1.42';
    var rect = inner.getBoundingClientRect();
    var targetX = rect.left < 16 ? 16 - rect.left : rect.right > right ? right - rect.right : 0;
    var targetY = rect.top < top ? top - rect.top : rect.bottom > bottom ? bottom - rect.bottom : 0;
    // Give the original character's hat and cape a little room. This affects
    // only screen typography; the fixed world waypoint and camera are intact.
    var character = read(tags.UserCharacter), camera = read(tags.MainCamera);
    if (character && character.position && camera) {
      var foot = character.position.clone().project(camera), head = character.position.clone().add(new THREE.Vector3(0, 3, 0)).project(camera);
      var cx = (foot.x * .5 + .5) * width;
      var bodyTop = (1 - head.y) * height * .5 - 8, bodyBottom = (1 - foot.y) * height * .5 + 12;
      var halfBody = narrow ? 36 : 48;
      // Anticipate the character before actual overlap, and retire clearance
      // gradually after passing. Both weights are continuous with zero slope
      // at their boundaries, so no intersection flag can toggle a large jump.
      var textCenter = (rect.left + rect.right) * .5 + targetX;
      var horizontalGap = Math.abs(textCenter - cx) - ((rect.right - rect.left) * .5 + halfBody);
      var horizontalWeight = 1 - smooth(horizontalGap / 48);
      var belowCharacter = rect.top + targetY - bodyBottom;
      var verticalWeight = 1 - smooth(belowCharacter / 80);
      var clearance = Math.min(0, bodyTop - 24 - (rect.bottom + targetY));
      targetY += clearance * horizontalWeight * verticalWeight;
      targetY = Math.max(targetY, top - rect.top);
    }
    var dt = record.lastTime === null ? 0 : clamp(now - record.lastTime, 0, .1);
    record.lastTime = now;
    // Integrate exponential damping against a linearly moving target over
    // the frame, rather than treating its end sample as an instantaneous
    // step. This keeps 30/60/120 Hz passes aligned at equal elapsed times.
    if (record.offsetX === null) { record.offsetX = targetX; record.offsetY = targetY; }
    else if (dt > 0) {
      var decay = Math.exp(-dt / .18), blend = 1 - decay;
      var ramp = 1 - .18 / dt * blend;
      var previousX = record.targetX === null ? targetX : record.targetX;
      var previousY = record.targetY === null ? targetY : record.targetY;
      record.offsetX = record.offsetX * decay + previousX * blend + (targetX - previousX) * ramp;
      record.offsetY = record.offsetY * decay + previousY * blend + (targetY - previousY) * ramp;
    }
    record.targetX = targetX; record.targetY = targetY;
    // Viewport safety is a final projection constraint. It does not store a
    // hidden overshoot that could rebound when the word leaves a screen edge.
    var dx = clamp(record.offsetX, 16 - rect.left, right - rect.right);
    var dy = clamp(record.offsetY, top - rect.top, bottom - rect.bottom);
    record.offsetX = dx; record.offsetY = dy;
    var position = /translate\(\s*([-+\d.eE]+)px\s*,\s*([-+\d.eE]+)px\s*\)/.exec(record.nativeTransform || '');
    if (!position) return;
    outer.style.transform = 'translate(' + (Number(position[1]) + dx) + 'px, ' + (Number(position[2]) + dy) + 'px)';
    // CSSOM serializes/rounds floating point components. Store the browser's
    // canonical readback, not the unrounded JS string: a stationary source
    // overlay may reuse its transform for many frames. A raw-string mismatch
    // would mistake our correction for a new native projection and add it
    // again, walking the label toward the screen edge without any user input.
    record.appliedTransform = outer.style.transform;
    if (record.entity === hint) {
      state.anchorClamped = Math.abs(dx) > .1 || Math.abs(dy) > .1;
      state.anchorScreenBounds = { left: rect.left + dx, top: rect.top + dy, right: rect.right + dx, bottom: rect.bottom + dy };
    }
  }
  function installHintViewportClamp() {
    var tasks = global.parcelRequire('smi9');
    if (!tasks || typeof tasks.addPostRenderCallback !== 'function') return;
    // The original callback registry has no remover. Register one tiny shared
    // dispatcher, and release its owner on destroy/reconnect without adding RAF.
    var key = Symbol.for('cihou.wayfinder.anchorViewportClamp');
    var lease = global[key];
    if (!lease) {
      lease = { owner: null }; global[key] = lease;
      tasks.addPostRenderCallback(function () { if (lease.owner) lease.owner(); });
    }
    lease.owner = clampHintToViewport; postRenderLease = lease;
  }
  function narrativeAnchor(force) {
    var anchor = waypointAnchor(), key = anchor.key, text = anchor.text, at = anchor.position;
    if (!force && key === anchorKey && hint && hint.alive) { maintainHint(); return; }
    // Native DOMTextSystem projects this text into the preserved 3D landscape.
    // Long explanations remain in the surrounding report, not in the scenery.
    if (key === anchorKey && text === lastAnchorText && hint && hint.alive) { maintainHint(); return; }
    if (key !== anchorKey) state.anchorVisit++;
    anchorKey = key; lastAnchorText = text;
    if (hint && hint.alive) {
      // Different words may share a short native fade; replacing the same
      // words immediately avoids two identical projected text entities.
      var oldHint = hint.get(tags.TextHint);
      if (oldHint && oldHint.text === text) hint.kill(); else hint.add(tags.KillTextHint);
    }
    hint = null;
    if (text && tags.TextHint) {
      hint = world.entity('CihouNarrativeAnchor').add(tags.TextHint, {
        text: text, position: at, delay: 0, duration: 86400, killing: false, fontSize: 22
      });
      ownedHints.push(hint);
    }
    maintainHint();
    emit('anchor', { chapter: state.chapter, beat: state.beat, node: anchor.node, stage: anchor.stage,
      lapIndex: state.lapIndex, loopNodeId: state.loopNodeId, anchorVisit: state.anchorVisit, position: at.toArray() });
  }
  function point(distance) { return route.getPointAt(wrap(distance, routeLength) / routeLength); }
  function tangent(distance) { return route.getTangentAt(wrap(distance, routeLength) / routeLength).setY(0).normalize(); }
  function updateTarget(dt, position, direction, moving) {
    var user = read(tags.UserTarget), input = read(tags.InputState);
    if (!user || !input) return;
    user.position.copy(position); user.direction.copy(direction); user.forceApplied = moving;
    user.speedAlpha = user.totalSpeedAlpha = moving ? Math.min(1, Math.abs(velocity) / speed) : 0;
    user.boostAlpha = 0; user.totalBoost = 0; user.inputHitPlane = true;
    // CharacterSystem's original spring aims a short distance along our track.
    // Its native cape, hat, turning and ground shadow are intentionally retained.
    user.inputPositionOnPlane.copy(position).addScaledVector(direction, moving ? 1.0 : 0);
    input.interacted = true; input.pressed = moving;
    var targetEntity = world.findEntity(tags.UserTarget);
    if (targetEntity) { if (moving) targetEntity.tagOn(tags.UserForceApplied); else targetEntity.tagOff(tags.UserForceApplied); }
    var zoom = read(tags.UserZoom);
    // Preserve the published UserFollowSystem's character tracking, lens,
    // pitch, distance and speed response throughout the entire closed walk.
    // The return to a familiar place supplies the reveal; the camera stays
    // with the traveller instead of leaving her near a screen edge.
    if (zoom) zoom.distance = initialZoom;
    if (focus) { focus.kill(); focus = null; }
  }
  function clearChoice() {
    if (choiceEffects) choiceEffects.clear();
    choiceRun = null;
    state.choiceRunId++; state.choiceMode = null; state.choiceProgress = 0;
    state.choiceElapsed = 0; state.choiceStep = 0; state.choiceRunning = false;
    state.exitComplete = state.presentationReady = false;
  }
  function choiceData(index) {
    var choice = (story.choices || [])[index] || {}, feedback = choice.feedback || {};
    var stage = sourceNode(), anchors = stage && stage.anchors || [];
    return {mode: choiceModes.indexOf(feedback.mode) >= 0 ? feedback.mode : choiceModes[index],
      lines: Array.isArray(feedback.lines) && feedback.lines.length === 3 ? feedback.lines :
        [choice.title || anchors[0] || '', choice.condition || anchors[1] || '', choice.text || anchors[2] || '']};
  }
  function beginChoice() {
    if (state.chapter !== 2 || state.selectedChoice === null || state.transitioning || destroyed) return;
    var data = choiceData(state.selectedChoice);
    var start = point(state.travel), direction = tangent(state.travel);
    // Each replay starts at the same landmark, not at the previous ending.
    var result = choiceEffects ? choiceEffects.start(data.mode, start, direction, data.lines) : null;
    var points = result && result.points || [start, start.clone().addScaledVector(direction, 20)];
    var curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    curve.arcLengthDivisions = 300;
    var length = curve.getLength();
    choiceRun = {curve: curve, length: length, lines: data.lines, elapsed: 0, ended: false,
      duration: Math.max(8.4, Math.min(18, length / speed)),
      settle: data.mode === 'prepare' ? 6.8 : 1.4};
    state.choiceMode = data.mode; state.choiceRunning = true; state.choiceStep = 0;
    state.choiceElapsed = state.choiceProgress = 0; state.phase = 'playing';
    state.canExit = false; state.exitComplete = state.presentationReady = false;
    anchorKey = ''; processMove(0); announce(true);
  }
  function requestChoiceScene() {
    if (state.chapter !== 2 || state.selectedChoice === null || state.transitioning) return;
    var name = names[state.selectedChoice];
    if (activeBiome() === name) { beginChoice(); return; }
    state.transitioning = true; pendingBiome = name; biomeSwapSeen = false; velocity = steering = interaction = 0;
    world.entity('CihouExplicitBiomeChoice').add(tags.TransitionToNextBiome);
    if (activeBiome() === 'tundra') {
      var store = read(tags.GameUIStore);
      if (store) store.update(function (data) { return Object.assign({}, data, {
        transitionOverlay: true, transitionCurrentBiome: 'tundra'}); });
    }
  }
  function processChoice(dt) {
    choiceRun.elapsed += dt;
    var progress = Math.min(1, choiceRun.elapsed / choiceRun.duration);
    state.choiceElapsed = choiceRun.elapsed; state.choiceProgress = state.exitProgress = progress;
    state.choiceStep = Math.min(2, Math.floor(progress * 3));
    var position = choiceRun.curve.getPointAt(progress);
    var direction = choiceRun.curve.getTangentAt(progress).setY(0).normalize();
    velocity = progress < 1 && dt > 0 ? choiceRun.length / choiceRun.duration : 0;
    state.interacting = velocity > .02;
    updateTarget(dt, position, direction, state.interacting);
    if (choiceEffects) choiceEffects.update(dt, position, progress);
    if (progress >= 1 && !choiceRun.ended) {
      choiceRun.ended = true; state.phase = 'settling';
      if (choiceEffects) choiceEffects.finish();
    }
    if (choiceRun.elapsed >= choiceRun.duration + choiceRun.settle) {
      state.phase = 'done'; state.choiceRunning = false;
      state.exitComplete = state.presentationReady = true;
    }
    narrativeAnchor(); announce();
  }
  function processMove(dt) {
    if (destroyed || !api.ready) return;
    clearTutorialArtifacts();
    dt = clamp(Number(dt) || 0, 0, .1);
    if (state.paused || !state.active || document.hidden || state.transitioning || (reduced && reduced.matches)) dt = 0;
    if (state.chapter === 2 && choiceRun) {
      processChoice(state.choiceRunning ? dt : 0); return;
    }
    var turn = Math.abs(steering) > .13 ? Math.sign(steering) * smooth((Math.abs(steering) - .13) / .67) : 0;
    // Holding always walks forward at a constant route speed, even after an
    // optional reverse-steering probe. Releasing has no adapter-side coast.
    var intent = state.chapter === 2 ? 0 : interaction > 0 ? interaction : turn;
    if (intent) lastDirection = intent < 0 ? -1 : 1;
    if (state.exitComplete) intent = 0;
    velocity = dt > 0 ? intent * speed : 0;
    var distance = velocity * dt, position, direction;
    if (exitOrigin) {
      exitDistance = Math.min(exitLength, exitDistance + Math.abs(distance));
      state.exitProgress = exitDistance / exitLength;
      position = exitOrigin.clone().addScaledVector(exitDirection, exitDistance);
      direction = exitDirection.clone();
      if (state.exitProgress >= 1) {
        state.exitComplete = true; state.phase = 'done'; velocity = 0; finishing += dt;
        if (finishing >= .7) state.presentationReady = true;
      }
    } else {
      state.travel += distance; explored += Math.abs(distance);
      minimumTravel = Math.min(minimumTravel, state.travel); maximumTravel = Math.max(maximumTravel, state.travel);
      // A forward/backward probe is not a completed circuit: completion needs
      // coverage of every part of the closed track, or explicit UI navigation.
      state.holdProgress = Math.max(progressFloor, Math.min(1, (maximumTravel - minimumTravel) / revealDistance));
      state.exploredDistance = explored;
      state.loopTurns = state.travel / routeLength;
      state.lapIndex = Math.floor(state.loopTurns);
      state.lapPhase = wrap(state.travel, routeLength) / routeLength;
      state.canExit = state.chapter > 0 && state.holdProgress >= 1;
      // A lap reveals the recurrence. Only the UI can change a chapter.
      state.phase = state.chapter === 0 ? 'road' : state.chapter === 1 ? 'ring' : 'choice';
      position = point(state.travel); direction = tangent(state.travel).multiplyScalar(lastDirection);
    }
    state.interacting = Math.abs(velocity) > .02 && dt > 0;
    updateTarget(dt, position, direction, state.interacting);
    narrativeAnchor(); announce();
  }
  function naturalNext(name) { return name === 'forest' ? 'grasslands' : name === 'grasslands' ? 'tundra' : 'grasslands'; }
  function activeBiome() {
    var current = world.findEntity([tags.EnvironmentState, tags.ActiveEnvironmentState]);
    return current ? current.get(tags.EnvironmentState).name : state.biomeName;
  }
  function nativeTransitionVisible() {
    var visible = false, store = read(tags.GameUIStore);
    if (store && typeof store.subscribe === 'function') {
      var unsubscribe = store.subscribe(function (data) { visible = !!data.transitionOverlay; });
      if (typeof unsubscribe === 'function') unsubscribe();
    }
    // The original Svelte overlay has a 1s outro after its store flag clears.
    // Reopening it during that outro reuses the old component, so onMount
    // never emits a second SafeToSwapBiomes. Wait for its actual removal.
    return visible || (typeof document.querySelector === 'function' &&
      !!document.querySelector('.container.svelte-xjm3ff'));
  }
  function setSystemEnabled(id, enabled) {
    var System = global.parcelRequire(id).default, system = world.getSystem(System);
    if (system) { stoppedSystems.push({ state: system, enabled: system.enabled }); system.enabled = enabled; }
  }
  function wrapEnvironment() {
    var System = global.parcelRequire('S3Ot').default;
    envState = world.getSystem(System); if (!envState || !envState.instance) return;
    originalEnvProcess = envState.instance.process;
    envState.instance.process = function (dt) {
      if (pendingBiome && entities(tags.SafeToSwapBiomes).length && naturalNext(activeBiome()) !== pendingBiome) {
        // The published transition only exposes next-biome. To compare an
        // earlier biome, use its *original* environment constructor at the same
        // system slot, while the original leaf video already covers the swap.
        var requested = pendingBiome, list = world.root._systemList, index = list.indexOf(envState);
        [tags.EnvironmentCell, tags.GroundAsset, tags.EnvironmentState].forEach(function (Tag) {
          entities(Tag).forEach(function (entity) { entity.kill(); });
        });
        var query = global.parcelRequire('WIvJ').default, previous = query.biome;
        query.biome = requested;
        world.removeSystem(System); world.addSystem(System);
        if (previous === undefined) delete query.biome; else query.biome = previous;
        var replacement = world.getSystem(System), addedAt = list.indexOf(replacement);
        if (addedAt >= 0 && index >= 0) { list.splice(addedAt, 1); list.splice(index, 0, replacement); }
        killTags(tags.SafeToSwapBiomes); killTags(tags.TransitionToNextBiome); killTags(tags.CameraStopUserMovement);
        wrapEnvironment(); changedBiome = true;
      } else { originalEnvProcess(dt); }
      clearTutorialArtifacts();
      if (pendingBiome && activeBiome() === pendingBiome && !entities(tags.TransitionToNextBiome).length) {
        state.biomeName = pendingBiome; state.biome = names.indexOf(pendingBiome);
        // Observe a whole normal world tick without the transition tag.
        // Also keep the first feedback line behind the gate: it must not
        // play while the leaf video still covers the newly loaded scenery.
        if (!biomeSwapSeen) { biomeSwapSeen = true; announce(true); return; }
        if (!(dt > 0) || state.paused || !state.active || document.hidden ||
            (reduced && reduced.matches) || nativeTransitionVisible() ||
            entities(tags.SafeToSwapBiomes).length) return;
        pendingBiome = null; state.transitioning = false; velocity = 0;
        // The leaf transition owns its in-flight destination. Once it clears,
        // honor the latest click; obsolete requests never start a playback.
        if (state.chapter === 2 && state.selectedChoice !== null) requestChoiceScene();
        processMove(0); narrativeAnchor(true); announce(true); emit('biome', copyState());
      }
    };
  }
  api.getState = copyState;
  api.setSteering = function (value) {
    steering = clamp(Number(value) || 0, -1, 1);
    if (steering === 0) { velocity = 0; if (api.ready) processMove(0); }
    return api;
  };
  api.setInteraction = function (value) {
    interaction = clamp(Number(value) || 0, 0, 1);
    if (interaction === 0) { steering = 0; velocity = 0; if (api.ready) processMove(0); }
    return api;
  };
  api.setProgress = function (value) {
    if (!api.ready) return api; value = clamp(Number(value) || 0, 0, 1);
    progressFloor = value; state.holdProgress = value; state.canExit = state.chapter > 0 && value === 1;
    if (value === 0) minimumTravel = maximumTravel = state.travel;
    processMove(0); narrativeAnchor(true); announce(true); return api;
  };
  api.setChapter = function (chapter) {
    chapter = clamp(Math.round(Number(chapter) || 0), 0, 2);
    if (!api.ready) return api;
    clearChoice(); state.selectedChoice = null;
    state.chapter = chapter; state.beat = 0;
    api.setExit(0); if (chapter === 0) api.setProgress(0); else api.setProgress(1);
    narrativeAnchor(true); announce(true); return api;
  };
  api.setChoice = function (value) {
    if (!api.ready) return api;
    var index = typeof value === 'string' ? names.indexOf(value) : Number(value);
    if (!Number.isInteger(index) || index < 0 || index > 2) return api;
    clearChoice(); state.chapter = 2; state.beat = index; state.selectedChoice = index;
    state.holdProgress = 1; state.canExit = true; state.phase = 'choice';
    api.setExit(0);
    requestChoiceScene();
    narrativeAnchor(true); announce(true); return api;
  };
  api.setExit = function (value) {
    if (!api.ready) return api;
    if (!Number(value)) {
      exitOrigin = exitDirection = null; exitDistance = finishing = 0;
      state.exitProgress = 0; state.exitComplete = state.presentationReady = false;
      state.canExit = state.chapter > 0 && state.holdProgress >= 1;
      state.phase = state.chapter === 0 ? 'road' : state.chapter === 1 ? 'ring' : 'choice';
      velocity = 0; processMove(0); announce(true); return api;
    }
    if (state.chapter === 0 || !state.canExit || state.transitioning || exitOrigin) return api;
    exitOrigin = point(state.travel); exitDirection = exitOrigin.clone().sub(routeCenter).setY(0).normalize();
    if (exitDirection.lengthSq() < .1) exitDirection.set(1, 0, 0);
    state.chapter = 2; state.canExit = false; state.phase = 'exit';
    if (focus) { focus.kill(); focus = null; }
    if (reduced && reduced.matches) { exitDistance = exitLength; state.exitProgress = 1; state.exitComplete = state.presentationReady = true; state.phase = 'done'; }
    processMove(0); narrativeAnchor(true); announce(true); return api;
  };
  function syncActivity() {
    if (!api.ready) return;
    hintLayouts.forEach(function (record) { record.lastTime = null; });
    var running = !state.paused && state.active && !document.hidden;
    if (running) engine.start(); else { steering = interaction = velocity = 0; engine.stop(); }
    announce();
  }
  api.setPaused = function (value) { state.paused = !!value; syncActivity(); return api; };
  api.setActive = function (value) { state.active = !!value; syncActivity(); return api; };
  api.setMuted = function (value) { if (template && template.setMuted) template.setMuted(!!value); return api; };
  api.reset = function () {
    if (!api.ready) return api; clearChoice(); state.selectedChoice = null;
    api.setExit(0); steering = interaction = velocity = explored = progressFloor = 0;
    minimumTravel = maximumTravel = 0;
    state.travel = state.loopTurns = state.holdProgress = state.beat = state.chapter = 0;
    state.lapIndex = state.lapPhase = state.anchorVisit = 0; state.loopNodeId = null;
    anchorKey = lastAnchorText = ''; if (hint && hint.alive) hint.kill(); hint = null;
    state.selectedChoice = null; state.canExit = false; state.phase = 'road';
    processMove(0); narrativeAnchor(true); announce(true); return api;
  };
  api.destroy = function () {
    if (destroyed) return; destroyed = true;
    clearChoice();
    if (postRenderLease && postRenderLease.owner === clampHintToViewport) postRenderLease.owner = null;
    releaseHintLayout();
    ownedHints.forEach(function (entity) { if (entity.alive) entity.kill(); }); ownedHints.length = 0;
    if (moveState) moveState.instance = originalMove;
    if (envState && envState.instance) envState.instance.process = originalEnvProcess;
    stoppedSystems.forEach(function (item) { item.state.enabled = item.enabled; });
    if (marker) marker.kill(); if (focus) focus.kill(); if (hint && hint.alive) hint.kill();
    if (engine) engine.stop(); document.removeEventListener('visibilitychange', syncActivity);
    api.ready = state.ready = false; emit('destroy', copyState());
  };
  async function connect(event) {
    if (api.ready || destroyed) return;
    template = event && event.detail ? event.detail : global.WayfinderTemplate;
    if (!template || !template.world) return;
    try {
      world = template.world; tags = template.tags; engine = template.engine; THREE = global.parcelRequire('N5rp');
      if (global.CihouChoiceEffects) choiceEffects = global.CihouChoiceEffects({world: world, tags: tags, THREE: THREE});
      var Move = global.parcelRequire('OAsz').default;
      moveState = world.getSystem(Move); if (!moveState || !moveState.instance) throw new Error('Wayfinder UserMoveSystem is unavailable');
      originalMove = moveState.instance; moveState.instance = processMove;
      // The source landscape intentionally keeps the origin around its ritual
      // tree barren. Explore the actual forest beyond that clearing instead.
      var requestedCenter = story.runtime && story.runtime.loop_center;
      routeCenter = Array.isArray(requestedCenter) && requestedCenter.length === 3
        ? new THREE.Vector3(Number(requestedCenter[0]) || 0, 0, Number(requestedCenter[2]) || 0)
        : new THREE.Vector3(42, 0, -28);
      var points = [[7, 3], [10.5, -.5], [8, -7], [1, -10], [-8, -8], [-11, -1], [-8, 7], [-1, 9.5], [6, 7]];
      route = new THREE.CatmullRomCurve3(points.map(function (p) {
        return new THREE.Vector3(routeCenter.x + p[0] * 2, 0, routeCenter.z + p[1] * 2);
      }), true, 'centripetal');
      route.arcLengthDivisions = 1000; routeLength = route.getLength();
      revealDistance = routeLength;
      state.routeCenter = routeCenter.toArray(); state.routeLength = routeLength;
      var zoom = read(tags.UserZoom); if (zoom) initialZoom = zoom.defaultDistance || zoom.distance || 15;
      marker = world.entity('CihouStoryMode');
      if (tags.BlockTokenCollection) marker.add(tags.BlockTokenCollection);
      if (tags.HideHUD) marker.add(tags.HideHUD);
      // Narrative interpretation replaces poem collection; environmental life
      // and the source work's audiovisual rendering systems stay enabled.
      ['PA4C', 'LdzR', 'vaEW', 'NcCM'].forEach(function (id) { setSystemEnabled(id, false); });
      [tags.BlockUserMove, tags.CameraStopUserMovement, tags.MoveUserToOrigin, tags.OriginTreeIntroSequence,
        tags.OriginTreeIntroSequenceStarted, tags.ModalStoppingUserMovement, tags.HideCharacter,
        tags.CameraFocusOnTarget,
        tags.DirectUserToOrigin, tags.WaitingForBiomeResolution, tags.ShowBiomeResolution,
        tags.FinalBiomeResolution, tags.FinalBiomeResolutionLines, tags.EndGameState,
        tags.CapeMagicalEffect, tags.AutoRemoveCapeMagicalEffect, tags.TriggerTreeTransitionAudio].forEach(function (Tag) { if (Tag) killTags(Tag); });
      clearTutorialArtifacts();
      state.biomeName = activeBiome(); state.biome = Math.max(0, names.indexOf(state.biomeName));
      wrapEnvironment(); api.ready = state.ready = true;
      installHintViewportClamp();
      processMove(0); narrativeAnchor(true); announce(true);
      document.addEventListener('visibilitychange', syncActivity);
      emit('ready', api);
    } catch (error) { api.error = String(error && error.message || error); emit('error', { message: api.error }); }
  }
  global.CihouWayfinder = api;
  document.addEventListener('wayfinder-ready', connect);
  if (global.WayfinderTemplate && global.WayfinderTemplate.world) connect();
})(window);

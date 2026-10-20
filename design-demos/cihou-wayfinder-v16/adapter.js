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
  var moveState, originalMove, envState, originalEnvProcess, pendingBiome = null;
  var stoppedSystems = [], hint = null, stateKey = '', anchorKey = '', lastAnchorText = '', destroyed = false;
  var reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)');
  var story = global.CIHOU_STORY_DATA || {};
  var state = { chapter: 0, beat: 0, biome: 0, biomeName: 'forest', selectedChoice: null,
    canExit: false, phase: 'road', holdProgress: 0, exitProgress: 0, exitComplete: false,
    presentationReady: false, transitioning: false, paused: false, active: true,
    travel: 0, loopTurns: 0, interacting: false, ready: false };
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
      state.interacting, Math.floor(state.holdProgress * 20), Math.floor(state.exitProgress * 12), Math.floor(state.loopTurns * 20)].join(':');
    if (force || key !== stateKey) { stateKey = key; emit('state', copyState()); }
  }
  function sourceNode() {
    var stages = story.stages || story.hero_states || (story.presentation && story.presentation.hero_states) || [];
    var node = stages[state.chapter];
    if (node) return Array.isArray(node) ? { anchors: node } : typeof node === 'string' ? { lines: [node] } : node;
    var anchors = story.anchors && story.anchors[state.chapter];
    return anchors ? { anchors: Array.isArray(anchors) ? anchors : [anchors] } : null;
  }
  function narrativeAnchor(force) {
    var key = state.chapter + ':' + state.beat;
    if (!force && key === anchorKey) return;
    var node = sourceNode(), target = read(tags.UserTarget);
    var at = target ? target.position.clone().add(new THREE.Vector3(0, 3, -1.6)) : new THREE.Vector3(0, 3, 0);
    // Native DOMTextSystem projects this text into the preserved 3D landscape.
    // Long explanations remain in the surrounding report, not in the scenery.
    var stageAnchors = node && node.anchors || story.anchors && story.anchors[state.chapter];
    var anchor = Array.isArray(stageAnchors) ? stageAnchors[Math.min(state.beat, stageAnchors.length - 1)] : null;
    if (typeof anchor === 'string') anchor = { text: anchor };
    var text = anchor ? anchor.text : node && (node.world_text || node.anchor || (Array.isArray(node.lines) ? node.lines.join('  ') : node.title));
    text = text == null ? '' : String(text);
    if (key === anchorKey && text === lastAnchorText && hint && hint.alive) return;
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
        text: String(text), position: at, delay: .12, duration: 9, fontSize: 18
      });
    }
    emit('anchor', { chapter: state.chapter, beat: state.beat, node: anchor || node, stage: node, position: at.toArray() });
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
  function processMove(dt) {
    if (destroyed || !api.ready) return;
    clearTutorialArtifacts();
    dt = clamp(Number(dt) || 0, 0, .1);
    if (state.paused || !state.active || state.transitioning || (reduced && reduced.matches)) dt = 0;
    var turn = Math.abs(steering) > .13 ? Math.sign(steering) * smooth((Math.abs(steering) - .13) / .67) : 0;
    var intent = turn || (interaction ? interaction * lastDirection : 0);
    if (intent) lastDirection = intent < 0 ? -1 : 1;
    if (state.exitComplete) intent = 0;
    velocity += (intent * speed - velocity) * (1 - Math.exp(-dt * (intent ? 6 : 12)));
    if (Math.abs(velocity) < .004) velocity = 0;
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
      state.canExit = state.holdProgress >= 1;
      if (state.chapter !== 2) {
        state.chapter = state.holdProgress >= .54 ? 1 : 0;
        var chapterProgress = state.chapter ? (state.holdProgress - .54) / .46 : state.holdProgress / .54;
        state.beat = Math.min(2, Math.floor(chapterProgress * 3));
      }
      state.phase = state.canExit ? 'ring' : state.chapter ? 'revealing' : 'road';
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
        pendingBiome = null; state.transitioning = false; velocity = 0;
        processMove(0); narrativeAnchor(true); announce(true); emit('biome', copyState());
      }
    };
  }
  api.getState = copyState;
  api.setSteering = function (value) { steering = clamp(Number(value) || 0, -1, 1); return api; };
  api.setInteraction = function (value) { interaction = clamp(Number(value) || 0, 0, 1); return api; };
  api.setProgress = function (value) {
    if (!api.ready) return api; value = clamp(Number(value) || 0, 0, 1);
    progressFloor = value; state.holdProgress = value; state.canExit = value === 1;
    if (value === 0) minimumTravel = maximumTravel = state.travel;
    state.chapter = value >= .54 ? 1 : 0; state.beat = value < .30 ? 0 : value < .72 ? 1 : 2;
    processMove(0); narrativeAnchor(true); announce(true); return api;
  };
  api.setChapter = function (chapter) {
    chapter = clamp(Math.round(Number(chapter) || 0), 0, 2);
    if (!api.ready) return api;
    api.setExit(0); if (chapter === 0) api.setProgress(0); else api.setProgress(1);
    state.chapter = chapter; state.beat = 0; narrativeAnchor(true); announce(true); return api;
  };
  api.setChoice = function (value) {
    if (!api.ready || state.transitioning) return api;
    var index = typeof value === 'string' ? names.indexOf(value) : Number(value);
    if (!Number.isInteger(index) || index < 0 || index > 2) return api;
    state.chapter = 2; state.beat = index; state.selectedChoice = index;
    state.holdProgress = 1; state.canExit = true; state.phase = 'choice';
    api.setExit(0);
    if (activeBiome() !== names[index]) {
      state.transitioning = true; pendingBiome = names[index]; velocity = 0; steering = interaction = 0;
      // GameUISystem sees this tag and mounts its original TransitionOverlay;
      // that component's video adds SafeToSwapBiomes at 1250 ms.
      world.entity('CihouExplicitBiomeChoice').add(tags.TransitionToNextBiome);
      // The original game skips this overlay on its final tundra resolution.
      // Explicit comparison still uses that exact original video component.
      if (activeBiome() === 'tundra') {
        var store = read(tags.GameUIStore);
        if (store) store.update(function (data) { return Object.assign({}, data, { transitionOverlay: true, transitionCurrentBiome: 'tundra' }); });
      }
    }
    narrativeAnchor(true); announce(true); return api;
  };
  api.setExit = function (value) {
    if (!api.ready) return api;
    if (!Number(value)) {
      exitOrigin = exitDirection = null; exitDistance = finishing = 0;
      state.exitProgress = 0; state.exitComplete = state.presentationReady = false;
      state.canExit = state.holdProgress >= 1; state.phase = state.canExit ? 'ring' : 'road';
      velocity = 0; processMove(0); announce(true); return api;
    }
    if (!state.canExit || state.transitioning || exitOrigin) return api;
    exitOrigin = point(state.travel); exitDirection = exitOrigin.clone().sub(routeCenter).setY(0).normalize();
    if (exitDirection.lengthSq() < .1) exitDirection.set(1, 0, 0);
    state.chapter = 2; state.canExit = false; state.phase = 'exit';
    if (focus) { focus.kill(); focus = null; }
    if (reduced && reduced.matches) { exitDistance = exitLength; state.exitProgress = 1; state.exitComplete = state.presentationReady = true; state.phase = 'done'; }
    processMove(0); narrativeAnchor(true); announce(true); return api;
  };
  function syncActivity() {
    if (!api.ready) return;
    var running = !state.paused && state.active && !document.hidden;
    if (running) engine.start(); else { steering = interaction = velocity = 0; engine.stop(); }
    announce();
  }
  api.setPaused = function (value) { state.paused = !!value; syncActivity(); return api; };
  api.setActive = function (value) { state.active = !!value; syncActivity(); return api; };
  api.setMuted = function (value) { if (template && template.setMuted) template.setMuted(!!value); return api; };
  api.reset = function () {
    if (!api.ready) return api; api.setExit(0); steering = interaction = velocity = explored = progressFloor = 0;
    minimumTravel = maximumTravel = 0;
    state.travel = state.loopTurns = state.holdProgress = state.beat = state.chapter = 0;
    state.selectedChoice = null; state.canExit = false; state.phase = 'road';
    processMove(0); narrativeAnchor(true); announce(true); return api;
  };
  api.destroy = function () {
    if (destroyed) return; destroyed = true;
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
      processMove(0); narrativeAnchor(true); announce(true);
      document.addEventListener('visibilitychange', syncActivity);
      emit('ready', api);
    } catch (error) { api.error = String(error && error.message || error); emit('error', { message: api.error }); }
  }
  global.CihouWayfinder = api;
  document.addEventListener('wayfinder-ready', connect);
  if (global.WayfinderTemplate && global.WayfinderTemplate.world) connect();
})(window);

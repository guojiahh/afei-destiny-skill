(() => {
  "use strict";

  const hero = document.querySelector(".hero");
  const world = document.querySelector("#scene");
  const description = document.querySelector("#scene-description");
  const status = document.querySelector("#scene-status");
  const instructions = document.querySelector("#scene-instructions");
  const invitation = document.querySelector("#scene-invitation");
  const invitationWords = document.querySelector("#scene-invitation-words");
  const progressArc = document.querySelector("#press-progress");
  const completion = document.querySelector("#scene-completion");
  const stepOut = document.querySelector("#step-out");
  const finalActions = document.querySelector("#scene-final-actions");
  const replay = document.querySelector("#replay");
  const replayFinal = document.querySelector("#replay-final");
  const pause = document.querySelector("#pause");
  const pauseLabel = document.querySelector("#pause-label");
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const states = JSON.parse(document.querySelector("#report-data").textContent).hero_states;
  const assets = JSON.parse(document.querySelector("#hero-assets").textContent);
  const rigMetadata = JSON.parse(document.querySelector("#hero-rig-meta").textContent);
  const markerMetadata = JSON.parse(document.querySelector("#hero-marker-meta").textContent);
  const timings = { invitation: 1.8,
    reveal: Number.isFinite(assets.revealDuration) && assets.revealDuration > 0 ? assets.revealDuration : 6.5,
    settle: 1.5,
    exit: Number.isFinite(assets.exitDuration) && assets.exitDuration > 0 ? assets.exitDuration : 3,
    exitSettle: .45, rewind: 1.9 };

  let scene;
  let rig;
  let ready = false;
  let unavailable = false;
  let disposed = false;
  let held = false;
  let heldSince = null;
  let heldFrom = 0;
  let pointerId = null;
  let keyboardHeld = false;
  let focusAfterReveal = false;
  let pausedByReader = false;
  let inView = true;
  let pageActive = true;
  let sceneStatic = false;
  let reducedMotion = motionPreference.matches;
  let phase = "road";
  let state = 0;
  let progress = 0;
  let revealReady = false;
  let phaseElapsed = 0;
  let visibleElapsed = 0;
  let rewindFrom = 0;
  let lastFrame = null;
  let frameRequest = 0;
  let lastEngineActivity;
  let lastEnginePause;

  function announce(text) { status.textContent = text; }
  function setState(next) {
    state = next;
    hero.dataset.state = String(state);
    description.textContent = states[state].description;
    world.setAttribute("aria-label", states[state].label);
  }
  function isActive() { return pageActive && inView && !document.hidden; }
  function canMove() { return ready && !unavailable && !disposed && isActive() && !pausedByReader; }
  function isWorldStory() { return scene && scene.interactionMode === "world" && typeof scene.getState === "function"; }
  function canHoldChoice() { return isWorldStory() && scene.choiceByHolding === true && !reducedMotion; }
  function invitationText() {
    if (isWorldStory()) return (reducedMotion ? "点击，" : "按住，") + (phase === "exit" ? "往前走" : reducedMotion ? "看见更多" : "陪她走");
    return reducedMotion ? "点击，看远一点" : progress ? "继续按住" : "按住，看见更多";
  }
  function revealComplete() {
    return progress === 1 && (reducedMotion || typeof scene.getStoryProgress !== "function" || revealReady);
  }
  function updateProgressArc() {
    const actual = isWorldStory() && ["exit", "done"].includes(phase) ? scene.getState().exitProgress
      : scene && typeof scene.getStoryProgress === "function" ? scene.getStoryProgress() : progress;
    const displayed = Number.isFinite(actual) ? Math.max(0, Math.min(1, actual)) : progress;
    progressArc.style.strokeDashoffset = String(62.83 * (1 - displayed));
    if (canHoldChoice()) {
      const amount = phase === "ring" ? scene.getState().choiceHoldProgress : 0;
      stepOut.style.setProperty("--choice-progress", String(Number.isFinite(amount) ? Math.max(0, Math.min(1, amount)) : 0));
    }
  }
  function onRevealReady() {
    if (isWorldStory()) { onStateChange(); return; }
    revealReady = true;
    if (phase === "road" && revealComplete() && !unavailable && !disposed) finishReveal();
  }
  function updateHold(now) {
    if (!held || heldSince === null) return;
    if (isWorldStory()) { updateProgressArc(); return; }
    progress = Math.min(1, heldFrom + Math.max(0, now - heldSince) / (timings.reveal * 1000));
    scene.setProgress(progress);
    updateProgressArc();
  }
  function release() {
    const wasHeld = held;
    const wasKeyboard = keyboardHeld;
    if (wasHeld) updateHold(performance.now());
    held = false;
    heldSince = null;
    keyboardHeld = false;
    const captured = pointerId;
    pointerId = null;
    if (captured !== null && world.hasPointerCapture(captured)) world.releasePointerCapture(captured);
    invitation.classList.remove("held");
    if (scene) scene.setInteraction(0);
    if ((phase === "road" && progress > 0) || (isWorldStory() && phase === "exit")) invitationWords.textContent = invitationText();
    if (!isWorldStory() && wasHeld && phase === "road" && progress === 1) finishReveal(wasKeyboard);
  }
  function syncControls() {
    const stopped = pausedByReader || reducedMotion;
    pause.setAttribute("aria-pressed", String(stopped));
    pause.setAttribute("aria-label", sceneStatic ? "当前画面使用静态模式" : reducedMotion ? "系统已启用减少动态效果" : stopped ? "继续画面中的移动" : "暂停画面中的移动");
    pauseLabel.textContent = reducedMotion ? "静态" : stopped ? "继续" : "暂停";
    pause.disabled = reducedMotion || unavailable;
    replay.hidden = progress === 0 && phase === "road";
    const holdingChoice = canHoldChoice();
    stepOut.textContent = holdingChoice ? "按住，再往前一步" : "再往前一步 ↗";
    if (holdingChoice) stepOut.classList.add("hold-choice");
    else stepOut.classList.remove("hold-choice");
    const acceptsInput = phase === "road" || (isWorldStory() && phase === "exit") || (holdingChoice && phase === "ring");
    world.setAttribute("aria-disabled", String(!acceptsInput || pausedByReader || !ready));
    instructions.textContent = isWorldStory() && !reducedMotion
      ? phase === "done" ? "她在新的路上继续走。可以随时阅读正文，或重新观看。"
        : phase === "ring" && holdingChoice ? "按住画面、下一步按钮或空格键，迈出这一步；短按只作试探，松开可以停下。也可直接阅读正文。"
        : phase === "exit" ? "按住画面或空格键，踏上新的路；松开后停在落脚点。也可随时跳到完整解读。"
        : "按住画面或空格键，陪她向前走；松开后她会放慢。也可随时跳到完整解读。"
      : reducedMotion
      ? "点击画面或按空格键，查看完整的环。也可随时跳到完整解读。"
      : "按住鼠标、触摸画面或按住空格键，让视角慢慢拉远；松开停在当前视角。也可随时跳到完整解读。";
    if (scene && !unavailable) {
      scene.reducedMotion = reducedMotion;
      if (stopped !== lastEnginePause) { scene.setPaused(stopped); lastEnginePause = stopped; }
      const active = ready && !disposed && isActive();
      if (active !== lastEngineActivity) { scene.setActive(active); lastEngineActivity = active; }
    }
  }
  function requestFrame() {
    const needsClock = phase === "road" ? held || visibleElapsed < timings.invitation
      : isWorldStory() ? held && (phase === "exit" || (canHoldChoice() && phase === "ring")) : !["ring", "done"].includes(phase);
    if (!frameRequest && canMove() && needsClock) {
      if (lastFrame === null) lastFrame = performance.now();
      frameRequest = requestAnimationFrame(tick);
    } else if (!needsClock) lastFrame = null;
  }
  function syncActivity() {
    if (!canMove()) release();
    if (frameRequest) cancelAnimationFrame(frameRequest);
    frameRequest = 0;
    lastFrame = null;
    syncControls();
    requestFrame();
  }
  function showCompletion() {
    completion.hidden = false;
    // Start the fade after the element has a visible layout box.
    completion.getBoundingClientRect();
    completion.classList.add("visible");
    if (document.activeElement === world && focusAfterReveal) stepOut.focus({ preventScroll: true });
    focusAfterReveal = false;
  }
  function hideCompletion() {
    completion.classList.remove("visible");
    completion.hidden = true;
  }
  function onStateChange(snapshot) {
    if (!isWorldStory() || !ready || unavailable || disposed) return;
    const actual = snapshot || scene.getState();
    if (Number.isFinite(actual.holdProgress)) progress = Math.max(0, Math.min(1, actual.holdProgress));
    updateProgressArc();
    if (actual.exitComplete) {
      if (phase !== "done") {
        phase = "done";
        release();
        setState(2);
        invitation.classList.remove("visible");
        stepOut.hidden = true;
      }
      // The world can finish the step before its closing camera movement.
      // Keep that quiet beat in the scene's control; older scenes omit this flag.
      if (actual.presentationReady !== false && completion.hidden) {
        finalActions.hidden = false;
        showCompletion();
        announce("画面已展开。可以继续阅读或重新观看。");
      }
    } else if (canHoldChoice() && phase === "ring" && ["placing", "crossing", "leaving"].includes(actual.phase)) {
      // The same held gesture now owns the step. Do not release it when the
      // scene commits the choice, including when its button loses focus.
      phase = "exit";
      hideCompletion();
      setState(2);
      invitationWords.textContent = invitationText();
      invitation.classList.add("visible");
      announce(states[2].description);
      if (document.activeElement === stepOut) world.focus({ preventScroll: true });
    } else if (actual.canExit && phase !== "ring" && !["exit", "done"].includes(phase)) {
      focusAfterReveal = keyboardHeld;
      phase = "ring";
      release();
      setState(1);
      invitation.classList.remove("visible");
      showCompletion();
      announce(states[1].description + " 可以再往前一步，或直接阅读正文。");
    } else if (actual.phase === "revealing" && phase === "road" && state !== 1) {
      setState(1);
    }
    syncControls();
    requestFrame();
  }
  function finishReveal(fromKeyboard = keyboardHeld) {
    if (isWorldStory() || phase !== "road" || !revealComplete()) return;
    focusAfterReveal = fromKeyboard;
    phase = "settling";
    phaseElapsed = 0;
    release();
    lastFrame = performance.now();
    setState(1);
    invitation.classList.remove("visible");
    announce(states[1].description + " 可以再往前一步，或直接阅读正文。");
    syncControls();
    requestFrame();
  }
  function start(event) {
    if (event && event.button !== undefined && event.button !== 0) return;
    if (!canMove() || (phase !== "road" && !(isWorldStory() && phase === "exit") && !(canHoldChoice() && phase === "ring")) || held) return;
    if (reducedMotion) {
      if (isWorldStory()) {
        // A motion preference can change midway through a step. Re-enter the
        // static choice before selecting its static final state.
        scene.setProgress(1);
        if (phase === "exit") scene.setExit(1);
        onStateChange();
        return;
      }
      progress = 1;
      scene.setProgress(1);
      finishReveal();
      return;
    }
    held = true;
    heldSince = performance.now();
    heldFrom = progress;
    keyboardHeld = !event || event.pointerId === undefined;
    scene.setInteraction(1);
    invitation.classList.add("held", "visible");
    if (event && event.pointerId !== undefined) {
      pointerId = event.pointerId;
      world.setPointerCapture(pointerId);
    }
    requestFrame();
  }
  function beginExit() {
    if (phase !== "ring" || !canMove()) return;
    hideCompletion();
    phase = "exit";
    phaseElapsed = 0;
    lastFrame = performance.now();
    setState(2);
    announce(states[2].description);
    if (isWorldStory()) {
      scene.setInteraction(0);
      invitationWords.textContent = invitationText();
      invitation.classList.add("visible");
      scene.setExit(1);
      onStateChange();
      if (phase === "exit") world.focus({ preventScroll: true });
    } else scene.setInteraction(.6);
    syncControls();
    requestFrame();
  }
  function returnToRoad() {
    progress = 0;
    revealReady = false;
    heldFrom = 0;
    phase = "road";
    phaseElapsed = 0;
    visibleElapsed = timings.invitation;
    focusAfterReveal = false;
    scene.setProgress(0);
    progressArc.style.strokeDashoffset = "62.83";
    setState(0);
    invitationWords.textContent = invitationText();
    invitation.classList.add("visible");
    world.focus({ preventScroll: true });
  }
  function reset() {
    if (!ready || unavailable) return;
    release();
    hideCompletion();
    finalActions.hidden = true;
    stepOut.hidden = false;
    pausedByReader = false;
    if (typeof scene.reset === "function") {
      // A story scene owns persistent travel and event state, not just a camera.
      scene.reset();
      returnToRoad();
    } else {
      rewindFrom = progress;
      phase = "rewind";
      phaseElapsed = 0;
      scene.setExit(0);
      invitation.classList.remove("visible");
    }
    announce("重新回到路上。");
    syncActivity();
  }
  function tick(now) {
    frameRequest = 0;
    if (!canMove()) { lastFrame = null; return; }
    // Lifecycle changes reset the anchor; active low-FPS time is real time.
    const dt = lastFrame === null ? 0 : Math.max(0, (now - lastFrame) / 1000);
    lastFrame = now;
    visibleElapsed += dt;
    phaseElapsed += dt;
    if (phase === "road") {
      if (visibleElapsed >= timings.invitation) invitation.classList.add("visible");
      if (held && !isWorldStory()) {
        updateHold(now);
        if (progress === 1) finishReveal();
      }
    } else if (phase === "settling" && (reducedMotion || phaseElapsed >= timings.settle)) {
      phase = "ring";
      phaseElapsed = 0;
      showCompletion();
    } else if (phase === "exit") {
      if (!isWorldStory()) {
        const amount = reducedMotion ? 1 : Math.min(1, phaseElapsed / timings.exit);
        scene.setExit(amount);
        if (amount === 1) {
          phase = "exit-settling";
          phaseElapsed = 0;
          scene.setInteraction(0);
        }
      }
    } else if (phase === "exit-settling" && (reducedMotion || phaseElapsed >= timings.exitSettle)) {
      phase = "done";
      stepOut.hidden = true;
      finalActions.hidden = false;
      showCompletion();
      announce("画面已展开。可以继续阅读或重新观看。");
    } else if (phase === "rewind") {
      const amount = reducedMotion ? 1 : Math.min(1, phaseElapsed / timings.rewind);
      progress = rewindFrom * (1 - amount * amount * (3 - 2 * amount));
      scene.setProgress(progress);
      if (amount === 1) {
        returnToRoad();
      }
    }
    updateProgressArc();
    syncControls();
    requestFrame();
  }
  function fail() {
    unavailable = true;
    ready = false;
    release();
    if (scene) scene.destroy();
    world.classList.add("scene-unavailable");
    world.setAttribute("aria-busy", "false");
    world.setAttribute("aria-disabled", "true");
    invitation.classList.remove("visible");
    document.querySelector(".scene-tools").hidden = true;
    announce("动态画面暂不可用，可以直接阅读完整解读。");
    syncActivity();
  }

  world.addEventListener("pointerdown", start);
  world.addEventListener("pointerup", release);
  world.addEventListener("pointercancel", release);
  world.addEventListener("lostpointercapture", release);
  world.addEventListener("contextmenu", event => event.preventDefault());
  world.addEventListener("keydown", event => {
    if (event.code === "Space" || event.code === "Enter") {
      event.preventDefault();
      if (!event.repeat) start();
    }
  });
  world.addEventListener("keyup", event => {
    if (event.code === "Space" || event.code === "Enter") { event.preventDefault(); release(); }
  });
  world.addEventListener("blur", release);
  window.addEventListener("blur", release);
  stepOut.addEventListener("pointerdown", event => {
    if (canHoldChoice()) {
      // Transfer focus before starting: the previous scene focus must blur
      // before this new hold exists, rather than canceling it afterward.
      stepOut.focus({ preventScroll: true });
      start(event);
    }
  });
  stepOut.addEventListener("pointerup", () => { if (canHoldChoice()) release(); });
  stepOut.addEventListener("keydown", event => {
    if (canHoldChoice() && (event.code === "Space" || event.code === "Enter")) {
      event.preventDefault();
      if (!event.repeat) start();
    }
  });
  stepOut.addEventListener("keyup", event => {
    if (canHoldChoice() && (event.code === "Space" || event.code === "Enter")) {
      event.preventDefault(); release();
    }
  });
  stepOut.addEventListener("blur", () => { if (phase === "ring") release(); });
  stepOut.addEventListener("contextmenu", event => { if (canHoldChoice()) event.preventDefault(); });
  stepOut.addEventListener("click", event => {
    // Virtual activation from assistive technology retains an explicit route;
    // pointer clicks use the held gesture, and static/older scenes keep click.
    if (!canHoldChoice() || event.detail === 0) beginExit();
  });
  replay.addEventListener("click", reset);
  replayFinal.addEventListener("click", reset);
  pause.addEventListener("click", () => { pausedByReader = !pausedByReader; release(); syncActivity(); });
  document.addEventListener("visibilitychange", syncActivity);
  motionPreference.addEventListener("change", event => {
    reducedMotion = event.matches || sceneStatic;
    release();
    invitationWords.textContent = invitationText();
    syncActivity();
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      syncActivity();
    }, { threshold: .02 }).observe(hero);
  }
  window.addEventListener("pagehide", event => {
    pageActive = false;
    syncActivity();
    if (!event.persisted) { disposed = true; if (scene) scene.destroy(); }
  });
  window.addEventListener("pageshow", () => { pageActive = true; syncActivity(); });

  world.setAttribute("aria-busy", "true");
  try {
    const Scene = window[assets.constructor];
    scene = new Scene(world, { roadTextureUrl: assets.road, terrainTextureUrl: assets.terrain, groundTextureUrl: assets.ground, grassAtlasUrl: assets.grass, grassMetadata: assets.grassMetadata, worldTextureUrl: assets.world, markerUrl: assets.marker, markerMetadata, reducedMotion, onRevealReady, onStateChange, onExitComplete: onStateChange });
    sceneStatic = isWorldStory() && scene.mode === "fallback";
    reducedMotion = reducedMotion || sceneStatic;
    const needsRig = typeof scene.setRig === "function" && !["canvas", "fallback"].includes(scene.mode);
    const Rig = window[assets.rigConstructor || "CihouCharacterRig"];
    const preparation = needsRig
      ? Rig.create({ atlasUrl: assets.character, metadata: rigMetadata, height: .8 }).then(character => {
        if (disposed) { character.dispose(); return; }
        rig = character;
        scene.setRig(rig);
      })
      : Promise.resolve();
    preparation.then(() => {
      if (disposed) return;
      ready = true;
      world.setAttribute("aria-busy", "false");
      invitationWords.textContent = invitationText();
      syncActivity();
      onStateChange();
    }).catch(fail);
  } catch (error) { fail(); }
  syncControls();
})();

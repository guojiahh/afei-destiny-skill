(() => {
  "use strict";

  const hero = document.querySelector(".hero");
  const scene = document.querySelector("#scene");
  const title = document.querySelector("#scene-title");
  const description = document.querySelector("#scene-description");
  const hint = document.querySelector("#scene-hint");
  const replay = document.querySelector("#replay");
  const pause = document.querySelector("#pause");
  const pauseLabel = document.querySelector("#pause-label");
  const walker = document.querySelector("#walker");
  const roadMarker = document.querySelector("#road-marker");
  const frontLeg = document.querySelector(".leg-front");
  const backLeg = document.querySelector(".leg-back");
  const frontArm = document.querySelector(".arm-front");
  const backArm = document.querySelector(".arm-back");
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const states = JSON.parse(document.querySelector("#report-data").textContent).hero_states;

  // Coordinates use the same 1200 × 900 image plane as both source assets.
  // Keep art alignment here so changes never alter the reading layout.
  const geometry = {
    road: {
      start: [660, 760],
      curves: [
        [[620, 650], [750, 500], [670, 385]],
        [[630, 330], [490, 285], [410, 245]],
        [[335, 215], [310, 165], [410, 135]],
        [[520, 105], [675, 88], [650, 15]]
      ]
    },
    loop: {
      start: [660, 666],
      curves: [
        [[480, 657], [336, 621], [276, 540]],
        [[108, 495], [96, 432], [252, 405]],
        [[480, 405], [636, 261], [780, 243]],
        [[984, 126], [1140, 234], [1128, 405]],
        [[1140, 585], [900, 675], [660, 666]]
      ]
    },
    exit: { x: 684, y: 794 }
  };

  function sampleRoute(route) {
    const points = [{ x: route.start[0], y: route.start[1], distance: 0 }];
    let start = route.start;
    route.curves.forEach(curve => {
      for (let step = 1; step <= 100; step++) {
        const t = step / 100;
        const u = 1 - t;
        const x = u ** 3 * start[0] + 3 * u ** 2 * t * curve[0][0] + 3 * u * t ** 2 * curve[1][0] + t ** 3 * curve[2][0];
        const y = u ** 3 * start[1] + 3 * u ** 2 * t * curve[0][1] + 3 * u * t ** 2 * curve[1][1] + t ** 3 * curve[2][1];
        const previous = points[points.length - 1];
        points.push({ x, y, distance: previous.distance + Math.hypot(x - previous.x, y - previous.y) });
      }
      start = curve[2];
    });
    return { points, length: points[points.length - 1].distance };
  }
  const roadRoute = sampleRoute(geometry.road);
  const loopRoute = sampleRoute(geometry.loop);

  let state = 0;
  let locked = false;
  let pausedByReader = false;
  let inView = true;
  let reducedMotion = motionPreference.matches;
  let phase = .12;
  let clock = 0;
  let exitProgress = 0;
  let exitStartPhase = 0;
  let frameRequest = 0;
  let lastFrame = 0;
  let pendingTimers = [];

  const lerp = (a, b, progress) => a + (b - a) * progress;
  const ease = value => value * value * (3 - 2 * value);
  function routePoint(route, value) {
    const distance = Math.max(0, Math.min(1, value)) * route.length;
    let left = 0;
    let right = route.points.length - 1;
    while (right - left > 1) {
      const middle = Math.floor((left + right) / 2);
      if (route.points[middle].distance < distance) left = middle;
      else right = middle;
    }
    const a = route.points[left];
    const b = route.points[right];
    const progress = (distance - a.distance) / (b.distance - a.distance || 1);
    return { x: lerp(a.x, b.x, progress), y: lerp(a.y, b.y, progress) };
  }
  function loopingPoint(value) {
    const point = routePoint(loopRoute, ((value % 1) + 1) % 1);
    return { ...point, scale: .62 + point.y / 900 * .68 };
  }

  function currentPoint() {
    if (state === 0) {
      const point = routePoint(roadRoute, phase);
      return { ...point, scale: lerp(.98, .24, phase) };
    }
    if (state === 1) return loopingPoint(phase);
    // Follow the ribbon to its foreground before taking the short step onto paper.
    // This keeps the person out of the transparent centre, even after a full loop.
    if (exitProgress < .48) {
      const target = exitStartPhase > .5 ? 1 : 0;
      return loopingPoint(lerp(exitStartPhase, target, ease(exitProgress / .48)));
    }
    const start = loopingPoint(0);
    const progress = ease((exitProgress - .48) / .52);
    return {
      x: lerp(start.x, geometry.exit.x, progress),
      y: lerp(start.y, geometry.exit.y, progress),
      scale: lerp(start.scale, 1.1, progress)
    };
  }

  function drawWalker(moving) {
    const point = currentPoint();
    const stride = moving ? Math.sin(clock * .009) * 17 : 0;
    const bob = moving ? Math.abs(Math.sin(clock * .009)) * 1.5 : 0;
    walker.style.opacity = state === 0 ? "0" : "1";
    if (state === 0) {
      const markPoint = routePoint(roadRoute, 1 - phase);
      const nextPoint = routePoint(roadRoute, Math.min(1, 1 - phase + .01));
      const angle = Math.atan2(nextPoint.y - markPoint.y, nextPoint.x - markPoint.x) * 180 / Math.PI + 90;
      const scale = lerp(.25, 1.5, phase);
      roadMarker.setAttribute("transform", `translate(${markPoint.x.toFixed(2)} ${markPoint.y.toFixed(2)}) rotate(${angle.toFixed(2)}) scale(${scale.toFixed(3)})`);
      roadMarker.setAttribute("opacity", String(Math.min(1, phase / .08, (1 - phase) / .15) * .42));
    } else roadMarker.setAttribute("opacity", "0");
    walker.setAttribute("transform", `translate(${point.x.toFixed(2)} ${(point.y - bob).toFixed(2)}) scale(${point.scale.toFixed(3)})`);
    frontLeg.style.transform = `rotate(${stride}deg)`;
    backLeg.style.transform = `rotate(${-stride}deg)`;
    frontArm.style.transform = `rotate(${-stride * .65}deg)`;
    backArm.style.transform = `rotate(${stride * .65}deg)`;
  }

  function canAnimate() {
    return !reducedMotion && !pausedByReader && inView && !document.hidden && (state !== 2 || exitProgress < 1);
  }

  function animate(now) {
    frameRequest = 0;
    if (!canAnimate()) {
      lastFrame = 0;
      drawWalker(false);
      return;
    }
    const elapsed = lastFrame ? Math.min(now - lastFrame, 50) : 0;
    lastFrame = now;
    clock += elapsed;
    if (!locked || state === 2) {
      if (state < 2) phase = (phase + elapsed / (state === 0 ? 14000 : 19000)) % 1;
      else exitProgress = Math.min(1, exitProgress + elapsed / 1850);
    }
    drawWalker((!locked || state === 2) && (state !== 2 || exitProgress < 1));
    if (canAnimate()) frameRequest = requestAnimationFrame(animate);
  }

  function syncAnimation() {
    if (frameRequest) cancelAnimationFrame(frameRequest);
    frameRequest = 0;
    lastFrame = 0;
    if (reducedMotion && state === 2) exitProgress = 1;
    drawWalker(false);
    if (canAnimate()) frameRequest = requestAnimationFrame(animate);
    const stopped = pausedByReader || reducedMotion;
    pause.setAttribute("aria-pressed", String(stopped));
    pause.setAttribute("aria-label", reducedMotion ? "系统已启用减少动态效果" : stopped ? "继续画面中的移动" : "暂停画面中的移动");
    pauseLabel.textContent = reducedMotion ? "静态" : stopped ? "继续" : "暂停";
    pause.disabled = reducedMotion;
  }

  function applyText() {
    const next = states[state];
    title.replaceChildren(document.createTextNode(next.lines[0]), document.createElement("br"), document.createTextNode(next.lines[1]));
    description.textContent = next.description;
    hint.replaceChildren(Object.assign(document.createElement("span"), { className: "signal" }), document.createTextNode(next.hint));
    hint.firstChild.setAttribute("aria-hidden", "true");
    scene.setAttribute("aria-label", next.label);
    scene.disabled = state === 2;
    replay.hidden = state === 0;
  }

  function changeState(next) {
    if (locked || next === state) return;
    locked = true;
    hero.classList.add("is-transitioning", "copy-out");
    const duration = reducedMotion ? 0 : next === 2 ? 2100 : 820;
    pendingTimers.push(setTimeout(() => {
      if (next === 2) exitStartPhase = phase;
      state = next;
      if (next === 0) { phase = .12; exitProgress = 0; }
      if (next === 1) phase = 0;
      hero.dataset.state = String(state);
      if ((reducedMotion || pausedByReader) && state === 2) exitProgress = 1;
      drawWalker(false);
      applyText();
      if (state === 2) syncAnimation();
    }, reducedMotion ? 0 : 130));
    pendingTimers.push(setTimeout(() => {
      hero.classList.remove("copy-out", "is-transitioning");
      locked = false;
      pendingTimers = [];
      syncAnimation();
    }, duration));
  }

  scene.addEventListener("click", () => {
    if (state < 2) changeState(state + 1);
  });
  document.querySelector(".wordmark").addEventListener("click", event => {
    event.preventDefault();
    changeState(0);
  });
  replay.addEventListener("click", () => changeState(0));
  pause.addEventListener("click", () => {
    pausedByReader = !pausedByReader;
    syncAnimation();
  });
  document.addEventListener("visibilitychange", syncAnimation);
  motionPreference.addEventListener("change", event => {
    reducedMotion = event.matches;
    syncAnimation();
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      syncAnimation();
    }, { threshold: .08 }).observe(scene);
  }
  window.addEventListener("pagehide", () => {
    pendingTimers.forEach(clearTimeout);
    if (frameRequest) cancelAnimationFrame(frameRequest);
  });
  window.addEventListener("pageshow", event => {
    if (!event.persisted) return;
    pendingTimers = [];
    locked = false;
    hero.classList.remove("copy-out", "is-transitioning");
    applyText();
    syncAnimation();
  });
  syncAnimation();
})();

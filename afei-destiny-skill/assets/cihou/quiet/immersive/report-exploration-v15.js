/* Shared exploration controller. All personal language comes from report-data. */
(() => {
  'use strict';
  const $ = id => document.querySelector('#' + id);
  const hero = document.querySelector('.hero'), world = $('scene');
  const data = JSON.parse($('report-data').textContent);
  const states = data.hero_states, choices = data.hero_choices || [];
  const assets = JSON.parse($('hero-assets').textContent);
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const chapters = [$('chapter-road'), $('chapter-ring'), $('chapter-choices')];
  const choiceButtons = [$('choice-0'), $('choice-1'), $('choice-2')];
  let scene, ready = false, disposed = false, unavailable = false;
  let paused = false, inView = true, pageActive = true, reduced = media.matches;
  let current = -1, selected = -1, choicesOpen = false, pointer = null;
  let keyboard = false, moving = false, lastBiome = 0, transitionTimer;
  let captionTimer, captionPending = null, captionSince = 0;
  let fallbackChapter = 0;
  const active = () => pageActive && inView && !document.hidden && !disposed;
  const canMove = () => ready && active() && !paused && !unavailable;
  const announce = text => { $('scene-status').textContent = text; };
  function stop() {
    keyboard = false; moving = false;
    if (scene) { scene.setInteraction(0); scene.setSteering(0); }
    const captured = pointer; pointer = null;
    if (captured !== null && world.hasPointerCapture(captured)) world.releasePointerCapture(captured);
    $('scene-invitation').classList.remove('held');
  }
  function applyCopy(index) {
    const state = states[index];
    current = index; hero.dataset.state = String(index);
    $('scene-line-1').textContent = state.lines[0];
    $('scene-line-2').textContent = state.lines[1];
    $('scene-caption').textContent = state.description;
    $('scene-description').textContent = state.description;
    $('scene-kicker').textContent = ['路上 · 01 / 03', '看见 · 02 / 03', '可能 · 03 / 03'][index];
    world.setAttribute('aria-label', state.label);
    chapters.forEach((button, i) => button.setAttribute('aria-current', i === index ? 'step' : 'false'));
    captionSince = performance.now();
  }
  function copy(index, immediate = false) {
    if (index === current) { clearTimeout(captionTimer); captionPending = null; return; }
    // A quick gesture cannot replace a sentence before it can be read.
    const delay = Math.max(0, 3200 - (performance.now() - captionSince));
    clearTimeout(captionTimer);
    if (immediate || reduced || !delay || current < 0) { captionPending = null; applyCopy(index); }
    else { captionPending = index; captionTimer = setTimeout(() => {
      if (active() && captionPending !== null) applyCopy(captionPending);
      captionPending = null;
    }, delay); }
  }
  function transition() {
    if (reduced) return;
    clearTimeout(transitionTimer);
    $('scene-transition').classList.remove('passing');
    $('scene-transition').getBoundingClientRect();
    $('scene-transition').classList.add('passing');
    transitionTimer = setTimeout(() => $('scene-transition').classList.remove('passing'), 2600);
  }
  function synchronize(snapshot) {
    if (disposed || (!ready && !unavailable)) return;
    const s = unavailable ? { chapter: fallbackChapter, canExit: fallbackChapter > 0, holdProgress: fallbackChapter > 0 ? 1 : 0 }
      : snapshot || scene.getState();
    const done = !!s.exitComplete;
    const leaving = s.phase === 'leaving';
    const chapter = choicesOpen || selected >= 0 || s.chapter === 2 ? 2 : s.chapter === 1 || s.canExit ? 1 : 0;
    copy(chapter);
    hero.dataset.biome = String(s.biome || 0);
    if (s.biome !== undefined && s.biome !== lastBiome) { lastBiome = s.biome; transition(); }
    $('press-progress').style.strokeDashoffset = String(62.83 * (1 - Math.max(0, Math.min(1, s.holdProgress || 0))));
    $('scene-completion').hidden = !(done || (s.canExit && !choicesOpen));
    $('scene-completion').classList.add('visible');
    $('step-out').hidden = done || choicesOpen;
    $('scene-final-actions').hidden = !done || s.presentationReady === false;
    $('scene-choices').hidden = leaving || !choicesOpen || choices.length !== 3;
    $('choice-walk').hidden = unavailable || done || selected < 0;
    $('replay').hidden = !(s.holdProgress > 0 || choicesOpen);
    $('scene-invitation').classList.add('visible');
    $('scene-invitation').hidden = unavailable || (choicesOpen && !leaving) || done;
    $('scene-invitation-words').textContent = reduced ? '点击，看见整条路' : leaving ? '鼠标左右，走完这一步' : s.canExit ? '还可以继续绕行' : '鼠标左右，陪她走一段';
    world.setAttribute('aria-disabled', String(!canMove()));
  }
  function activity() {
    if (!canMove()) stop();
    if (scene && !unavailable) { scene.reducedMotion = reduced; scene.setPaused(paused || reduced); scene.setActive(ready && active()); }
    $('pause').disabled = reduced || unavailable;
    $('pause').setAttribute('aria-pressed', String(paused || reduced));
    $('pause').setAttribute('aria-label', reduced ? '系统已启用减少动态效果' : paused ? '继续画面中的移动' : '暂停画面中的移动');
    $('pause-label').textContent = reduced ? '静态' : paused ? '继续' : '暂停';
    $('scene-instructions').textContent = reduced
      ? '点击画面查看全环；也可用顶部三个视角按钮直接查看静态场景，选择走法或阅读正文。'
      : '鼠标移到画面左侧或右侧，沿环路回走或前进；移回中央或移出画面停下。触摸按住左右两侧，或用方向键、空格键行走。顶部可直接切换视角，随时阅读正文。';
    if (captionPending !== null && active()) copy(captionPending, true);
    synchronize();
  }
  function steer(event) {
    if (!canMove() || reduced || keyboard) return;
    if (event.pointerType && event.pointerType !== 'mouse' && pointer === null) return;
    const rect = world.getBoundingClientRect();
    const normalized = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - .5) * 2));
    scene.setSteering(normalized);
    moving = Math.abs(normalized) > .16;
    scene.setInteraction(0);
    $('scene-invitation').classList[moving ? 'add' : 'remove']('held');
  }
  function inspect(index) {
    if (!ready && !unavailable) return;
    stop(); choicesOpen = index === 2; selected = -1;
    choiceButtons.forEach(button => button.setAttribute('aria-pressed', 'false'));
    $('choice-detail').hidden = true;
    fallbackChapter = index;
    if (!unavailable) {
      if (index === 0) { scene.reset(); lastBiome = 0; }
      else { scene.setExit(0); scene.setProgress(1); }
    }
    copy(index, true); synchronize();
    announce(states[index].description);
  }
  function select(index) {
    if ((!ready && !unavailable) || choices.length !== 3) return;
    stop(); selected = index; choicesOpen = true;
    const choice = choices[index];
    choiceButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    $('choice-condition').textContent = choice.condition;
    $('choice-text').textContent = choice.text;
    $('choice-detail').hidden = false;
    if (!unavailable) { scene.setExit(0); scene.setChoice(index); }
    copy(2, true); synchronize();
    announce(choice.condition + '。' + choice.text);
  }
  function walk() {
    if (!canMove() || (choices.length && selected < 0)) return;
    stop(); scene.setExit(1); synchronize();
    announce('这一步只是一次尝试。可以继续比较其他走法，或阅读正文。');
  }
  function fail() {
    unavailable = true; ready = false; stop();
    if (scene) scene.destroy();
    world.classList.add('scene-unavailable'); world.setAttribute('aria-busy', 'false');
    world.setAttribute('aria-disabled', 'true');
    $('scene-invitation').hidden = true;
    document.querySelector('.scene-tools').hidden = true;
    $('scene-footnote').textContent = '动态画面暂不可用。仍可切换三个视角，并阅读完整正文。';
    announce('动态画面暂不可用，可以直接阅读完整解读。');
    synchronize();
  }
  chapters.forEach((button, index) => button.addEventListener('click', () => inspect(index)));
  choiceButtons.forEach((button, index) => {
    button.textContent = choices[index] ? choices[index].title : '';
    button.addEventListener('click', () => select(index));
  });
  $('scene-choices').addEventListener('pointerenter', stop);
  $('scene-chapters').addEventListener('pointerenter', stop);
  $('step-out').addEventListener('click', () => {
    inspect(2);
    if (!choices.length) walk();
    else choiceButtons[0].focus({ preventScroll: true });
  });
  $('choice-walk').addEventListener('click', walk);
  $('replay').addEventListener('click', () => inspect(0));
  $('replay-final').addEventListener('click', () => inspect(0));
  $('pause').addEventListener('click', () => { paused = !paused; stop(); activity(); });
  world.addEventListener('pointermove', steer);
  world.addEventListener('pointerleave', () => { if (pointer === null) stop(); });
  world.addEventListener('pointerdown', event => {
    if (event.button !== undefined && event.button !== 0 || !canMove()) return;
    if (reduced) { inspect(1); return; }
    pointer = event.pointerId; world.setPointerCapture(pointer);
    steer(event);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture', 'blur'].forEach(type => world.addEventListener(type, stop));
  world.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Space', 'Enter'].includes(event.code)) return;
    event.preventDefault();
    if (!canMove() || event.repeat) return;
    if (reduced) { inspect(current < 1 ? 1 : 2); return; }
    keyboard = true; scene.setSteering(event.code === 'ArrowLeft' ? -1 : 1); scene.setInteraction(1);
  });
  world.addEventListener('keyup', event => {
    if (['ArrowLeft', 'ArrowRight', 'Space', 'Enter'].includes(event.code)) { event.preventDefault(); stop(); }
  });
  window.addEventListener('blur', stop);
  document.addEventListener('visibilitychange', activity);
  media.addEventListener('change', event => {
    reduced = event.matches; stop(); activity();
    if (reduced && ready) inspect(current < 1 ? 0 : current);
  });
  let observer;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; activity(); }, { threshold: .02 });
    observer.observe(hero);
  }
  window.addEventListener('pagehide', event => {
    pageActive = false; activity();
    clearTimeout(transitionTimer); clearTimeout(captionTimer);
    if (!event.persisted) { disposed = true; if (observer) observer.disconnect(); if (scene) scene.destroy(); }
  });
  window.addEventListener('pageshow', () => { pageActive = true; activity(); });
  world.setAttribute('aria-busy', 'true'); applyCopy(0);
  try {
    scene = new window[assets.constructor](world, {
      reducedMotion: reduced, roadTextureUrl: assets.road, onStateChange: synchronize, onExitComplete: synchronize,
    });
    reduced = reduced || scene.mode === 'fallback';
    const Rig = window[assets.rigConstructor];
    const preparation = typeof scene.setRig === 'function' && scene.mode !== 'fallback'
      ? Rig.create({ atlasUrl: assets.character, metadata: JSON.parse($('hero-rig-meta').textContent), height: .8 }).then(rig => {
        if (disposed) rig.dispose(); else scene.setRig(rig);
      }) : Promise.resolve();
    preparation.then(() => {
      if (disposed) return;
      ready = true; world.setAttribute('aria-busy', 'false'); activity(); synchronize();
    }).catch(fail);
  } catch (error) { fail(); }
})();

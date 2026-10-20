(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const data = window.CIHOU_STORY_DATA;
  const states = data.hero_states, choices = data.choices || [];
  const loop = data.loop_story;
  const labels = loop ? ['此刻', '来处', '可能'] : ['来处', '此刻', '可能'];
  const surface = $('story-surface'), dialog = $('reading-dialog');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let api, chapter = 0, selected = null, muted = true, paused = false, heldPointer = null, heldKey = null, latest, booted = false;
  function applyActivity() {
    if (!api) return;
    api.setPaused(paused || reduced.matches);
    api.setActive(!dialog.open && !$('story-note').open && !reduced.matches);
  }
  function stop() {
    if (api) { api.setSteering(0); api.setInteraction(0); }
    const pointer = heldPointer; heldPointer = heldKey = null;
    if (pointer !== null && surface.hasPointerCapture(pointer)) surface.releasePointerCapture(pointer);
    surface.dataset.holding = 'false';
  }
  function hold() {
    if (!api || reduced.matches || paused || dialog.open || $('story-note').open || (latest && latest.transitioning)) return false;
    api.setSteering(0); api.setInteraction(1);
    surface.dataset.holding = 'true';
    return true;
  }
  function read() { stop(); dialog.showModal(); applyActivity(); }
  function close() { dialog.close(); applyActivity(); surface.focus({preventScroll: true}); }
  $('read-report').addEventListener('click', read);
  $('error-read').addEventListener('click', read);
  document.querySelector('.skip').addEventListener('click', event => { event.preventDefault(); read(); });
  $('close-reading').addEventListener('click', close);
  dialog.addEventListener('close', applyActivity);
  $('story-note').addEventListener('toggle', () => { stop(); applyActivity(); });
  function render(state) {
    latest = state; chapter = state.chapter;
    document.body.dataset.chapter = chapter;
    document.body.dataset.biome = state.biomeName || 'forest';
    document.body.dataset.transitioning = !!state.transitioning;
    document.body.dataset.phase = state.phase || 'road';
    surface.dataset.loopTurns = String(state.loopTurns || 0);
    surface.dataset.progress = String(state.holdProgress || 0);
    surface.dataset.ready = String(!!state.ready);
    surface.dataset.loopNode = state.loopNodeId || '';
    surface.dataset.anchorVisit = String(state.anchorVisit || 0);
    const copy = states[chapter];
    $('story-kicker').textContent = labels[chapter] + ' · 0' + (chapter + 1);
    $('story-title').textContent = copy.lines.join('\n');
    const context = loop && loop[['present', 'past', 'future'][chapter]];
    const activeNode = loop && chapter === 0 && loop.nodes.find(node => node.id === state.loopNodeId);
    // Explain only the sentence currently encountered; the reading view
    // retains the whole loop instead of repeating it at every waypoint.
    $('story-description').textContent = activeNode ? activeNode.detail : context ? context.text : copy.description;
    $('story-choices').hidden = chapter !== 2 || !choices.length;
    $('next-chapter').hidden = chapter === 2;
    $('next-chapter').textContent = chapter === 0 ? (loop ? '回看这条路的来处 ↗' : '看见这条路 ↗') : '看看其他走法 ↗';
    $('restart').hidden = chapter !== 2;
    $('story-instruction').textContent = reduced.matches ? '已减少动态 · 点击上方视角继续阅读' : state.transitioning ? '风景正在变化' : state.exitComplete ? '这一小步走到了这里。接下来，由现实给你新的信息。' : state.phase === 'exit' ? '长按画面，沿选定的方向走一步 · 松开停下' : chapter === 2 ? '每条路都有自己的条件。可以比较，也可以重新选择。' : '长按画面，沿环行走 · 松开停下 · 也可按住空格键';
    document.querySelectorAll('[data-chapter]').forEach(button => {
      if (button.tagName !== 'BUTTON') return;
      button.textContent = '0' + (+button.dataset.chapter + 1) + ' ' + labels[+button.dataset.chapter];
      if (+button.dataset.chapter === chapter) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    $('walk-choice').disabled = !!state.transitioning;
    $('walk-choice').textContent = state.exitComplete ? '这一小步已走过' : state.phase === 'exit' ? '长按画面，继续走一步' : '试着走一步 ↗';
  }
  function setChapter(next) {
    stop(); $('story-note').open = false;
    if (api) api.setChapter(next); else render({chapter: next, ready: false});
    $('story-status').textContent = states[next].description;
  }
  document.querySelectorAll('button[data-chapter]').forEach(button => button.addEventListener('click', () => setChapter(+button.dataset.chapter)));
  $('next-chapter').addEventListener('click', () => setChapter(Math.min(2, chapter + 1)));
  $('restart').addEventListener('click', () => {
    stop(); selected = null; $('choice-detail').hidden = true;
    $('choice-tabs').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', 'false'));
    if (api) api.reset(); else setChapter(0);
  });
  choices.forEach((choice, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.id = 'choice-' + index; button.setAttribute('aria-pressed', 'false');
    const number = document.createElement('span'); number.textContent = '0' + (index + 1);
    button.append(number, document.createTextNode(choice.title));
    button.addEventListener('click', () => {
      if (latest && latest.transitioning && !reduced.matches) return;
      stop(); selected = index;
      $('choice-tabs').querySelectorAll('button').forEach((item, i) => item.setAttribute('aria-pressed', String(i === index)));
      $('choice-condition').textContent = choice.condition;
      $('choice-description').textContent = choice.text;
      $('choice-detail').hidden = false;
      if (api && !reduced.matches) api.setChoice(index);
      $('story-status').textContent = choice.title + '。' + choice.condition + choice.text;
    });
    $('choice-tabs').append(button);
  });
  $('walk-choice').addEventListener('click', () => { if (api && selected !== null) { stop(); api.setExit(1); surface.focus({preventScroll: true}); } });
  surface.addEventListener('pointerdown', event => {
    if ((event.button && event.button !== 0) || heldPointer !== null || event.isPrimary === false) return;
    if (!hold()) return;
    event.preventDefault(); heldPointer = event.pointerId; surface.setPointerCapture(event.pointerId);
    surface.focus({preventScroll: true});
  });
  surface.addEventListener('pointerup', event => { if (event.pointerId === heldPointer) stop(); });
  surface.addEventListener('pointercancel', stop);
  surface.addEventListener('lostpointercapture', stop);
  surface.addEventListener('pointerleave', event => { if (heldPointer !== null && !surface.hasPointerCapture(event.pointerId)) stop(); });
  surface.addEventListener('keydown', event => {
    if (!api || !['ArrowLeft', 'ArrowRight', ' '].includes(event.key)) return;
    event.preventDefault();
    if (reduced.matches) return;
    if (heldPointer === null && heldKey === null && hold()) heldKey = event.key;
  });
  surface.addEventListener('keyup', event => { if (event.key === heldKey) { event.preventDefault(); stop(); } });
  surface.addEventListener('blur', stop);
  document.querySelectorAll('.story-bar,.story-copy,.story-footer,.story-choices').forEach(el => el.addEventListener('pointerenter', stop));
  window.addEventListener('blur', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  $('pause').addEventListener('click', () => { paused = !paused; stop(); applyActivity(); $('pause').textContent = paused ? '继续' : '暂停'; $('pause').setAttribute('aria-pressed', String(paused)); });
  $('sound').addEventListener('click', () => { muted = !muted; if (api) api.setMuted(muted); $('sound').textContent = '声音 · ' + (muted ? '关' : '开'); $('sound').setAttribute('aria-pressed', String(!muted)); });
  document.addEventListener('cihou:state', event => {
    // Initialization emits state before ready. Keep the user's pending view.
    if (!api) return;
    render(event.detail);
    if (!reduced.matches && chapter === 2 && selected !== null && !event.detail.transitioning
        && event.detail.selectedChoice !== selected) api.setChoice(selected);
  });
  document.addEventListener('cihou:anchor', event => {
    if (event.detail.node && event.detail.node.text) $('story-status').textContent = event.detail.node.text;
  });
  document.addEventListener('cihou:ready', event => {
    api = event.detail; $('story-loader').hidden = true;
    if (chapter) api.setChapter(chapter);
    if (chapter === 2 && selected !== null && !reduced.matches) api.setChoice(selected);
    api.setMuted(muted); applyActivity(); render(api.getState());
  });
  function fail(error) { console.error('Cihou Wayfinder:', error && (error.stack || error.message) || String(error)); $('story-loader').hidden = true; $('story-error').hidden = false; }
  document.addEventListener('cihou:error', event => fail(event.detail));
  render({chapter: 0, ready: false});
  function syncMotion() {
    stop();
    document.body.dataset.reduced = String(reduced.matches);
    $('walk-choice').hidden = reduced.matches;
    if (reduced.matches) $('story-loader').hidden = true;
    if (!reduced.matches && !booted) { booted = true; window.WayfinderTemplate.connect().catch(fail); }
    if (!reduced.matches && api && chapter === 2 && selected !== null && !api.getState().transitioning) api.setChoice(selected);
    applyActivity(); render(latest || {chapter, ready: false});
  }
  reduced.addEventListener('change', syncMotion);
  syncMotion();
})();

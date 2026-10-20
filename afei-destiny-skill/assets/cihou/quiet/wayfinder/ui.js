(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const data = window.CIHOU_STORY_DATA;
  const states = data.hero_states, choices = data.choices || [], loop = data.loop_story;
  const labels = loop ? ['现在', '之前', '此后'] : ['之前', '现在', '此后'];
  const surface = $('story-surface'), dialog = $('reading-dialog'), holdButton = $('guide-hold');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let api, chapter = 0, selected = null, muted = true, paused = false, heldPointer = null, heldKey = null, holdTarget = null;
  let latest, booted = false, failed = false, pendingPlay = false, staticResult = false, card = null, cardKey = '', readingReturn = null;
  const collected = new Set(), choiceButtons = [];
  let activeRun = null, viewingCollected = false;
  const walked = [new Set(), new Set()], released = [false, false], started = [false, false];
  function feedback(choice) {
    return choice.feedback || {lines: [choice.title, choice.condition, choice.text], result: choice.text};
  }
  function totalNodes(index) {
    return index === 0 && loop ? loop.nodes.length : (states[index].anchors || [states[index]]).length;
  }
  function holding() { return heldPointer !== null || heldKey !== null; }
  function hasCard() {
    return chapter === 2 && selected !== null && collected.has(selected) && !activeRun && !pendingPlay;
  }
  function collectResult(state) {
    if (!activeRun || state.chapter !== 2 || state.selectedChoice !== activeRun.index ||
        state.choiceRunId !== activeRun.runId || state.phase !== 'done' || !state.presentationReady ||
        state.choiceRunning || state.transitioning) return;
    collected.add(activeRun.index); activeRun = null;
    $('story-status').textContent = '已收集 ' + collected.size + ' / ' + choices.length + ' 张卡。' + feedback(choices[selected]).result;
  }
  function rememberWalk(state) {
    if (chapter > 1 || !holding() || !state.interacting || paused || state.paused || state.active === false ||
        document.hidden || dialog.open || $('story-note').open || reduced.matches || state.transitioning) return;
    started[chapter] = true;
    const valid = chapter === 0 && loop ? loop.nodes.map(node => node.id) :
      Array.from({length: totalNodes(chapter)}, (_, i) => 'anchor-' + i);
    if (valid.includes(state.loopNodeId)) walked[chapter].add(state.loopNodeId);
  }
  function guide(state) {
    const choice = chapter === 2 && selected !== null ? choices[selected] : null;
    const done = hasCard();
    const staticReading = reduced.matches || failed;
    const complete = chapter < 2 && walked[chapter].size >= totalNodes(chapter) && released[chapter];
    $('story-guide').dataset.complete = String(complete);
    $('guide-progress').dataset.count = chapter < 2 ? String(walked[chapter].size) : '0';
    $('guide-progress').dataset.total = chapter < 2 ? String(totalNodes(chapter)) : '0';
    $('guide-progress').dataset.complete = String(complete);
    $('guide-step').textContent = '第 ' + (chapter + 1) + ' 步 / 4 · ' + labels[chapter];
    $('next-chapter').hidden = chapter === 2;
    $('next-chapter').dataset.prominent = String(complete || staticReading);
    $('next-chapter').textContent = chapter === 0 ? '接着看：' + labels[1] + ' →' : '接着看：此后 →';
    $('restart').hidden = chapter !== 2;
    holdButton.hidden = chapter === 2 || staticReading || $('story-note').open;
    holdButton.disabled = !api || paused || !!state.transitioning;
    holdButton.dataset.holding = String(holding());
    $('hold-label').textContent = holding() ? '行走中 · 松开停下' : (chapter < 2 && started[chapter] ? '按住这里，继续走' : '按住这里，开始走');
    $('guide-progress').textContent = chapter < 2 && !staticReading ? '已走过 ' + walked[chapter].size + ' / ' + totalNodes(chapter) + ' 处 · 想多看一会儿，可以继续走' : '';
    let title, instruction;
    if (chapter < 2) {
      title = chapter === 0 ? '先沿路走一走，看见现在的循环' : '再走一段，看看这种模式怎样形成';
      instruction = chapter === 0 ? '按住按钮或风景空白处，松开就停。沿途的文字会反复出现。' : '和刚才一样长按，回看这些反应怎样慢慢变得熟悉。松开后可展开解释。';
      if (!api && !staticReading) instruction = '风景正在准备。稍后按住这里，小人就会向前走。';
      else if (complete) {
        title = chapter === 0 ? '这一路的环节，你都走过了' : '这段模式的来处，你已经走过';
        instruction = chapter === 0 ? '可以继续回看，也可以点右侧按钮，看看它是怎样形成的。' : '带着这份理解，去看看此后还能怎样选择。';
      } else if (holding()) instruction = '正在向前走。想细看文字，松开后点标题下的解释按钮。';
      else if (started[chapter]) instruction = '已停下。继续按住就能往前走，也可以点解释按钮慢慢读。';
      if (paused) { title = '先停在这里，慢慢看'; instruction = '点击顶部“继续”，再按住按钮行走。'; }
      if (staticReading) { title = '先读这一段，再继续下一步'; instruction = '展开标题下的解释，读完后点下一步。也可以随时进入完整解读。'; }
      if ($('story-note').open) { title = '先停下来，读懂这一段'; instruction = staticReading ? '读完后，点下一步继续。也可以先收起解释，回到风景。' : '点“收起解释”回到风景，再按住按钮继续走。'; }
    } else if (done) {
      title = collected.size === choices.length ? '卡片已收集齐，可以一张张翻看' : '这张卡已收好 · ' + collected.size + ' / ' + choices.length;
      instruction = collected.size === choices.length ? '点上方任意卡片直接阅读；想深入理解，就带着当前这张进入完整解读。' :
        '点“待收集”继续探索；已收集的卡片点开就能看。也可以先进入完整解读。';
    } else if (choice) {
      title = state.transitioning ? '风景正在为这个选择展开' : '这一步会自动走完，请看沿途的变化';
      instruction = paused ? '已暂停。点击顶部“继续”，接着看这一步。' : '不用再按住。体验结束就会收好这张卡，以后点它便可直接阅读。';
    } else if (choices.length) {
      title = collected.size ? '已收好的卡片，还在这里' : '先选一句，收集你的第一张卡';
      instruction = collected.size ? '点已收集的卡直接阅读，或选“待收集”继续探索。' : '任选一项，体验后就能得到对应卡片。一张卡也能进入完整解读。';
    } else {
      title = '把刚才的理解，带进完整解读';
      instruction = '点击顶部“04 完整解读”，慢慢看清这条路和接下来的选择。';
    }
    $('guide-title').textContent = title;
    $('story-instruction').textContent = instruction;
  }
  function applyActivity() {
    if (!api) return;
    api.setPaused(paused || reduced.matches);
    api.setActive(!dialog.open && !$('story-note').open && !reduced.matches);
  }
  function stop() {
    const pointer = heldPointer, target = holdTarget;
    heldPointer = heldKey = holdTarget = null;
    if (pointer !== null && target && target.hasPointerCapture(pointer)) target.releasePointerCapture(pointer);
    surface.dataset.holding = 'false'; holdButton.dataset.holding = 'false';
    if (api) { api.setSteering(0); api.setInteraction(0); }
    if (latest) guide(latest);
  }
  function userRelease() {
    if (chapter < 2 && walked[chapter].size >= totalNodes(chapter)) released[chapter] = true;
    stop();
  }
  function hold() {
    if (!api || chapter === 2 || reduced.matches || paused || dialog.open || $('story-note').open || (latest && latest.transitioning)) return false;
    api.setSteering(0); api.setInteraction(1); surface.dataset.holding = 'true';
    if (latest) guide(latest);
    return true;
  }
  function read(event) {
    readingReturn = event && event.currentTarget;
    stop();
    const chosen = hasCard() ? choices[selected] : null;
    $('reading-entry').hidden = !chosen;
    $('reading-choice-title').textContent = chosen ? chosen.title : '';
    $('reading-choice-result').textContent = chosen ? feedback(chosen).result : '';
    $('close-reading').textContent = chosen ? '回到我的卡片 ×' : '回到风景 ×';
    dialog.showModal(); dialog.scrollTop = 0;
    $('read-report').setAttribute('aria-current', 'step');
    $('reading-title').focus({preventScroll: true}); applyActivity();
  }
  function afterReading() {
    $('read-report').removeAttribute('aria-current'); applyActivity();
    const target = readingReturn && !readingReturn.hidden ? readingReturn : surface;
    target.focus({preventScroll: true}); readingReturn = null;
  }
  function close() { dialog.close(); }
  $('read-report').addEventListener('click', read);
  $('read-after-choice').addEventListener('click', read);
  $('error-read').addEventListener('click', read);
  document.querySelector('.skip').addEventListener('click', event => { event.preventDefault(); read(event); });
  $('close-reading').addEventListener('click', close);
  dialog.addEventListener('close', afterReading);
  $('reading-nav').querySelectorAll('a').forEach(link => link.addEventListener('click', event => {
    const section = $(link.dataset.readingChapter);
    if (!section) return;
    event.preventDefault(); section.scrollIntoView({behavior: 'auto', block: 'start'}); section.focus({preventScroll: true});
  }));
  $('story-note').addEventListener('toggle', () => { stop(); applyActivity(); if (latest) render(latest); });
  function clearCard() {
    if (card) { card.$destroy(); card = null; }
    $('choice-card').textContent = ''; cardKey = '';
  }
  function showCard(choice, key) {
    if (key === cardKey) return;
    clearCard(); cardKey = key;
    const lines = feedback(choice).lines;
    if (api && window.parcelRequire) {
      const HaikuCard = window.parcelRequire('UYkZ').default;
      card = new HaikuCard({target: $('choice-card'), props: {
        lines: lines.map(text => ({en: text, fr: text})),
        tokens: [['sun', 'feather', 'wind'], ['leaf', 'tree', 'sun'], ['rain', 'grass', 'flower']][selected],
        animatePoem: false}});
    } else $('choice-card').textContent = lines.join('\n');
  }
  function render(state) {
    // API mutations can publish synchronously. An obsolete run must never
    // replace a saved card or collect an interrupted choice.
    if (latest && Number.isFinite(state.choiceRunId) && state.choiceRunId < latest.choiceRunId) return;
    latest = state; chapter = state.chapter;
    collectResult(state);
    rememberWalk(state);
    const choice = chapter === 2 && selected !== null ? choices[selected] : null;
    const done = hasCard();
    document.body.dataset.chapter = chapter;
    document.body.dataset.biome = state.biomeName || 'forest';
    document.body.dataset.transitioning = !!state.transitioning;
    document.body.dataset.phase = done ? 'done' : state.phase || 'road';
    document.body.dataset.selected = String(!!choice);
    document.body.dataset.hasCards = String(collected.size > 0);
    document.body.dataset.reviewingCard = String(done && viewingCollected);
    surface.dataset.loopTurns = String(state.loopTurns || 0);
    surface.dataset.progress = String(state.holdProgress || 0);
    surface.dataset.ready = String(!!state.ready);
    surface.dataset.loopNode = state.loopNodeId || '';
    surface.dataset.anchorVisit = String(state.anchorVisit || 0);
    surface.dataset.choiceProgress = String(state.choiceProgress || 0);
    surface.setAttribute('aria-label', chapter === 2 ? '点击待收集选项体验并获得卡片，点击已收集卡片直接阅读' : '长按画面或下方按钮沿环行走，松开停下；也可按住空格键');
    const copy = states[chapter];
    $('story-kicker').textContent = '0' + (chapter + 1) + ' · ' + labels[chapter];
    $('story-title').textContent = choice ? choice.title : copy.lines.join('\n');
    const context = loop && loop[['present', 'past', 'future'][chapter]];
    const activeNode = loop && chapter === 0 && loop.nodes.find(node => node.id === state.loopNodeId);
    $('story-description').textContent = activeNode ? activeNode.detail : context ? context.text : copy.description;
    const anchor = (copy.anchors || [])[state.waypointIndex || 0];
    $('note-quote').textContent = activeNode ? activeNode.text : typeof anchor === 'string' ? anchor : copy.lines.join('，');
    $('note-label').textContent = $('story-note').open ? '收起解释，回到风景' : chapter === 0 && loop ? '点这里，读懂路上这句话' : '点这里，理解这种模式的来处';
    $('note-help').textContent = reduced.matches || failed ? '读完后，可以点下方的下一步，继续理解这条路。' : '展开时先停下来读。收起后，再长按继续走。';
    $('story-note').hidden = chapter === 2;
    $('story-choices').hidden = chapter !== 2 || !choices.length;
    $('story-choices').dataset.collectedCount = String(collected.size);
    $('choices-heading').textContent = '我的卡片 · 已收集 ' + collected.size + ' / ' + choices.length;
    $('collection-hint').textContent = collected.size === choices.length ? '三张都已收好。点任意一张，直接翻看。' :
      collected.size ? '已收集的点开就能看；待收集的，体验后留下。' : '先任选一种走法。体验结束，就获得一张卡。';
    $('choice-detail').hidden = !choice;
    $('choice-description').hidden = true;
    $('choice-result').hidden = !done;
    $('choice-card').hidden = !done;
    $('read-after-choice').hidden = !done;
    $('choice-reading-hint').hidden = !done;
    $('choice-replay').hidden = !done || reduced.matches || failed;
    $('story-error').hidden = !failed || done || $('story-note').open;
    if (choice) {
      $('choice-condition').textContent = choice.condition;
      $('choice-description').textContent = choice.text;
      $('choice-result').textContent = done ? feedback(choice).result : '';
      if (done) showCard(choice, selected + ':' + !!api);
      else if (cardKey) clearCard();
    } else if (cardKey) clearCard();
    choiceButtons.forEach(({button, status}, i) => {
      const playing = !!choice && i === selected && !done;
      const owned = collected.has(i);
      button.setAttribute('aria-pressed', String(!!choice && i === selected));
      button.dataset.collected = String(owned);
      button.dataset.collectState = playing ? 'playing' : owned ? 'collected' : 'uncollected';
      status.textContent = playing ? owned ? '正在重播…' : '正在体验…' : owned ? '✓ 已收集 · 点开看' : '待收集 · 去体验 →';
    });
    document.querySelectorAll('button[data-chapter]').forEach(button => {
      button.textContent = '0' + (+button.dataset.chapter + 1) + ' ' + labels[+button.dataset.chapter];
      if (+button.dataset.chapter === chapter) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    guide(state);
  }
  function setChapter(next) {
    activeRun = null; viewingCollected = false;
    stop(); $('story-note').open = false; selected = null; pendingPlay = staticResult = false; clearCard();
    if (api) api.setChapter(next); else render({chapter: next, ready: false});
    applyActivity(); $('story-status').textContent = states[next].description;
  }
  document.querySelectorAll('button[data-chapter]').forEach(button => button.addEventListener('click', () => setChapter(+button.dataset.chapter)));
  $('next-chapter').addEventListener('click', () => setChapter(Math.min(2, chapter + 1)));
  $('restart').addEventListener('click', () => {
    activeRun = null; viewingCollected = false;
    stop(); walked.forEach(set => set.clear()); released.fill(false); started.fill(false);
    selected = null; pendingPlay = staticResult = false; clearCard();
    if (api) api.reset(); else setChapter(0);
  });
  function startChoice(index) {
    activeRun = {index, runId: null};
    api.setChoice(index);
    activeRun = {index, runId: api.getState().choiceRunId};
    render(api.getState());
  }
  function choose(index, replay = false) {
    if (!replay && !collected.has(index) && selected === index && (activeRun || pendingPlay)) return;
    // Invalidate the previous request before stop/applyActivity emit state.
    activeRun = null; pendingPlay = false; viewingCollected = false; staticResult = false;
    stop(); $('story-note').open = false; selected = index; chapter = 2; clearCard();
    $('choice-scroll').scrollTop = 0;
    viewingCollected = collected.has(index) && !replay;
    staticResult = viewingCollected || reduced.matches || failed;
    pendingPlay = !staticResult && !api;
    if (staticResult) {
      collected.add(index);
      if (api) api.setChapter(2);
    } else if (api) startChoice(index);
    render(Object.assign({}, api ? api.getState() : latest || {}, {chapter: 2}));
    applyActivity();
    const choice = choices[index];
    $('story-status').textContent = choice.title + '。' + (staticResult ? feedback(choice).result : choice.condition);
  }
  choices.forEach((choice, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.id = 'choice-' + index; button.setAttribute('aria-pressed', 'false');
    const number = document.createElement('span'); number.textContent = '0' + (index + 1);
    const status = document.createElement('small'); status.className = 'choice-collection-state';
    button.append(number, document.createTextNode(choice.title), status);
    choiceButtons.push({button, status});
    button.addEventListener('click', () => choose(index));
    $('choice-tabs').append(button);
  });
  $('choice-replay').addEventListener('click', () => { if (selected !== null) choose(selected, true); });
  [surface, holdButton].forEach(target => {
    target.addEventListener('pointerdown', event => {
      if ((event.button && event.button !== 0) || holding() || event.isPrimary === false) return;
      target.focus({preventScroll: true});
      heldPointer = event.pointerId; holdTarget = target;
      if (!hold()) { heldPointer = holdTarget = null; return; }
      event.preventDefault(); target.setPointerCapture(event.pointerId);
    });
    target.addEventListener('pointerup', event => { if (event.pointerId === heldPointer) userRelease(); });
    target.addEventListener('pointercancel', stop);
    target.addEventListener('lostpointercapture', stop);
    target.addEventListener('pointerleave', event => { if (heldPointer !== null && !target.hasPointerCapture(event.pointerId)) stop(); });
    target.addEventListener('keydown', event => {
      const keys = target === holdButton ? [' ', 'Enter'] : ['ArrowLeft', 'ArrowRight', ' '];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      if (!holding()) { heldKey = event.key; holdTarget = target; if (!hold()) heldKey = holdTarget = null; }
    });
    target.addEventListener('keyup', event => { if (event.key === heldKey) { event.preventDefault(); userRelease(); } });
    target.addEventListener('blur', stop);
    target.addEventListener('contextmenu', event => event.preventDefault());
  });
  document.querySelectorAll('.story-bar,.story-copy,.story-choices').forEach(el => el.addEventListener('pointerenter', stop));
  window.addEventListener('blur', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  $('pause').addEventListener('click', () => { paused = !paused; stop(); applyActivity(); $('pause').textContent = paused ? '继续' : '暂停'; $('pause').setAttribute('aria-pressed', String(paused)); if (latest) render(latest); });
  $('sound').addEventListener('click', () => { muted = !muted; if (api) api.setMuted(muted); $('sound').textContent = '声音 · ' + (muted ? '关' : '开'); $('sound').setAttribute('aria-pressed', String(!muted)); });
  document.addEventListener('cihou:state', event => {
    if (!api) return;
    render(event.detail);
  });
  document.addEventListener('cihou:anchor', event => {
    if (event.detail.node && event.detail.node.text) $('story-status').textContent = event.detail.node.text;
  });
  document.addEventListener('cihou:ready', event => {
    api = event.detail; $('story-loader').hidden = true;
    const requestedChapter = chapter;
    api.setMuted(muted); applyActivity();
    if (requestedChapter) api.setChapter(requestedChapter);
    if (requestedChapter === 2 && selected !== null && pendingPlay && !reduced.matches) {
      pendingPlay = false; startChoice(selected);
    }
    render(api.getState());
  });
  function fail(error) {
    console.error('Cihou Wayfinder:', error && (error.stack || error.message) || String(error));
    failed = true; activeRun = null; pendingPlay = false; staticResult = selected !== null;
    if (chapter === 2 && selected !== null) collected.add(selected);
    $('story-loader').hidden = true; $('story-error').hidden = false;
    render(latest || {chapter, ready: false});
  }
  document.addEventListener('cihou:error', event => fail(event.detail));
  render({chapter: 0, ready: false});
  function syncMotion() {
    stop(); document.body.dataset.reduced = String(reduced.matches);
    if (reduced.matches) {
      activeRun = null;
      $('story-loader').hidden = true; pendingPlay = false;
      if (chapter === 2 && selected !== null) { staticResult = true; collected.add(selected); if (api) api.setChapter(2); }
    }
    applyActivity();
    if (!reduced.matches && !booted) { booted = true; window.WayfinderTemplate.connect().catch(fail); }
    render(latest || {chapter, ready: false});
  }
  reduced.addEventListener('change', syncMotion); syncMotion();
})();

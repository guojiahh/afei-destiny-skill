(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cases = window.CIHOU_CASES, reduced = matchMedia('(prefers-reduced-motion:reduce)'), narrow = matchMedia('(max-width:856px)');
  const typeLabels = {loop:'回环',bridge:'接桥',confluence:'汇流',sparse:'留白'};
  const state = {index:0,selected:'overview'};
  const playback = {timer:0, playing:false, position:0, mode:'ready', remaining:0, started:0};
  const steps = [{id:'past',label:'来处',duration:3400},{id:'relation',label:'反复',duration:4500},{id:'present',label:'此刻',duration:3700},{id:'action',label:'介入',duration:4400}];
  const drafts = new Map();
  let sceneMotion = null, copyMotion = null, toastTimer = 0, sceneId = 0;
  const model = () => cases[state.index];
  const draft = () => {const id=model().id;if(!drafts.has(id))drafts.set(id,{status:'observe',note:'',correction:'',feedback:'',dirty:false,exported:false});return drafts.get(id);};
  const revised = m => ({...m,...m.revision,structure:m.structure,id:m.id,revision:m.revision});
  const text = (id,value) => {$(id).textContent=value;};
  const chain = (items,cls='small-chain') => `<div class="${cls}">${items.map((v,i)=>`${i?'<i aria-hidden="true">→</i>':''}<span>${esc(v)}</span>`).join('')}</div>`;
  function notify(message) {clearTimeout(toastTimer);text('toast',message);$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,6000);}
  function safeArt(structure,options) {try{return window.CihouEditorialScene.art(structure,options);}catch(error){console.error(error);return '<p class="footnote">图形暂不可用，以下文字保留了理解的变化。</p>';}}
  const kindLabels = {fact:'已有经历',interpretation:'一种理解',present:'此刻',action:'你能参与',scenario:'条件情景',unknown:'尚待了解'};
  const sceneRenderer = () => model().structure==='loop' ? window.CihouKineticScene : window.CihouEditorialScene;
  const interaction = () => window.CIHOU_INTERACTIONS[model().structure];
  function cancelMotion(finish=false) {
    if(sceneMotion){finish?sceneMotion.finish():sceneMotion.cancel();sceneMotion=null;}
    if(copyMotion){copyMotion.cancel();copyMotion=null;}
  }
  function playbackUI() {
    const available=model().structure==='loop'&&!reduced.matches;
    $('playback-strip').hidden=!available;
    $('playback-strip').dataset.playing=String(playback.playing);
    text('playback-state',playback.playing?`${steps[playback.position].label} · 自动讲解`:({ready:'一段经历，怎样成为回环',paused:'已暂停 · 可直接点图',explore:'自由探索 · 点哪里，读哪里',done:'讲解结束 · 等待现实回应'}[playback.mode]));
    text('playback-toggle',playback.playing?'Ⅱ 暂停':playback.mode==='paused'?'▷ 继续':'↻ 重播');
    $('playback-toggle').setAttribute('aria-label',playback.playing?'暂停自动讲解':playback.mode==='paused'?'继续自动讲解':'重播自动讲解');
    $('scene-explanation').setAttribute('aria-live',playback.playing?'off':'polite');
    $('playback-progress').style.width=`${playback.mode==='done'?100:playback.playing?(playback.position+1)*25:playback.mode==='explore'?0:playback.position*25}%`;
  }
  function stopPlayback(mode='paused', finish=true) {
    if(playback.playing)playback.remaining=Math.max(0,playback.remaining-(performance.now()-playback.started));
    clearTimeout(playback.timer);playback.timer=0;playback.playing=false;playback.mode=mode;
    if(mode==='paused'&&sceneMotion?.pause){sceneMotion.pause();if(copyMotion)copyMotion.pause();}
    else if(finish)cancelMotion(true);
    playbackUI();
  }
  function schedulePlayback() {
    playback.started=performance.now();
    playback.timer=setTimeout(()=>{
      if(!playback.playing)return;
      if(playback.position>=steps.length-1){stopPlayback('done');return;}
      playback.position++;advancePlayback();
    },playback.remaining);
  }
  function advancePlayback() {
    if(!playback.playing||document.hidden||reduced.matches)return;
    const part=steps[playback.position];
    selectHotspot(part.id,true);playback.remaining=part.duration;playbackUI();schedulePlayback();
  }
  function startPlayback(resume=false) {
    if(model().structure!=='loop'||reduced.matches||document.hidden)return;
    clearTimeout(playback.timer);playback.position=resume?playback.position:0;
    playback.playing=true;playback.mode='playing';
    if(resume&&sceneMotion?.resume){sceneMotion.resume();if(copyMotion)copyMotion.play();playbackUI();schedulePlayback();}
    else advancePlayback();
  }
  function renderHotspots() {
    const layout=sceneRenderer().layout(model(),{mobile:narrow.matches});
    $('scene-stage').style.aspectRatio=`${layout.width}/${layout.height}`;
    $('scene-stage').dataset.structure=model().structure;
    $('scene-stage').dataset.selected=state.selected;
    $('scene-hotspots').innerHTML=interaction().hotspots.map(h=>{
      const [x,y]=layout.anchors[h.id];
      return `<button type="button" class="scene-hotspot" data-hotspot="${esc(h.id)}" data-kind="${esc(h.kind)}" aria-label="查看${esc(h.label)}${h.kind==='scenario'?'情景':''}" aria-pressed="${state.selected===h.id}" aria-controls="scene-explanation" style="left:${x/layout.width*100}%;top:${y/layout.height*100}%"><span class="hotspot-dot" aria-hidden="true"></span><span class="hotspot-label">${esc(h.label)}</span></button>`;
    }).join('');
  }
  function renderScene() {
    cancelMotion();
    const focused=document.activeElement?.dataset?.hotspot;
    try {
      $('scene-host').innerHTML=sceneRenderer().render(model(),{selected:state.selected,mobile:narrow.matches,revised:false,idPrefix:'main-'+(++sceneId)});
      renderHotspots();
      if(focused)$('scene-hotspots').querySelector(`[data-hotspot="${focused}"]`)?.focus({preventScroll:true});
    } catch(error){console.error(error);$('scene-hotspots').innerHTML='';$('scene-host').innerHTML=`<p class="footnote">图形暂不可用。${esc(model().summary)} ${esc(model().action.change)} 下方可以继续阅读完整说明。</p>`;}
  }
  function renderExplanation(animate=false) {
    const part=interaction().hotspots.find(h=>h.id===state.selected)||interaction().overview;
    text('scene-kind',kindLabels[part.kind]);text('scene-title',part.title);text('scene-body',part.body);
    $('scene-explanation').dataset.kind=part.kind;
    if(copyMotion){copyMotion.cancel();copyMotion=null;}
    if(animate&&!reduced.matches&&$('scene-explanation').animate)copyMotion=$('scene-explanation').animate([{opacity:.35,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:360,easing:'ease-out'});
  }
  function renderHero() {
    const m=model();text('report-meta',`${String(state.index+1).padStart(2,'0')} / ${m.name}的故事 · ${m.role.replace(' · 虚构样例','')}`);
    $('report-title').innerHTML=m.title.map(v=>`<span>${esc(v)}</span>`).join('');text('hero-summary',m.summary);
    text('future-heading',m.structure==='sparse'?'尚待了解':'此后 ／ 条件情景');
    text('figure-caption',m.structure==='sparse'?'已知留下，原因留白。':m.structure==='loop'?'叠层示意，回环待核对。':'连线是理解，分支是情景。');
    renderScene();renderExplanation();playbackUI();
  }
  function selectHotspot(id,automatic=false) {
    if(!interaction().hotspots.some(h=>h.id===id))return;
    if(!automatic)stopPlayback('explore',false);
    cancelMotion();state.selected=id;
    $('scene-hotspots').querySelectorAll('[data-hotspot]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.hotspot===id)));
    $('scene-stage').dataset.selected=id;
    renderExplanation(true);
    const svg=$('scene-host').querySelector('svg');
    if(svg)sceneMotion=sceneRenderer().transition(svg,model(),{mobile:narrow.matches,selected:id,reduced:reduced.matches});
  }
  function renderStory() {
    const m=model();
    const headings={loop:'几次临时承接，\n渐渐成了持续安排。',bridge:'准备已经在这里，\n还需要具体的回应。',confluence:'几条已有的线，\n在眼前交汇。',sparse:'先把已知的留下，\n不急着连接原因。'};
    $('origin-title').innerHTML=esc(headings[m.structure]).replace('\n','<br>');
    $('history').innerHTML=m.nodes.map((n,i)=>`<li><div class="history-meta"><span class="history-number">${String(i+1).padStart(2,'0')}</span><h3>${esc(n.label)}</h3></div><blockquote>${esc(n.quote)}</blockquote><span class="source-ref">${esc(n.source.split(' · ')[0])} · 日期未提供</span></li>`).join('');
    $('interpretation').innerHTML=m.insights.map(i=>`<div class="insight">${chain(i.chain)}<p>${esc(i.sentence)}</p></div>`).join('');
    text('counterexample',m.context.against+' '+m.context.alternative);
    const covered=m.topics.filter(t=>t.status==='深入').map(t=>t.name),partial=m.topics.filter(t=>t.status==='略有了解').map(t=>t.name),missing=m.topics.filter(t=>t.status==='未展开').map(t=>t.name);
    $('scope-line').innerHTML=`<strong>本次范围</strong>　${covered.length?'深入：'+esc(covered.join('、'))+'。 ':''}${partial.length?'略有了解：'+esc(partial.join('、'))+'。 ':''}${missing.length?'尚未展开：'+esc(missing.join('、'))+'。':''}`;
    text('choice-title',m.structure==='sparse'?'眼下，可以先观察。':'你能加入一个条件。');
    $('change-line').innerHTML=`<div><small>眼下的问题</small><p>${esc(m.question)}</p></div><span class="change-arrow" aria-hidden="true">→</span><div><small>${esc(m.action.short)}</small><p>${esc(m.action.change)}</p></div>`;
    $('choice-facts').innerHTML=`<div><h3>需要投入</h3><p>${esc(m.action.cost)}</p></div><div><h3>也依赖外部条件</h3><p>${esc(m.action.needs)}</p></div>`;
    $('responses').innerHTML=m.branches.length?m.branches.map(b=>`<div class="response"><span class="branch-label">${esc(b.label)} · 尚未发生的情景</span><h3>${esc(b.title)}</h3><p>${esc(b.body)}</p><dl><dt>需要</dt><dd>${esc(b.needs)}</dd><dt>代价</dt><dd>${esc(b.cost)}</dd><dt>留意</dt><dd>${esc(b.observe)}</dd></dl></div>`).join(''):'<p class="no-future">线索不足，未来暂时留白。</p>';
    $('alternative').innerHTML=`<h3>也可以，${esc(m.alternative.label)}。</h3><p>${esc(m.alternative.protect)} ${esc(m.alternative.cost)}</p><p>需要：${esc(m.alternative.needs)} 留意：${esc(m.alternative.observe)}</p>`;
    $('windows').innerHTML=m.windows.map(w=>`<li><small>${esc(w.kind)}<br>${esc(w.time)}</small><h4>${esc(w.title)}</h4><p>${esc(w.body)}</p></li>`).join('');
    renderDecision();renderLifeTopics();renderRevision();renderEvidence();text('observation-question',m.observation);renderRecord();renderShare();
  }
  function renderDecision() {
    const extra=window.CIHOU_EXPERIENCE[model().structure];
    const traditional=`<aside class="traditional-reading"><div><span class="eyebrow">另一种观察角度</span><h3>命理，怎样参与这份理解？</h3></div><div><div class="basis-flow"><span>盘面与传统规则</span><i>⇢</i><span>提出观察</span><i>⇢</i><span>与经历核对</span></div><p>它可以提供传统的解释角度；具体如何作出决定，仍要回到当时的经历、想法和现实条件。</p><p class="basis-empty">本样例没有出生与命盘资料，因此保留这个阅读层次，暂不填入个人命理判断。</p></div></aside>`;
    if(!extra){$('decision-reading').innerHTML=traditional;return;}
    $('decision-reading').innerHTML=`<section class="decision-reading"><div class="decision-intro"><p class="eyebrow">再往里看一层</p><h2>你在意可靠，<br>也需要可持续。</h2><blockquote>“${esc(extra.reflections[1].quote)}”<cite>虚构素材 ${extra.reflections[1].id} · ${esc(extra.reflections[1].kind)}</cite></blockquote></div><div class="decision-scenes">${extra.scenes.map((part,i)=>`<div class="decision-scene"><span class="scene-scenario">${esc(part.label)}</span>${chain(part.steps,'decision-chain')}<blockquote>“${esc(extra.reflections[i===0?0:2].quote)}”</blockquote><span class="source-ref">虚构素材 ${part.source}</span></div>`).join('')}</div><p class="decision-meaning">同一个人，在不同条件下，已经会作出不同的回应。可以尝试把“先讨论顺序”放到任务进入的那一刻。为什么任务持续交来，还要看岗位、人手和派工权限。</p><p class="footnote">以上为本轮新增的虚构自述。它们说明决策时在意什么，不推断童年或固定人格；也不推翻下文 V2 对派工原因的修正。</p></section>${traditional}`;
  }
  function renderLifeTopics() {
    const m=model(),known=m.topics.filter(t=>t.status!=='未展开'),unknown=m.topics.filter(t=>t.status==='未展开');
    $('life-topics').innerHTML=`<div class="life-index" aria-label="本次生活领域覆盖">${m.topics.map(t=>`<span data-depth="${esc(t.status)}">${esc(t.name)}<i>${esc(t.status)}</i></span>`).join('')}</div><div class="life-readings">${known.map((t,i)=>`<section class="life-topic"><div class="life-topic-heading"><span class="topic-number">${String(i+1).padStart(2,'0')}</span><h3>${esc(t.name)}</h3><span class="topic-depth">${esc(t.status)}</span></div><div><h4>${esc(t.label)}</h4><ul>${t.points.map(p=>`<li>${esc(p)}</li>`).join('')}</ul></div></section>`).join('')}</div>${unknown.length?`<aside class="life-unknown"><span class="eyebrow">本次仍留白</span><p>${unknown.map(t=>esc(t.name)).join(' · ')}</p><ul>${unknown.map(t=>`<li><strong>${esc(t.name)}</strong> ${esc(t.label)}。${esc(t.points.join(' '))}</li>`).join('')}</ul></aside>`:''}`;
  }
  function renderRevision() {
    const m=model(),r=m.revision,next=revised(m);
    text('revision-feedback',r.feedback.replace(/^模拟回访[：:]\s*/,''));
    $('revision-comparison').innerHTML=[{version:'V1 / 当时的理解',model:m,revised:false,body:r.prior},{version:'V2 / 新反馈后的理解 · 模拟',model:next,revised:true,body:r.current}].map((v,i)=>`<div class="revision-panel"><small>${esc(v.version)}</small><div class="revision-art">${safeArt(m.structure,{revised:v.revised,idPrefix:'revision-'+i+'-'+state.index})}</div><div class="revision-labels">${v.model.graphLabels.map(label=>`<span>${esc(label)}</span>`).join('')}</div><p>${esc(v.body)}</p><h3>${i?'下一步改为':'当时可考虑'}：${esc(v.model.action.short)}</h3><p>观察：${esc(v.model.action.observe)}</p></div>`).join('');
    $('revision-diff').innerHTML=[['保留',r.keep],['放下 / 修正',r.drop],['仍待了解',r.unknown]].map(([a,b])=>`<div><h3>${a}</h3><p>${esc(b)}</p></div>`).join('');
  }
  function renderEvidence() {
    const m=model(),next=revised(m);
    const sourceRows=(ns)=>ns.map(n=>`<div class="source-row"><strong>${esc(n.label)}</strong><p>${esc(n.quote)}</p><small>${esc(n.time)} · ${esc(n.source)}</small></div>`).join('');
    const edgeRows=(es,ns)=>es.length?es.map(e=>`<div class="edge-row"><h4>${esc(ns.find(n=>n.id===e.from)?.label||e.from)} → ${esc(ns.find(n=>n.id===e.to)?.label||e.to)} · ${esc(e.label)}</h4><dl><dt>依据</dt><dd>${esc(e.basis)}</dd><dt>条件</dt><dd>${esc(e.condition)}</dd><dt>反例</dt><dd>${esc(e.counterexample)}</dd><dt>未知</dt><dd>${esc(e.unknown)}</dd></dl></div>`).join(''):'<p>没有足够依据连接因果，保留未知。</p>';
    const extra=window.CIHOU_EXPERIENCE[m.structure];
    $('source-list').innerHTML=sourceRows(m.nodes)+(extra?`<h4>${esc(extra.version)}</h4>${extra.reflections.map(r=>`<div class="source-row"><strong>${esc(r.id)} · ${esc(r.kind)}</strong><p>${esc(r.quote)}</p><small>虚构自述；不新增主图因果边，不覆盖 V2 修正</small></div>`).join('')}`:'');
    $('edge-list').innerHTML=edgeRows(m.edges,m.nodes)+`<details class="revision-evidence"><summary>模拟 V2 的完整依据<span class="detail-plus" aria-hidden="true">＋</span></summary>${sourceRows(next.nodes)}${edgeRows(next.edges,next.nodes)}<p class="footnote">${esc(next.action.change)} 所需条件：${esc(next.action.needs)} 投入：${esc(next.action.cost)}</p>${next.branches.map(b=>`<div class="edge-row"><h4>${esc(b.label)} · ${esc(b.title)}</h4><p>${esc(b.body)}</p><p>条件：${esc(b.needs)} 代价：${esc(b.cost)} 观察：${esc(b.observe)}</p></div>`).join('')}</details>`;
    $('topic-list').innerHTML=m.topics.map(t=>`<div class="topic-row"><h4>${esc(t.name)}<span>${esc(t.status)}</span></h4><p>${esc(t.label)}。${esc(t.points.join(' '))}</p></div>`).join('');
    text('provenance',`固定版本：phase1-${m.id} / V1，2026-10-15。来源：匿名虚构素材 v1；${m.structure==='loop'?'另含补充虚构自述 L4–L6（2026-10-16）；':''}V2 为预设模拟回访 v1。本原型未使用真实咨询、出生资料、历法计算或八字分析；不生成正式咨询报告。图形长度、位置、线数和颜色不代表数值、概率或因果强度；叠片不代表真实任务数量或重复次数。本地文件没有账号、上传或云同步，旧副本不会自动更新或撤回。`);
  }
  function renderRecord() {
    const d=draft();$('record-status').value=d.status;$('record-note').value=d.note;$('correction-note').value=d.correction;$('feedback-note').value=d.feedback;
    $('feedback-field').hidden=d.status!=='acted';
    text('record-note-label',d.status==='acted'?'实际尝试了什么？（请填写）':d.status==='intend'?'想尝试的具体一步（可不填）':'我的观察或想法（可不填）');
    text('draft-status',d.exported&&!d.dirty?'已生成本地记录 · 未提交原咨询':'仅在本页 · 未同步');
  }
  function recordText() {
    const m=model(),d=draft();return ['# 此后 · 观察与纠正记录','',`匿名样例：${m.name}（虚构）`,`报告版本：phase1-${m.id} / V1`,`来源快照：虚构素材 v1${window.CIHOU_EXPERIENCE[m.structure]?' + '+window.CIHOU_EXPERIENCE[m.structure].version+'（L4、L5、L6）':''}`,`原型日期：2026-10-16`,'','这是一份本地草稿，尚未提交原咨询、尚未同步。页面 V2 是预设演示，不是对本记录的分析。','',`状态：${{observe:'先观察，尚未行动',intend:'想尝试，尚未行动',acted:'手动声明已在现实中尝试'}[d.status]}`,`观察问题：${m.observation}`,`可考虑的行动：${m.action.short}`,`所需条件：${m.action.needs}`,'','## 我的记录',d.note.trim()||'未填写','','## 实际收到的回应',d.status==='acted'?(d.feedback.trim()||'未填写，不推断有没有变化'):'未记录现实反馈','','## 对 V1 的纠正草稿',d.correction.trim()||'未填写','','页面试演不等于现实行动。把记录带回原咨询，核对后再更新正式理解。'].join('\n');
  }
  function download(content,type,name) {const blob=content instanceof Blob?content:new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  // No report object enters this function. Share markup is built from an explicit
  // field allowlist, so private text is absent from both pixels and file source.
  function shareSVG({structure,action='',showShape=true,showAction=true,showMotto=true}) {
    const type=['loop','bridge','confluence','sparse'].includes(structure)?structure:'sparse';
    const artwork=showShape?window.CihouEditorialScene.art(type,{revised:false,idPrefix:'public-art'}):'';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="840" viewBox="0 0 720 840" role="img" aria-label="此后匿名分享图"><rect width="720" height="840" fill="#f6f4ee"/><text x="48" y="69" fill="#252820" font-family="Songti SC,STSong,serif" font-size="30">此后</text><text x="672" y="66" text-anchor="end" fill="#676a64" font-family="sans-serif" font-size="11" letter-spacing="3">CIHOU</text><path d="M48 95H672" stroke="#252820"/>${showMotto?'<text x="48" y="202" font-family="Songti SC,STSong,serif" font-size="64" fill="#252820">你，也是原因。</text>':''}<svg x="25" y="245" width="670" height="350" viewBox="0 0 1000 440">${artwork}</svg>${showAction?`<text x="48" y="659" font-family="sans-serif" font-size="25" fill="#3559c7">${esc(String(action).slice(0,28))}</text>`:''}<path d="M48 727H672" stroke="#d7d8ce"/><text x="48" y="765" font-family="sans-serif" font-size="14" fill="#676a64">一种可参与的理解。未来仍然开放。</text><text x="48" y="793" font-family="sans-serif" font-size="11" fill="#676a64">匿名虚构 · 条件试演</text></svg>`;
  }
  window.CihouShare={create:shareSVG};
  function currentShare() {return shareSVG({structure:model().structure,action:model().action.short,showShape:$('share-shape').checked,showAction:$('share-action').checked,showMotto:$('share-motto').checked});}
  function renderShare() {try{$('share-preview').innerHTML=currentShare();}catch(error){console.error(error);text('share-preview','分享图暂不可用。');}}
  async function exportShare() {
    const svg=currentShare(),button=$('export-share');button.disabled=true;
    try{const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));try{const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=1680;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');ctx.drawImage(img,0,0,1440,1680);const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));if(!blob)throw new Error('PNG unavailable');download(blob,'image/png','cihou-share.png');notify('已生成分享图，只包含预览中的内容。');}finally{URL.revokeObjectURL(url);}}
    catch(error){download(svg,'image/svg+xml;charset=utf-8','cihou-share.svg');notify('已生成独立 SVG 分享图，可用浏览器打开。');}
    finally{button.disabled=false;}
  }
  $('playback-toggle').addEventListener('click',()=>{if(playback.playing)stopPlayback('paused');else startPlayback(playback.mode==='paused');});
  $('scene-hotspots').addEventListener('click',e=>{const button=e.target.closest('[data-hotspot]');if(button)selectHotspot(button.dataset.hotspot);});
  $('record-form').addEventListener('input',e=>{const d=draft();if(e.target.id==='record-status'){d.status=e.target.value;d.dirty=true;d.exported=false;renderRecord();return;}if(e.target.id==='record-note')d.note=e.target.value;if(e.target.id==='correction-note')d.correction=e.target.value;if(e.target.id==='feedback-note')d.feedback=e.target.value;d.dirty=true;d.exported=false;text('draft-status','仅在本页 · 未同步');});
  $('record-form').addEventListener('submit',e=>{e.preventDefault();if(draft().status==='acted'&&!draft().note.trim()){notify('请先写下实际尝试了什么。图上的预演不会计为现实行动。');$('record-note').focus();return;}download(recordText(),'text/markdown;charset=utf-8','cihou-observation.md');draft().dirty=false;draft().exported=true;renderRecord();notify('已生成本地记录，仍需由你带回原咨询。');});
  ['share-shape','share-action','share-motto'].forEach(id=>$(id).addEventListener('change',renderShare));$('export-share').addEventListener('click',exportShare);
  $('case-select').innerHTML=cases.map((m,i)=>`<option value="${i}">${esc(m.name)} · ${esc(typeLabels[m.structure])} · ${m.nodes.length} 项经历</option>`).join('');
  $('case-select').addEventListener('change',()=>{stopPlayback('ready');state.index=Number($('case-select').value);state.selected='overview';renderHero();renderStory();document.querySelectorAll('details').forEach(d=>d.open=false);window.scrollTo({top:0,behavior:'instant'});$('scene-hotspots').querySelector('[data-hotspot=present]')?.focus({preventScroll:true});});
  narrow.addEventListener('change',()=>{if(playback.playing)stopPlayback('paused');renderScene();});
  reduced.addEventListener('change',()=>{if(reduced.matches){stopPlayback('paused');renderScene();}playbackUI();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(playback.playing)stopPlayback('paused');else if(playback.mode!=='paused')cancelMotion(true);}});
  window.addEventListener('beforeunload',e=>{if([...drafts.values()].some(d=>d.dirty)){e.preventDefault();e.returnValue='';}});
  renderHero();renderStory();startPlayback();
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{if(!entries[0].isIntersecting){if(playback.playing)stopPlayback('paused');else if(playback.mode!=='paused')cancelMotion(true);}},{threshold:0}).observe($('scene-stage'));
})();

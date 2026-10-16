#!/usr/bin/env node
// Source/data/SVG/artifact contracts. Real focus and transitions still need UI QA.
// Run: node design-demos/cihou-stage1/verify.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const directory = dirname(fileURLToPath(import.meta.url));
const source = name => readFileSync(join(directory, name), 'utf8');
const app = source('app.js'), scene = source('scene-editorial.js'), data = source('cases.js');
const interactionSource = source('interactions.js'), template = source('template.html');
const scripts = [['cases.js', data], ['interactions.js', interactionSource], ['scene-editorial.js', scene], ['scene-kinetic.js', source('scene-kinetic.js')], ['experience.js', source('experience.js')], ['app.js', app]];
for (const [filename, script] of scripts) new vm.Script(script, { filename });
const context = vm.createContext({ window: {} });
for (const [filename, script] of scripts.slice(0, -1)) vm.runInContext(script, context, { filename });
const cases = context.window.CIHOU_CASES, interactions = context.window.CIHOU_INTERACTIONS;
const { render, art, layout, transition } = context.window.CihouEditorialScene;
for (const [name, method] of Object.entries({ render, art, layout, transition })) assert.equal(typeof method, 'function', `Missing renderer API: ${name}`);
const originalData = JSON.stringify(cases), originalInteractions = JSON.stringify(interactions);
const structures = ['loop', 'bridge', 'confluence', 'sparse'];
const hotspotIDs = ['past', 'relation', 'present', 'action', 'future-a', 'future-b'];
const kinds = ['fact', 'interpretation', 'present', 'action', 'scenario', 'unknown'];
const nodeCounts = { loop: 3, bridge: 5, confluence: 7, sparse: 2 };
assert.equal(cases.length, 4, 'Expected four fictional samples');
assert.equal(new Set(cases.map(item => item.id)).size, cases.length, 'Duplicate case IDs');
assert.deepEqual(Object.keys(interactions).sort(), [...structures].sort(), 'Interaction structures differ from samples');

const text = (value, message) => assert(typeof value === 'string' && value.trim(), message);
const attrs = markup => Object.fromEntries([...markup.matchAll(/([A-Za-z_][\w:.-]*)\s*=\s*"([^"]*)"/g)].map(match => [match[1], match[2]]));
const tags = (markup, name) => [...markup.matchAll(new RegExp(`<${name}\\b([^>]*?)>`, 'g'))].map(match => attrs(match[1]));
const numbers = d => [...d.matchAll(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)].map(match => Number(match[0]));
const topology = d => ({ commands: (d.match(/[MmLlHhVvCcSsQqTtAaZz]/g) || []).join(''), count: numbers(d).length });
const morphPaths = svg => new Map(tags(svg, 'path').filter(path => path['data-morph-key']).map(path => [path['data-morph-key'], path]));
const geometry = svg => [...morphPaths(svg)].filter(([, path]) => !path['data-trace-role']).map(([key, path]) => `${key}:${path.d}`).join('|');
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const fingerprints = new Set();
let hotspotCount = 0, sceneCount = 0, snapshotCount = 0, shareCount = 0, layoutCount = 0;

// Execute the real isolated share function with its real escaper and renderer.
const escapeLine = app.split('\n').find(line => line.trimStart().startsWith('const esc ='));
const shareStart = app.indexOf('  function shareSVG('), shareEnd = app.indexOf('\n  window.CihouShare', shareStart);
assert(escapeLine && shareStart >= 0 && shareEnd > shareStart, 'Cannot locate isolated share renderer');
vm.runInContext(escapeLine + '\n' + app.slice(shareStart, shareEnd) + '\nwindow.testShare = shareSVG;', context);
const share = context.window.testShare;

function checkSourceModel(model, label) {
  const nodeIds = new Set(model.nodes.map(node => node.id));
  assert.equal(nodeIds.size, model.nodes.length, `${label}: duplicate node ID`);
  for (const node of model.nodes) {
    for (const field of ['id', 'label', 'time', 'quote', 'source']) text(node[field], `${label}: node ${field}`);
    assert(node.source.includes('虚构素材'), `${label}: unmarked fictional source`);
  }
  for (const edge of model.edges) {
    assert(nodeIds.has(edge.from) && nodeIds.has(edge.to), `${label}: missing relationship endpoint`);
    for (const field of ['label', 'basis', 'condition', 'counterexample', 'unknown']) text(edge[field], `${label}: relationship ${field}`);
  }
  for (const id of model.graphNodeIds || []) assert(nodeIds.has(id), `${label}: missing graph source`);
  for (const field of ['short', 'change', 'cost', 'needs', 'observe']) text(model.action[field], `${label}: action ${field}`);
  for (const branch of model.branches) for (const field of ['id', 'label', 'title', 'body', 'needs', 'cost', 'observe']) text(branch[field], `${label}: branch ${field}`);
  assert.equal(new Set(model.topics.map(topic => topic.id)).size, 8, `${label}: missing topic or explicit unknown`);
  assert(model.topics.every(topic => ['深入', '略有了解', '未展开'].includes(topic.status)), `${label}: invalid topic coverage`);
  if (model.structure === 'sparse') {
    assert.equal(model.edges.length, 0, `${label}: invented relationship`);
    assert.equal(model.branches.length, 0, `${label}: invented future`);
  }
}

function checkHotspots(item) {
  const set = interactions[item.structure], ids = new Set(item.nodes.map(node => node.id));
  text(set.intro, `${item.id}: missing discovery hint`);
  assert.equal(set.hotspots.length, item.structure === 'sparse' ? 4 : 6, `${item.id}: incorrect hotspot count`);
  assert.equal(new Set(set.hotspots.map(hotspot => hotspot.id)).size, set.hotspots.length, `${item.id}: duplicate hotspot ID`);
  for (const copy of [set.overview, ...set.hotspots]) {
    text(copy.title, `${item.id}: missing interaction title`); text(copy.body, `${item.id}: missing interaction body`);
    assert(Array.from(copy.title).length < 18 && Array.from(copy.body).length < 55, `${item.id}: oversized interaction explanation`);
    assert(kinds.includes(copy.kind), `${item.id}: unsupported interaction kind`);
  }
  for (const hotspot of set.hotspots) {
    assert(hotspotIDs.includes(hotspot.id), `${item.id}: invalid hotspot ID`);
    assert(Array.from(hotspot.label).length >= 2 && Array.from(hotspot.label).length <= 5, `${item.id}: oversized hotspot label`);
    assert(Array.isArray(hotspot.nodeRefs) && Array.isArray(hotspot.edgeRefs), `${item.id}: missing source references`);
    for (const id of hotspot.nodeRefs) assert(ids.has(id), `${item.id}/${hotspot.id}: missing node ${id}`);
    for (const ref of hotspot.edgeRefs) assert(item.edges.some(edge => edge.from === ref.from && edge.to === ref.to), `${item.id}/${hotspot.id}: missing relationship`);
    assert.equal(hotspot.kind === 'scenario', Boolean(hotspot.branchId), `${item.id}: scenario reference mismatch`);
    if (hotspot.branchId) assert(item.branches.some(branch => branch.id === hotspot.branchId), `${item.id}: missing scenario branch`);
    if (item.structure === 'sparse') assert(!hotspot.branchId && hotspot.edgeRefs.length === 0, 'Sparse interaction invented a cause or future');
    hotspotCount++;
  }
}

function checkLayout(item, mobile) {
  const result = layout(item, { mobile }), message = `${item.id}/${mobile ? 'mobile' : 'desktop'}`;
  assert(Number.isFinite(result.width) && Number.isFinite(result.height) && result.width > 0 && result.height > 0, `${message}: invalid canvas`);
  const expected = interactions[item.structure].hotspots.map(hotspot => hotspot.id).sort();
  assert.deepEqual(Object.keys(result.anchors).sort(), Array.from(expected), `${message}: missing or extra hotspot anchor`);
  const boxes = [], cssWidth = mobile ? 284 : 801, scale = cssWidth / result.width;
  for (const [id, point] of Object.entries(result.anchors)) {
    assert(point.length === 2 && point.every(Number.isFinite), `${message}/${id}: invalid anchor`);
    assert(point[0] >= 0 && point[0] <= result.width && point[1] >= 0 && point[1] <= result.height, `${message}/${id}: anchor outside canvas`);
    // Actual HTML button box, including its label, at the narrowest supported
    // mobile viewport (320px) and the desktop breakpoint (857px).
    const box = { id, left: point[0] * scale - 48, top: point[1] * scale - 20 };
    box.right = box.left + 96; box.bottom = box.top + 56;
    assert(box.left >= 0 && box.right <= cssWidth && box.top >= 0 && box.bottom <= result.height * scale, `${message}/${id}: 96x56 target/label exceeds ${cssWidth}px canvas`);
    boxes.push(box);
  }
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    assert(!(a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top), `${message}: overlapping targets ${a.id}/${b.id}`);
  }
  layoutCount++;
}

function checkSVG(svg, model, { mobile, selected, label }) {
  assert(svg.startsWith('<svg '), `${label}: missing SVG`);
  assert(!/\b(?:undefined|NaN|Infinity)\b/.test(svg), `${label}: unresolved rendering value`);
  const all = [...svg.matchAll(/<[A-Za-z][\w:-]*\b([^>]*?)>/g)].map(match => attrs(match[1]));
  const ids = all.filter(tag => tag.id).map(tag => tag.id);
  assert.equal(new Set(ids).size, ids.length, `${label}: duplicate SVG ID`);
  assert.equal(all.filter(tag => tag.role === 'img').length, 1, `${label}: expected one passive image layer`);
  assert(!/tabindex=|role="button"|<animate\b|<script\b/i.test(svg), `${label}: interaction moved out of the HTML hotspot layer`);
  for (const tag of all) for (const id of (tag['aria-labelledby'] || '').split(/\s+/).filter(Boolean)) assert(ids.includes(id), `${label}: missing accessible summary`);
  const root = tags(svg, 'svg')[0];
  assert.equal(root['data-selected'], selected, `${label}: wrong selected state`);
  assert.equal(root['data-active'], String(selected === 'action'), `${label}: action compatibility state drift`);
  const paths = morphPaths(svg), allPaths = tags(svg, 'path').filter(path => path['data-morph-key']);
  assert(paths.size > 0 && paths.size === allPaths.length, `${label}: missing/duplicate morph keys`);
  for (const path of paths.values()) {
    assert(path['data-morph-role'], `${label}: path has no semantic role`);
    assert(numbers(path.d).length > 0 && numbers(path.d).every(Number.isFinite), `${label}: invalid path coordinates`);
    if (path['data-trace-role']) {
      assert.equal(path.pathLength, '1', `${label}: trace length normalization missing`);
      assert.equal(Number(path.opacity), 0, `${label}: static render contains a travelling trace`);
    }
  }
  if (['bridge', 'confluence'].includes(model.structure)) {
    const group = model.structure === 'bridge' ? 'preparation' : 'method';
    const pastPaths = [...paths.values()].filter(path => path['data-thread-group'] === group);
    const pastAnchor = Array.from(layout(model, { mobile }).anchors.past);
    assert(pastPaths.length > 0, `${label}: missing past thread group ${group}`);
    for (const path of pastPaths) {
      assert.equal(topology(path.d).commands, 'MCC', `${label}: past thread must retain two cubic segments`);
      assert.deepEqual(numbers(path.d).slice(6, 8), pastAnchor, `${label}: past thread misses its hotspot anchor`);
    }
  }
  const futures = ['future-a', 'future-b'].map(key => paths.get(key)).filter(Boolean);
  if (model.structure === 'sparse') {
    assert.equal(futures.length, 0, `${label}: sparse future invented`);
    assert(![...paths.values()].some(path => path['data-morph-role'] === 'action'), `${label}: sparse action connected unknown facts`);
    const grouped = new Map();
    for (const path of paths.values()) if (path['data-thread-group']) {
      const group = path['data-thread-group'];
      if (!grouped.has(group)) grouped.set(group, []);
      grouped.get(group).push(...numbers(path.d).filter((_, index) => index % 2 === 0));
    }
    assert.equal(grouped.size, 2, `${label}: expected two separate known conditions`);
    const [left, right] = [...grouped.values()].sort((a, b) => Math.min(...a) - Math.min(...b));
    assert(Math.max(...left) < Math.min(...right), `${label}: unknown conditions were joined`);
  } else {
    assert.equal(futures.length, 2, `${label}: both conditional futures must remain present`);
    for (const path of futures) {
      assert(path['stroke-dasharray'] && path['data-external-condition'] === 'true', `${label}: conditional future became a fact`);
      assert(Number(path.opacity) > 0, `${label}: hidden future`);
    }
    for (const index of [0, 1, 2]) {
      const action = paths.get(`action-${index}`);
      assert(action, `${label}: missing intervention path`);
      const end = numbers(action.d).slice(-2);
      for (const future of futures) assert(distance(end, numbers(future.d).slice(0, 2)) >= (mobile ? 25 : 45), `${label}: action closes the unanswered gap`);
    }
    if (selected.startsWith('future-')) {
      const chosen = paths.get(selected), other = paths.get(selected === 'future-a' ? 'future-b' : 'future-a');
      assert(Number(chosen.opacity) > Number(other.opacity), `${label}: selected future has no reading emphasis`);
    } else {
      for (const key of ['stroke', 'stroke-width', 'opacity', 'stroke-dasharray']) assert.equal(futures[0][key], futures[1][key], `${label}: unselected futures imply unequal weighting`);
    }
    for (const branch of model.branches) assert(svg.includes(branch.label), `${label}: conditional description missing`);
    if (model.structure === 'confluence') {
      const partner = [...paths.values()].filter(path => path['data-thread-group'] === 'partner');
      const gather = [...paths.values()].filter(path => path['data-thread-group'] === 'gather');
      assert(partner.length && gather.length, `${label}: missing partner/gather inputs`);
      for (const path of partner) {
        assert(path['stroke-dasharray'] && path['data-external-condition'] === 'true', `${label}: partner intention became confirmed availability`);
        const end = numbers(path.d).slice(-2);
        assert(gather.every(target => distance(end, numbers(target.d).slice(0, 2)) > (mobile ? 12 : 20)), `${label}: partner input closes its unconfirmed gap`);
      }
    }
  }
  return paths;
}

for (const item of cases) {
  assert.equal(item.nodes.length, nodeCounts[item.structure], `${item.id}: V1 source content unexpectedly changed`);
  checkHotspots(item);
  for (const mobile of [false, true]) checkLayout(item, mobile);
  const diagrams = [], artworks = [];
  for (const revised of [false, true]) {
    const model = revised ? { ...item, ...item.revision } : item;
    const label = `${item.id}/${revised ? 'V2' : 'V1'}`;
    checkSourceModel(model, label); snapshotCount++;
    for (const mobile of [false, true]) {
      const selectedIDs = ['overview', ...interactions[item.structure].hotspots.map(hotspot => hotspot.id)];
      let baseline, baselineGeometry;
      for (const selected of selectedIDs) {
        const svg = render(item, { revised, mobile, selected, idPrefix: 'verify' });
        const info = `${label}/${mobile ? 'mobile' : 'desktop'}/${selected}`;
        const paths = checkSVG(svg, model, { mobile, selected, label: info });
        if (selected === 'overview') { baseline = paths; baselineGeometry = geometry(svg); }
        else {
          assert.deepEqual([...paths.keys()], [...baseline.keys()], `${info}: changing focus replaced morph targets`);
          for (const [key, path] of paths) assert.deepEqual(topology(path.d), topology(baseline.get(key).d), `${info}: incompatible path topology for ${key}`);
          // Future inspection changes emphasis, not the hypothetical outcome.
          // Sparse action must never create a route between its known pieces.
          if (selected.startsWith('future-')) assert.equal(geometry(svg), baselineGeometry, `${info}: reading a future changed its path or outcome`);
          else assert.notEqual(geometry(svg), baselineGeometry, `${info}: focus only changed color/text`);
          if (!revised && item.structure !== 'sparse') assert.notEqual(geometry(svg), geometry(render(item, { revised: true, mobile, selected: 'overview' })), `${info}: inspection accidentally became the simulated revision`);
        }
        sceneCount++;
      }
      const compatible = render(item, { revised, mobile, active: true });
      assert.equal(tags(compatible, 'svg')[0]['data-selected'], 'action', `${label}: active compatibility broke`);
    }
    diagrams.push(geometry(render(item, { revised, mobile: true, selected: 'overview' })));
    const artwork = art(item.structure, { revised, idPrefix: 'art' });
    assert(!/<text\b|<tspan\b/.test(artwork), `${label}: personal labels in art`);
    for (const value of [item.name, ...model.nodes.map(node => node.quote), ...model.edges.map(edge => edge.basis)]) assert(!artwork.includes(value), `${label}: private text in art`);
    artworks.push(geometry(artwork));
  }
  fingerprints.add(artworks[0]);
  if (item.structure === 'sparse') {
    assert.equal(diagrams[0], diagrams[1], 'No sparse feedback must not invent geometry');
    assert.equal(artworks[0], artworks[1], 'Sparse revision art invented information');
  } else {
    assert.notEqual(diagrams[0], diagrams[1], `${item.id}: V2 only changed text`);
    assert.notEqual(artworks[0], artworks[1], `${item.id}: V2 artwork retained old structure`);
  }
}
assert.equal(hotspotCount, 22, 'Expected all 22 source-bound hotspots');
assert.equal(fingerprints.size, 4, 'Four structures became cosmetic variants');
assert.equal(JSON.stringify(cases), originalData, 'Rendering modified case content');
assert.equal(JSON.stringify(interactions), originalInteractions, 'Rendering modified interaction content');

for (const item of cases) for (const showShape of [false, true]) for (const showAction of [false, true]) for (const showMotto of [false, true]) {
  const action = 'ALLOWLIST_ACTION_ONLY', input = { structure: item.structure, action, showShape, showAction, showMotto };
  for (const field of ['name', 'nodes', 'edges', 'sources', 'report', 'draft', 'corrections', 'interactions']) Object.defineProperty(input, field, { get() { throw new Error(`Share accessed private field: ${field}`); } });
  const output = share(input);
  assert.equal(output.includes('data-thread-group'), showShape, 'Share retained hidden art');
  assert.equal(output.includes(action), showAction, 'Share retained hidden action');
  assert.equal(output.includes('你，也是原因。'), showMotto, 'Share retained hidden motto');
  for (const model of [item, { ...item, ...item.revision }]) for (const privateText of [item.name, ...model.nodes.flatMap(node => [node.quote, node.source]), ...model.edges.map(edge => edge.basis)]) assert(!output.includes(privateText), 'Share contains private report content');
  assert(!/<(?:script|foreignObject|image)\b/i.test(output), 'Share contains executable or external content');
  shareCount++;
}
assert.equal(shareCount, 32);

const payload = '<script>alert(1)</script>', hostile = JSON.parse(JSON.stringify(cases[0]));
hostile.nodes[0].label = payload; hostile.action.short = payload; hostile.branches[0].label = payload;
const escaped = render(hostile, { selected: 'action', idPrefix: '"><script>' });
assert(!escaped.includes('<script>') && escaped.includes('&lt;script&gt;'), 'Diagram text/identifier is not safely escaped');
assert(!share({ structure: 'loop', action: payload }).includes('<script>'), 'Share phrase can inject markup');
assert(!/<dialog\b|role=["'](?:tab|tablist)["']/i.test(template), 'Tabs or dialogs returned to the reading flow');
assert(!template.includes('try-action') && !app.includes('try-action'), 'External fixed preview button remains');
const heroStart = template.indexOf('<section class="hero '), hero = template.slice(heroStart, template.indexOf('</section>', heroStart));
assert(heroStart >= 0, 'Main figure section missing');
for (const id of ['scene-stage', 'scene-host', 'scene-hotspots', 'scene-explanation']) assert(hero.includes(`id="${id}"`), `Missing graph interaction layer: ${id}`);
assert.equal((hero.match(/<(?:button|input|select|textarea|summary)\b/g) || []).length, 1, 'Hero may contain only the automatic narration pause control');
assert(hero.includes('id="playback-toggle"'), 'Missing narration pause control');
assert(app.includes('CIHOU_INTERACTIONS') && app.includes('data-hotspot=') && app.includes('aria-pressed=') && app.includes('aria-controls="scene-explanation"'), 'Dynamic HTML hotspot contract missing');

// Run the actual builder and compare all six script blocks to current sources.
process.stdout.write(execFileSync('python3', [join(directory, 'build.py')], { encoding: 'utf8' }));
const built = readFileSync(join(dirname(directory), 'cihou-stage1.html'), 'utf8');
const inlineScripts = [...built.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1].replace(/<\\\/script/g, '</script').trim());
assert.equal(inlineScripts.length, 6, 'Built artifact has missing or unexpected script blocks');
for (const [index, [, script]] of scripts.entries()) assert.equal(inlineScripts[index], script.trim(), `Bundle script ${index} differs from source`);
assert(built.includes('CIHOU_INTERACTIONS') && built.includes('id="scene-hotspots"') && built.includes('data-morph-key'), 'Interactive figure/data missing from bundle');
assert(!built.includes('CihouScene.render') && !/\/\* (?:STYLES|CASES|INTERACTIONS|SCENE|KINETIC|EXPERIENCE|APP) \*\//.test(built), 'Old renderer or build placeholder remains');
assert(!/<script[^>]+src=|<link[^>]+href=["']https?:/i.test(built), 'Report requires an external runtime');
console.log(`PASS: ${snapshotCount} data snapshots; ${hotspotCount} sourced hotspots; ${layoutCount} layouts; ${sceneCount} SVG states; ${shareCount} share combinations.`);
console.log('Verified references, source immutability, stable morph topology, past-anchor alignment, local geometry, conditional gaps, sparse separation, V2 differences, 320px/857px targets, escaping and six-script source consistency.');
console.log('Browser checks remain required for focus, actual label sizes, transition replay/cancel/finish, reduced motion and downloads.');

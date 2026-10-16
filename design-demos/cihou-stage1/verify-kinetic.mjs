import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

// A minimal SVG DOM and deterministic RAF clock exercise animation lifecycle
// without introducing a browser library into the self-contained demo.
let frames = new Map(), nextFrame = 0, now = 0;
const scope = {
  window: {},
  requestAnimationFrame(callback) { frames.set(++nextFrame, callback); return nextFrame; },
  cancelAnimationFrame(id) { frames.delete(id); }
};
vm.runInNewContext(fs.readFileSync(fileURLToPath(new URL('./scene-kinetic.js', import.meta.url)), 'utf8'), scope);
const renderer = scope.window.CihouKineticScene;
const states = ['overview', 'past', 'relation', 'present', 'action', 'future-a', 'future-b'];

function fakeSvg(markup) {
  const elements = [...markup.matchAll(/<(?:g|path|ellipse|rect|svg)\b([^>]+)>/g)].map(match => ({
    attrs: Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(item => [item[1], item[2]])),
    setAttribute(key, value) { this.attrs[key] = String(value); },
    getAttribute(key) { return this.attrs[key] ?? null; }
  }));
  const root = elements.find(item => item.attrs['data-kinetic']);
  const matching = selector => {
    const [, key, value] = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
    return item => key in item.attrs && (value === undefined || item.attrs[key] === value);
  };
  root.querySelector = selector => elements.find(matching(selector));
  root.querySelectorAll = selector => elements.filter(matching(selector));
  root.snapshot = () => JSON.stringify(elements.map(item => item.attrs));
  return root;
}

function advance(milliseconds = 0) {
  now += milliseconds;
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach(callback => callback(now));
}

function validateTargets(mobile, renderedWidth) {
  const box = renderer.layout({}, { mobile });
  const scale = renderedWidth / box.width;
  const rectangles = Object.entries(box.anchors).map(([id, [x, y]]) => ({ id, x: x * scale - 48, y: y * scale - 20, width: 96, height: 56 }));
  for (const current of rectangles) {
    assert(current.x >= 0 && current.x + current.width <= renderedWidth, `${current.id}: horizontal bounds`);
    assert(current.y >= 0 && current.y + current.height <= box.height * scale, `${current.id}: vertical bounds`);
    for (const other of rectangles) {
      if (other === current) continue;
      assert(current.x + 96 <= other.x || other.x + 96 <= current.x || current.y + 56 <= other.y || other.y + 56 <= current.y, `${current.id}/${other.id}: hit targets overlap`);
    }
  }
}

for (const mobile of [false, true]) {
  validateTargets(mobile, mobile ? 284 : 801);
  validateTargets(mobile, mobile ? 354 : 1000);
  let expectedBranches;
  for (const selected of states) {
    const markup = renderer.render({}, { mobile, selected, idPrefix: `proof-${selected}` });
    assert(!/NaN|undefined|https?:\/\//.test(markup.replace('http://www.w3.org/2000/svg', '')), 'finite, self-contained SVG');
    const svg = fakeSvg(markup);
    assert.equal(svg.getAttribute('viewBox'), mobile ? '0 40 400 490' : '0 70 1000 370');
    for (const element of [...svg.querySelectorAll('[data-kinetic-source]'), ...svg.querySelectorAll('[data-kinetic-layer]'), ...svg.querySelectorAll('[data-kinetic-future-plate]')]) {
      assert(element.getAttribute('transform')?.startsWith('translate('), `${selected}: static render has positioned components`);
      assert(!element.getAttribute('transform').startsWith('translate(0 0)'), `${selected}: no flash at SVG origin`);
    }
    const branches = svg.querySelectorAll('[data-kinetic-branch]').map(item => item.getAttribute('d'));
    expectedBranches ||= branches;
    assert.deepEqual(branches, expectedBranches, 'selection does not close the future gap');
    const [startX, startY] = branches[0].match(/^M([\d.]+),([\d.]+)/).slice(1).map(Number);
    const [waitX, waitY] = svg.querySelector('[data-kinetic-wait]').getAttribute('transform').match(/translate\(([\d.]+) ([\d.]+)\)/).slice(1).map(Number);
    assert(mobile ? startY - (waitY + 16.5 + 10) > 20 : startX - (waitX + 47) > 20, 'visible gap remains beyond waiting platform edge');
    assert(svg.querySelector('[data-kinetic-return-track]'), 'hypothesized return has its own dashed path');
  }

  const svg = fakeSvg(renderer.render({}, { mobile, selected: 'overview' }));
  for (const selected of states.slice(1)) {
    const animation = renderer.transition(svg, {}, { mobile, selected });
    advance(); advance(650);
    animation.pause();
    const frozen = svg.snapshot();
    assert.equal(frames.size, 0);
    advance(10000);
    assert.equal(svg.snapshot(), frozen, 'pause freezes moving cards as well as the pile');
    animation.resume(); advance();
    assert.equal(svg.getAttribute('data-kinetic-playing'), 'true');
    advance(3200);
    assert.equal(frames.size, 0, `${selected}: animation is finite`);
    assert.equal(svg.getAttribute('data-kinetic-playing'), 'false');
    assert(svg.querySelectorAll('[data-kinetic-flow]').every(item => item.getAttribute('opacity') === '0'));
    assert(!/NaN|undefined/.test(svg.snapshot()));
  }

  renderer.transition(svg, {}, { mobile, selected: 'present', reduced: true });
  const existingPile = svg.querySelectorAll('[data-kinetic-layer]').map(item => item.getAttribute('opacity'));
  renderer.transition(svg, {}, { mobile, selected: 'action', reduced: true });
  assert.deepEqual(svg.querySelectorAll('[data-kinetic-layer]').map(item => item.getAttribute('opacity')), existingPile, 'action retains previously accumulated tasks');
  assert.equal(svg.querySelector('[data-kinetic-route]').getAttribute('opacity'), '1');
  assert.equal(svg.querySelector('[data-kinetic-waiting-card]').getAttribute('opacity'), '0.95');
  assert.deepEqual(svg.querySelectorAll('[data-kinetic-branch]').map(item => item.getAttribute('d')), expectedBranches);

  const previous = renderer.transition(svg, {}, { mobile, selected: 'relation' });
  advance(); advance(500); previous.pause();
  const latest = renderer.transition(svg, {}, { mobile, selected: 'action' });
  previous.resume(); advance(); advance(700);
  assert.equal(frames.size, 1, 'cancelled predecessor cannot reclaim RAF after manual selection');
  assert.equal(svg.getAttribute('data-focus'), 'action');
  latest.finish(); assert.equal(frames.size, 0);
  const finished = svg.snapshot(); previous.finish(); previous.cancel(); advance(20000);
  assert.equal(svg.snapshot(), finished, 'superseded controller cannot change latest final state');
  renderer.transition(svg, {}, { mobile, selected: 'past', reduced: true });
  assert.equal(frames.size, 0, 'reduced-motion transition has no RAF');
  console.log(`${mobile ? 'mobile' : 'desktop'}: hit targets, 7 static states, retained task pile, open future gap, finite RAF, freeze/resume/cancel passed`);
}

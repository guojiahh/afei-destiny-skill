"""Drive the shipped exploration controller with synthetic data and a mock DOM.

These tests exercise event/state behavior in Node, without fetching assets or
asserting WebGL appearance. Browser QA remains responsible for rendered motion.
"""
from pathlib import Path
import shutil
import subprocess
import unittest


CONTROLLER = (Path(__file__).resolve().parents[1] / "assets" / "cihou" /
              "quiet" / "immersive" / "report-exploration-v15.js")

NODE_HARNESS = r"""
'use strict';
const fs = require('node:fs'), vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(process.argv[1], 'utf8');
// Reuse the actual scene's numerical movement step without constructing WebGL.
// This catches controller/scene contract mistakes that command-only mocks miss.
const motionContext = vm.createContext({window: {}});
vm.runInContext(fs.readFileSync(require('node:path').join(
  require('node:path').dirname(process.argv[1]), 'hero-scene-v15.js'), 'utf8'), motionContext);
const scenePrototype = motionContext.window.CihouHeroSceneV15.prototype;

class Element {
  constructor() {
    this.events = new Map(); this.attrs = {}; this.dataset = {}; this.style = {};
    this.hidden = false; this.disabled = false; this.textContent = '';
    this.captured = new Set(); this.classes = new Set(); this.focused = false;
    this.classList = {
      add: (...names) => names.forEach(name => this.classes.add(name)),
      remove: (...names) => names.forEach(name => this.classes.delete(name)),
      contains: name => this.classes.has(name),
    };
  }
  addEventListener(type, callback) {
    if (!this.events.has(type)) this.events.set(type, []);
    this.events.get(type).push(callback);
  }
  emit(type, detail = {}) {
    const event = {target: this, currentTarget: this, prevented: false,
      preventDefault() { this.prevented = true; }, ...detail};
    for (const callback of this.events.get(type) || []) callback(event);
    return event;
  }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  getAttribute(name) { return this.attrs[name]; }
  getBoundingClientRect() { return {left: 100, top: 0, width: 1000, height: 600}; }
  setPointerCapture(id) { this.captured.add(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  releasePointerCapture(id) { this.captured.delete(id); }
  focus() { this.focused = true; }
}

async function setup({reduced = false, failure = null, withChoices = true, sceneMode = 'webgl'} = {}) {
  const ids = ['scene', 'report-data', 'hero-assets', 'hero-rig-meta',
    'chapter-road', 'chapter-ring', 'chapter-choices', 'choice-0', 'choice-1',
    'choice-2', 'scene-status', 'scene-line-1', 'scene-line-2', 'scene-caption',
    'scene-description', 'scene-kicker', 'scene-transition', 'press-progress',
    'scene-completion', 'step-out', 'scene-final-actions', 'scene-choices',
    'choice-walk', 'replay', 'scene-invitation', 'scene-invitation-words',
    'pause', 'pause-label', 'scene-instructions', 'choice-detail',
    'choice-condition', 'choice-text', 'scene-footnote', 'scene-chapters',
    'replay-final'];
  const elements = Object.fromEntries(ids.map(id => ['#' + id, new Element()]));
  elements['.hero'] = new Element(); elements['.scene-tools'] = new Element();
  const document = new Element(), window = new Element(), media = new Element();
  document.hidden = false;
  document.querySelector = selector => {
    assert.ok(elements[selector], 'Missing mock DOM target: ' + selector);
    return elements[selector];
  };
  const stateCopy = [0, 1, 2].map(index => ({
    lines: ['Synthetic line ' + index, 'Synthetic second ' + index],
    description: 'Synthetic description ' + index, label: 'Synthetic view ' + index,
  }));
  const choices = withChoices ? [0, 1, 2].map(index => ({
    title: 'Synthetic choice ' + index, condition: 'Synthetic condition ' + index,
    text: 'Synthetic action ' + index,
  })) : [];
  elements['#report-data'].textContent = JSON.stringify({hero_states: stateCopy, hero_choices: choices});
  elements['#hero-assets'].textContent = JSON.stringify({constructor: 'SyntheticScene',
    rigConstructor: 'SyntheticRig', road: 'data:synthetic-road', character: 'data:synthetic-character'});
  elements['#hero-rig-meta'].textContent = JSON.stringify({originalCharacter: true});
  media.matches = reduced; window.matchMedia = () => media;
  let now = 0, nextTimer = 1, observer = null, scene = null;
  const timers = new Map(), calls = [], rig = {disposed: false, dispose() { this.disposed = true; }};
  function later(callback, delay = 0) {
    const id = nextTimer++; timers.set(id, {callback, at: now + delay}); return id;
  }
  function advance(milliseconds) {
    const target = now + milliseconds;
    for (;;) {
      const next = [...timers.entries()].filter(([, timer]) => timer.at <= target)
        .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!next) break;
      timers.delete(next[0]); now = next[1].at; next[1].callback();
    }
    now = target;
  }
  class Observer {
    constructor(callback) { this.callback = callback; observer = this; this.disconnected = false; }
    observe(target) { assert.equal(target, elements['.hero']); }
    disconnect() { this.disconnected = true; }
    show(value) { this.callback([{isIntersecting: value}]); }
  }
  window.IntersectionObserver = Observer;
  class SyntheticScene {
    constructor(container, options) {
      if (failure === 'constructor') throw new Error('Synthetic WebGL unavailable');
      scene = this; this.options = options; this.mode = sceneMode; this.destroyed = false;
      this.state = {chapter: 0, phase: 'walking', biome: 0, holdProgress: 0, canExit: false,
        exitComplete: false, presentationReady: false};
    }
    setRig(value) { this.rig = value; calls.push(['rig']); }
    getState() { return {...this.state}; }
    publish(patch) {
      Object.assign(this.state, patch); this.options.onStateChange(this.getState());
    }
    setSteering(value) { this.steering = value; calls.push(['steering', value]); }
    setInteraction(value) { this.interaction = value; calls.push(['interaction', value]); }
    setPaused(value) { this.paused = value; calls.push(['paused', value]); }
    setActive(value) { this.active = value; calls.push(['active', value]); }
    advanceMotion(seconds) {
      if (!this.motion) {
        this.motion = Object.create(scenePrototype); this.motion._resetState();
        Object.assign(this.motion, {walkSpeed: 3.65, revealSeconds: 16, figureHeight: 1.04,
          options: {}, _emitState() {}});
      }
      this.motion.steering = this.steering || 0; this.motion.targetInteraction = this.interaction || 0;
      for (let elapsed = 0; elapsed < seconds; elapsed += .025) this.motion._step(.025);
      return this.motion;
    }
    setProgress(value) {
      calls.push(['progress', value]); this.publish({holdProgress: value,
        chapter: value >= 1 ? 1 : 0, phase: value >= 1 ? 'choice' : 'walking', canExit: value >= 1});
    }
    setChoice(value) {
      this.choice = value; calls.push(['choice', value]); this.publish({chapter: 2, phase: 'choice', biome: value});
    }
    setExit(value) {
      calls.push(['exit', value]);
      const staticComplete = value > 0 && this.reducedMotion;
      this.publish({exitComplete: staticComplete, presentationReady: staticComplete,
        phase: value > 0 ? staticComplete ? 'complete' : 'leaving' : 'choice'});
    }
    reset() {
      calls.push(['reset']); this.publish({chapter: 0, phase: 'walking', biome: 0, holdProgress: 0,
        canExit: false, exitComplete: false, presentationReady: false});
    }
    destroy() { this.destroyed = true; calls.push(['destroy']); }
  }
  window.SyntheticScene = SyntheticScene;
  window.SyntheticRig = {create: () => failure === 'rig'
    ? Promise.reject(new Error('Synthetic rig failed')) : Promise.resolve(rig)};
  const context = vm.createContext({window, document, IntersectionObserver: Observer,
    performance: {now: () => now}, setTimeout: later, clearTimeout: id => timers.delete(id), console});
  vm.runInContext(source, context, {filename: process.argv[1]});
  // Flush the rig preparation and its following ready/error continuation.
  for (let i = 0; i < 6; i++) await Promise.resolve();
  const get = id => elements['#' + id];
  return {get, elements, document, window, media, stateCopy, choices, calls, scene,
    rig, advance, observer, click: id => get(id).emit('click'),
    pointer: (type, x = 600, extra = {}) => get('scene').emit(type, {
      pointerType: 'mouse', pointerId: 7, button: 0, clientX: x, ...extra}),
    positiveExits: () => calls.filter(call => call[0] === 'exit' && call[1] > 0)};
}

const cases = {
  async mouse() {
    const h = await setup();
    h.pointer('pointermove', 1100); assert.equal(h.scene.steering, 1);
    h.pointer('pointermove', 100); assert.equal(h.scene.steering, -1);
    h.pointer('pointermove', 600); assert.equal(h.scene.steering, 0);
    assert.equal(h.get('scene-invitation').classList.contains('held'), false);
    h.pointer('pointerdown', 1100);
    assert.equal(h.get('scene').hasPointerCapture(7), true);
    assert.ok(h.scene.advanceMotion(1).velocity > 0, 'Pressed edge should walk');
    h.pointer('pointermove', 600);
    assert.equal(h.scene.advanceMotion(2).velocity, 0, 'Held mouse returning to center must stop');
    h.pointer('pointerup', 1100); assert.equal(h.scene.interaction, 0);
    assert.equal(h.scene.steering, 0); assert.equal(h.get('scene').hasPointerCapture(7), false);
    h.pointer('pointermove', 100); h.pointer('pointerleave');
    assert.equal(h.scene.steering, 0);
  },
  async touch() {
    const h = await setup();
    const count = h.calls.length;
    h.pointer('pointermove', 1100, {pointerType: 'touch'});
    assert.equal(h.calls.length, count, 'Touch hover must not move the scene');
    h.pointer('pointerdown', 100, {pointerType: 'touch'});
    assert.equal(h.scene.steering, -1);
    assert.ok(h.scene.advanceMotion(1).velocity < 0);
    h.pointer('pointermove', 600, {pointerType: 'touch'});
    assert.equal(h.scene.advanceMotion(2).velocity, 0, 'Held touch returning to center must stop');
    h.pointer('pointercancel', 100, {pointerType: 'touch'});
    assert.equal(h.scene.steering, 0); assert.equal(h.scene.interaction, 0);
    assert.equal(h.get('scene').hasPointerCapture(7), false);
  },
  async keyboard() {
    const h = await setup(), world = h.get('scene');
    assert.equal(world.emit('keydown', {code: 'ArrowLeft'}).prevented, true);
    assert.equal(h.scene.steering, -1); assert.equal(h.scene.interaction, 1);
    h.pointer('pointermove', 1100); assert.equal(h.scene.steering, -1, 'Held key owns steering');
    const count = h.calls.length;
    world.emit('keydown', {code: 'ArrowRight', repeat: true}); assert.equal(h.calls.length, count);
    world.emit('keyup', {code: 'ArrowLeft'}); assert.equal(h.scene.steering, 0);
    for (const code of ['ArrowRight', 'Space', 'Enter']) {
      world.emit('keydown', {code}); assert.equal(h.scene.steering, 1);
      world.emit('keyup', {code}); assert.equal(h.scene.interaction, 0);
    }
    world.emit('keydown', {code: 'Space'}); h.window.emit('blur');
    assert.equal(h.scene.steering, 0); assert.equal(h.scene.interaction, 0);
  },
  async chapters() {
    const h = await setup();
    for (const [index, id] of ['chapter-road', 'chapter-ring', 'chapter-choices'].entries()) {
      h.click(id);
      assert.equal(h.get('scene-caption').textContent, h.stateCopy[index].description);
      assert.equal(h.elements['.hero'].dataset.state, String(index));
      assert.equal(h.get(id).getAttribute('aria-current'), 'step');
      assert.equal(h.get('scene').getAttribute('aria-label'), h.stateCopy[index].label);
    }
    assert.equal(h.get('scene-choices').hidden, false);
    assert.equal(h.positiveExits().length, 0, 'Chapter navigation is not consent to walk');
    h.click('replay');
    assert.equal(h.get('scene-caption').textContent, h.stateCopy[0].description);
    assert.equal(h.get('scene-choices').hidden, true);
    assert.equal(h.get('choice-detail').hidden, true);
  },
  async choices() {
    const h = await setup(); h.click('step-out');
    assert.equal(h.get('scene-choices').hidden, false); assert.equal(h.get('choice-0').focused, true);
    assert.equal(h.get('choice-walk').hidden, true);
    for (let i = 0; i < 3; i++) {
      h.click('choice-' + i);
      assert.equal(h.get('choice-condition').textContent, h.choices[i].condition);
      assert.equal(h.get('choice-text').textContent, h.choices[i].text);
      assert.equal(h.get('choice-detail').hidden, false);
      assert.equal(h.scene.choice, i);
      for (let j = 0; j < 3; j++) assert.equal(h.get('choice-' + j).getAttribute('aria-pressed'), String(i === j));
      assert.equal(h.positiveExits().length, 0, 'Preview must not start walking');
    }
    h.click('choice-walk'); assert.equal(h.positiveExits().length, 1);
    assert.equal(h.get('scene-choices').hidden, true, 'Choice overlay must release the walking area');
    assert.equal(h.get('scene-invitation').hidden, false, 'Leaving keeps directional control available');
    assert.equal(h.get('scene-final-actions').hidden, true, 'Walk command is not an immediate completion');
    h.scene.publish({phase: 'complete', exitComplete: true, presentationReady: false});
    assert.equal(h.get('scene-final-actions').hidden, true, 'Wait for the final presentation to settle');
    h.scene.publish({presentationReady: true});
    assert.equal(h.get('scene-final-actions').hidden, false);
    h.click('chapter-choices'); assert.equal(h.get('choice-detail').hidden, true);
  },
  async lifecycle() {
    const h = await setup();
    const move = () => h.pointer('pointerdown', 1100);
    move(); h.click('pause');
    assert.equal(h.scene.paused, true); assert.equal(h.scene.interaction, 0);
    assert.equal(h.get('pause').getAttribute('aria-pressed'), 'true');
    h.pointer('pointermove', 100); assert.equal(h.scene.steering, 0);
    h.click('pause'); assert.equal(h.scene.paused, false);
    move(); h.document.hidden = true; h.document.emit('visibilitychange');
    assert.equal(h.scene.active, false); assert.equal(h.scene.steering, 0);
    h.document.hidden = false; h.document.emit('visibilitychange'); assert.equal(h.scene.active, true);
    move(); h.observer.show(false); assert.equal(h.scene.active, false); assert.equal(h.scene.interaction, 0);
    h.observer.show(true); assert.equal(h.scene.active, true);
    move(); h.window.emit('pagehide', {persisted: true});
    assert.equal(h.scene.active, false); assert.equal(h.scene.destroyed, false);
    h.window.emit('pageshow'); assert.equal(h.scene.active, true);
    h.window.emit('pagehide', {persisted: false});
    assert.equal(h.scene.destroyed, true); assert.equal(h.observer.disconnected, true);
    h.window.emit('pageshow'); assert.equal(h.scene.active, false, 'Disposed scene must not resume');
  },
  async reduced() {
    const h = await setup({reduced: true});
    assert.equal(h.scene.reducedMotion, true); assert.equal(h.scene.paused, true);
    assert.equal(h.get('pause').disabled, true);
    h.pointer('pointermove', 1100); assert.equal(h.scene.steering || 0, 0);
    h.pointer('pointerdown', 1100);
    assert.equal(h.get('scene-caption').textContent, h.stateCopy[1].description);
    assert.equal(h.scene.interaction || 0, 0);
    h.click('chapter-choices'); h.click('choice-1');
    assert.equal(h.get('choice-text').textContent, h.choices[1].text);
    assert.equal(h.positiveExits().length, 0);
    h.click('choice-walk'); assert.equal(h.positiveExits().length, 1);
    h.media.emit('change', {matches: false}); assert.equal(h.scene.paused, false);
    h.media.emit('change', {matches: true}); assert.equal(h.scene.paused, true);
  },
  async caption() {
    const h = await setup();
    h.scene.publish({chapter: 1, canExit: true});
    h.advance(3199); assert.equal(h.get('scene-caption').textContent, h.stateCopy[0].description);
    h.advance(1); assert.equal(h.get('scene-caption').textContent, h.stateCopy[1].description);
    h.click('chapter-road'); h.scene.publish({chapter: 1, canExit: true});
    h.advance(200); h.scene.publish({chapter: 0, canExit: false});
    h.advance(4000);
    assert.equal(h.get('scene-caption').textContent, h.stateCopy[0].description,
      'A returned stage must cancel the pending caption from a brief crossing');
  },
  async fallbackConstructor() { await fallback('constructor'); },
  async fallbackRig() { await fallback('rig'); },
  async fallbackStaticScene() {
    const h = await setup({sceneMode: 'fallback'});
    assert.equal(h.scene.reducedMotion, true); assert.equal(h.scene.paused, true);
    assert.equal(h.scene.rig, undefined, 'Static fallback does not wait for WebGL rig assets');
    assert.equal(h.get('scene').getAttribute('aria-busy'), 'false');
    h.click('chapter-choices'); h.click('choice-2');
    assert.equal(h.get('choice-text').textContent, h.choices[2].text);
    assert.equal(h.positiveExits().length, 0);
    h.click('choice-walk'); assert.equal(h.positiveExits().length, 1);
    assert.equal(h.get('scene-final-actions').hidden, false);
  },
  async transition() {
    const h = await setup(); h.scene.publish({biome: 1});
    assert.equal(h.get('scene-transition').classList.contains('passing'), true);
    h.advance(2600); assert.equal(h.get('scene-transition').classList.contains('passing'), false);
    const staticView = await setup({reduced: true}); staticView.scene.publish({biome: 2});
    assert.equal(staticView.get('scene-transition').classList.contains('passing'), false);
  },
};

async function fallback(failure) {
  const h = await setup({failure});
  assert.equal(h.get('scene').getAttribute('aria-busy'), 'false');
  assert.equal(h.get('scene').getAttribute('aria-disabled'), 'true');
  if (h.scene) assert.equal(h.scene.destroyed, true);
  for (const [index, id] of ['chapter-road', 'chapter-ring', 'chapter-choices'].entries()) {
    h.click(id); assert.equal(h.get('scene-caption').textContent, h.stateCopy[index].description);
  }
  assert.equal(h.get('scene-choices').hidden, false, 'Visual failure must preserve choice comparison');
  for (let i = 0; i < 3; i++) {
    h.click('choice-' + i);
    assert.equal(h.get('choice-condition').textContent, h.choices[i].condition);
    assert.equal(h.get('choice-text').textContent, h.choices[i].text);
    assert.equal(h.get('choice-detail').hidden, false);
  }
  h.click('choice-walk'); assert.equal(h.positiveExits().length, 0);
  assert.equal(h.get('scene-caption').textContent, h.stateCopy[2].description);
}

const name = process.argv[2];
assert.ok(cases[name], 'Unknown test case: ' + name);
cases[name]().then(() => process.stdout.write('ok ' + name + '\n')).catch(error => {
  console.error(error); process.exitCode = 1;
});
"""


class ExplorationControllerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.node = shutil.which("node")
        if not cls.node:
            raise unittest.SkipTest("Node.js unavailable for controller behavior checks")

    def run_case(self, case):
        result = subprocess.run(
            [self.node, "-e", NODE_HARNESS, str(CONTROLLER), case],
            text=True, capture_output=True, timeout=15, check=False,
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)

    def test_mouse_left_right_center_and_release(self):
        self.run_case("mouse")

    def test_touch_requires_press_and_cancel_releases_capture(self):
        self.run_case("touch")

    def test_keyboard_direction_release_and_window_blur(self):
        self.run_case("keyboard")

    def test_three_chapters_and_replay_preserve_readable_copy(self):
        self.run_case("chapters")

    def test_three_choices_preview_until_explicit_walk(self):
        self.run_case("choices")

    def test_pause_visibility_offscreen_and_page_lifecycle_stop_motion(self):
        self.run_case("lifecycle")

    def test_reduced_motion_keeps_static_navigation_and_choice(self):
        self.run_case("reduced")

    def test_caption_reading_time_and_return_cancel_stale_copy(self):
        self.run_case("caption")

    def test_webgl_construction_failure_keeps_copy_and_choices(self):
        self.run_case("fallbackConstructor")

    def test_rig_preparation_failure_keeps_copy_and_choices(self):
        self.run_case("fallbackRig")

    def test_static_scene_fallback_keeps_choice_without_rig_loading(self):
        self.run_case("fallbackStaticScene")

    def test_biome_transition_settles_and_respects_reduced_motion(self):
        self.run_case("transition")


if __name__ == "__main__":
    unittest.main()

/* Node-only, read-only production-code check. No browser, WebGL, or rig IK.
 * Run from any directory:
 *   node design-demos/cihou-reference-study/v13-stage-qa/low-fps-planner-check.cjs
 * stdout is JSON; this script does not write files.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const repoRoot = path.resolve(__dirname, '../../..');
const sceneRelativePath = 'afei-destiny-skill/assets/cihou/quiet/immersive/hero-scene-v13.js';
const source = fs.readFileSync(path.join(repoRoot, sceneRelativePath), 'utf8');
const T = require(path.join(repoRoot, 'afei-destiny-skill/assets/cihou/quiet/immersive/three.min.js'));
const w = { THREE: T };
vm.runInNewContext(source, { window: w, requestAnimationFrame: () => 1 });
const P = w.CihouHeroSceneV13.prototype;

function foot(x, z) {
  return { mode: 'stance', anchor: new T.Vector3(x, .004, z),
    world: new T.Vector3(x, .004, z), stance: 1, landedAt: -.1 };
}

function simulate(frameSeconds) {
  const s = Object.create(P);
  Object.assign(s, {
    phase: 'complete', phaseAge: 0, interaction: 1, targetInteraction: 1,
    holdAge: 0, impulse: 0, figureHeight: 1.15, footDistance: 0,
    travel: 0, gaitTime: 0, time: 0, footMode: 'stand', nextSwingAt: .025,
    edgePoint: new T.Vector3(), exitDirection: new T.Vector3(1, 0, 0),
    edgeApproach: 1, exitDistance: 0, exitLength: 100,
    exitComplete: true, presentationReady: true, options: {},
    active: true, paused: false, reducedMotion: false, last: 1000,
    rig: {
      isV13: true, height: 1,
      getGaitMetrics() {
        return { stride: .270, stanceFraction: .62,
          travelPerGaitSecond: .270 / .62 * .92 };
      },
      group: { worldToLocal: point => point }
    },
    worldFeet: { left: foot(.04, .0299), right: foot(-.04, -.0299) }
  });
  s._exitPoint = distance => new T.Vector3(distance, 0, 0);
  let swingStarts = 0, plannerCalls = 0, simulationSteps = 0;
  let minStep = Infinity, maxStep = 0, floatingResidualSteps = 0;
  let maxStanceLag = 0, maxStrongAnchorDrift = 0, maxWorldToAnchor = 0;
  const lastSwing = {}, previous = {};
  s._prepareWorldFeet = function (point, basis, dt, moving) {
    plannerCalls++;
    const targets = P._prepareWorldFeet.call(this, point, basis, dt, moving);
    for (const side of ['left', 'right']) {
      const f = this.worldFeet[side], old = previous[side];
      if (f.swingAt !== undefined && f.swingAt !== lastSwing[side]) {
        swingStarts++;
        lastSwing[side] = f.swingAt;
      }
      if (f.mode === 'stance') {
        maxStanceLag = Math.max(maxStanceLag, this.exitDistance - f.world.x);
        if (f.stance >= .9) {
          maxWorldToAnchor = Math.max(maxWorldToAnchor, f.world.distanceTo(f.anchor));
          if (old && old.mode === 'stance' && old.stance >= .9) {
            maxStrongAnchorDrift = Math.max(maxStrongAnchorDrift, f.world.distanceTo(old.world));
          }
        }
      }
      previous[side] = { mode: f.mode, stance: f.stance, world: f.world.clone() };
    }
    return targets;
  };
  s._step = function (dt) {
    simulationSteps++;
    minStep = Math.min(minStep, dt);
    maxStep = Math.max(maxStep, dt);
    if (dt < 1e-12) floatingResidualSteps++;
    return P._step.call(this, dt);
  };
  // Match the current render's dt=0 planner call, without drawing or rig.update.
  s.render = function () {
    return this._prepareWorldFeet(this._actorPoint(), {
      t: this.exitDirection, side: new T.Vector3(0, 0, 1)
    }, 0, true);
  };
  const frames = Math.round(10 / frameSeconds);
  for (let frame = 1; frame <= frames; frame++) {
    P._tick.call(s, 1000 + frame * frameSeconds * 1000);
  }
  return {
    fps: 1 / frameSeconds, frames, elapsedSimulationSeconds: s.time,
    travelMetres: s.exitDistance, swingStarts, plannerCalls, simulationSteps,
    minStepSeconds: minStep, maxStepSeconds: maxStep, floatingResidualSteps,
    maxStanceLagMetres: maxStanceLag,
    maxContinuousStrongStanceWorldDriftMetres: maxStrongAnchorDrift,
    maxStrongStanceWorldToAnchorErrorMetres: maxWorldToAnchor
  };
}

const results = [simulate(1 / 60), simulate(.2), simulate(1)];
const assertions = {
  allTravelSixMetres: results.every(r => Math.abs(r.travelMetres - 6) < 1e-9),
  allStrongStanceAnchorsStable: results.every(r => r.maxContinuousStrongStanceWorldDriftMetres < 1e-12),
  allStrongStanceWorldTargetsMatchAnchors: results.every(r => r.maxStrongStanceWorldToAnchorErrorMetres < 1e-12),
  lowFpsSwingCountsWithinOneOf60Fps: results.slice(1).every(r => Math.abs(r.swingStarts - results[0].swingStarts) <= 1),
  lowFpsStanceLagDoesNotGrow: results.slice(1).every(r => r.maxStanceLagMetres <= results[0].maxStanceLagMetres + 1e-9)
};
console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  evidenceKind: 'Node VM straight-line planner stub; not a browser or rendered rig take',
  scene: { path: sceneRelativePath, sha256: crypto.createHash('sha256').update(source).digest('hex') },
  integrationBoundary: [
    'Actual scene prototype _tick, _step, _prepareWorldFeet, _actorPoint and _footRoadPoint execute.',
    'Actual _tick receives 600 / 50 / 10 synthetic frames over exactly 10 seconds, with last timestamp pre-set to 1000ms.',
    'The production <=25ms subdivision is preserved; this is not a fixed-40Hz accumulator.',
    'Each synthetic render additionally calls the actual planner with dt=0, matching the current production render call.'
  ],
  stubbedBoundary: [
    'Straight +X exit path replaces _exitPoint; phase is complete throughout, with active=true and paused/reducedMotion=false.',
    'Intent is held at 1; the actual scene movement branch advances at 0.60m/s.',
    'Rig height=1 and figure height=1.15; gait metrics match the current rig at speed=1, intent=1.',
    'Feet are pre-seeded at x=+/-.04m, y=.004m, z=+/-.0299m, so this does not validate _seedWorldFeet.',
    'worldToLocal is an identity stub; requestAnimationFrame is inert; render performs no camera, WebGL, rig.update, or IK.',
    'No phase transitions, terrain slopes, camera facing, reduced-motion UI, fallback, or browser scheduling are exercised.'
  ],
  metricDefinitions: {
    swingStarts: 'A new swingAt value for either foot, including swings that start and finish between synthetic renders.',
    maxStanceLagMetres: 'Maximum root X minus foot world X whenever foot.mode is stance, sampled at every planner invocation.',
    strongStance: 'foot.mode is stance and stance load is at least .90.',
    maxContinuousStrongStanceWorldDriftMetres: 'World displacement between consecutive planner samples while the same foot is strongly planted in both.',
    floatingResidualSteps: 'Production while(remain>0) substeps below 1e-12 seconds, retained rather than silently removed.'
  },
  results, assertions, allPassed: Object.values(assertions).every(Boolean)
}, null, 2));

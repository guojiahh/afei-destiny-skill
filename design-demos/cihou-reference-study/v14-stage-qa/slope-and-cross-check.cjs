/* Native Three.js checks in Node; no browser, WebGL, or joint rendered take.
 * Run from any directory:
 *   node design-demos/cihou-reference-study/v14-stage-qa/slope-and-cross-check.cjs
 * stdout is JSON; the script reads production sources without modifying them.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const repoRoot = path.resolve(__dirname, '../../..');
const sourceDirectory = 'afei-destiny-skill/assets/cihou/quiet/immersive';
const T = require(path.join(repoRoot, sourceDirectory, 'three.min.js'));
const w = { THREE: T }, sources = [];
for (const name of ['hero-scene-v14.js', 'hero-character-rig-v14.js']) {
  const relativePath = sourceDirectory + '/' + name;
  const source = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
  sources.push({ path: relativePath, sha256: crypto.createHash('sha256').update(source).digest('hex') });
  vm.runInNewContext(source, { window: w });
}
const SP = w.CihouHeroSceneV14.prototype;
const RP = w.CihouCharacterRigV14.prototype;
const V = (x, y, z) => new T.Vector3(x, y, z);

function lower() {
  const heel = new T.Vector2(-.055, -.022), toe = new T.Vector2(.075, -.012);
  return {
    heel, toe, footSourceAngle: Math.atan2(toe.y - heel.y, toe.x - heel.x),
    contactContour: [heel, toe], meta: { sourceRect: [0, 0, 100, 100] },
    pivot: { x: 0, y: 0 }, ankle: new T.Vector2(0, 0), scale: 1
  };
}

function sceneWithFeet(group, normal) {
  const rig = Object.create(RP);
  Object.assign(rig, {
    height: 1, group, getGaitMetrics: RP.getGaitMetrics,
    parts: { leftShin: lower(), rightShin: lower() }
  });
  const s = Object.create(SP);
  Object.assign(s, {
    rig, phase: 'choice', footMode: 'stand', figureHeight: 1.15,
    time: 1, interaction: 0, footDistance: 0,
    worldFeet: {
      left: { mode: 'stance', anchor: V(.02, .004, 0), world: V(.02, .004, 0), stance: 1, landedAt: 0 },
      right: { mode: 'stance', anchor: V(-.02, .004, 0), world: V(-.02, .004, 0), stance: 1, landedAt: 0 }
    },
    _roadContact: point => ({ point: point.clone(), normal: normal.clone() })
  });
  return s;
}

const yaws = [0, .65, 2.2], pitches = [0, .2, -.35], facings = [1, -1];
const scales = [[.75, .75, .75], [1.15, 1.15, 1.15], [1.3, .8, .6]];
const normals = [V(0, 1, 0), V(-.15, 1, .25).normalize(), V(.3, 1, -.2).normalize()];
let maxTangentDot = 0, transformCases = 0;
for (const yaw of yaws) for (const pitch of pitches) for (const facing of facings)
for (const scale of scales) for (const normal of normals) {
  const actor = new T.Group(), group = new T.Group();
  actor.rotation.set(pitch, yaw, .07);
  actor.position.set(2, .5, -1);
  group.scale.set(facing * scale[0], scale[1], scale[2]);
  actor.add(group);
  actor.updateMatrixWorld(true);
  const s = sceneWithFeet(group, normal);
  const targets = SP._prepareWorldFeet.call(s, V(0, 0, 0), { t: V(1, 0, 0), side: V(0, 0, 1) }, 0, false);
  for (const side of ['left', 'right']) {
    const foot = RP._prepareFoot.call(s.rig, side, 0, 0, {
      stride: 0, lockFeet: 1, footTargets: targets, externalFootTargets: true
    });
    const heel = group.localToWorld(V(foot.ankle.x + foot.heel.x, foot.ankle.y + foot.heel.y, foot.ankle.z));
    const toe = group.localToWorld(V(foot.ankle.x + foot.toe.x, foot.ankle.y + foot.toe.y, foot.ankle.z));
    maxTangentDot = Math.max(maxTangentDot, Math.abs(toe.sub(heel).normalize().dot(normal)));
  }
  transformCases++;
}

// This check invokes the actual _roadContact with an actual sloped top Mesh.
const height = (x, z) => .14 + .2 * x + .1 * z;
const geometry = new T.BufferGeometry();
geometry.setAttribute('position', new T.Float32BufferAttribute([
  -2, height(-2, -2), -2, -2, height(-2, 2), 2,
  2, height(2, -2), -2, 2, height(2, 2), 2
], 3));
geometry.setIndex([0, 1, 2, 1, 3, 2]);
geometry.computeVertexNormals();
const road = new T.Mesh(geometry, new T.MeshBasicMaterial({ side: T.DoubleSide }));
road.updateMatrixWorld(true);
const contactScene = Object.create(SP);
contactScene.road = road;
const contact = contactScene._roadContact(V(.3, height(.3, .4) + .004, .4));
const heightError = contact.point.y - height(.3, .4);
const normalError = contact.normal.distanceTo(V(-.2, 1, -.1).normalize());

let maxXError = 0, maxYError = 0, maxLoadError = 0;
const samples = [];
for (const p of [0, .3999, .4, .4001, .535, .6699, .67, .7, .75, .88, 1]) {
  const s = sceneWithFeet(new T.Group(), V(0, 1, 0));
  Object.assign(s, {
    phase: 'crossing', footMode: 'cross', actionProgress: p, figureHeight: 1.15,
    crossFeet: {
      front: 'left', rear: 'right',
      starts: { left: V(.035 * 1.15, .004, .02), right: V(-.035 * 1.15, .004, -.02) },
      ends: { left: V(.255 * 1.15, .004, .02), right: V(.355 * 1.15, .004, -.02) }
    }
  });
  s.rig.height = 1.15;
  SP._prepareWorldFeet.call(s, V(0, 0, 0), { t: V(1, 0, 0), side: V(0, 0, 1) }, 0, false);
  const action = RP._actionPose.call(s.rig, { action: 'cross', progress: p });
  const rear = s.worldFeet.right, expected = action.footTargets.right;
  maxXError = Math.max(maxXError, Math.abs(rear.world.x - (expected.x + action.rootTravel)));
  maxYError = Math.max(maxYError, Math.abs(rear.world.y - .004 - expected.y));
  maxLoadError = Math.max(maxLoadError, Math.abs(rear.stance - expected.stance));
  samples.push({ p, mode: rear.mode, stance: rear.stance });
}
const assertions = {
  worldHeelToeDirectionTangent: maxTangentDot < 1e-10,
  topMeshRayHeightMatchesPlane: Math.abs(heightError) < 1e-7,
  topMeshRayNormalMatchesPlane: normalError < 1e-7,
  sceneRigRearPositionAndLoadMatch: Math.max(maxXError, maxYError, maxLoadError) < 1e-10
};
console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  evidenceKind: 'Node/native Three.js offline math and Mesh-ray checks; no browser or joint rendered take',
  sources,
  executedProductionMethods: ['SceneV14._prepareWorldFeet', 'SceneV14._roadContact', 'RigV14._prepareFoot', 'RigV14._actionPose'],
  boundaries: [
    'Normal/heel-toe check uses real Three Groups and their matrixWorld, with synthetic foot metadata and fixed world-plane normals.',
    'The transform grid includes facing reflection, uniform and nonuniform scale, yaw, pitch, and fixed .07-radian roll.',
    'Ray check invokes actual _roadContact against a real synthetic sloped top Mesh using native Three Raycaster.',
    'Rear-follow check starts with pre-seeded crossFeet and compares actual scene planning with actual rig action pose at 11 progress values.',
    'No browser, WebGL, real atlas alpha pixels, full rig.update/IK, production road geometry, camera animation, or end-to-end rendered take is exercised.',
    'The transform cases are independent; they do not test long-running surface-normal cache invalidation.'
  ],
  normalFormula: {
    transformCases, heelToeChecks: transformCases * 2,
    maxAbsWorldTangentDotSurfaceNormal: maxTangentDot,
    yawsRadians: yaws, pitchesRadians: pitches, rollRadians: .07,
    facings, scales, surfaceNormals: normals.map(normal => normal.toArray())
  },
  roadRay: { plane: 'y = .14 + .2*x + .1*z', queryPoint: [.3, height(.3, .4) + .004, .4], heightError, normalError, contactPoint: contact.point.toArray() },
  rearFollow: { interval: [.40, .67], landingLoadInterval: [.67, .75], maxXError, maxYError, maxLoadError, samples },
  assertions, allPassed: Object.values(assertions).every(Boolean)
}, null, 2));

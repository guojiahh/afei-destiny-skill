"""Exercise finite choice playback through the actual adapter and shipped math.

The world and visual-effects boundary are synthetic. This suite tests adapter
ownership, movement, cancellation and time, not the appearance of native art.
It deliberately does not initialize a report or repack the 49 MB asset bundle.
"""

from pathlib import Path
import shutil
import subprocess
import unittest


ASSETS = Path(__file__).resolve().parents[1] / "assets" / "cihou" / "quiet" / "wayfinder"


PROGRAM = r'''
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const adapter=fs.readFileSync(process.argv[1],'utf8');
const runtime=fs.readFileSync(process.argv[2],'utf8');
const testCase=process.argv[3],modes=['attempt','prepare','sustain'];
const marker='"N5rp":[function(require,module,exports) {\n';
const start=runtime.indexOf(marker)+marker.length,end=runtime.indexOf('\n},{}],',start);
assert.ok(start>=marker.length&&end-start>600000,'Published Three.js factory boundary');

function setup(){
 const events={},all=[],tags={},postRender=[],effectsLog=[];
 let milliseconds=0,activeEffect=null;
 for(const match of adapter.matchAll(/tags\.([A-Za-z0-9_]+)/g))tags[match[1]]=match[1];
 const overlay={dom:false,mountedAt:null,outroEndsAt:null,safeSent:false,flagTimerFired:false,mounts:0,reuses:0};
 let storeData={transitionOverlay:false},wasTransition=false;
 const store={
  subscribe(fn){fn(storeData);return ()=>{}},
  update(fn){
   const previous=!!storeData.transitionOverlay;storeData=fn(storeData);
   if(storeData.transitionOverlay&&!previous){
    if(!overlay.dom){
     overlay.dom=true;overlay.mountedAt=milliseconds;overlay.safeSent=false;
     overlay.flagTimerFired=false;overlay.mounts++;
    }else overlay.reuses++;
    // Svelte reverses an outgoing transition without rerunning onMount.
    overlay.outroEndsAt=null;
   }else if(!storeData.transitionOverlay&&previous)overlay.outroEndsAt=milliseconds+1000;
  }};
 const document={hidden:false,querySelectorAll(){return []},
  querySelector(selector){
   if(selector==='.container.svelte-xjm3ff')return overlay.dom?{}:null;
   if(selector==='#story-choices')return null;
   throw Error('Unexpected native overlay selector '+selector);
  },
  addEventListener(type,fn){(events[type]??=[]).push(fn)},
  removeEventListener(type,fn){events[type]=(events[type]||[]).filter(item=>item!==fn)},
  dispatchEvent(event){for(const fn of events[event.type]||[])fn(event)}};
 const media={matches:false,addEventListener(){},removeEventListener(){}};
 const story={hero_states:[0,1,2].map(i=>({lines:['Synthetic '+i],description:'Synthetic '+i,
  anchors:['Synthetic anchor '+i]})),
  loop_story:{nodes:['trigger','meaning','response','relief','cost','return'].map(id=>({
   id,text:'Synthetic '+id,detail:'Synthetic detail '+id,refs:['user:2']}))},
  choices:modes.map((mode,i)=>({id:'synthetic-'+i,title:'Synthetic '+mode,
   condition:'Synthetic condition '+i,text:'Synthetic action '+i,
   feedback:{mode,lines:[0,1,2].map(n=>'Synthetic step '+n),result:'Synthetic result '+i}}))};
 const window={CIHOU_STORY_DATA:story,matchMedia:()=>media,
  performance:{now:()=>milliseconds},
  requestAnimationFrame(){throw Error('Adapter must reuse the native frame loop')}};
 const context=vm.createContext({window,document,console,performance:window.performance,
  CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}}});
 const threeModule={exports:{}};
 vm.runInContext('(function(require,module,exports){'+runtime.slice(start,end)+'\n})',context)(
  ()=>{throw Error('Unexpected Three.js dependency')},threeModule,threeModule.exports);
 const THREE=threeModule.exports;
 assert.equal(THREE.REVISION,'118');
 class Entity{
  constructor(name){this.name=name;this.alive=true;this.data=new Map();all.push(this)}
  add(tag,data={}){this.data.set(tag,data);return this}
  get(tag){if(!this.data.has(tag))throw Error('Tag '+tag+' not part of Entity');return this.data.get(tag)}
  has(tag){return this.data.has(tag)}
  remove(tag){this.data.delete(tag);return this}
  tagOn(tag){return this.add(tag)}tagOff(tag){return this.remove(tag)}
  kill(){this.alive=false;return this}
 }
 const factories={};
 for(const id of ['OAsz','S3Ot','PA4C','LdzR','vaEW','NcCM'])factories[id]=function(){};
 const systems=new Map(),query={};
 const engine={running:true,starts:0,stops:0,
  start(){this.running=true;this.starts++},stop(){this.running=false;this.stops++}};
 const world={root:{_systemList:[]},entity:name=>new Entity(name),
  query(selector){const required=Array.isArray(selector)?selector:[selector];
   return {entities:all.filter(entity=>entity.alive&&required.every(tag=>entity.has(tag)))}},
  findEntity(selector){return this.query(selector).entities[0]||null},
  findTag(tag){const entity=this.findEntity(tag);return entity?entity.get(tag):null},
  getSystem(factory){return systems.get(factory)},
  removeSystem(factory){const state=systems.get(factory);systems.delete(factory);
   const at=this.root._systemList.indexOf(state);if(at>=0)this.root._systemList.splice(at,1)},
  addSystem(factory){
   if(factory===factories.S3Ot){
    this.entity('SyntheticEnvironment').add(tags.EnvironmentState,{name:query.biome||'forest',solved:0})
     .add(tags.ActiveEnvironmentState);
   }
   const state={enabled:true,instance:factory===factories.S3Ot?{process:nativeEnvironment}:function(){}};
   systems.set(factory,state);this.root._systemList.push(state);return state;
  }};
 function nativeEnvironment(){
  const safe=world.query(tags.SafeToSwapBiomes).entities;if(!safe.length)return;
  const current=world.findTag(tags.EnvironmentState);
  current.name=current.name==='forest'?'grasslands':current.name==='grasslands'?'tundra':'grasslands';
  for(const entity of world.query(tags.TransitionToNextBiome).entities){
   entity.remove(tags.TransitionToNextBiome);entity.remove(tags.CameraStopUserMovement);
  }
  for(const entity of safe)entity.remove(tags.SafeToSwapBiomes);
 }
 for(const factory of Object.values(factories))world.addSystem(factory);
 const target={position:new THREE.Vector3(),direction:new THREE.Vector3(1,0,0),
  inputPositionOnPlane:new THREE.Vector3()};
 world.entity('SyntheticUser').add(tags.UserTarget,target);
 world.entity('SyntheticCharacter').add(tags.UserCharacter,{position:new THREE.Vector3(),velocity:new THREE.Vector3()});
 world.entity('SyntheticInput').add(tags.InputState,{interacted:false,pressed:false});
 world.entity('SyntheticZoom').add(tags.UserZoom,{distance:15,defaultDistance:15});
 world.entity('SyntheticUI').add(tags.GameUIStore,store);
 world.entity('SyntheticViewport').add(tags.AppState,{width:1200,height:800});
 window.WayfinderTemplate={world,tags,engine,setMuted(){}};
 window.parcelRequire=id=>id==='N5rp'?THREE:id==='WIvJ'?{default:query}:
  id==='smi9'?{addPostRenderCallback:fn=>postRender.push(fn)}:{default:factories[id]};
 window.CihouChoiceEffects=function(effectContext){
  assert.equal(effectContext.world,world);assert.equal(effectContext.tags,tags);
  assert.equal(effectContext.THREE,THREE);
  return {
   start(mode,origin,direction,texts){
    assert.ok(modes.includes(mode));assert.equal(texts.length,3);
    activeEffect={mode,number:effectsLog.filter(item=>item.kind==='start').length+1,completed:false};
    effectsLog.push({kind:'start',...activeEffect,origin:origin.toArray(),texts:Array.from(texts)});
    const side=new THREE.Vector3(-direction.z,0,direction.x);
    const points=[origin.clone(),origin.clone().addScaledVector(direction,10),
     origin.clone().addScaledVector(direction,22).addScaledVector(side,mode==='prepare'?6:mode==='sustain'?-8:2)];
    const length=new THREE.CatmullRomCurve3(points,false,'centripetal').getLength();
    return {points,length,anchorProgress:[0,.5,1],durationHint:0};
   },
   update(dt,position,progress){
    assert.ok(Number.isFinite(dt)&&dt>=0);assert.ok(position.isVector3);
    assert.ok(Number.isFinite(progress)&&progress>=0&&progress<=1);
   },
   finish(){assert.ok(activeEffect,'Cannot finish before starting effects');
    assert.equal(activeEffect.completed,false,'One visual run finishes once');
    activeEffect.completed=true;effectsLog.push({kind:'finish',number:activeEffect.number,mode:activeEffect.mode})},
   clear(){effectsLog.push({kind:'clear',number:activeEffect&&activeEffect.number});activeEffect=null},
   getState(){return {completed:!!(activeEffect&&activeEffect.completed)}}
  };
 };
 const stateEvents=[],anchorEvents=[];
 document.addEventListener('cihou:state',event=>stateEvents.push(event.detail));
 document.addEventListener('cihou:anchor',event=>anchorEvents.push(event.detail));
 vm.runInContext(adapter,context,{filename:process.argv[1]});
 const api=window.CihouWayfinder;
 assert.equal(api.ready,true,api.error||'Actual adapter initializes against the strict world contract');
 const move=world.getSystem(factories.OAsz).instance;
 function nativeOverlayTimers(){
  if(!overlay.dom)return;
  // Original TransitionOverlay.onMount emits SafeToSwapBiomes at 1250ms;
  // GamePages clears its store at 3500ms, followed by a 1000ms Svelte outro.
  // These are wall-clock component events, independent of engine pause.
  if(!overlay.safeSent&&milliseconds-overlay.mountedAt>=1250){
   overlay.safeSent=true;
   const transition=world.findEntity(tags.TransitionToNextBiome);
   if(transition)transition.add(tags.SafeToSwapBiomes);
  }
  if(!overlay.flagTimerFired&&milliseconds-overlay.mountedAt>=3500){
   overlay.flagTimerFired=true;store.update(data=>({...data,transitionOverlay:false}));
  }
  if(overlay.outroEndsAt!==null&&milliseconds>=overlay.outroEndsAt&&!storeData.transitionOverlay){
   overlay.dom=false;overlay.mountedAt=null;overlay.outroEndsAt=null;
  }
 }
 function nativeGameUI(){
  const transitioning=world.query(tags.TransitionToNextBiome).entities.length>0;
  if(transitioning!==wasTransition){
   if(transitioning&&world.findTag(tags.EnvironmentState).name!=='tundra')
    store.update(data=>({...data,transitionOverlay:true}));
   wasTransition=transitioning;
  }
 }
 function tick(dt=.05){
  milliseconds+=Math.max(0,Number(dt)||0)*1000;
  nativeOverlayTimers();
  // The environment swap precedes GameUISystem's observation of the tag.
  // Replacing it in the same frame can hide the required false edge.
  world.getSystem(factories.S3Ot).instance.process(dt);
  move(dt);nativeGameUI();
  world.findTag(tags.UserCharacter).position.copy(target.position);
  for(const callback of postRender)callback();
  return api.getState();
 }
 function advance(seconds,fps=20){for(let frame=0;frame<Math.round(seconds*fps);frame++)tick(1/fps)}
 function finishTransitions(){
  for(let attempt=0;attempt<1200;attempt++){
   const transition=world.findEntity(tags.TransitionToNextBiome);
   if(!transition&&!api.getState().transitioning&&!overlay.dom)break;
   tick(.05);
  }
  assert.equal(api.getState().transitioning,false,'The bounded pending transition chain settles');
  assert.equal(overlay.dom,false,'The outgoing native component is fully removed');
  assert.equal(overlay.reuses,0,'A new selection must mount a fresh overlay rather than reuse an outgoing component');
 }
 function choose(index){api.setChoice(index);finishTransitions();return api.getState()}
 function untilDone(){
  const steps=new Set();let frames=0;
  while(api.getState().phase!=='done'&&frames<1200){steps.add(api.getState().choiceStep);tick(.05);frames++}
  steps.add(api.getState().choiceStep);
  assert.equal(api.getState().phase,'done','An explicit selection terminates instead of looping indefinitely');
  return {state:api.getState(),steps};
 }
 function hidden(value){document.hidden=value;document.dispatchEvent({type:'visibilitychange'})}
 function getOverlay(){return {...overlay,flag:!!storeData.transitionOverlay}}
 return {api,tick,advance,choose,finishTransitions,untilDone,effectsLog,stateEvents,anchorEvents,
  target,engine,hidden,media,move,getOverlay};
}

if(testCase==='manual'){
 const h=setup();h.api.setInteraction(1);h.advance(2);
 assert.ok(h.api.getState().travel>8,'Stage zero still advances on hold');
 h.api.setInteraction(0);const at=h.api.getState().travel;h.advance(10);
 assert.equal(h.api.getState().travel,at,'Release has no manual drift');
 assert.equal(h.api.getState().chapter,0,'Walking never automatically changes the chapter');
 h.api.setChapter(1);h.api.setInteraction(1);h.advance(2);h.api.setInteraction(0);
 const ringAt=h.api.getState().travel;assert.ok(ringAt>at);
 h.advance(5);assert.equal(h.api.getState().travel,ringAt);
 h.api.setChapter(2);h.api.setInteraction(1);h.advance(20);
 assert.equal(h.api.getState().travel,ringAt,'Unselected possibilities remain stationary even if hold input arrives');
 assert.equal(h.effectsLog.filter(item=>item.kind==='start').length,0);
 assert.equal(h.api.getState().choiceRunning,false);
}else if(testCase==='finite'){
 for(let index=0;index<3;index++){
  const h=setup();h.api.setChapter(2);const originalTravel=h.api.getState().travel;
  h.choose(index);assert.equal(h.api.getState().choiceRunning,true);
  const {state,steps}=h.untilDone();
  assert.equal(state.choiceMode,modes[index]);assert.equal(state.choiceProgress,1);
  assert.equal(state.choiceRunning,false);assert.equal(state.exitComplete,true);assert.equal(state.presentationReady,true);
  assert.deepEqual([...steps].sort(),[0,1,2],'All three reading steps are encountered');
  assert.equal(state.travel,originalTravel,'An open choice route does not consume the old closed-loop coordinate');
  assert.equal(h.effectsLog.filter(item=>item.kind==='finish').length,1);
  const elapsed=state.choiceElapsed,position=h.target.position.toArray(),runId=state.choiceRunId;
  const doneEvents=h.stateEvents.filter(item=>item.phase==='done'&&item.choiceRunId===runId).length;
  h.advance(10);
  assert.equal(h.api.getState().choiceElapsed,elapsed);
  assert.deepEqual(h.target.position.toArray(),position);
  assert.equal(h.effectsLog.filter(item=>item.kind==='finish').length,1);
  assert.equal(h.stateEvents.filter(item=>item.phase==='done'&&item.choiceRunId===runId).length,doneEvents,
   'An idle finished run does not keep publishing completion');
 }
}else if(testCase==='release-pause'){
 const h=setup();h.choose(0);h.advance(1);h.api.setInteraction(0);h.api.setSteering(0);
 const afterRelease=h.api.getState().choiceElapsed;h.advance(1);
 assert.ok(h.api.getState().choiceElapsed>afterRelease,'Manual release does not cancel explicit autoplay');
 for(const [stop,resume,label] of [
  [()=>h.api.setPaused(true),()=>h.api.setPaused(false),'pause'],
  [()=>h.api.setActive(false),()=>h.api.setActive(true),'reading'],
  [()=>h.hidden(true),()=>h.hidden(false),'hidden']]){
  stop();const before=h.api.getState(),position=h.target.position.toArray();
  h.advance(10);assert.equal(h.api.getState().choiceElapsed,before.choiceElapsed,label+' freezes the process');
  assert.equal(h.api.getState().choiceProgress,before.choiceProgress);
  assert.deepEqual(h.target.position.toArray(),position);
  resume();h.tick(.05);
  assert.ok(h.api.getState().choiceElapsed>before.choiceElapsed,label+' resumes the same run');
  assert.ok(h.api.getState().choiceElapsed-before.choiceElapsed<=.050001,'No wall-clock catch-up after '+label);
  assert.equal(h.api.getState().choiceRunId,before.choiceRunId);
 }
}else if(testCase==='replay'){
 const h=setup();h.choose(0);h.advance(1);
 const firstRun=h.api.getState().choiceRunId,firstOrigin=h.effectsLog.find(item=>item.kind==='start').origin;
 h.choose(0);assert.ok(h.api.getState().choiceRunId>firstRun,'Same selection is a new explicit replay');
 assert.deepEqual(h.effectsLog.filter(item=>item.kind==='start')[1].origin,firstOrigin,
  'A replay begins at the fixed fork instead of drifting from the previous route position');
 h.untilDone();const finishedRun=h.api.getState().choiceRunId;
 h.choose(0);assert.ok(h.api.getState().choiceRunId>finishedRun);
 assert.equal(h.api.getState().choiceRunning,true,'A completed selection can replay');
 assert.deepEqual(h.effectsLog.filter(item=>item.kind==='start')[2].origin,firstOrigin);
 h.choose(1);assert.equal(h.api.getState().selectedChoice,1);assert.equal(h.api.getState().choiceMode,'prepare');
 assert.equal(h.api.getState().choiceRunning,true);h.untilDone();
 assert.equal(h.effectsLog.filter(item=>item.kind==='finish').length,2,'Only the two completed runs finish');
}else if(testCase==='queued'){
 const h=setup();h.api.setChapter(2);h.api.setChoice(1);
 assert.equal(h.api.getState().transitioning,true);
 h.api.setChoice(2);h.api.setChoice(0);h.api.setChoice(2);
 assert.equal(h.api.getState().selectedChoice,2,'Latest click is accepted while a native video is in flight');
 h.advance(3);
 assert.equal(h.getOverlay().flag,true);assert.equal(h.getOverlay().dom,true);
 assert.equal(h.effectsLog.filter(item=>item.kind==='start').length,0,'Swapping scenery at 1.25s must not start feedback beneath the video');
 assert.equal(h.anchorEvents.some(event=>event.node&&event.node.text.startsWith('Synthetic step')),false,
  'The first finite feedback sentence does not play under the first three seconds of leaves');
 h.advance(.7);
 assert.equal(h.getOverlay().flag,false);assert.equal(h.getOverlay().dom,true,'The component remains during the original outro');
 assert.equal(h.effectsLog.filter(item=>item.kind==='start').length,0,'A false store flag alone is not an exited overlay');
 h.advance(.7);
 assert.equal(h.getOverlay().dom,true);
 assert.equal(h.getOverlay().mounts,1,'The latest request waits for full component removal');
 h.finishTransitions();
 const starts=h.effectsLog.filter(item=>item.kind==='start');
 assert.equal(starts.length,1,'Superseded requested choices never begin their visual process');
 assert.equal(starts[0].mode,'sustain');assert.equal(h.api.getState().biomeName,'tundra');
 assert.equal(h.getOverlay().mounts,2,'The queued destination receives a distinct onMount/safe-swap lifecycle');
 h.untilDone();assert.equal(h.api.getState().selectedChoice,2);
 for(const [stop,resume,label] of [
  [h=>h.api.setPaused(true),h=>h.api.setPaused(false),'pause'],
  [h=>h.api.setActive(false),h=>h.api.setActive(true),'reading'],
  [h=>h.hidden(true),h=>h.hidden(false),'hidden']]){
  const frozen=setup();frozen.api.setChoice(1);frozen.advance(3.7);stop(frozen);frozen.advance(2);
  assert.equal(frozen.getOverlay().dom,false,'Wall-clock outro can finish during '+label);
  assert.equal(frozen.api.getState().transitioning,true,'Engine stop retains its pending handoff during '+label);
  assert.equal(frozen.effectsLog.filter(item=>item.kind==='start').length,0,label+' cannot start a prepared choice');
  resume(frozen);frozen.tick(0);
  assert.equal(frozen.effectsLog.filter(item=>item.kind==='start').length,0,'A zero-dt wakeup cannot consume the prepared handoff');
  frozen.tick(.05);assert.equal(frozen.effectsLog.filter(item=>item.kind==='start').length,1);
  assert.equal(frozen.api.getState().choiceMode,'prepare');
 }
}else if(testCase==='cancel'){
 for(const cancel of ['chapter','reset','destroy']){
  const h=setup();h.choose(0);h.advance(1);
  const starts=h.effectsLog.filter(item=>item.kind==='start').length;
  if(cancel==='chapter')h.api.setChapter(0);else h.api[cancel]();
  const elapsed=h.api.getState().choiceElapsed;h.advance(20);
  assert.equal(h.api.getState().choiceElapsed,elapsed,cancel+' cancels the old process');
  assert.equal(h.api.getState().choiceRunning,false);
  assert.equal(h.effectsLog.filter(item=>item.kind==='start').length,starts);
  assert.equal(h.effectsLog.filter(item=>item.kind==='finish').length,0,'Cancelled effects do not finish');
  assert.ok(h.effectsLog.some(item=>item.kind==='clear'),'Owned effects are cleared on '+cancel);
 }
 for(const reset of [false,true]){
  const h=setup();h.api.setChoice(1);assert.equal(h.api.getState().transitioning,true);
  h.advance(3.7);h.api.setPaused(true);
  if(reset)h.api.reset();else h.api.setChapter(0);
  h.advance(2);
  assert.equal(h.getOverlay().dom,false,'A cancelled video finishes its original outro while paused');
  assert.equal(h.effectsLog.filter(item=>item.kind==='start').length,0);
  h.api.setPaused(false);
  h.finishTransitions();h.advance(20);
  assert.equal(h.api.getState().chapter,0,'An old video cannot restore a superseded chapter');
  assert.equal(h.api.getState().selectedChoice,null);
  assert.equal(h.api.getState().choiceRunning,false);
  assert.equal(h.effectsLog.filter(item=>item.kind==='start').length,0,'No cancelled transition launches effects');
 }
}else if(testCase==='time'){
 const traces=[];
 for(const fps of [30,60,120]){
  const h=setup();h.choose(0);h.advance(2,fps);
  traces.push({elapsed:h.api.getState().choiceElapsed,progress:h.api.getState().choiceProgress,
   position:h.target.position.clone()});
 }
 for(const trace of traces){
  assert.ok(Math.abs(trace.elapsed-traces[0].elapsed)<1e-8,'Elapsed time is independent of frame count');
  assert.ok(Math.abs(trace.progress-traces[0].progress)<1e-8,'Route progress uses elapsed time');
  assert.ok(trace.position.distanceTo(traces[0].position)<1e-6,'Identical elapsed time gives the same open-route position');
 }
 const h=setup();h.choose(0);
 for(const dt of [0,-1,NaN]){const before=h.api.getState().choiceElapsed;h.tick(dt);assert.equal(h.api.getState().choiceElapsed,before)}
 const before=h.api.getState().choiceElapsed;h.tick(1000);
 assert.ok(h.api.getState().choiceElapsed-before<=.100001,'A delayed frame cannot skip the finite process');
}else{throw Error('Unknown choice test case '+testCase)}
'''


class ChoicePlaybackTests(unittest.TestCase):
    def run_case(self, case):
        node = shutil.which("node")
        if not node:
            self.skipTest("Node.js unavailable for actual adapter lifecycle checks")
        result = subprocess.run(
            [node, "-e", PROGRAM, str(ASSETS / "adapter.js"),
             str(ASSETS / "runtime" / "wayfinder.js"), case],
            text=True, capture_output=True, timeout=20, check=False,
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)

    def test_old_hold_loops_and_unselected_possibilities_stay_manual(self):
        self.run_case("manual")

    def test_three_modes_terminate_once_after_showing_all_reading_steps(self):
        self.run_case("finite")

    def test_release_keeps_autoplay_but_pause_reading_and_hidden_freeze_it(self):
        self.run_case("release-pause")

    def test_reselection_and_replay_start_at_the_same_fork(self):
        self.run_case("replay")

    def test_latest_selection_wins_during_the_original_video_transition(self):
        self.run_case("queued")

    def test_chapter_restart_and_destroy_cancel_effects_and_pending_playback(self):
        self.run_case("cancel")

    def test_real_route_uses_frame_independent_time_and_bounds_delayed_frames(self):
        self.run_case("time")


if __name__ == "__main__":
    unittest.main()

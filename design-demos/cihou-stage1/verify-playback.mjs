// Exercise the actual narration clock without a real-time wait or browser mutation.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const definitions=app.slice(app.indexOf('  function stopPlayback('),app.indexOf('  function renderHotspots()'));
let now=0,serial=0,selected=[],jobs=new Map(),paused=0,resumed=0,finished=0;
const motion={pause(){paused++},resume(){resumed++}};
const sandbox={document:{hidden:false},reduced:{matches:false},playback:{timer:0,playing:false,position:0,mode:'ready',remaining:0,started:0},steps:[{id:'past',duration:3400},{id:'relation',duration:4500},{id:'present',duration:3700},{id:'action',duration:4400}],model:()=>({structure:'loop'}),sceneMotion:motion,copyMotion:null,playbackUI(){},selectHotspot(id){selected.push(id)},cancelMotion(){finished++},performance:{now:()=>now},clearTimeout:id=>jobs.delete(id),setTimeout(fn,ms){const id=++serial;jobs.set(id,{fn,at:now+ms});return id}};
vm.createContext(sandbox);vm.runInContext(definitions,sandbox);
function advance(ms){const end=now+ms;for(;;){const next=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;now=next[1].at;jobs.delete(next[0]);next[1].fn();}now=end;}
sandbox.startPlayback();assert.deepEqual(selected,['past']);advance(1000);sandbox.stopPlayback('paused');assert.equal(paused,1);assert.equal(sandbox.playback.remaining,2400);advance(9000);assert.equal(selected.length,1);sandbox.startPlayback(true);assert.equal(resumed,1);advance(2399);assert.equal(selected.length,1);advance(1);assert.deepEqual(selected,['past','relation']);
// A direct click takes ownership; the old narration must not replace its state.
sandbox.stopPlayback('explore',false);sandbox.selectHotspot('future-b');advance(20000);assert.equal(selected.at(-1),'future-b');assert.equal(jobs.size,0);
// One complete play stops before choosing an external response.
selected=[];sandbox.startPlayback();advance(16000);assert.deepEqual(selected,['past','relation','present','action']);assert.equal(sandbox.playback.mode,'done');assert.equal(sandbox.playback.playing,false);assert.equal(jobs.size,0);assert(finished>0);
// Reduced motion and background entry do not start narration.
selected=[];sandbox.reduced.matches=true;sandbox.startPlayback();assert.equal(selected.length,0);sandbox.reduced.matches=false;sandbox.document.hidden=true;sandbox.startPlayback();assert.equal(selected.length,0);
console.log('PASS narration: preserved pause/resume timing; direct selection cancels old clock; one play ends at action; reduced/background entry stays still.');

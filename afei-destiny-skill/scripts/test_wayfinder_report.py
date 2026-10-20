"""Synthetic report coverage for the self-contained original-runtime renderer."""
import base64
import copy
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import test_html_report as synthetic_fixture
import render_wayfinder_report as wayfinder
from consultation_harness import active_artifacts, read_state, session_lifecycle
from generate_html_report import generate, load_sources, render, safe_json, validate_model


def embedded_json(html, identifier):
    match = re.search(r'<script id="' + re.escape(identifier) +
                      r'" type="application/json">(.*?)</script>', html, re.S)
    if not match:
        raise AssertionError("Missing embedded JSON: " + identifier)
    return json.loads(match[1])


class ResourceTags(HTMLParser):
    def __init__(self):
        super().__init__()
        self.external_scripts = []
        self.external_styles = []
        self.images = []

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == "script" and "src" in attrs:
            self.external_scripts.append(attrs["src"])
        if tag == "link" and attrs.get("rel") == "stylesheet":
            self.external_styles.append(attrs.get("href"))
        if tag in {"img", "source"} and "src" in attrs:
            self.images.append(attrs["src"])


class WayfinderReportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Reuse only the existing synthetic setup helpers, without inheriting or
        # rediscovering the legacy test class as another test suite.
        fixture = synthetic_fixture.HtmlReportTests("runTest")
        fixture.setUp()
        cls.fixture = fixture
        try:
            fixture.mobius()
            fixture.model["presentation"].pop("hero_runtime")
            for index, state in enumerate(fixture.model["presentation"]["hero_states"]):
                state["anchors"] = ["Synthetic anchor " + str(index) + ":" + str(i) for i in range(3)]
            fixture.model["presentation"]["hero_choices"] = [
                {"id": "synthetic-" + str(i), "title": "Synthetic choice " + str(i),
                 "condition": "Synthetic condition " + str(i),
                 "text": "One synthetic controllable action " + str(i), "refs": ["user:5"]}
                for i in range(3)
            ]
            fixture.model["presentation"]["loop_story"] = {
                "nodes": [{"id": identifier, "text": "Synthetic " + identifier,
                           "detail": "Synthetic loop detail " + identifier, "refs": ["user:2"]}
                          for identifier in ["trigger", "meaning", "response", "relief", "cost", "return"]],
                "present": {"text": "Synthetic present condition", "refs": ["user:2"]},
                "future": {"text": "Synthetic future experiment", "refs": ["user:5"]},
            }
            fixture.save()
            # This also exercises the production default runtime dispatch and
            # source registration, rather than calling the adapter in isolation.
            generate(fixture.s, fixture.model_path, fixture.out, register=True)
            cls.html = fixture.out.read_text()
            cls.data = embedded_json(cls.html, "report-data")
            cls.provenance = embedded_json(cls.html, "report-provenance")
            cls.embedded_assets = embedded_json(cls.html, "wayfinder-assets")
            cls.sources = load_sources(fixture.s, read_state(fixture.s))
            # The real 49 MB resource collection is packed once by its existing
            # lru_cache. Negative tests use __wrapped__ with a tiny temporary tree.
            cls.cached_assets, cls.entries = wayfinder.packed_assets()
        except Exception:
            fixture.tearDown()
            raise

    @classmethod
    def tearDownClass(cls):
        cls.fixture.tearDown()

    def test_all_444_actual_resources_are_inline_and_match_provenance(self):
        manifest = json.loads((wayfinder.ASSETS / "asset-manifest.json").read_text())
        self.assertEqual(444, len(self.embedded_assets))
        self.assertEqual(manifest, self.provenance["hero"]["resources"])
        self.assertEqual({entry["path"] for entry in manifest}, set(self.embedded_assets))
        for entry in manifest:
            with self.subTest(path=entry["path"]):
                mime, encoded = self.embedded_assets[entry["path"]]
                raw = base64.b64decode(encoded, validate=True)
                self.assertEqual(entry["bytes"], len(raw))
                self.assertEqual(entry["sha256"], hashlib.sha256(raw).hexdigest())
                self.assertEqual(raw, (wayfinder.ASSETS / "assets" / entry["path"].lstrip("/")).read_bytes())
                self.assertTrue(mime)
        self.assertEqual(49_137_963, sum(entry["bytes"] for entry in manifest))
        self.assertIs(self.cached_assets, wayfinder.packed_assets()[0])

    def test_source_bound_default_runtime_and_registered_delivery(self):
        fixture = self.fixture
        self.assertEqual("wayfinder-v19", self.provenance["hero"]["version"])
        runtime = (wayfinder.ASSETS / "runtime" / "wayfinder.js").read_bytes()
        self.assertEqual(hashlib.sha256(runtime).hexdigest(), self.provenance["hero"]["runtime_sha256"])
        self.assertEqual(fixture.model["sources"], self.provenance["sources"])
        self.assertEqual(fixture.model["session_id"], self.provenance["session_id"])
        self.assertEqual(hashlib.sha256(safe_json(fixture.model).encode()).hexdigest(),
                         self.provenance["model_sha256"])
        state = read_state(fixture.s)
        self.assertEqual("complete", session_lifecycle(state))
        html_record = active_artifacts(state, "html_report")[0]
        model_record = active_artifacts(state, "visual_report_model")[0]
        self.assertTrue({fixture.user["id"], fixture.tech["id"], model_record["id"]}
                        <= set(html_record["source_artifact_ids"]))
        for name, source in self.sources.items():
            self.assertEqual(hashlib.sha256(source["text"].encode()).hexdigest(),
                             self.provenance["sources"][name]["sha256"])

    def test_three_sourced_views_choices_nine_chapters_and_both_originals(self):
        model = self.fixture.model
        self.assertEqual(model["presentation"]["hero_states"], self.data["hero_states"])
        self.assertEqual([state["anchors"] for state in model["presentation"]["hero_states"]],
                         self.data["anchors"])
        self.assertEqual(model["presentation"]["hero_choices"], self.data["choices"])
        self.assertEqual(model["presentation"]["loop_story"], self.data["loop_story"])
        static_story = self.html.split('<ol class="static-story">', 1)[1].split(
            '<section class="reading-section chapter-', 1)[0]
        for node in model["presentation"]["loop_story"]["nodes"]:
            self.assertIn(node["text"], static_story)
            self.assertIn(node["detail"], static_story)
        for field in ["present", "future"]:
            self.assertIn(model["presentation"]["loop_story"][field]["text"], static_story)
        self.assertEqual(3, len(self.data["hero_states"]))
        self.assertEqual(9, self.html.count('<section class="reading-section chapter-'))
        for chapter in model["chapters"]:
            self.assertIn(chapter["title"], self.html)
        for kind, count in [("user", 8), ("technical", 11)]:
            for index in range(1, count + 1):
                self.assertIn('id="source-' + kind + '-' + str(index) + '"', self.html)
            encoded = base64.b64encode(self.sources[kind]["text"].encode()).decode()
            self.assertIn("data:text/markdown;base64," + encoded, self.html)
        self.assertEqual(2, self.html.count("data:text/markdown;base64,"))
        self.assertIn('<article class="reading" id="reading"', self.html)
        self.assertIn("<noscript>", self.html)
        self.assertIn("Wayfinder", self.html)
        self.assertNotIn("@@", self.html)

    def test_no_external_runtime_scripts_styles_or_asset_urls(self):
        parser = ResourceTags()
        parser.feed(self.html)
        self.assertEqual([], parser.external_scripts)
        self.assertEqual([], parser.external_styles)
        self.assertFalse(any(re.match(r"https?:|//", src) for src in parser.images))
        head = self.html.split("</head>", 1)[0]
        styles = re.findall(r"<style>(.*?)</style>", head, re.S)
        self.assertEqual(3, len(styles))
        for style in styles:
            self.assertNotRegex(style, r'url\(\s*[\'"]?(?:https?:|//|\.\./assets/)')
        self.assertIn('url("data:font/woff;base64,', styles[0])

    def test_personal_copy_is_escaped_in_html_json_and_scene_anchors(self):
        model = copy.deepcopy(self.fixture.model)
        payload = '</script><script>alert("synthetic")</script>'
        model["title"] = payload
        model["presentation"]["hero_states"][0]["description"] = payload
        model["presentation"]["hero_states"][0]["anchors"][0] = payload
        model["presentation"]["loop_story"]["nodes"][0].update(text="<img src=x>", detail=payload)
        model["presentation"]["loop_story"]["future"]["text"] = payload
        model["chapters"][0]["cards"][0]["text"] = payload
        html = render(model, self.sources)
        self.assertNotIn(payload, html)
        self.assertIn("&lt;/script&gt;", html)
        data = embedded_json(html, "report-data")
        self.assertEqual(payload, data["title"])
        self.assertEqual(payload, data["anchors"][0][0])
        self.assertEqual(payload, data["hero_states"][0]["description"])
        self.assertEqual(payload, data["loop_story"]["nodes"][0]["detail"])
        self.assertEqual(payload, data["loop_story"]["future"]["text"])
        self.assertNotIn("<img src=x>", html)
        self.assertIn("&lt;img src=x&gt;", html)
        self.assertIn(r"\u003c/script", html)

    def test_asset_digest_failure_is_detected_before_embedding(self):
        # Bypass only the cache for this tiny synthetic negative fixture; never
        # clear or refill the real process-wide 444-resource pack.
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "assets").mkdir()
            (root / "assets" / "synthetic.png").write_bytes(b"changed synthetic bytes")
            entry = {"path": "/synthetic.png", "bytes": 9,
                     "sha256": hashlib.sha256(b"original synthetic bytes").hexdigest()}
            (root / "asset-manifest.json").write_text(json.dumps([entry]))
            with patch.object(wayfinder, "ASSETS", root):
                with self.assertRaisesRegex(ValueError, "asset digest mismatch: /synthetic.png"):
                    wayfinder.packed_assets.__wrapped__()
        self.assertIs(self.cached_assets, wayfinder.packed_assets()[0])

    def test_bootstrap_blob_suffixes_decode_actual_assets_and_disable_telemetry(self):
        node = shutil.which("node")
        if not node:
            self.skipTest("Node.js unavailable for actual bootstrap behavior")
        # The smallest real file of each relevant type keeps this subprocess
        # bounded while the separate integrity test covers all 444 resources.
        suffixes = [".png", ".jpg", ".sheet", ".gltf", ".glb", ".mp4", ".ogg", ".woff", ".woff2"]
        selected = {}
        for suffix in suffixes:
            path = min((path for path in self.embedded_assets if path.endswith(suffix)),
                       key=lambda path: len(self.embedded_assets[path][1]))
            selected[path] = self.embedded_assets[path]
        program = r'''
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const packed=JSON.parse(fs.readFileSync(0,'utf8')),blobs=[];
const assets={textContent:JSON.stringify(packed),removed:false,remove(){this.removed=true}};
const story={textContent:JSON.stringify({title:'Synthetic bootstrap story',hero_states:[]})};
const loader={hidden:false},errorNotice={hidden:true},events={};
let readyEvent,initCalls=0,telemetryCalls=0,audio;
const nodes={'wayfinder-assets':assets,'report-data':story,'story-loader':loader,'story-error':errorNotice};
const document={getElementById:id=>nodes[id],
 dispatchEvent:event=>{readyEvent=event}};
const nfb=Object.fromEntries(['sendAnalytics','sendTrackingPixel','startButtonTracking','revealHeader','hideHeader']
 .map(key=>[key,()=>{telemetryCalls++}]));
const window={addEventListener(type,callback){events[type]=callback},
 parcelRequire:id=>id==='XMOu'?nfb:{audioState:{update(fn){audio=fn({muted:false})}}}};
const context=vm.createContext({window,document,Blob,Uint8Array,Symbol,
 URL:{createObjectURL(blob){blobs.push(blob);return 'blob:synthetic/'+blobs.length}},
 atob:encoded=>Buffer.from(encoded,'base64').toString('binary'),
 CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}}});
vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),context);
(async()=>{
 assert.equal(assets.removed,true);
 const engine=window[Symbol.for('wayfinder.config')];
 assert.equal(engine.autoInit,false);assert.equal(engine.nfbHeader,false);assert.equal(initCalls,0);
 for(const [index,[path,[mime,encoded]]] of Object.entries(packed).entries()){
  const url=window.WayfinderTemplate.asset(path);
  assert.ok(url.endsWith('#'+path.slice(1)),'The public AssetManager needs the original extension: '+path);
  assert.equal(/\.([^.]+)$/.exec(url)[1],path.split('.').pop());
  assert.equal(blobs[index].type,mime);
  assert.deepEqual(Buffer.from(await blobs[index].arrayBuffer()),Buffer.from(encoded,'base64'));
 }
 assert.throws(()=>window.WayfinderTemplate.asset('/absent.png'),/Missing bundled/);
 engine.init=async()=>{initCalls++;engine.world={synthetic:true};engine.Tags={synthetic:true}};
 await window.WayfinderTemplate.connect();
 assert.equal(initCalls,1);assert.equal(audio.muted,true);
 for(const callback of Object.values(nfb)) callback();
 assert.equal(telemetryCalls,0);assert.equal(readyEvent.type,'wayfinder-ready');
 assert.equal(readyEvent.detail.world,engine.world);
 events.error();assert.equal(loader.hidden,true);assert.equal(errorNotice.hidden,false);
})().catch(error=>{console.error(error);process.exitCode=1});
'''
        result = subprocess.run([node, "-e", program, str(wayfinder.ASSETS / "bootstrap.js")],
                                input=json.dumps(selected), text=True, capture_output=True,
                                timeout=20, check=False)
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)

    def _run_ui_case(self, case):
        node = shutil.which("node")
        if not node:
            self.skipTest("Node.js unavailable for UI lifecycle behavior")
        program = r'''
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(process.argv[1],'utf8');
class Element{
 constructor(tag='DIV'){this.tagName=tag;this.events={};this.children=[];this.dataset={};this.attrs={};
  this.hidden=false;this.open=false;this.textContent='';this.disabled=false;this.captured=new Set()}
 addEventListener(type,callback){(this.events[type]??=[]).push(callback)}
 emit(type,extra={}){const event={preventDefault(){},...extra};for(const cb of this.events[type]||[])cb(event)}
 setAttribute(key,value){this.attrs[key]=String(value)}removeAttribute(key){delete this.attrs[key]}
 append(...children){this.children.push(...children)}
 querySelectorAll(selector){assert.equal(selector,'button');return this.children.filter(child=>child.tagName==='BUTTON')}
 showModal(){this.open=true}close(){this.open=false;this.emit('close')}focus(){this.focused=true}
 setPointerCapture(id){this.captured.add(id)}hasPointerCapture(id){return this.captured.has(id)}
 releasePointerCapture(id){this.captured.delete(id)}
}
function setup(initialReduced=false){
 const ids=['story-surface','reading-dialog','read-report','error-read','close-reading','story-note',
  'story-kicker','story-title','story-description','story-choices','next-chapter','restart','story-instruction',
  'walk-choice','story-status','choice-detail','choice-tabs','choice-condition','choice-description',
  'pause','sound','story-loader','story-error'];
 const nodes=Object.fromEntries(ids.map(id=>[id,new Element()]));
 const chapters=[0,1,2].map(index=>{const button=new Element('BUTTON');button.dataset.chapter=String(index);return button});
 const skip=new Element('A'),media=new Element(),document=new Element(),window=new Element();
 media.matches=initialReduced;document.body=new Element('BODY');
 document.getElementById=id=>{assert.ok(nodes[id],'Unexpected node '+id);return nodes[id]};
 document.querySelector=selector=>{assert.equal(selector,'.skip');return skip};
 document.querySelectorAll=selector=>{
  if(selector==='button[data-chapter]'||selector==='[data-chapter]')return chapters;
  if(selector==='.story-bar,.story-copy,.story-footer,.story-choices')return [new Element(),new Element(),new Element(),nodes['story-choices']];
  throw Error('Unexpected selector '+selector);
 };
 document.createElement=tag=>new Element(tag.toUpperCase());
 document.createTextNode=text=>({textContent:text});
 let connectCalls=0;
 const api={paused:false,active:true,muted:true,choice:null,choiceCalls:0,
  state:{chapter:0,ready:true,biomeName:'forest',transitioning:false,loopNodeId:'trigger'},
  getState(){return {...this.state}},
  setSteering(value){this.steering=value},setInteraction(value){this.interaction=value},
  setPaused(value){this.paused=value},setActive(value){this.active=value},setMuted(value){this.muted=value},
  setChapter(value){this.state.chapter=value;document.emit('cihou:state',{detail:this.getState()})},
  setChoice(value){this.choice=value;this.choiceCalls++;this.state.chapter=2;this.state.selectedChoice=value;document.emit('cihou:state',{detail:this.getState()})},
  setExit(value){this.exit=value},reset(){this.setChapter(0)}
 };
 window.CIHOU_STORY_DATA={hero_states:[0,1,2].map(i=>({lines:['Synthetic '+i,'Synthetic second '+i],
  description:'Synthetic description '+i})),
  loop_story:{nodes:['trigger','meaning','response','relief','cost','return'].map(id=>({
   id,text:'Synthetic '+id,detail:'Only this local detail '+id,refs:['user:2']})),
   present:{text:'Synthetic shared present context',refs:['user:2']},
   past:{text:'Synthetic sourced past context',refs:['user:2']},
   future:{text:'Synthetic future context',refs:['user:5']}},
  choices:[0,1,2].map(i=>({title:'Synthetic choice '+i,condition:'Synthetic condition '+i,text:'Synthetic action '+i}))};
 window.WayfinderTemplate={connect(){connectCalls++;return Promise.resolve()}};
 vm.runInNewContext(source,{window,document,matchMedia:()=>media,innerWidth:1200,console});
 return {nodes,chapters,media,document,window,api,connects:()=>connectCalls,
  click:id=>nodes[id].emit('click'),ready:()=>document.emit('cihou:ready',{detail:api}),
  reduced(value){media.matches=value;media.emit('change')},
  note(value){nodes['story-note'].open=value;nodes['story-note'].emit('toggle')},
  choose(index){nodes['choice-tabs'].children[index].emit('click')}};
}
if(process.argv[2]==='copy'){
 const h=setup();h.ready();
 assert.equal(h.nodes['story-description'].textContent,'Only this local detail trigger');
 h.api.state.loopNodeId='meaning';
 h.document.emit('cihou:state',{detail:h.api.getState()});
 assert.equal(h.nodes['story-description'].textContent,'Only this local detail meaning',
  'Opening a node explanation must not prepend the same global context again');
 h.chapters[1].emit('click');
 assert.equal(h.nodes['story-description'].textContent,'Synthetic sourced past context');
}else if(process.argv[2]==='hold'){
 const h=setup();h.ready();const surface=h.nodes['story-surface'];
 const pointer=(type,kind='mouse',x=1200)=>surface.emit(type,{pointerType:kind,pointerId:9,button:0,clientX:x});
 pointer('pointermove');assert.equal(h.api.interaction||0,0,'Hover must not start walking');
 assert.equal(h.api.steering||0,0);
 pointer('pointerdown');
 assert.equal(h.api.interaction,1,'A pressed mouse starts the forward hold');
 assert.equal(h.api.steering||0,0,'Position must not steer backward');
 pointer('pointermove','mouse',0);assert.equal(h.api.interaction,1);
 pointer('pointerup');assert.equal(h.api.interaction,0,'Mouse release stops the hold');
 for(const event of ['pointercancel','lostpointercapture']){
  pointer('pointerdown');pointer(event);assert.equal(h.api.interaction,0,event+' must stop');
 }
 pointer('pointerdown');h.window.emit('blur');assert.equal(h.api.interaction,0);
 pointer('pointermove','touch');assert.equal(h.api.interaction,0,'Touch hover must not walk');
 pointer('pointerdown','touch');assert.equal(h.api.interaction,1);
 pointer('pointerup','touch');assert.equal(h.api.interaction,0);
 for(const key of ['ArrowLeft','ArrowRight',' ']){
  surface.emit('keydown',{key});assert.equal(h.api.interaction,1,key+' holds forward');
  assert.equal(h.api.steering||0,0,key+' never reverses the loop');
  surface.emit('keyup',{key});assert.equal(h.api.interaction,0);
 }
 assert.equal(h.api.state.chapter,0,'Holding or releasing is not an explicit chapter choice');
}else{
// Requests made during preparation must survive the eventual ready event.
const h=setup();
assert.equal(h.connects(),1);
h.click('pause');h.click('read-report');h.chapters[2].emit('click');h.choose(1);h.click('sound');
h.ready();
assert.equal(h.api.paused,true);assert.equal(h.api.active,false);
assert.equal(h.api.muted,false);assert.equal(h.api.state.chapter,2);assert.equal(h.api.choice,1);
// Each independent reading surface continues to hold the world stopped.
h.click('pause');assert.equal(h.api.paused,false);assert.equal(h.api.active,false);
h.note(true);h.click('close-reading');assert.equal(h.api.active,false,'Open note still owns the activity stop');
h.click('read-report');h.note(false);assert.equal(h.api.active,false,'Open report still owns the activity stop');
h.click('close-reading');assert.equal(h.api.active,true);
// Mid-session reduce stops the entire engine through its API, preserving copy.
h.reduced(true);
assert.equal(h.api.paused,true);assert.equal(h.api.active,false);
assert.equal(h.document.body.dataset.reduced,'true');assert.equal(h.nodes['walk-choice'].hidden,true);
const choicesBefore=h.api.choiceCalls;h.choose(2);
assert.equal(h.api.choiceCalls,choicesBefore,'Reduced preview must not initiate animated scenery');
assert.equal(h.nodes['choice-description'].textContent,'Synthetic action 2');
h.reduced(false);
assert.equal(h.api.paused,false);assert.equal(h.api.active,true);assert.equal(h.connects(),1);
assert.equal(h.api.choice,2,'Returning motion must match the visible selected choice');
assert.equal(h.nodes['walk-choice'].hidden,false);
h.chapters[0].emit('click');h.reduced(true);h.reduced(false);
assert.equal(h.api.state.chapter,0,'An old choice must not override an explicitly returned chapter');
const pendingView=setup();
pendingView.chapters[2].emit('click');pendingView.choose(1);pendingView.chapters[0].emit('click');
pendingView.ready();
assert.equal(pendingView.api.state.chapter,0,'Ready preserves the latest loading-time view');
assert.equal(pendingView.api.choice,null,'A superseded loading-time choice must not be replayed');
// Initial reduce is a usable static report and never starts the heavy engine.
const staticPage=setup(true);
assert.equal(staticPage.connects(),0);assert.equal(staticPage.nodes['story-loader'].hidden,true);
staticPage.chapters[2].emit('click');staticPage.choose(2);staticPage.click('read-report');
assert.equal(staticPage.nodes['choice-description'].textContent,'Synthetic action 2');
staticPage.reduced(false);assert.equal(staticPage.connects(),1);
staticPage.ready();
assert.equal(staticPage.api.choice,2);assert.equal(staticPage.api.state.chapter,2);
assert.equal(staticPage.api.active,false,'Reading opened before engine load still stops it');
staticPage.click('close-reading');assert.equal(staticPage.api.active,true);
}
'''
        result = subprocess.run([node, "-e", program, str(wayfinder.ASSETS / "ui.js"), case],
                                text=True, capture_output=True, timeout=15, check=False)
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)

    def test_ui_restores_loading_activity_and_reduced_motion_preferences(self):
        self._run_ui_case("lifecycle")

    def test_ui_press_hold_forward_and_release_for_mouse_touch_and_keyboard(self):
        self._run_ui_case("hold")

    def test_ui_current_node_note_uses_local_detail_without_repeating_global_context(self):
        self._run_ui_case("copy")

    def test_default_loop_story_requires_six_ordered_sourced_nodes(self):
        state = read_state(self.fixture.s)
        valid = copy.deepcopy(self.fixture.model)
        validate_model(valid, state, self.sources)
        mutations = [
            lambda model: model["presentation"].pop("loop_story"),
            lambda model: model["presentation"]["loop_story"]["nodes"].reverse(),
            lambda model: model["presentation"]["loop_story"]["nodes"][0].update(refs=["user:999"]),
        ]
        for mutate in mutations:
            model = copy.deepcopy(valid)
            mutate(model)
            with self.assertRaises(ValueError):
                validate_model(model, state, self.sources)

    def _run_adapter_case(self, case):
        node = shutil.which("node")
        if not node:
            self.skipTest("Node.js unavailable for real adapter movement checks")
        program = r'''
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const adapter=fs.readFileSync(process.argv[1],'utf8');
const runtime=fs.readFileSync(process.argv[2],'utf8');
const ids=['trigger','meaning','response','relief','cost','return'];
const story={hero_states:[0,1,2].map(i=>({lines:['Synthetic '+i,'Second '+i],description:'Synthetic '+i})),
 loop_story:{nodes:ids.map(id=>({id,text:'Synthetic '+id,detail:'Synthetic detail '+id,refs:['user:2']})),
  present:{text:'Synthetic present',refs:['user:2']},future:{text:'Synthetic future',refs:['user:5']}}};
const events={},all=[],tags={},postRenderCallbacks=[],slots=new Map();
let clockMilliseconds=0,slotDefaults={left:-80,top:800};
for(const match of adapter.matchAll(/tags\.([A-Za-z0-9_]+)/g))tags[match[1]]=match[1];
const document={hidden:false,addEventListener(type,fn){(events[type]??=[]).push(fn)},
 removeEventListener(type,fn){events[type]=(events[type]||[]).filter(item=>item!==fn)},
 dispatchEvent(event){for(const fn of events[event.type]||[])fn(event)}};
const window={CIHOU_STORY_DATA:story,matchMedia:()=>({matches:false})};
window.performance={now:()=>clockMilliseconds};
const context=vm.createContext({window,document,console,performance:window.performance,CustomEvent:class{
 constructor(type,options){this.type=type;this.detail=options.detail}}});
// Load only the shipped Three.js factory as inert source, not the game entry.
// The actual CatmullRomCurve3/Vector3 mathematics is shared with production.
const marker='"N5rp":[function(require,module,exports) {\n';
const start=runtime.indexOf(marker)+marker.length,end=runtime.indexOf('\n},{}],',start);
assert.ok(start>=marker.length&&end-start>600000,'Published Three.js module boundary');
const threeModule={exports:{}};
vm.runInContext('(function(require,module,exports){'+runtime.slice(start,end)+'\n})',context)(
 ()=>{throw Error('Unexpected Three dependency')},threeModule,threeModule.exports);
const THREE=threeModule.exports;
assert.equal(THREE.REVISION,'118');
class Entity{
 constructor(name){this.name=name;this.alive=true;this.data=new Map();all.push(this)}
 add(tag,data={}){this.data.set(tag,data);return this}
 get(tag){if(!this.data.has(tag))throw Error('Tag '+tag+' not part of Entity');return this.data.get(tag)}
 has(tag){return this.data.has(tag)}
 remove(tag){this.data.delete(tag);return this}tagOn(tag){return this.add(tag)}
 tagOff(tag){return this.remove(tag)}kill(){this.alive=false;return this}
}
const factories={};for(const id of ['OAsz','S3Ot','PA4C','LdzR','vaEW','NcCM'])factories[id]=function(){};
const systems=new Map(Object.values(factories).map(factory=>[factory,
 {enabled:true,instance:factory===factories.S3Ot?{process(){}}:function(){}}]));
const world={root:{_systemList:[...systems.values()]},
 entity:name=>new Entity(name),
 query(selector){const required=Array.isArray(selector)?selector:[selector];
  return {entities:all.filter(entity=>entity.alive&&required.every(tag=>entity.has(tag)))}},
 findEntity(selector){return this.query(selector).entities[0]||null},
 findTag(tag){const entity=this.findEntity(tag);return entity?entity.get(tag):null},
 getSystem(factory){return systems.get(factory)},
 removeSystem(factory){systems.delete(factory)},addSystem(factory){systems.set(factory,{enabled:true,instance:{process(){}}})}};
const user=new Entity('SyntheticUser').add(tags.UserTarget,{
 position:new THREE.Vector3(),direction:new THREE.Vector3(1,0,0),inputPositionOnPlane:new THREE.Vector3()});
new Entity('SyntheticInput').add(tags.InputState,{interacted:false,pressed:false});
new Entity('SyntheticZoom').add(tags.UserZoom,{distance:15,defaultDistance:15});
new Entity('SyntheticEnvironment').add(tags.EnvironmentState,{name:'forest'}).add(tags.ActiveEnvironmentState);
new Entity('SyntheticUI').add(tags.GameUIStore,{update(fn){fn({})}});
new Entity('SyntheticViewport').add(tags.AppState,{width:390,height:844});
const nativeLabel=new Entity('UnrelatedNativeLabel').add(tags.TextSprite3D,{text:'Original native label'});
// CSSStyleDeclaration serializes values; assigning a long floating-point
// transform does not promise that its getter returns the same source string.
// Model this browser boundary independently of the adapter's ownership logic.
function normalizedStyle(initialTransform){
 const style={};let stored='';
 Object.defineProperty(style,'transform',{enumerable:true,
  get(){return stored},
  set(value){
   stored=String(value).trim().replace(/([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)(px)?/gi,
    (_,numeric,unit)=>String(Number(Number(numeric).toPrecision(6)))+(unit||''))
    .replace(/,\s*/g,', ');
  }});
 style.transform=initialTransform;return style;
}
function slotFor(entity){
 if(!slots.has(entity)){
  const outer={style:normalizedStyle('translate('+slotDefaults.left+'px, '+slotDefaults.top+'px)')};
  const inner={textContent:entity.get(tags.TextSprite3D).text,style:normalizedStyle('scale(1, 1)'),layoutScale:1,
   getBoundingClientRect(){
    const match=/translate\(([-+\d.eE]+)px,\s*([-+\d.eE]+)px\)/.exec(outer.style.transform);
    assert.ok(match,'Mock native overlay keeps its translate contract');
    const left=Number(match[1]),top=Number(match[2]);
    const font=entity.get(tags.TextSprite3D).fontSize||22;
    const intrinsicWidth=260*font/22*this.layoutScale;
    const limit=parseFloat(this.style.maxWidth)||Infinity;
    const width=Math.min(intrinsicWidth,limit),lines=Math.ceil(intrinsicWidth/limit)||1;
    const height=32*font/22*this.layoutScale*lines;
    return {left,top,right:left+width,bottom:top+height,width,height};
   }};
  outer.querySelector=selector=>{assert.equal(selector,'.text-sprite-3d');return inner};
  outer.inner=inner;slots.set(entity,outer);
 }
 return slots.get(entity);
}
document.querySelectorAll=selector=>{
 assert.equal(selector,'.container.svelte-1bz0ho2 .text-sprite-3d-container');
 return world.query(tags.TextSprite3D).entities.map(slotFor);
};
const originalNativeStyles=JSON.stringify(slotFor(nativeLabel));
let engineStarted=0,engineStopped=0;
const engine={start(){engineStarted++},stop(){engineStopped++}};
window.WayfinderTemplate={world,tags,engine,setMuted(){}};
window.parcelRequire=id=>id==='N5rp'?THREE:id==='WIvJ'?{default:{}}:
 id==='smi9'?{addPostRenderCallback:callback=>postRenderCallbacks.push(callback)}:{default:factories[id]};
vm.runInContext(adapter,context,{filename:process.argv[1]});
const api=window.CihouWayfinder;
assert.equal(api.ready,true,api.error||'Adapter should initialize against its world contract');
assert.equal(postRenderCallbacks.length,1,'Reuse the native post-render registry without a new RAF');
const firstHint=world.query(tags.TextHint).entities[0];
assert.ok(firstHint);assert.equal(firstHint.has(tags.TextSprite3D),false,
 'The adapter creates TextHint before the native DOM system creates its sprite');
const move=()=>{
 clockMilliseconds+=50;
 const waiting=world.query(tags.TextHint).entities.filter(entity=>
  !entity.has(tags.TextSprite3D)&&!entity.has(tags.KillTextHint));
 world.getSystem(factories.OAsz).instance(.05);
 // Native DOMTextSystem runs after movement and deliberately starts at 14px.
 // A hint created during movement cannot have its sprite read immediately.
 for(const entity of waiting)if(entity.alive&&!entity.has(tags.TextSprite3D))
  entity.add(tags.TextSprite3D,{text:entity.get(tags.TextHint).text,fontSize:14,fontStyle:'italic',culling:true});
 for(const callback of postRenderCallbacks)callback();
};
move();assert.equal(firstHint.get(tags.TextSprite3D).fontSize,14);
move();assert.equal(firstHint.get(tags.TextSprite3D).fontSize,22,
 'Adapter styles the native sprite on a later frame, after it exists');
assert.equal(firstHint.get(tags.TextSprite3D).fontStyle,'normal');
assert.equal(firstHint.get(tags.TextSprite3D).culling,false);
const bounded=api.getState().anchorScreenBounds,firstSlot=slotFor(firstHint);
assert.ok(bounded.left>=16&&bounded.right<=374);
assert.ok(bounded.top>=80&&bounded.bottom<=844*.55+.001);
const transformed=firstSlot.style.transform;
for(const callback of postRenderCallbacks)callback();
assert.equal(firstSlot.style.transform,transformed,'A stationary frame must not accumulate clamp offsets');
assert.equal(JSON.stringify(slotFor(nativeLabel)),originalNativeStyles,'Other native text slots are untouched');
if(process.argv[3]==='startup'){
 const viewport=world.findTag(tags.AppState);
 const firstPosition=firstHint.get(tags.TextHint).position.toArray();
 function post(){
  clockMilliseconds+=1000/60;
  for(const callback of postRenderCallbacks)callback();
  const rect=firstSlot.inner.getBoundingClientRect();
  assert.ok(rect.left>=16-.002&&rect.right<=viewport.width-16+.002,
   'The actual CSSOM text box remains horizontally in bounds');
  assert.ok(rect.top>=Math.min(80,viewport.height*.18)-.002&&rect.bottom<=viewport.height*.55+.002,
   'The actual CSSOM text box remains vertically in bounds');
  assert.deepEqual(firstHint.get(tags.TextHint).position.toArray(),firstPosition);
  return rect;
 }
 const drift={};
 function stationaryRange(label,settlingFrames=0){
  for(let frame=0;frame<settlingFrames;frame++)post();
  const positions=[];
  for(let frame=0;frame<120;frame++)positions.push(post().top);
  drift[label]=Math.max(...positions)-Math.min(...positions);
  assert.ok(drift[label]<.002,
   label+' cached projection must not accumulate correction over two stationary seconds: '+drift[label]);
  return positions;
 }
 // Native projection is cached while the user stands still. Do not rewrite
 // its transform between callbacks: this is the real accumulation boundary.
 const stationary=stationaryRange('startup');
 assert.ok(Math.abs(stationary[119]-(844*.55-32))<.002,
  '14px native creation followed by 22px styling stays at the intended bottom clamp, not the top edge');
 // Late font metrics and a layout resize change dimensions without changing
 // the source overlay's cached projection.
 firstSlot.inner.layoutScale=1.15;
 stationaryRange('lateFontMetrics',120);
 viewport.width=360;viewport.height=780;
 stationaryRange('smallerViewport',120);
 firstSlot.inner.layoutScale=1;viewport.width=390;viewport.height=844;
 stationaryRange('restoredViewport',120);
 assert.ok(Math.abs(firstSlot.inner.getBoundingClientRect().top-(844*.55-32))<.002,
  'After the intentional damping settles, restored dimensions recover the original placement');
 // A later native camera projection must be recognized as a new baseline.
 // Once that camera stops, its newly cached transform must remain stable too.
 const cameraProjection='translate(90.123456789px, 380.987654321px)';
 firstSlot.style.transform=cameraProjection;
 assert.notEqual(firstSlot.style.transform,cameraProjection,'The style mock really normalizes assigned floats');
 stationaryRange('newNativeCamera',180);
 const afterCamera=post();
 assert.ok(Math.abs(afterCamera.left-90.1235)<.025&&Math.abs(afterCamera.top-380.988)<.025,
  'A camera update replaces the source baseline instead of being mistaken for another adapter correction');
 assert.equal(JSON.stringify(slotFor(nativeLabel)),originalNativeStyles);
 api.destroy();
 assert.equal(firstSlot.style.transform,normalizedStyle(cameraProjection).transform,
  'Cleanup restores the latest native camera projection');
 console.log(JSON.stringify({stationaryDrift:drift,afterCamera}));
}else if(process.argv[3]==='motion'){
 const viewport=world.findTag(tags.AppState);viewport.width=1000;viewport.height=700;
 const camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,100);
 camera.position.set(0,0,10);camera.lookAt(new THREE.Vector3());camera.updateMatrixWorld(true);
 new Entity('SyntheticCamera').add(tags.MainCamera,camera);
 new Entity('SyntheticCharacter').add(tags.UserCharacter,{position:new THREE.Vector3()});
 slotDefaults={left:0,top:280};
 function trace(fps){
  api.reset();move();move();
  const native=world.query(tags.TextHint).entities.find(entity=>!entity.has(tags.KillTextHint));
  const slot=slotFor(native),worldPosition=native.get(tags.TextHint).position.toArray();
  const result=[],startTime=clockMilliseconds;
  for(let frame=0;frame<=9*fps;frame++){
   const t=frame/fps;
   // Continuous original camera projection passes through and returns across
   // the character's screen footprint, including both collision thresholds.
   const left=t<=4?t*200:t<=5?800:(9-t)*200;
   slot.style.transform='translate('+left+'px, 280px)';
   clockMilliseconds=startTime+t*1000;
   for(const callback of postRenderCallbacks)callback();
   const bounds=api.getState().anchorScreenBounds;
   assert.ok(bounds.left>=16-.001&&bounds.right<=984+.001,'Horizontal viewport safety');
   assert.ok(bounds.top>=80-.001&&bounds.bottom<=656+.001,'Vertical viewport safety');
   result.push({t,top:bounds.top,left:bounds.left});
   assert.deepEqual(native.get(tags.TextHint).position.toArray(),worldPosition,
    'Collision avoidance adjusts typography, never the fixed world waypoint');
  }
  let turns=0,lastSign=0,maxVelocity=0;
  for(let i=1;i<result.length;i++){
   const delta=result[i].top-result[i-1].top;
   maxVelocity=Math.max(maxVelocity,Math.abs(delta)*fps);
   if(Math.abs(delta)>.015){
    const sign=Math.sign(delta);if(lastSign&&lastSign!==sign)turns++;lastSign=sign;
   }
  }
  assert.ok(Math.min(...result.map(frame=>frame.top))<255,
   'The trace actually exercises character avoidance, rather than disabling it');
  assert.ok(maxVelocity<600,'No frame may reproduce the old large collision jump: '+maxVelocity+' px/s at '+fps+'fps');
  assert.ok(turns<=3,'Two continuous passes must not produce threshold jitter: '+turns+' direction changes');
  result.metrics={fps,maxFrameDelta:maxVelocity/fps,maxVelocity,turns};
  return result;
 }
 const traces=new Map([30,60,120].map(fps=>[fps,trace(fps)]));
 let maxCrossRateDifference=0;
 for(let frame=0;frame<=9*30;frame++){
  const a=traces.get(30)[frame].top,b=traces.get(60)[frame*2].top,c=traces.get(120)[frame*4].top;
  maxCrossRateDifference=Math.max(maxCrossRateDifference,Math.max(a,b,c)-Math.min(a,b,c));
  assert.ok(Math.max(a,b,c)-Math.min(a,b,c)<2.5,
   'Same-time avoidance should be frame-rate independent near t='+frame/30+': '+[a,b,c]);
 }
 // Artificially delivering callbacks while stopped must not advance damping.
 const current=world.query(tags.TextHint).entities.find(entity=>!entity.has(tags.KillTextHint));
 const slot=slotFor(current);
 for(const [stop,resume] of [
  [()=>api.setPaused(true),()=>api.setPaused(false)],
  [()=>api.setActive(false),()=>api.setActive(true)],
  [()=>{document.hidden=true},()=>{document.hidden=false}],
 ]){
  stop();const before=JSON.stringify(slot);
  for(let i=0;i<30;i++){clockMilliseconds+=1000/60;for(const callback of postRenderCallbacks)callback()}
  assert.equal(JSON.stringify(slot),before,'Paused/reading/background text must not continue settling');
  resume();
 }
 console.log(JSON.stringify({motion:[...traces.values()].map(trace=>trace.metrics),maxCrossRateDifference}));
 api.destroy();
}else{
const visits=[];let previousVisit;
function observe(){
 const state=api.getState();
 assert.equal(state.chapter,0,'Walking never chooses another interpretation chapter');
 if(state.anchorVisit!==previousVisit){
  previousVisit=state.anchorVisit;
  assert.ok(ids.includes(state.loopNodeId),'The current native text is one of the six sourced loop nodes');
  assert.equal(state.anchorPosition.length,3);
  visits.push({id:state.loopNodeId,position:Array.from(state.anchorPosition),visit:state.anchorVisit});
 }
 return state;
}
observe();api.setInteraction(1);
let safety=0;
while(api.getState().loopTurns<2.05&&safety++<4000){move();observe()}
assert.ok(safety<4000,'Two laps must be reachable with a bounded forward hold');
assert.ok(api.getState().loopTurns>=2);
assert.deepEqual(visits.slice(0,6).map(item=>item.id),ids);
for(const id of ids){
 const repeated=visits.filter(item=>item.id===id);
 assert.ok(repeated.length>=2,'Each node must recur on the next lap: '+id);
 assert.deepEqual(repeated[0].position,repeated[1].position,'Native text returns to the same world waypoint');
}
api.setInteraction(0);for(let i=0;i<80;i++)move();
const settled=api.getState(),position=user.get(tags.UserTarget).position.clone();
const liveHints=world.query(tags.TextHint).entities.filter(entity=>{
 const text=entity.get(tags.TextHint).text;
 return !entity.has(tags.KillTextHint)&&ids.some(id=>text==='Synthetic '+id)});
assert.ok(liveHints.length>0,'Native world text remains present when stopped');
const currentHint=liveHints.find(entity=>entity.get(tags.TextHint).text==='Synthetic '+settled.loopNodeId);
assert.ok(currentHint,'Current waypoint has its own persistent native text');
assert.equal(currentHint.get(tags.TextHint).killing,false,'Native hint must not expire on a reading timer');
assert.equal(currentHint.get(tags.TextSprite3D).fontSize,22);
for(let i=0;i<400;i++)move();
assert.equal(api.getState().travel,settled.travel,'Release keeps the traveller stopped');
assert.ok(user.get(tags.UserTarget).position.distanceTo(position)<1e-10);
assert.equal(api.getState().anchorVisit,settled.anchorVisit,'Stopping does not fabricate waypoint visits');
assert.equal(currentHint.alive,true);
api.setPaused(true);api.setInteraction(1);for(let i=0;i<20;i++)move();
assert.equal(api.getState().travel,settled.travel);assert.ok(engineStopped>0);
api.setPaused(false);api.setInteraction(0);assert.ok(engineStarted>0);
api.setChapter(1);assert.equal(api.getState().chapter,1,'Only explicit navigation changes chapter');
const lastHint=world.query(tags.TextHint).entities.find(entity=>!entity.has(tags.KillTextHint));
move();move();
const lastSlot=slotFor(lastHint);
api.destroy();
assert.equal(lastSlot.style.transform,'translate(-80px, 800px)','Destroy releases the native overlay transform');
const releasedStyles=JSON.stringify(lastSlot);
for(const callback of postRenderCallbacks)callback();
assert.equal(JSON.stringify(lastSlot),releasedStyles,'A shared callback cannot keep styling a destroyed adapter');
}
'''
        result = subprocess.run([node, "-e", program, str(wayfinder.ASSETS / "adapter.js"),
                                 str(wayfinder.ASSETS / "runtime" / "wayfinder.js"), case],
                                text=True, capture_output=True, timeout=20, check=False)
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        return result.stdout

    def test_real_adapter_repeats_six_fixed_waypoints_for_two_laps_and_stops_on_release(self):
        self._run_adapter_case("loops")

    def test_real_postrender_character_pass_and_return_is_continuous_across_frame_rates(self):
        self._run_adapter_case("motion")

    def test_native_cached_startup_projection_survives_cssom_rounding_font_and_resize(self):
        self._run_adapter_case("startup")


if __name__ == "__main__":
    unittest.main()

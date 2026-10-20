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
                 "text": "One synthetic controllable action " + str(i), "refs": ["user:5"],
                 "feedback": {"mode": ["attempt", "prepare", "sustain"][i],
                              "lines": ["Synthetic step " + str(n) for n in range(3)],
                              "result": "Synthetic finite experience " + str(i)}}
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
        self.assertEqual("wayfinder-v21", self.provenance["hero"]["version"])
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
        self.assertEqual(["attempt", "prepare", "sustain"],
                         [choice["feedback"]["mode"] for choice in self.data["choices"]])
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
        model["presentation"]["hero_choices"][0]["feedback"]["result"] = payload
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
        self.assertEqual(payload, data["choices"][0]["feedback"]["result"])
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
 emit(type,extra={}){const event={target:this,currentTarget:this,preventDefault(){},...extra};for(const cb of this.events[type]||[])cb(event)}
 setAttribute(key,value){this.attrs[key]=String(value);if(key==='disabled')this.disabled=true}
 getAttribute(key){return this.attrs[key]??null}
 removeAttribute(key){delete this.attrs[key];if(key==='disabled')this.disabled=false}
 append(...children){this.children.push(...children)}
 replaceChildren(...children){this.children=[...children]}
 querySelectorAll(selector){
  assert.ok(['button','a'].includes(selector),'Unexpected element selector '+selector);
  return this.children.filter(child=>child.tagName===selector.toUpperCase());
 }
 showModal(){this.open=true}close(){this.open=false;this.emit('close')}focus(){this.focused=true}
 scrollIntoView(options){this.scrolledIntoView=options||true}
 scrollTo(options){this.scrollTop=typeof options==='object'?options.top:0}
 setPointerCapture(id){this.captured.add(id)}hasPointerCapture(id){return this.captured.has(id)}
 releasePointerCapture(id){this.captured.delete(id)}
}
function setup(initialReduced=false){
 const ids=['story-surface','reading-dialog','read-report','error-read','close-reading','story-note',
  'story-kicker','story-title','story-description','story-choices','next-chapter','restart','story-instruction',
  'choice-result','choice-replay','choice-card','story-status','choice-detail','choice-tabs','choice-condition','choice-description',
  'guide-hold','guide-title','guide-step','guide-progress','note-label','note-quote','note-help',
  'choices-heading','choice-reading-hint','collection-hint','choice-scroll','hold-label','story-guide',
  'read-after-choice','reading-entry','reading-choice-title','reading-choice-result','reading-title','reading-nav','reading-intro',
  'pause','sound','story-loader','story-error'];
 const nodes=Object.fromEntries(ids.map(id=>[id,new Element()]));
 const chapters=[0,1,2].map(index=>{const button=new Element('BUTTON');button.dataset.chapter=String(index);return button});
 const readingLinks=[1,2,3,4,5,6,7,8,9].map(index=>{
  const link=new Element('A');link.dataset.readingChapter='chapter-'+index;
  link.setAttribute('href','#chapter-'+index);link.textContent='Synthetic reading chapter '+index;
  nodes['chapter-'+index]=new Element('SECTION');return link;
 });
 nodes['reading-nav'].append(...readingLinks);
 const skip=new Element('A'),media=new Element(),document=new Element(),window=new Element();
 media.matches=initialReduced;document.body=new Element('BODY');
 document.getElementById=id=>{assert.ok(nodes[id],'Unexpected node '+id);return nodes[id]};
 document.querySelector=selector=>{assert.equal(selector,'.skip');return skip};
 document.querySelectorAll=selector=>{
  if(selector==='button[data-chapter]'||selector==='[data-chapter]')return chapters;
  if(selector==='[data-reading-chapter]'||selector==='a[data-reading-chapter]')return readingLinks;
  if(selector==='.story-bar,.story-copy,.story-choices')return [new Element(),new Element(),nodes['story-choices']];
  throw Error('Unexpected selector '+selector);
 };
 document.createElement=tag=>new Element(tag.toUpperCase());
 document.createTextNode=text=>({textContent:text});
 let connectCalls=0,runSequence=0;
 const api={paused:false,active:true,muted:true,choice:null,choiceCalls:0,
  state:{chapter:0,ready:true,biomeName:'forest',transitioning:false,loopNodeId:'trigger',beat:0,anchorVisit:0,
   interacting:false,active:true,paused:false,holdProgress:0,phase:'road',choiceRunning:false,presentationReady:false,choiceRunId:0},
  getState(){return {...this.state}},
  publish(){document.emit('cihou:state',{detail:this.getState()})},
  // The real stop API publishes synchronously before UI releases pointer
  // ownership. Keep that ordering so a release cannot fabricate a visit.
  setSteering(value){this.steering=value;if(value===0){this.state.interacting=false;this.publish()}},
  setInteraction(value){this.interaction=value;if(value===0){this.state.interacting=false;this.publish()}},
  setPaused(value){this.paused=this.state.paused=value;this.publish()},
  setActive(value){this.active=this.state.active=value;this.publish()},setMuted(value){this.muted=value},
  setChapter(value){Object.assign(this.state,{chapter:value,loopNodeId:value===0?'trigger':'anchor-0',beat:0,choiceRunId:++runSequence,
   interacting:false,selectedChoice:null,choiceRunning:false,presentationReady:false,
   holdProgress:value===0?0:1,phase:value===0?'road':value===1?'ring':'choice'});this.publish()},
  setChoice(value){this.choice=value;this.choiceCalls++;this.state.chapter=2;this.state.selectedChoice=value;
   this.state.phase='playing';this.state.choiceRunning=true;this.state.choiceRunId=++runSequence;this.state.presentationReady=false;
   document.emit('cihou:state',{detail:this.getState()})},
  setExit(value){this.exit=value},reset(){this.setChapter(0)}
 };
 window.CIHOU_STORY_DATA={hero_states:[0,1,2].map(i=>({lines:['Synthetic '+i,'Synthetic second '+i],
  description:'Synthetic description '+i,anchors:[0,1,2].map(n=>'Synthetic anchor '+i+':'+n)})),
  loop_story:{nodes:['trigger','meaning','response','relief','cost','return'].map(id=>({
   id,text:'Synthetic '+id,detail:'Only this local detail '+id,refs:['user:2']})),
   present:{text:'Synthetic shared present context',refs:['user:2']},
   past:{text:'Synthetic sourced past context',refs:['user:2']},
   future:{text:'Synthetic future context',refs:['user:5']}},
  reading_chapters:readingLinks.map((link,index)=>({id:link.dataset.readingChapter,title:link.textContent,refs:['user:'+index]})),
  choices:[0,1,2].map(i=>({title:'Synthetic choice '+i,condition:'Synthetic condition '+i,text:'Synthetic action '+i,
   feedback:{mode:['attempt','prepare','sustain'][i],lines:['First '+i,'Second '+i,'Third '+i],result:'Synthetic result '+i}}))};
 window.WayfinderTemplate={connect(){connectCalls++;return Promise.resolve()}};
 vm.runInNewContext(source,{window,document,matchMedia:()=>media,innerWidth:1200,console});
 return {nodes,chapters,media,document,window,api,connects:()=>connectCalls,
  click:id=>nodes[id].emit('click'),ready:()=>document.emit('cihou:ready',{detail:api}),
  reduced(value){media.matches=value;media.emit('change')},
  state(patch){Object.assign(api.state,patch);api.publish()},
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
 h.chapters[2].emit('click');h.choose(0);
 pointer('pointerdown');assert.equal(h.api.interaction,0,'The automatic choice does not require or accept manual hold walking');
 surface.emit('keydown',{key:' '});assert.equal(h.api.interaction,0,'Space must not manually walk chapter 2');
}else if(process.argv[2]==='guidance'){
 const h=setup();h.ready();
 const progress=()=>Number(h.nodes['guide-progress'].dataset.count);
 const total=()=>Number(h.nodes['guide-progress'].dataset.total);
 const prominent=()=>h.nodes['next-chapter'].dataset.prominent==='true';
 const pointer=(type,id=7,target='guide-hold')=>h.nodes[target].emit(type,{pointerId:id,button:0,isPrimary:true,pointerType:'mouse'});
 const visit=(id,extra={})=>h.state({loopNodeId:id,interacting:true,...extra});
 const six=['trigger','meaning','response','relief','cost','return'];
 assert.equal(progress(),0,'The initially projected sentence is not a walked node');
 assert.equal(total(),6);assert.equal(prominent(),false);
 assert.match(h.nodes['guide-hold'].textContent+h.nodes['story-instruction'].textContent,/长按|按住/,
  'The first interaction explains how to begin');
 for(const button of h.chapters){assert.equal(button.disabled,false);assert.equal(button.getAttribute('disabled'),null)}
 visit('meaning');assert.equal(progress(),0,'An unheld state event is not experience');
 pointer('pointerdown');assert.equal(h.api.interaction,1,'The visible guide button really starts walking');
 assert.equal(h.nodes['story-surface'].dataset.holding,'true');
 const heldCopy=h.nodes['guide-hold'].textContent+h.nodes['guide-step'].textContent+h.nodes['story-instruction'].textContent;
 assert.match(heldCopy,/松开|行走|走着|正在/,'Holding receives immediate feedback');
 visit('meaning',{paused:true});assert.equal(progress(),0,'Paused residual movement cannot count');
 visit('meaning',{paused:false,active:false});assert.equal(progress(),0,'An inactive world cannot count');
 h.document.hidden=true;visit('meaning',{active:true});assert.equal(progress(),0,'Background residual movement cannot count');
 h.document.hidden=false;visit('trigger',{interacting:false});assert.equal(progress(),0,'A hold without movement cannot count');
 for(const id of six){visit(id);visit(id)}
 assert.equal(progress(),6,'Each valid node is counted once');
 assert.equal(h.api.state.chapter,0,'Completing a route does not navigate');
 assert.equal(prominent(),false,'Completion still waits for a deliberate release');
 pointer('pointerup',8);assert.equal(prominent(),false,'Another pointer cannot release this hold');
 pointer('pointerup');assert.equal(h.api.interaction,0);assert.equal(prominent(),true);
 assert.equal(h.nodes['guide-progress'].dataset.complete,'true');
 h.click('next-chapter');assert.equal(h.api.state.chapter,1);assert.equal(total(),3);assert.equal(progress(),0);
 assert.equal(h.api.state.holdProgress,1,'The fixture models navigation setting this legacy value');
 assert.equal(prominent(),false,'Legacy holdProgress cannot satisfy the second chapter');
 const guide=h.nodes['guide-hold'];guide.emit('keydown',{key:' '});
 assert.equal(h.api.interaction,1,'Space on the guide button is a real hold');
 for(const id of ['anchor-0','anchor-1','anchor-2'])visit(id);
 assert.equal(progress(),3);assert.equal(prominent(),false);
 guide.emit('keyup',{key:'Enter'});assert.equal(prominent(),false,'Unrelated keyup cannot complete a space hold');
 guide.emit('keyup',{key:' '});assert.equal(prominent(),true);assert.equal(h.api.state.chapter,1);
 h.chapters[0].emit('click');assert.equal(progress(),6,'Returning preserves the first chapter coverage');
 h.chapters[1].emit('click');assert.equal(progress(),3,'Each chapter owns its own coverage');
 h.chapters[2].emit('click');h.click('restart');assert.equal(progress(),0);assert.equal(total(),6);assert.equal(prominent(),false);
 // Cancellation can stop a complete hold, but is not the user's affirmative
 // release. A new complete reading must not auto-advance on losing focus.
 for(const interruption of ['pointercancel','lostpointercapture','blur']){
  const cancelled=setup();cancelled.ready();
  const button=cancelled.nodes['guide-hold'];button.emit('pointerdown',{pointerId:3,button:0,isPrimary:true});
  for(const id of six)cancelled.state({loopNodeId:id,interacting:true});
  button.emit(interruption,{pointerId:3});
  assert.notEqual(cancelled.nodes['next-chapter'].dataset.prominent,'true',interruption+' is not a deliberate release');
  assert.equal(cancelled.api.state.chapter,0);
 }
 const enter=setup();enter.ready();enter.nodes['guide-hold'].emit('keydown',{key:'Enter'});
 assert.equal(enter.api.interaction,1,'Enter is available on the explicit hold button');
 enter.nodes['guide-hold'].emit('keyup',{key:'Enter'});assert.equal(enter.api.interaction,0);
 const skip=setup();skip.ready();skip.chapters[2].emit('click');
 assert.equal(skip.api.state.chapter,2,'The top navigation remains available before completing either hold');
}else if(process.argv[2]==='card-reading'){
 const h=setup();h.ready();h.chapters[2].emit('click');
 assert.equal(h.nodes['read-after-choice'].hidden,true,'The card CTA waits for a completed result');
 h.choose(0);assert.equal(h.api.choiceCalls,1);assert.equal(h.nodes['read-after-choice'].hidden,true);
 h.state({phase:'done',choiceRunning:false,presentationReady:true});
 assert.equal(h.nodes['read-after-choice'].hidden,false,'One completed card is sufficient to enter the full report');
 const card=h.nodes['choice-card'].textContent;
 h.nodes['reading-dialog'].scrollTop=950;h.click('read-after-choice');
 assert.equal(h.nodes['reading-dialog'].open,true);assert.equal(h.api.active,false);
 assert.equal(h.nodes['reading-dialog'].scrollTop,0,'Entering from a card starts with its report context');
 assert.equal(h.nodes['reading-entry'].hidden,false);
 assert.ok(h.nodes['reading-choice-title'].textContent.includes('Synthetic choice 0'));
 assert.ok(h.nodes['reading-choice-result'].textContent.includes('Synthetic result 0'));
 assert.equal(h.api.choiceCalls,1,'Reading is not another playback request');
 h.click('close-reading');
 assert.equal(h.nodes['reading-dialog'].open,false);assert.equal(h.api.active,true);
 assert.equal(h.nodes['choice-card'].textContent,card,'Closing returns to the same card');
 assert.equal(h.nodes['choice-tabs'].children[0].attrs['aria-pressed'],'true');
 assert.equal(h.api.choiceCalls,1,'Returning to the card does not replay it');
 h.choose(1);h.state({phase:'done',choiceRunning:false,presentationReady:true});h.click('read-after-choice');
 assert.ok(h.nodes['reading-choice-title'].textContent.includes('Synthetic choice 1'));
 assert.ok(h.nodes['reading-choice-result'].textContent.includes('Synthetic result 1'));
 assert.equal(h.nodes['reading-choice-result'].textContent.includes('Synthetic result 0'),false,'A later card replaces stale reading context');
 h.click('close-reading');h.click('restart');h.click('read-report');
 assert.equal(h.nodes['reading-entry'].hidden,true,'Restart clears the selected-card reading context');
 for(const kind of ['reduced','failed']){
  const fallback=setup(kind==='reduced');
  if(kind==='failed')fallback.document.emit('cihou:error',{detail:new Error('Synthetic unavailable WebGL')});
  fallback.chapters[2].emit('click');fallback.choose(2);
  assert.equal(fallback.nodes['read-after-choice'].hidden,false,kind+' still provides the complete-report CTA');
  fallback.click('read-after-choice');assert.equal(fallback.nodes['reading-dialog'].open,true);
  assert.ok(fallback.nodes['reading-choice-title'].textContent.includes('Synthetic choice 2'));
  assert.ok(fallback.nodes['reading-choice-result'].textContent.includes('Synthetic result 2'));
  assert.equal(fallback.api.choiceCalls,0,'Static access never waits for WebGL or starts motion');
 }
}else if(process.argv[2]==='collection'){
 const h=setup();h.ready();h.chapters[2].emit('click');
 const count=()=>Number(h.nodes['story-choices'].dataset.collectedCount);
 const buttons=h.nodes['choice-tabs'].children;
 assert.equal(count(),0);
 for(let index=0;index<3;index++){
  const before=h.api.choiceCalls;h.nodes['choice-scroll'].scrollTop=420;h.choose(index);
  assert.equal(h.nodes['choice-scroll'].scrollTop,0,'A newly selected route starts with its card area in view');
  assert.equal(h.api.choiceCalls,before+1,'Each unknown card starts one experience');
  assert.equal(buttons[index].dataset.collected,'false','Starting a route does not collect its card');
  h.state({phase:'done',choiceRunning:false,presentationReady:true,transitioning:false});
  assert.equal(count(),index+1,'A matching complete result collects exactly one card');
  assert.equal(buttons[index].dataset.collected,'true');
  assert.equal(buttons[index].dataset.collectState,'collected');
  assert.equal(h.nodes['read-after-choice'].hidden,false,'A first card already permits complete reading');
  if(index<2)assert.ok(h.nodes['collection-hint'].textContent.trim(),
   'After a card the interface explains how to find the remaining choices');
 }
 const before=h.api.choiceCalls;
 for(const index of [0,2,1,0]){
  h.nodes['choice-scroll'].scrollTop=420;h.choose(index);
  assert.equal(h.nodes['choice-scroll'].scrollTop,0,'Opening a collected card resets its scroll position');
  assert.equal(h.api.choiceCalls,before,'Collected items open their card without replay');
  assert.equal(h.nodes['choice-result'].textContent,'Synthetic result '+index);
  assert.equal(h.nodes['choice-card'].textContent,'First '+index+'\nSecond '+index+'\nThird '+index);
  assert.equal(h.nodes['read-after-choice'].hidden,false);
 }
 h.chapters[0].emit('click');h.chapters[2].emit('click');assert.equal(count(),3,'Chapter navigation keeps the page collection');
 h.click('restart');h.chapters[2].emit('click');assert.equal(count(),3,'Restarting the walk keeps cards already obtained');
 h.choose(2);assert.equal(h.api.choiceCalls,before,'A card remains independently accessible after restart');
 const fresh=setup();fresh.ready();fresh.chapters[2].emit('click');
 assert.equal(Number(fresh.nodes['story-choices'].dataset.collectedCount),0,'A new page experience starts a new collection');
 fresh.choose(0);assert.equal(fresh.api.choiceCalls,1);
}else if(process.argv[2]==='collection-races'){
 const h=setup();h.ready();h.chapters[2].emit('click');
 const count=()=>Number(h.nodes['story-choices'].dataset.collectedCount);
 const buttons=h.nodes['choice-tabs'].children;
 h.choose(0);const obsoleteA=h.api.getState();h.choose(0);
 assert.equal(h.api.choiceCalls,1,'Repeated clicks on the active unknown item do not restart it');
 assert.equal(h.api.getState().choiceRunId,obsoleteA.choiceRunId);
 h.choose(1);
 assert.equal(count(),0,'Leaving an unfinished route does not collect it');
 h.document.emit('cihou:state',{detail:{...obsoleteA,phase:'done',choiceRunning:false,presentationReady:true}});
 assert.equal(count(),0,'A superseded completion cannot collect either route');
 assert.equal(buttons[0].dataset.collected,'false');assert.equal(buttons[1].dataset.collected,'false');
 assert.equal(h.nodes['read-after-choice'].hidden,true,'An obsolete result does not unlock the current result card');
 const current=h.api.getState();
 for(const premature of [{phase:'settling',choiceRunning:false},
  {phase:'done',choiceRunning:true},{phase:'done',choiceRunning:false,transitioning:true}]){
  h.document.emit('cihou:state',{detail:{...current,presentationReady:true,...premature}});
  assert.equal(count(),0,'Incomplete or covered feedback cannot enter the collection');
 }
 h.state({phase:'done',choiceRunning:false,presentationReady:true,transitioning:false});
 assert.equal(count(),1);assert.equal(buttons[1].dataset.collected,'true');
 h.choose(0);const unfinishedA=h.api.getState(),calls=h.api.choiceCalls;
 assert.equal(h.api.state.choiceRunning,true);
 h.choose(1);
 assert.equal(h.api.choiceCalls,calls,'Reading an obtained card does not replay it');
 assert.equal(h.api.state.choiceRunning,false,'Reading an obtained card cancels the unfinished other route');
 assert.equal(h.nodes['choice-result'].textContent,'Synthetic result 1');
 h.document.emit('cihou:state',{detail:{...unfinishedA,phase:'done',choiceRunning:false,presentationReady:true}});
 assert.equal(count(),1,'A cancelled late completion cannot silently collect the other card');
 assert.equal(buttons[0].dataset.collected,'false');
 assert.equal(h.nodes['choice-result'].textContent,'Synthetic result 1','A late event cannot replace the card being read');
 h.choose(0);assert.equal(h.api.choiceCalls,calls+1,'The unfinished card still requires its own first complete experience');
 h.choose(1);const beforeReplay=h.api.choiceCalls;
 h.click('choice-replay');assert.equal(h.api.choiceCalls,beforeReplay+1,'Only explicit replay replays an obtained card');
 assert.equal(h.api.choice,1);assert.equal(count(),1,'Replay neither removes nor duplicates the saved card');
 const replay=h.api.getState();h.choose(1);
 assert.equal(h.api.choiceCalls,beforeReplay+1,'Clicking the collected tab during replay still opens its saved card');
 assert.equal(h.api.state.choiceRunning,false,'Selecting the collected tab cancels its optional replay and reads the saved card');
 h.document.emit('cihou:state',{detail:{...replay,phase:'done',choiceRunning:false,presentationReady:true}});
 assert.equal(count(),1);assert.equal(h.nodes['choice-result'].textContent,'Synthetic result 1');
 h.click('choice-replay');assert.equal(h.api.choiceCalls,beforeReplay+2);
 h.state({phase:'done',choiceRunning:false,presentationReady:true,transitioning:false});assert.equal(count(),1);
}else if(process.argv[2]==='collection-static'){
 for(const kind of ['reduced','failed']){
  const h=setup(kind==='reduced');
  if(kind==='failed')h.document.emit('cihou:error',{detail:new Error('Synthetic unavailable WebGL')});
  h.chapters[2].emit('click');
  for(let index=0;index<3;index++){
   h.choose(index);
   assert.equal(Number(h.nodes['story-choices'].dataset.collectedCount),index+1,
    kind+' collects only the selected readable static result');
   assert.equal(h.api.choiceCalls,0);
   assert.equal(h.nodes['read-after-choice'].hidden,false);
  }
  h.choose(0);assert.equal(h.nodes['choice-result'].textContent,'Synthetic result 0');
  assert.equal(h.api.choiceCalls,0,'Static card browsing requires no engine');
 }
 const h=setup();h.ready();h.chapters[2].emit('click');h.choose(1);h.reduced(true);
 assert.equal(Number(h.nodes['story-choices'].dataset.collectedCount),1,'Mid-run static fallback can preserve its readable result');
 const calls=h.api.choiceCalls;h.reduced(false);h.choose(1);
 assert.equal(h.api.choiceCalls,calls,'Restoring motion does not replay a static card already obtained');
 const failed=setup();failed.ready();failed.chapters[2].emit('click');failed.choose(2);
 failed.document.emit('cihou:error',{detail:new Error('Synthetic mid-run rendering failure')});
 assert.equal(Number(failed.nodes['story-choices'].dataset.collectedCount),1,'A readable failure fallback belongs to its selected card');
 const failedCalls=failed.api.choiceCalls;failed.choose(2);assert.equal(failed.api.choiceCalls,failedCalls);
}else if(process.argv[2]==='choice'){
 const h=setup();h.ready();h.chapters[2].emit('click');
 h.choose(1);assert.equal(h.api.choiceCalls,1,'One click starts exactly one finite experience');
 assert.equal(h.api.choice,1);assert.equal(h.nodes['choice-description'].textContent,'Synthetic action 1');
 for(let i=0;i<3;i++)h.document.emit('cihou:state',{detail:h.api.getState()});
 assert.equal(h.api.choiceCalls,1,'Rendering playback progress must never issue another playback request');
 h.api.state.transitioning=true;h.choose(2);
 assert.equal(h.api.choiceCalls,2,'A new click during transition must reach the adapter queue');
 h.api.state.transitioning=false;h.api.state.phase='done';h.api.state.choiceRunning=false;h.api.state.presentationReady=true;
 h.document.emit('cihou:state',{detail:h.api.getState()});
 assert.equal(h.nodes['choice-result'].textContent,'Synthetic result 2');
 assert.equal(h.nodes['choice-card'].textContent,'First 2\nSecond 2\nThird 2');
 assert.equal(h.api.choiceCalls,2,'Completing an effect must not replay it');
 h.click('choice-replay');assert.equal(h.api.choiceCalls,3,'Only an explicit optional replay issues another request');
 const failed=setup();failed.document.emit('cihou:error',{detail:new Error('Synthetic no WebGL')});
 failed.chapters[2].emit('click');failed.choose(0);
 assert.equal(failed.nodes['choice-result'].textContent,'Synthetic result 0','An unavailable engine retains the same result copy');
 assert.equal(failed.api.choiceCalls,0);
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
assert.equal(h.document.body.dataset.reduced,'true');
const choicesBefore=h.api.choiceCalls;h.choose(2);
assert.equal(h.api.choiceCalls,choicesBefore,'Reduced feedback must not initiate animated scenery');
assert.equal(h.nodes['choice-description'].textContent,'Synthetic action 2');
assert.equal(h.nodes['choice-result'].textContent,'Synthetic result 2');
h.reduced(false);
assert.equal(h.api.paused,false);assert.equal(h.api.active,true);assert.equal(h.connects(),1);
assert.equal(h.api.choiceCalls,choicesBefore,'Restoring motion must not replay an already read static result');
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
assert.equal(staticPage.nodes['choice-result'].textContent,'Synthetic result 2');
staticPage.reduced(false);assert.equal(staticPage.connects(),1);
staticPage.ready();
assert.equal(staticPage.api.choiceCalls,0,'Initial static feedback remains completed when the engine becomes available');
assert.equal(staticPage.api.state.chapter,2);
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

    def test_ui_choice_click_plays_once_state_events_do_not_replay_and_failure_keeps_result(self):
        self._run_ui_case("choice")

    def test_ui_two_hold_chapters_count_real_nodes_and_offer_next_only_after_release(self):
        self._run_ui_case("guidance")

    def test_ui_one_result_card_enters_full_reading_and_returns_without_replay(self):
        self._run_ui_case("card-reading")

    def test_ui_collected_cards_open_independently_and_survive_navigation_and_restart(self):
        self._run_ui_case("collection")

    def test_ui_incomplete_or_obsolete_results_cannot_collect_and_only_replay_replays(self):
        self._run_ui_case("collection-races")

    def test_ui_static_and_failed_results_collect_without_animated_playback(self):
        self._run_ui_case("collection-static")

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

    def test_v20_choices_require_complete_distinct_sourced_feedback(self):
        state = read_state(self.fixture.s)
        valid = copy.deepcopy(self.fixture.model)
        validate_model(valid, state, self.sources)
        mutations = [
            (lambda choices: choices[0].pop('feedback'), 'requires feedback'),
            (lambda choices: choices[0]['feedback'].update(mode='success'), 'feedback mode'),
            (lambda choices: choices[0]['feedback'].update(mode=[]), 'feedback mode'),
            (lambda choices: choices[1]['feedback'].update(mode='attempt'), 'each feedback mode once'),
            (lambda choices: choices[0]['feedback']['lines'].pop(), 'three short lines'),
            (lambda choices: choices[0]['feedback']['lines'].__setitem__(1, ' '), 'three short lines'),
            (lambda choices: choices[0]['feedback']['lines'].__setitem__(1, '文' * 33), 'three short lines'),
            (lambda choices: choices[0]['feedback'].update(result=' '), 'feedback result'),
            (lambda choices: choices[0].update(refs=['user:999']), 'section references'),
        ]
        for mutate, message in mutations:
            model = copy.deepcopy(valid)
            mutate(model['presentation']['hero_choices'])
            with self.subTest(message=message), self.assertRaisesRegex(ValueError, message):
                validate_model(model, state, self.sources)

    def test_v20_choices_remain_optional_and_historical_models_need_no_feedback(self):
        state = read_state(self.fixture.s)
        model = copy.deepcopy(self.fixture.model)
        model['presentation']['hero_choices'] = []
        validate_model(model, state, self.sources)
        model['presentation'].pop('hero_choices')
        validate_model(model, state, self.sources)
        for runtime in ['wayfinder-v16', 'wayfinder-v17', 'wayfinder-v18', 'wayfinder-v19', 'paper-v15']:
            model = copy.deepcopy(self.fixture.model)
            model['presentation']['hero_runtime'] = runtime
            for choice in model['presentation']['hero_choices']:
                choice.pop('feedback')
            with self.subTest(runtime=runtime):
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
if(process.argv[3]==='choice-panel'){
 // Reuse the actual projected native hint, including late font metrics and
 // CSSOM serialization. The fixture describes visible controls, not the
 // adapter's intended clamp arithmetic.
 story.choices=[0,1,2].map(index=>({title:'Synthetic choice '+index,
  feedback:{mode:['attempt','prepare','sustain'][index],
   lines:['Synthetic finite first sentence','Synthetic finite second sentence','Synthetic finite final sentence']}}));
 world.findTag(tags.EnvironmentState).name='grasslands';
 api.setChapter(2);api.setChoice(1);move();move();
 assert.equal(api.getState().choiceMode,'prepare');
 let panelRect={left:780,top:160,right:1180,bottom:760},guideRect=null,copyRect=null;
 document.querySelector=selector=>{
  if(selector==='#story-choices')return {getBoundingClientRect:()=>panelRect};
  if(selector==='#story-guide')return guideRect?{getBoundingClientRect:()=>guideRect}:null;
  if(selector==='.story-copy')return copyRect?{getBoundingClientRect:()=>copyRect}:null;
  throw Error('Unexpected visible-control selector '+selector);
 };
 const viewport=world.findTag(tags.AppState);
 function currentHint(){return world.query(tags.TextHint).entities.find(entity=>!entity.has(tags.KillTextHint))}
 function checkVisible(label,left,top,headerBottom,largeText=false){
  const native=currentHint(),slot=slotFor(native),position=native.get(tags.TextHint).position.toArray();
  slot.inner.layoutScale=largeText?2.2:1;
  // Native projection may land behind the panel or above the title area.
  // Every rendered frame must remain readable, including a cached projection.
  slot.style.transform='translate('+left+'px, '+top+'px)';
  for(let frame=0;frame<120;frame++){
   clockMilliseconds+=1000/60;for(const callback of postRenderCallbacks)callback();
   const rect=slot.inner.getBoundingClientRect();
   assert.ok(rect.left>=16-.002&&rect.right<=viewport.width-16+.002,label+' remains inside the viewport');
   assert.ok(rect.top>=headerBottom+10-.002,label+' clears the fixed title controls');
   if(viewport.width>700)assert.ok(rect.right<=panelRect.left-12+.002,label+' clears the right choice panel');
   else assert.ok(rect.bottom<=panelRect.top-12+.002,label+' clears the lower choice panel');
   assert.deepEqual(native.get(tags.TextHint).position.toArray(),position,
    'Panel avoidance moves only the projected typography, never its route landmark');
  }
 }
 viewport.width=1200;viewport.height=800;
 checkVisible('Desktop prepare playback',930,340,148);
 checkVisible('Desktop high camera projection',900,20,148);
 viewport.width=390;viewport.height=844;panelRect={left:16,top:410,right:374,bottom:820};
 checkVisible('Narrow prepare playback with longer metrics',240,650,132,true);
 checkVisible('Narrow high camera projection',40,12,132,true);
 let safety=0;while(api.getState().phase!=='done'&&safety++<800)move();
 assert.equal(api.getState().phase,'done','The same placement rule covers the finished result card');
 viewport.width=1200;viewport.height=800;panelRect={left:620,top:150,right:1180,bottom:770};
 checkVisible('Larger desktop result card',930,360,148);
 viewport.width=390;viewport.height=844;panelRect={left:16,top:360,right:374,bottom:830};
 checkVisible('Larger narrow result card',230,650,132,true);
 // The same real callback must leave the explicit hold guide usable and,
 // on narrow screens, keep the world phrase below the fixed explanation.
 api.setChapter(0);move();move();
 function checkGuide(left,top){
  const native=currentHint(),slot=slotFor(native),position=native.get(tags.TextHint).position.toArray();
  slot.style.transform='translate('+left+'px, '+top+'px)';
  for(let frame=0;frame<120;frame++){
   clockMilliseconds+=1000/60;for(const callback of postRenderCallbacks)callback();
   const rect=slot.inner.getBoundingClientRect();
   assert.ok(rect.bottom<=guideRect.top-12+.002,'The projected phrase clears the hold guide');
   if(viewport.width<=700)assert.ok(rect.top>=copyRect.bottom+12-.002,
    'The narrow world phrase clears the heading and explanation');
   assert.deepEqual(native.get(tags.TextHint).position.toArray(),position,'Guidance does not move the world landmark');
  }
 }
 viewport.width=1200;viewport.height=800;guideRect={top:650};copyRect={bottom:240};
 checkGuide(300,720);
 api.setChapter(1);move();move();
 viewport.width=390;viewport.height=844;guideRect={top:430};copyRect={bottom:230};
 checkGuide(40,110);checkGuide(40,700);
 assert.equal(JSON.stringify(slotFor(nativeLabel)),originalNativeStyles,'The original unrelated label is not reflowed');
 api.destroy();
}else if(process.argv[3]==='startup'){
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

    def test_prepare_projected_text_clears_choice_controls_and_the_result_card(self):
        self._run_adapter_case("choice-panel")

    def test_native_cached_startup_projection_survives_cssom_rounding_font_and_resize(self):
        self._run_adapter_case("startup")


if __name__ == "__main__":
    unittest.main()

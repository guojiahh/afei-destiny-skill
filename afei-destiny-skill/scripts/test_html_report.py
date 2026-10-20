"""Synthetic-only regression coverage for personal HTML delivery and source lineage."""
import copy
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import unittest
from consultation_harness import (HarnessError, initialize_session, register_artifact, transition_stage,
    read_state, session_lifecycle, supersede, audit_state, active_artifacts, write_state)
from consultation_output_router import build_output_plan
from generate_html_report import (generate, load_sources, validate_model, render, markdown,
    init_model, MOBIUS_CHAPTERS, ASSETS, sections, PLACEHOLDER)
from validate_final_report import REQUIRED_HEADINGS

class HtmlReportTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.s=Path(self.tmp.name)/'session'
        self.state=initialize_session(self.s,'focused','synthetic')
        # Historical models remain checkable after the default template changes.
        self.state.pop('report_template');write_state(self.s,self.state)
        chart=self.reg('chart_facts','chart.json','{}',['operational_input'])
        self.move('chart_ready')
        lock=self.reg('chart_lock','lock.md','synthetic',['chart_fact'],[chart['id']])
        self.move('deep_dive')
        deep=self.reg('deep_dive','deep.md','synthetic',['biography'],[lock['id']])
        self.move('report_ready')
        text='# Synthetic user report\n\n'+''.join(h+'\n\n'+('### 现实中的具体场景\n\nA conditional example.\n\n### 心结收束\n\nAgency.\n\n' if i==1 else 'Synthetic evidence.\n\n') for i,h in enumerate(REQUIRED_HEADINGS))+'[technical](technical_analysis.md)\n'
        self.user=self.reg('markdown_report','final_report.md',text,['prior_output'],[deep['id']])
        self.tech=self.reg('technical_report','technical_analysis.md','# Synthetic technical\n\n## Method\n\nDeclared assumptions.\n\n## Limits\n\nUnverified.\n',['prior_output'],[lock['id']])
        self.model={'schema_version':1,'session_id':self.state['session_id'],'sources':{k:{'artifact_id':a['id'],'sha256':a['sha256']} for k,a in [('user',self.user),('technical',self.tech)]},'title':'Synthetic report','subtitle':'A sourced explanation','closing':'An open question','technical_intro':'Methods and uncertainty','technical_cards':[{'title':'Method','text':'Declared uncertainty','refs':['technical:1']}],'limits':'No guaranteed outcome',
          'diagram':{'type':'threshold','nodes':[{'id':n,'label':n,'kind':kind,'title':n,'text':'Supported text','refs':['user:2']} for n,kind in [('past','fact'),('present','hypothesis'),('action','action')]],'edges':[{'from':'past','to':'present','kind':'hypothesis','refs':['user:2']}],'tour':['past','present','action']},
          'chapters':[{'title':'Chapter '+str(i),'lead':'Lead','layout':'story','cards':[{'title':'Point','text':'Supported point','refs':['user:2']}],'covers':covers} for i,covers in enumerate([['user:1','user:2'],['user:3','user:4','user:5'],['user:6','user:7','user:8']])]}
        self.model_path=self.s/'model.json';self.out=self.s/'final_report.html';self.save()
    def tearDown(self):self.tmp.cleanup()
    def save(self):self.model_path.write_text(json.dumps(self.model))
    def move(self,to):transition_stage(self.s,self.state,to,operator_override=False,reason=None)
    def reg(self,kind,name,text,cats,parents=()):
        p=self.s/name;p.write_text(text)
        return register_artifact(self.s,self.state,kind=kind,path=p,source_categories=cats,source_artifact_ids=parents)
    def test_completion_requires_registered_html_and_model(self):
        self.assertEqual('html',self.state['delivery_format'])
        self.assertEqual('unfinished',session_lifecycle(self.state))
        generate(self.s,self.model_path,self.out)
        self.assertEqual('unfinished',session_lifecycle(read_state(self.s)))
        generate(self.s,self.model_path,self.out,register=True)
        state=read_state(self.s)
        self.assertEqual('complete',session_lifecycle(state));self.assertEqual([],audit_state(self.s,state))
        self.assertTrue(generate(self.s,self.model_path,self.out,check=True)['ok'])
        plan=build_output_plan(state,'html_report')
        self.assertEqual({'markdown_report','technical_report','visual_report_model'},{a['kind'] for a in plan['selected_artifacts']})
    def test_report_supersession_invalidates_html_and_completion(self):
        generate(self.s,self.model_path,self.out,register=True);state=read_state(self.s)
        supersede(self.s,state,scope=None,artifact_ids=[self.user['id']],reason='synthetic correction')
        self.assertFalse(active_artifacts(state,'html_report'));self.assertFalse(active_artifacts(state,'visual_report_model'))
        self.assertEqual('unfinished',session_lifecycle(state))
        with self.assertRaises(HarnessError):generate(self.s,self.model_path,self.out,check=True)
    def test_cross_session_model_is_rejected_without_writes(self):
        self.model['session_id']='another-session';self.save()
        with self.assertRaisesRegex(HarnessError,'another session'):generate(self.s,self.model_path,self.out,register=True)
        self.assertFalse(self.out.exists());self.assertFalse(active_artifacts(read_state(self.s),'visual_report_model'))
    def test_source_tampering_is_rejected(self):
        (self.s/'final_report.md').write_text('changed')
        with self.assertRaisesRegex(HarnessError,'audit failed'):generate(self.s,self.model_path,self.out)
    def test_stale_model_hash_is_rejected(self):
        self.model['sources']['technical']['sha256']='old';self.save()
        with self.assertRaisesRegex(HarnessError,'stale'):generate(self.s,self.model_path,self.out)
    def test_missing_or_duplicate_section_coverage_is_rejected(self):
        for covers in [[],['user:1','user:2','user:2']]:
            self.model['chapters'][0]['covers']=covers;self.save()
            with self.assertRaisesRegex(HarnessError,'exactly once'):generate(self.s,self.model_path,self.out)
    def test_edge_and_external_future_narration_validation(self):
        original=copy.deepcopy(self.model)
        self.model['diagram']['edges'][0]['to']='missing';self.save()
        with self.assertRaisesRegex(HarnessError,'unknown node'):generate(self.s,self.model_path,self.out)
        self.model=original;self.model['diagram']['nodes'][-1]['kind']='condition';self.save()
        with self.assertRaisesRegex(HarnessError,'external responses'):generate(self.s,self.model_path,self.out)
    def test_html_and_script_injection_are_inert(self):
        payload='</script><script>alert(1)</script><img src=x onerror=alert(1)>'
        self.model['title']=payload;self.model['diagram']['nodes'][0]['text']=payload;self.save()
        generate(self.s,self.model_path,self.out)
        result=self.out.read_text();self.assertNotIn(payload,result)
        self.assertIn('\\u003c/script',result);self.assertIn('&lt;img',result)
        self.assertNotIn('href="javascript:',markdown('[bad](javascript:alert(1))'))
    def test_registration_rejects_arbitrary_html_and_missing_parents(self):
        sources=[self.user['id'],self.tech['id']]
        model_art=register_artifact(self.s,self.state,kind='visual_report_model',path=self.model_path,source_categories=['prior_output'],source_artifact_ids=sources)
        self.out.write_text('<html>incomplete</html>')
        with self.assertRaisesRegex(HarnessError,'does not match'):register_artifact(self.s,self.state,kind='html_report',path=self.out,source_categories=['prior_output'],source_artifact_ids=sources+[model_art['id']])
        with self.assertRaisesRegex(HarnessError,'both current reports'):register_artifact(self.s,self.state,kind='html_report',path=self.out,source_categories=['prior_output'],source_artifact_ids=[model_art['id']])
    def test_preserves_original_reports_and_embeds_every_section(self):
        before=[(self.s/n).read_bytes() for n in ['final_report.md','technical_analysis.md']]
        generate(self.s,self.model_path,self.out)
        text=self.out.read_text()
        for key,count in [('user',8),('technical',2)]:
            for i in range(1,count+1):self.assertIn(f'id="source-{key}-{i}"',text)
        self.assertEqual(before,[(self.s/n).read_bytes() for n in ['final_report.md','technical_analysis.md']])
        self.assertEqual(2,text.count('data:text/markdown;base64,'))
    def test_legacy_markdown_delivery_and_explicit_markdown_remain_supported(self):
        self.state.pop('delivery_format');self.assertEqual('complete',session_lifecycle(self.state))
        self.state['delivery_format']='markdown';self.assertEqual('complete',session_lifecycle(self.state))
        self.state['artifacts']=[a for a in self.state['artifacts'] if a['kind']!='technical_report']
        self.assertEqual('unfinished',session_lifecycle(self.state))
    def test_second_person_and_sparse_node_counts_do_not_receive_first_person_content(self):
        self.model['title']='Another synthetic situation';self.model['diagram']['type']='sparse'
        self.model['diagram']['nodes']=self.model['diagram']['nodes'][:2]
        self.model['diagram']['edges']=[];self.model['diagram']['tour']=['past'];self.save()
        generate(self.s,self.model_path,self.out)
        text=self.out.read_text();self.assertIn('Another synthetic situation',text)
        self.assertNotIn('Synthetic report',text);self.assertNotIn('林舟',text)
        self.assertNotIn('"id":"action"',text)

    def quiet(self):
        self.model['diagram']['type']='loop'
        self.model['presentation']={'style':'quiet-v1','hero_runtime':'paper-v15','hero_states':[
            {'lines':['Synthetic','state '+str(i)],'description':'State description '+str(i),
             'hint':'State hint','label':'Scene action','node_id':node,'refs':['user:2']}
            for i,node in enumerate(['past','present','action'])]}
        self.save()

    def test_quiet_delivery_contains_sources_downloads_and_personalized_states(self):
        import base64
        self.quiet()
        generate(self.s,self.model_path,self.out,register=True)
        self.assertTrue(generate(self.s,self.model_path,self.out,check=True)['ok'])
        state=read_state(self.s)
        self.assertEqual('complete',session_lifecycle(state))
        self.assertEqual([],audit_state(self.s,state))
        result=self.out.read_text()
        for source in ['final_report.md','technical_analysis.md']:
            encoded=base64.b64encode((self.s/source).read_bytes()).decode()
            self.assertIn('data:text/markdown;base64,'+encoded,result)
        for key,count in [('user',8),('technical',2)]:
            for i in range(1,count+1):self.assertIn(f'id="source-{key}-{i}"',result)
        self.assertNotIn('href="#source-',result)
        self.assertIn('id="hero-scene-runtime"', result)
        self.assertIn('id="hero-rig-runtime"', result)
        self.assertIn('The MIT License', result)
        self.assertNotIn('id="girl-frames"', result)
        self.assertNotIn('CC0-1.0', result)
        self.assertIn('State description 2',result)
        self.assertIn('<noscript>',result)

    def test_quiet_inlines_selected_artwork_and_records_exact_asset_hashes(self):
        import base64
        from render_quiet_report import ASSETS as QUIET_ASSETS, HERO_BUNDLE
        self.quiet();generate(self.s,self.model_path,self.out)
        result=self.out.read_text()
        def script_json(identifier):
            return json.loads(re.search(r'<script id="'+identifier+r'" type="application/json">(.*?)</script>',result,re.S)[1])
        assets=script_json('hero-assets');provenance=script_json('report-provenance')
        self.assertEqual(HERO_BUNDLE['constructor'],assets['constructor'])
        self.assertEqual(HERO_BUNDLE['version'],assets['version'])
        self.assertEqual(HERO_BUNDLE.get('rig_constructor','CihouCharacterRig'),assets['rigConstructor'])
        for key in ['road','character']+[key for key in ['marker','world','terrain','ground','grass'] if key in HERO_BUNDLE]:
            self.assertTrue(assets[key].startswith('data:image/png;base64,'))
            raw=base64.b64decode(assets[key].split(',',1)[1])
            self.assertEqual((QUIET_ASSETS/'immersive'/HERO_BUNDLE[key]).read_bytes(),raw)
        for key,record in provenance['hero']['assets'].items():
            raw=(QUIET_ASSETS/'immersive'/HERO_BUNDLE[key]).read_bytes()
            self.assertEqual(hashlib.sha256(raw).hexdigest(),record['sha256'])
        self.assertTrue(script_json('hero-rig-meta')['originalCharacter'])
        self.assertEqual(8,len(script_json('hero-rig-meta')['parts']))
        self.assertEqual('MIT',provenance['hero']['three']['license'])
        # Browser loads inline scripts, metadata objects and data URLs only.
        self.assertIsNone(re.search(r'<script\b[^>]*\bsrc=',result,re.I))
        self.assertIsNone(re.search(r'<link\b[^>]*\brel=["\']stylesheet',result,re.I))
        self.assertNotIn('@@',result)

    def test_quiet_optional_world_and_rig_selection_remain_inline_and_hashed(self):
        import base64
        from unittest.mock import patch
        from render_quiet_report import ASSETS as QUIET_ASSETS, HERO_BUNDLE
        self.quiet()
        # Reuse a bundled PNG so this adapter test does not select an unapproved
        # artwork version or depend on a competing prototype's filenames.
        with patch.dict(HERO_BUNDLE,world=HERO_BUNDLE['road'],terrain=HERO_BUNDLE['road'],ground=HERO_BUNDLE['road'],grass=HERO_BUNDLE['road'],grass_meta=HERO_BUNDLE['rig_meta'],rig_constructor='CustomPaintedRig',reveal_duration=10.5,exit_duration=9.5):
            generate(self.s,self.model_path,self.out)
            result=self.out.read_text()
            def script_json(identifier):
                return json.loads(re.search(r'<script id="'+identifier+r'" type="application/json">(.*?)</script>',result,re.S)[1])
            assets=script_json('hero-assets');provenance=script_json('report-provenance')
            self.assertEqual('CustomPaintedRig',assets['rigConstructor'])
            self.assertEqual(9.5,assets['exitDuration'])
            self.assertEqual(10.5,assets['revealDuration'])
            raw=(QUIET_ASSETS/'immersive'/HERO_BUNDLE['world']).read_bytes()
            self.assertEqual(raw,base64.b64decode(assets['world'].split(',',1)[1]))
            self.assertTrue(assets['world'].startswith('data:image/png;base64,'))
            self.assertEqual({'file':HERO_BUNDLE['world'],'sha256':hashlib.sha256(raw).hexdigest()},
                             provenance['hero']['assets']['world'])
            self.assertEqual(raw,base64.b64decode(assets['terrain'].split(',',1)[1]))
            self.assertEqual({'file':HERO_BUNDLE['terrain'],'sha256':hashlib.sha256(raw).hexdigest()},
                             provenance['hero']['assets']['terrain'])
            for key in ('ground','grass'):
                self.assertEqual(raw,base64.b64decode(assets[key].split(',',1)[1]))
                self.assertEqual({'file':HERO_BUNDLE[key],'sha256':hashlib.sha256(raw).hexdigest()},
                                 provenance['hero']['assets'][key])
            metadata=(QUIET_ASSETS/'immersive'/HERO_BUNDLE['grass_meta']).read_bytes()
            self.assertEqual(json.loads(metadata),assets['grassMetadata'])
            self.assertEqual(hashlib.sha256(metadata).hexdigest(),provenance['hero']['assets']['grass_meta']['sha256'])
            self.assertNotIn('rig_constructor',provenance['hero']['assets'])
            self.assertNotIn('exit_duration',provenance['hero']['assets'])
            self.assertNotIn('reveal_duration',provenance['hero']['assets'])
        self.assertIsNone(re.search(r'<script\b[^>]*\bsrc=',result,re.I))
        self.assertIsNone(re.search(r'<link\b[^>]*\brel=["\']stylesheet',result,re.I))
        self.assertIsNone(re.search(r'<(?:img|source)\b[^>]*\bsrc=["\'](?:https?:|//)',result,re.I))
        style=re.search(r'<style>(.*?)</style>',result,re.S)[1]
        self.assertIsNone(re.search(r'url\(\s*["\']?(?:https?:|//)',style,re.I))
        self.assertNotIn('@@',result)

    def test_quiet_native_geometry_bundle_does_not_require_old_marker_artwork(self):
        from unittest.mock import patch
        from render_quiet_report import HERO_BUNDLE
        self.quiet()
        native_bundle={key:value for key,value in HERO_BUNDLE.items()
                       if key not in {'marker','marker_meta','world'}}
        with patch.dict(HERO_BUNDLE,native_bundle,clear=True):
            generate(self.s,self.model_path,self.out)
        result=self.out.read_text()
        assets=json.loads(re.search(r'<script id="hero-assets" type="application/json">(.*?)</script>',result,re.S)[1])
        provenance=json.loads(re.search(r'<script id="report-provenance" type="application/json">(.*?)</script>',result,re.S)[1])
        marker=json.loads(re.search(r'<script id="hero-marker-meta" type="application/json">(.*?)</script>',result,re.S)[1])
        self.assertEqual({},marker)
        self.assertNotIn('marker',assets)
        self.assertNotIn('marker_meta',provenance['hero']['assets'])

    def test_quiet_controller_attaches_selected_rig_to_illustrated_scenes(self):
        node=shutil.which('node')
        if not node:self.skipTest('Node.js unavailable for scene adapter regression')
        script=r'''
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const controller=fs.readFileSync(process.argv[1],'utf8');
async function check({mode,customRig=false,supportsRig=true,revealDuration,exitDuration}){
 class Element{
  constructor(){this.attrs={};this.events={};this.hidden=false;this.classList={add(){},remove(){}};this.style={};this.dataset={};this.textContent=''}
  addEventListener(type,fn){(this.events[type]??=[]).push(fn)}
  emit(type,event={}){for(const fn of this.events[type]??[])fn({...event,preventDefault(){}})}
  setAttribute(k,v){this.attrs[k]=v}getBoundingClientRect(){return{width:1280,height:720}}
  setPointerCapture(){}hasPointerCapture(){return false}focus(){}
 }
 const selectors=['.hero','#scene','#scene-description','#scene-status','#scene-instructions','#scene-invitation','#scene-invitation-words','#press-progress','#scene-completion','#step-out','#scene-final-actions','#replay','#replay-final','#pause','#pause-label','#report-data','#hero-assets','#hero-rig-meta','#hero-marker-meta','.scene-tools'];
 const els=Object.fromEntries(selectors.map(s=>[s,new Element()]));
 const assets={constructor:'PaintedScene',road:'data:road',terrain:'data:terrain',ground:'data:ground',grass:'data:grass',grassMetadata:{parts:{short:{sourceRect:[0,0,8,8],rootPx:[4,8]}}},world:'data:world',marker:'data:marker',character:'data:girl'};
 if(customRig)assets.rigConstructor='PaintedRig';
 if(exitDuration!==undefined)assets.exitDuration=exitDuration;
 if(revealDuration!==undefined)assets.revealDuration=revealDuration;
 els['#scene-completion'].hidden=true;els['#scene-final-actions'].hidden=true;
 els['#hero-assets'].textContent=JSON.stringify(assets);
 els['#hero-rig-meta'].textContent=JSON.stringify({originalCharacter:true});
 els['#hero-marker-meta'].textContent=JSON.stringify({anchor:[.5,1]});
 els['#report-data'].textContent=JSON.stringify({hero_states:[0,1,2].map(i=>({label:'state'+i,description:'description'+i}))});
 const document=new Element();document.querySelector=s=>els[s];document.hidden=false;
 const window=new Element(),media=new Element();media.matches=false;window.matchMedia=()=>media;
 let scene,created=0,defaultCreated=0,rigOptions,now=0,id=0,queue=new Map();
 const character={dispose(){}};
 const makeRig=options=>{created++;rigOptions=options;return Promise.resolve(character)};
 window.CihouCharacterRig={create:options=>{defaultCreated++;return makeRig(options)}};
 window.PaintedRig={create:makeRig};
 class PaintedScene{
  constructor(container,options){scene=this;this.container=container;this.options=options;this.mode=mode;if(!supportsRig)this.setRig=undefined}
  setRig(value){this.rig=value}setProgress(value){this.progress=value}setExit(value){this.exit=value}setPaused(){}setActive(){}setInteraction(){}destroy(){this.destroyed=true}
 }
 window.PaintedScene=PaintedScene;
 vm.runInNewContext(controller,{window,document,performance:{now:()=>now},requestAnimationFrame:fn=>(queue.set(++id,fn),id),cancelAnimationFrame:x=>queue.delete(x)});
 function pump(ms){const end=now+ms;while(now<end){now=Math.min(end,now+100);const q=[...queue.values()];queue.clear();q.forEach(fn=>fn(now))}}
 for(let i=0;i<5;i++)await Promise.resolve();
 assert.equal(els['#scene'].attrs['aria-busy'],'false');assert.equal(scene.destroyed,undefined);
 assert.equal(scene.options.worldTextureUrl,'data:world');assert.equal(scene.options.roadTextureUrl,'data:road');
 assert.equal(scene.options.terrainTextureUrl,'data:terrain');assert.equal(scene.options.groundTextureUrl,'data:ground');assert.equal(scene.options.grassAtlasUrl,'data:grass');assert.equal(JSON.stringify(scene.options.grassMetadata),JSON.stringify(assets.grassMetadata));
 assert.equal(scene.options.markerMetadata.anchor[1],1);
 const needsRig=supportsRig&&!['canvas','fallback'].includes(mode);
 assert.equal(created,needsRig?1:0);assert.equal(defaultCreated,needsRig&&!customRig?1:0);
 if(needsRig){assert.equal(scene.rig,character);assert.equal(rigOptions.atlasUrl,'data:girl');assert.equal(rigOptions.metadata.originalCharacter,true);assert.equal(rigOptions.height,.8)}
 if(exitDuration!==undefined||revealDuration!==undefined){
  pump(2000);els['#scene'].emit('pointerdown',{button:0,pointerId:1});
  const revealSeconds=Number.isFinite(revealDuration)&&revealDuration>0?revealDuration:6.5;
  pump(revealSeconds*1000-1);assert(scene.progress<1);assert.equal(els['#scene-completion'].hidden,true);
  now+=1;els['#scene'].emit('pointerup',{pointerId:1});assert.equal(scene.progress,1);
  pump(1499);assert.equal(els['#scene-completion'].hidden,true);pump(1);
  assert.equal(els['#scene-completion'].hidden,false);els['#step-out'].emit('click');
  const expected=Number.isFinite(exitDuration)&&exitDuration>0?exitDuration:3;
  pump(expected*1000-1);assert(scene.exit<1);assert.equal(els['#scene-final-actions'].hidden,true);assert.equal(els['#scene-completion'].hidden,true);
  pump(2);assert.equal(scene.exit,1);assert.equal(els['#scene-final-actions'].hidden,true);
  pump(449);assert.equal(els['#scene-final-actions'].hidden,true);pump(2);
  assert.equal(els['#scene-final-actions'].hidden,false);assert.equal(els['#scene-completion'].hidden,false);
 }
}
(async()=>{
 await check({mode:'illustrated-2.5d',customRig:true});
 await check({mode:'illustrated-2.5d'});
 await check({mode:'webgl'});
 await check({mode:'canvas',customRig:true});
 await check({mode:'fallback',customRig:true});
 await check({mode:'illustrated-2.5d',customRig:true,supportsRig:false});
 await check({mode:'illustrated-2.5d',customRig:true,exitDuration:6.5});
 await check({mode:'illustrated-2.5d',customRig:true,revealDuration:10.5,exitDuration:9.5});
 await check({mode:'webgl',revealDuration:0});
 await check({mode:'webgl',revealDuration:-2});
 await check({mode:'webgl',revealDuration:'10.5'});
 await check({mode:'webgl',exitDuration:0});
 await check({mode:'webgl',exitDuration:-2});
 await check({mode:'webgl',exitDuration:'6.5'});
 console.log('PASS: optional painted world/rig, illustrated/WebGL attachment, canvas fallback, configurable 10.5s reveal/9.5s exit and settle timing');
})().catch(e=>{console.error(e);process.exitCode=1});
'''
        controller=Path(__file__).resolve().parents[1]/'assets'/'cihou'/'quiet'/'report.js'
        result=subprocess.run([node,'-e',script,str(controller)],capture_output=True,text=True,timeout=15)
        self.assertEqual(0,result.returncode,result.stdout+result.stderr)

    def test_quiet_displays_sourced_scene_copy_and_keeps_reading_accessible(self):
        self.quiet();generate(self.s,self.model_path,self.out)
        result=self.out.read_text()
        hero=result.split('<section class="hero"',1)[1].split('</section>',1)[0]
        self.assertNotIn('<h1',hero)
        self.assertIn('id="scene-line-2">state 0</span>',hero)
        self.assertNotIn('个人咨询报告',hero)
        self.assertIn('id="scene-description">State description 0</p>',hero)
        self.assertIn('id="scene-caption">State description 0</p>',hero)
        self.assertIn('id="scene-chapters"',hero)
        self.assertIn('aria-describedby="scene-instructions scene-description"',hero)
        self.assertIn('id="step-out"',hero)
        self.assertIn('href="#reading"',hero)
        self.assertIn('按住，看见更多',hero)
        self.assertNotIn('按住，随她往前',result)
        fallback=result.split('<noscript>',1)[1].split('</noscript>',1)[0]
        for i in range(3):self.assertIn('State description '+str(i),fallback)

    def test_hero_choices_require_distinct_ids_conditions_and_current_sources(self):
        self.quiet()
        choices = [{'id': 'route'+str(i), 'title': 'Route '+str(i), 'condition': 'When this condition holds',
                    'text': 'One controllable experiment, without a promised result', 'refs': ['user:5']}
                   for i in range(3)]
        self.model['presentation']['hero_choices'] = choices
        self.save(); generate(self.s,self.model_path,self.out)
        result = self.out.read_text()
        data = json.loads(re.search(r'<script id="report-data" type="application/json">(.*?)</script>', result, re.S)[1])
        self.assertEqual(choices, data['hero_choices'])
        for mutate, message in [
            (lambda c: c.pop(), 'three conditional alternatives'),
            (lambda c: c[1].update(id='route0'), 'duplicate hero choice'),
            (lambda c: c[0].update(condition=''), 'hero choice condition'),
            (lambda c: c[0].update(refs=['user:99']), 'section references'),
        ]:
            self.model['presentation']['hero_choices'] = copy.deepcopy(choices)
            mutate(self.model['presentation']['hero_choices']); self.save()
            with self.assertRaisesRegex(ValueError,message): generate(self.s,self.model_path,self.out)

    def test_quiet_controller_preserves_input_progress_and_static_navigation(self):
        # Execute the real controller against deterministic clocks and a minimal
        # scene/DOM contract. This covers lifecycle semantics, not rendering QA.
        node=shutil.which('node')
        if not node:self.skipTest('Node.js unavailable for controller state regression')
        script=r'''
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
class Element {
 constructor(){this.attrs={};this.events={};this.hidden=false;this.classList={values:new Set(),add(...v){v.forEach(x=>this.values.add(x))},remove(...v){v.forEach(x=>this.values.delete(x))}};this.style={};this.textContent='';this.dataset={};this.captured=new Set();}
 addEventListener(type,fn){(this.events[type]??=[]).push(fn)}
 emit(type,event={}){for(const fn of this.events[type]??[])fn({...event,preventDefault(){}})}
 setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]}
 getBoundingClientRect(){return{width:1280,height:720}}
 setPointerCapture(id){this.captured.add(id)}hasPointerCapture(id){return this.captured.has(id)}releasePointerCapture(id){this.captured.delete(id)}
 focus(){document.activeElement=this}
}
const selectors=['.hero','#scene','#scene-description','#scene-status','#scene-instructions','#scene-invitation','#scene-invitation-words','#press-progress','#scene-completion','#step-out','#scene-final-actions','#replay','#replay-final','#pause','#pause-label','#report-data','#hero-assets','#hero-rig-meta','#hero-marker-meta','.scene-tools'];
const els=Object.fromEntries(selectors.map(x=>[x,new Element()]));
els['.hero'].dataset.state='0';
els['#scene-completion'].hidden=true;els['#scene-final-actions'].hidden=true;
els['#report-data'].textContent=JSON.stringify({hero_states:[0,1,2].map(i=>({label:'state'+i,description:'description'+i}))});
els['#hero-assets'].textContent=JSON.stringify({constructor:'TestScene',road:'data:road',marker:'data:marker',character:'data:girl'});
els['#hero-rig-meta'].textContent='{}';els['#hero-marker-meta'].textContent='{}';
const document=new Element();document.querySelector=s=>els[s];document.hidden=false;document.activeElement=null;
const window=new Element();const media=new Element();media.matches=false;window.matchMedia=()=>media;
let scene,observer,now=0,id=0,queue=new Map();
class TestScene{constructor(){scene=this;this.mode='webgl';this.active=true;this.progress=0;this.exit=0}setRig(r){this.rig=r}setProgress(v){this.progress=v}setExit(v){this.exit=v}setInteraction(v){this.interaction=v}setPaused(v){this.paused=v}setActive(v){this.active=v}destroy(){this.destroyed=true}}
window.TestScene=TestScene;window.CihouCharacterRig={create:()=>Promise.resolve({dispose(){}})};
class IntersectionObserver{constructor(cb){observer=cb}observe(){}}
window.IntersectionObserver=IntersectionObserver;
const ctx={window,document,IntersectionObserver,console,performance:{now:()=>now},requestAnimationFrame:fn=>(queue.set(++id,fn),id),cancelAnimationFrame:x=>queue.delete(x)};
vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),ctx);
function pump(ms,frameMs=16){const end=now+ms;while(now<end){now=Math.min(end,now+frameMs);const q=[...queue.values()];queue.clear();q.forEach(fn=>fn(now));}}
(async()=>{
 await Promise.resolve();await Promise.resolve();await Promise.resolve();
 assert.equal(els['#scene'].attrs['aria-busy'],'false');pump(2000);
 // Ten frames per second must preserve the authored wall-clock durations.
 // An idle RAF clock also must not be charged to the next pointer hold.
 pump(30000,100);
 els['#scene'].emit('pointerdown',{button:0,pointerId:10});pump(6400,100);
 assert(Math.abs(scene.progress-6400/6500)<1e-10);assert.equal(els['.hero'].dataset.state,'0');
 pump(100,100);assert.equal(scene.progress,1);assert.equal(els['.hero'].dataset.state,'1');
 pump(500,100);document.hidden=true;document.emit('visibilitychange');pump(30000,100);
 assert.equal(els['#scene-completion'].hidden,true);document.hidden=false;document.emit('visibilitychange');
 pump(999,100);assert.equal(els['#scene-completion'].hidden,true);pump(1,100);assert.equal(els['#scene-completion'].hidden,false);
 els['#step-out'].emit('click');pump(1000,100);assert(Math.abs(scene.exit-1/3)<1e-10);
 window.emit('pagehide',{persisted:true});const cachedExit=scene.exit;pump(30000,100);assert.equal(scene.exit,cachedExit);
 window.emit('pageshow',{persisted:true});pump(1999,100);assert(scene.exit<1);pump(1,100);assert.equal(scene.exit,1);
 pump(450,100);assert.equal(els['#scene-final-actions'].hidden,false);
 els['#replay-final'].emit('click');pump(1900,100);assert.equal(scene.progress,0);assert.equal(els['.hero'].dataset.state,'0');
 // Pointer release commits the last fraction between RAF callbacks, and blur
 // drops the input clock before a suspended page can accumulate held time.
 els['#scene'].emit('pointerdown',{button:0,pointerId:11});pump(500,100);now+=50;window.emit('blur');
 const blurred=scene.progress;assert(Math.abs(blurred-550/6500)<1e-10);pump(30000,100);assert.equal(scene.progress,blurred);
 els['#scene'].emit('pointerdown',{button:0,pointerId:12});pump(100,100);assert(Math.abs(scene.progress-blurred-100/6500)<1e-10);
 els['#scene'].emit('pointerup',{pointerId:12});els['#replay'].emit('click');pump(1900,100);assert.equal(scene.progress,0);
 els['#scene'].emit('pointerdown',{button:0,pointerId:1});pump(2000);const partial=scene.progress;assert(partial>.25&&partial<.4);
 els['#scene'].emit('pointerup',{pointerId:1});pump(1000);assert.equal(scene.progress,partial);
 els['#scene'].emit('pointerdown',{button:0,pointerId:2});pump(500);observer([{isIntersecting:false}]);const off=scene.progress;pump(30000);assert.equal(scene.progress,off);assert.equal(scene.active,false);
 observer([{isIntersecting:true}]);pump(500);assert.equal(scene.progress,off);
 els['#scene'].emit('pointerdown',{button:0,pointerId:3});pump(6000);assert.equal(els['.hero'].dataset.state,'1');pump(1600);assert.equal(els['#scene-completion'].hidden,false);
 els['#step-out'].emit('click');pump(1000);assert.equal(els['.hero'].dataset.state,'2');const beforePause=scene.exit;
 els['#pause'].emit('click');pump(30000);assert.equal(scene.exit,beforePause);assert.equal(scene.paused,true);
 els['#pause'].emit('click');pump(3000);assert.equal(scene.exit,1);assert.equal(els['#scene-final-actions'].hidden,false);
 els['#replay-final'].emit('click');pump(2300);assert.equal(scene.progress,0);assert.equal(scene.exit,0);assert.equal(els['.hero'].dataset.state,'0');
 media.emit('change',{matches:true});els['#scene'].emit('keydown',{code:'Space',repeat:false});pump(64);assert.equal(scene.progress,1);assert.equal(els['.hero'].dataset.state,'1');assert.equal(els['#pause'].disabled,true);
 els['#step-out'].emit('click');pump(64);assert.equal(scene.exit,1);assert.equal(els['#scene-final-actions'].hidden,false);
 const beforeHidden=scene.progress;document.hidden=true;document.emit('visibilitychange');pump(30000);assert.equal(scene.progress,beforeHidden);assert.equal(scene.active,false);document.hidden=false;document.emit('visibilitychange');
 window.emit('pagehide',{persisted:true});assert.equal(scene.active,false);window.emit('pageshow',{persisted:true});assert.equal(scene.active,true);
 console.log('PASS: 10fps wall-clock reveal/settle/exit/rewind, idle/blur/offscreen/hidden/cached-page time, release retention, pause/resume during exit, replay, keyboard reduced-motion');
})().catch(e=>{console.error(e);process.exitCode=1});
'''
        controller=Path(__file__).resolve().parents[1]/'assets'/'cihou'/'quiet'/'report.js'
        result=subprocess.run([node,'-e',script,str(controller)],capture_output=True,text=True,timeout=15)
        self.assertEqual(0,result.returncode,result.stdout+result.stderr)

    def test_quiet_controller_replays_story_scenes_with_fresh_events(self):
        # The real controller must reset the story's persistent events; merely
        # reversing the camera leaves the next viewing without its flower/seed.
        node=shutil.which('node')
        if not node:self.skipTest('Node.js unavailable for story replay regression')
        script=r'''
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const controller=fs.readFileSync(process.argv[1],'utf8');
async function check(reduced,delayed=false){
 class Element{
  constructor(){this.attrs={};this.events={};this.hidden=false;this.classList={values:new Set(),add(...v){v.forEach(x=>this.values.add(x))},remove(...v){v.forEach(x=>this.values.delete(x))}};this.style={};this.dataset={};this.textContent='';this.captured=new Set()}
  addEventListener(type,fn){(this.events[type]??=[]).push(fn)}
  emit(type,event={}){for(const fn of this.events[type]??[])fn({...event,preventDefault(){}})}
  setAttribute(k,v){this.attrs[k]=v}getBoundingClientRect(){return{width:1280,height:720}}
  setPointerCapture(id){this.captured.add(id)}hasPointerCapture(id){return this.captured.has(id)}releasePointerCapture(id){this.captured.delete(id)}
  focus(){document.activeElement=this}
 }
 const selectors=['.hero','#scene','#scene-description','#scene-status','#scene-instructions','#scene-invitation','#scene-invitation-words','#press-progress','#scene-completion','#step-out','#scene-final-actions','#replay','#replay-final','#pause','#pause-label','#report-data','#hero-assets','#hero-rig-meta','#hero-marker-meta','.scene-tools'];
 const els=Object.fromEntries(selectors.map(s=>[s,new Element()]));
 els['#scene-completion'].hidden=true;els['#scene-final-actions'].hidden=true;
 els['#report-data'].textContent=JSON.stringify({hero_states:[0,1,2].map(i=>({label:'state'+i,description:'description'+i}))});
 els['.hero'].dataset.state='0';
 els['#hero-assets'].textContent=JSON.stringify({constructor:'StoryScene',road:'data:road',marker:'data:marker',character:'data:girl',revealDuration:delayed?10.5:6.5});
 els['#hero-rig-meta'].textContent='{}';els['#hero-marker-meta'].textContent='{}';
 const document=new Element();document.querySelector=s=>els[s];document.hidden=false;document.activeElement=null;
 const window=new Element(),media=new Element();media.matches=reduced;window.matchMedia=()=>media;
 let scene,now=0,id=0,queue=new Map();
 class StoryScene{
  constructor(container,options){scene=this;this.options=options;this.mode='illustrated-2.5d';this.progress=this.storyProgress=0;this.exit=0;this.travel=0;this.flower=false;this.seed=false;this.resetCalls=0;this.flowerEvents=0;this.seedEvents=0;if(!delayed)this.getStoryProgress=undefined}
  setRig(){}setPaused(v){this.paused=v}setActive(v){this.active=v}setInteraction(v){this.interaction=v}destroy(){}
  setProgress(v){this.progress=v;if(!delayed||this.reducedMotion)this.storyProgress=v;if(v>0){this.travel+=1;if(!this.flower){this.flower=true;this.flowerEvents++}}}
  setExit(v){this.exit=v;if(v>0&&!this.seed){this.seed=true;this.seedEvents++}}
  getStoryProgress(){return this.storyProgress}
  advanceStory(v){this.storyProgress=v;if(v===1)this.options.onRevealReady()}
  reset(){this.resetCalls++;this.progress=this.storyProgress=this.exit=this.travel=0;this.flower=this.seed=false}
 }
 window.StoryScene=StoryScene;window.CihouCharacterRig={create:()=>Promise.resolve({dispose(){}})};
 vm.runInNewContext(controller,{window,document,performance:{now:()=>now},requestAnimationFrame:fn=>(queue.set(++id,fn),id),cancelAnimationFrame:x=>queue.delete(x)});
 function pump(ms){const end=now+ms;while(now<end){now=Math.min(end,now+100);const q=[...queue.values()];queue.clear();q.forEach(fn=>fn(now))}}
 function start(){els['#scene'].emit('pointerdown',{button:0,pointerId:7})}
 function expectRoad(resetCalls){
  assert.equal(scene.resetCalls,resetCalls);assert.equal(scene.progress,0);assert.equal(scene.exit,0);assert.equal(scene.travel,0);
  assert.equal(scene.flower,false);assert.equal(scene.seed,false);assert.equal(scene.interaction,0);
  assert.equal(els['.hero'].dataset.state,'0');assert.equal(els['#scene-completion'].hidden,true);assert.equal(els['#scene-final-actions'].hidden,true);assert.equal(els['#step-out'].hidden,false);
  assert.equal(els['#press-progress'].style.strokeDashoffset,'62.83');assert.equal(els['#replay'].hidden,true);
  assert.equal(els['#scene'].attrs['aria-disabled'],'false');assert.equal(els['#scene'].captured.size,0);assert.equal(document.activeElement,els['#scene']);
  assert(els['#scene-invitation'].classList.values.has('visible'));assert.equal(els['#scene-invitation-words'].textContent,reduced?'点击，看远一点':'按住，看见更多');
  assert.equal(scene.paused,reduced);assert.equal(els['#pause'].disabled,reduced);
 }
 for(let i=0;i<5;i++)await Promise.resolve();
 if(delayed&&!reduced){
  // The user's segmented holds can finish the input clock before the scene has
  // reached its encounter and wide shot. Raw progress must not cut that action.
  pump(2000);start();pump(2000);scene.advanceStory(.2);pump(100);
  assert(Math.abs(Number(els['#press-progress'].style.strokeDashoffset)-62.83*.8)<1e-9);
  els['#scene'].emit('pointerup',{pointerId:7});const partial=scene.progress;pump(30000);
  assert.equal(scene.progress,partial);assert.equal(scene.interaction,0);assert.equal(els['#scene-completion'].hidden,true);
  start();scene.advanceStory(.52);pump(8400);assert.equal(scene.progress,1);
  assert.equal(scene.interaction,1);assert.equal(els['#scene'].captured.size,1);assert.equal(els['.hero'].dataset.state,'0');assert.equal(els['#scene-completion'].hidden,true);
  assert(Math.abs(Number(els['#press-progress'].style.strokeDashoffset)-62.83*.48)<1e-9);
  els['#scene'].emit('pointerup',{pointerId:7});pump(30000);assert.equal(scene.interaction,0);assert.equal(els['#scene-completion'].hidden,true);
  start();scene.advanceStory(.78);pump(100);assert.equal(scene.interaction,1);assert.equal(els['#scene-completion'].hidden,true);
  scene.advanceStory(1);assert.equal(els['.hero'].dataset.state,'1');assert.equal(scene.interaction,0);assert.equal(els['#scene'].captured.size,0);
  pump(1499);assert.equal(els['#scene-completion'].hidden,true);pump(1);assert.equal(els['#scene-completion'].hidden,false);
  els['#step-out'].emit('click');pump(3500);assert.equal(scene.seedEvents,1);assert.equal(els['#scene-final-actions'].hidden,false);
  els['#replay-final'].emit('click');expectRoad(1);
  start();pump(10500);assert.equal(scene.progress,1);assert.equal(scene.interaction,1);assert.equal(els['.hero'].dataset.state,'0');assert.equal(els['#scene-completion'].hidden,true);
  scene.advanceStory(1);pump(1500);assert.equal(els['#scene-completion'].hidden,false);assert.equal(scene.flowerEvents,2);
  // A ready signal arriving before the minimum hold time must also wait.
  els['#replay'].emit('click');expectRoad(2);start();pump(1000);scene.advanceStory(1);
  assert.equal(els['.hero'].dataset.state,'0');assert.equal(scene.interaction,1);pump(9500);assert.equal(els['.hero'].dataset.state,'1');pump(1500);assert.equal(els['#scene-completion'].hidden,false);
  return;
 }
 pump(2000);start();pump(reduced?100:1000);assert.equal(scene.flowerEvents,1);
 if(!reduced){els['#pause'].emit('click');assert.equal(scene.paused,true)}
 // Replay while a held/paused reveal is partial must restore input immediately.
 els['#replay'].emit('click');expectRoad(1);
 start();pump(reduced?200:8000);assert.equal(scene.flowerEvents,2);assert.equal(els['#scene-completion'].hidden,false);
 els['#step-out'].emit('click');pump(reduced?200:3500);assert.equal(scene.seedEvents,1);assert.equal(els['#scene-final-actions'].hidden,false);
 els['#replay-final'].emit('click');expectRoad(2);
 // No rewind frame or stale hold time may be charged to the next viewing.
 pump(30000);expectRoad(2);start();pump(reduced?200:6499);
 if(!reduced){assert(scene.progress<1);assert.equal(els['#scene-completion'].hidden,true);now+=1;els['#scene'].emit('pointerup',{pointerId:7});pump(1500)}
 assert.equal(scene.progress,1);assert.equal(scene.flowerEvents,3);assert.equal(els['#scene-completion'].hidden,false);
 els['#step-out'].emit('click');pump(reduced?200:3500);assert.equal(scene.seedEvents,2);assert.equal(els['#scene-final-actions'].hidden,false);
}
(async()=>{await check(false);await check(true);await check(false,true);await check(true,true);console.log('PASS: immediate scene reset, persistent events, segmented holds with delayed story readiness, actual story progress, repeated and static playback')})().catch(e=>{console.error(e);process.exitCode=1});
'''
        controller=Path(__file__).resolve().parents[1]/'assets'/'cihou'/'quiet'/'report.js'
        result=subprocess.run([node,'-e',script,str(controller)],capture_output=True,text=True,timeout=15)
        self.assertEqual(0,result.returncode,result.stdout+result.stderr)

    def test_quiet_controller_follows_world_story_events_and_held_exit(self):
        # Drive the controller through the public scene contract. The scene owns
        # actual travel and safe footfall; controller time must not skip either.
        node=shutil.which('node')
        if not node:self.skipTest('Node.js unavailable for world story regression')
        script=r'''
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const controller=fs.readFileSync(process.argv[1],'utf8');
async function check(initialReduced,fallback=false,delayedPresentation=false,holdChoice=false){
 class Element{
  constructor(){this.attrs={};this.events={};this.hidden=false;this.classList={values:new Set(),add(...v){v.forEach(x=>this.values.add(x))},remove(...v){v.forEach(x=>this.values.delete(x))}};this.style={setProperty(k,v){this[k]=v}};this.dataset={};this.textContent='';this.captured=new Set()}
  addEventListener(type,fn){(this.events[type]??=[]).push(fn)}
  emit(type,event={}){const emitted={...event,defaultPrevented:false,preventDefault(){this.defaultPrevented=true}};for(const fn of this.events[type]??[])fn(emitted);return emitted}
  setAttribute(k,v){this.attrs[k]=v}getBoundingClientRect(){return{width:1280,height:720}}
  setPointerCapture(id){this.captured.add(id)}hasPointerCapture(id){return this.captured.has(id)}releasePointerCapture(id){this.captured.delete(id)}
  focus(){if(document.activeElement===this)return;const previous=document.activeElement;document.activeElement=this;if(previous)previous.emit('blur',{relatedTarget:this});this.emit('focus',{relatedTarget:previous})}
 }
 const selectors=['.hero','#scene','#scene-description','#scene-status','#scene-instructions','#scene-invitation','#scene-invitation-words','#press-progress','#scene-completion','#step-out','#scene-final-actions','#replay','#replay-final','#pause','#pause-label','#report-data','#hero-assets','#hero-rig-meta','#hero-marker-meta','.scene-tools'];
 const els=Object.fromEntries(selectors.map(s=>[s,new Element()]));
 els['.hero'].dataset.state='0';els['#scene-completion'].hidden=true;els['#scene-final-actions'].hidden=true;
 els['#report-data'].textContent=JSON.stringify({hero_states:[0,1,2].map(i=>({label:'state'+i,description:'description'+i}))});
 els['#hero-assets'].textContent=JSON.stringify({constructor:'WorldScene',road:'data:road',marker:'data:marker',character:'data:girl',revealDuration:10.5,exitDuration:9.5});
 els['#hero-rig-meta'].textContent='{}';els['#hero-marker-meta'].textContent='{}';
 const document=new Element();document.querySelector=s=>els[s];document.hidden=false;document.activeElement=null;
 const window=new Element(),media=new Element();media.matches=initialReduced;window.matchMedia=()=>media;
 let scene,observer,rigCreates=0,now=0,id=0,queue=new Map();
 class WorldScene{
  constructor(container,options){scene=this;this.options=options;this.mode=fallback?'fallback':'webgl';this.interactionMode='world';this.choiceByHolding=holdChoice;this.reducedMotion=options.reducedMotion||fallback;this.resetCalls=0;this.progressWrites=[];this.exitWrites=[];this.story={phase:'walking',holdProgress:0,exitProgress:0,canExit:false,exitComplete:false}}
  getState(){return{...this.story}}getStoryProgress(){return this.story.holdProgress}
  advance(next){Object.assign(this.story,next);this.options.onStateChange(this.getState())}
  setRig(){assert.equal(fallback,false)}setPaused(v){this.paused=v}setActive(v){this.active=v}setInteraction(v){this.interaction=v}destroy(){}
  setProgress(v){this.progressWrites.push(v);if(this.reducedMotion&&v===1)this.advance({phase:'choice',holdProgress:1,canExit:true})}
  setExit(v){this.exitWrites.push(v);if(v>0&&this.story.phase==='choice')this.advance(this.reducedMotion?{phase:'complete',canExit:false,exitProgress:1,exitComplete:true}:{phase:'placing',canExit:false,exitProgress:0})}
  reset(){this.resetCalls++;this.story={phase:'walking',holdProgress:0,exitProgress:0,canExit:false,exitComplete:false};this.options.onStateChange(this.getState())}
 }
 class IntersectionObserver{constructor(cb){observer=cb}observe(){}}
 window.IntersectionObserver=IntersectionObserver;window.WorldScene=WorldScene;window.CihouCharacterRig={create:()=>{rigCreates++;return Promise.resolve({dispose(){}})}};
 vm.runInNewContext(controller,{window,document,IntersectionObserver,performance:{now:()=>now},requestAnimationFrame:fn=>(queue.set(++id,fn),id),cancelAnimationFrame:x=>queue.delete(x)});
 function pump(ms){const end=now+ms;while(now<end){now=Math.min(end,now+100);const q=[...queue.values()];queue.clear();q.forEach(fn=>fn(now))}}
 const down=id=>els['#scene'].emit('pointerdown',{button:0,pointerId:id});
 const up=id=>els['#scene'].emit('pointerup',{pointerId:id});
 function buttonKeydown(code,repeat=false){
  const event=els['#step-out'].emit('keydown',{code,repeat});
  // Native buttons activate on every unprevented Enter keydown, including
  // repeats. A repeated key must not be mistaken for a virtual AT click.
  if(code==='Enter'&&!event.defaultPrevented)els['#step-out'].emit('click',{detail:0});
  return event;
 }
 function staticCycle(){down(1);assert.equal(els['.hero'].dataset.state,'1');assert.equal(els['#scene-completion'].hidden,false);els['#step-out'].emit('click');assert.equal(els['.hero'].dataset.state,'2');assert.equal(els['#scene-final-actions'].hidden,false);els['#replay-final'].emit('click');assert.equal(els['.hero'].dataset.state,'0');assert.equal(els['#scene-final-actions'].hidden,true)}
 for(let i=0;i<5;i++)await Promise.resolve();
 if(initialReduced||fallback){staticCycle();staticCycle();assert.equal(scene.resetCalls,2);assert.equal(els['#pause'].disabled,true);if(fallback){assert.equal(rigCreates,0);assert.equal(els['#pause'].attrs['aria-label'],'当前画面使用静态模式');media.emit('change',{matches:false});assert.equal(scene.reducedMotion,true);staticCycle()}return}
 if(holdChoice){
  scene.advance({phase:'choice',holdProgress:1,canExit:true,choiceHoldProgress:0});
  assert.equal(els['#scene'].attrs['aria-disabled'],'false');assert.equal(els['#step-out'].textContent,'按住，再往前一步');
  els['#scene'].focus();els['#step-out'].emit('pointerdown',{button:0,pointerId:41});
  assert.equal(scene.interaction,1);
  // The pointer's native focus default follows its down listener. The first
  // button press must survive that focus transfer, just like later presses.
  els['#step-out'].focus();assert.equal(document.activeElement,els['#step-out']);assert.equal(scene.interaction,1);assert(els['#scene'].captured.has(41));
  scene.advance({choiceHoldProgress:.4});
  assert.equal(els['#step-out'].style['--choice-progress'],'0.4');
  up(41);scene.advance({choiceHoldProgress:0});els['#step-out'].emit('click',{detail:1});pump(30000);
  assert.deepEqual(scene.exitWrites,[]);assert.equal(els['.hero'].dataset.state,'1');assert.equal(els['#scene-completion'].hidden,false);
  // A scene-owned commitment must preserve the same held gesture and pointer.
  els['#step-out'].emit('pointerdown',{button:0,pointerId:42});
  scene.advance({phase:'placing',canExit:false,choiceHoldProgress:1});
  els['#step-out'].emit('blur');
  assert.equal(els['.hero'].dataset.state,'2');assert.equal(scene.interaction,1);assert(els['#scene'].captured.has(42));
  assert.equal(document.activeElement,els['#scene']);assert.equal(els['#scene-completion'].hidden,true);
  up(42);assert.equal(scene.interaction,0);scene.advance({phase:'complete',exitProgress:1,exitComplete:true,presentationReady:false});pump(30000);
  assert.equal(els['#scene-final-actions'].hidden,true);scene.advance({presentationReady:true});assert.equal(els['#scene-final-actions'].hidden,false);
  els['#replay-final'].emit('click');scene.advance({phase:'choice',holdProgress:1,canExit:true,choiceHoldProgress:0});
  els['#step-out'].focus();assert(buttonKeydown('Space').defaultPrevented);assert.equal(scene.interaction,1);
  assert(buttonKeydown('Space',true).defaultPrevented);assert.equal(scene.interaction,1);
  scene.advance({phase:'placing',canExit:false});assert.equal(scene.interaction,1);els['#scene'].emit('keyup',{code:'Space'});assert.equal(scene.interaction,0);
  scene.advance({phase:'complete',exitProgress:1,exitComplete:true,presentationReady:true});els['#replay-final'].emit('click');
  scene.advance({phase:'choice',holdProgress:1,canExit:true,choiceHoldProgress:0});els['#step-out'].focus();
  assert(buttonKeydown('Enter').defaultPrevented);assert(buttonKeydown('Enter',true).defaultPrevented);
  assert.deepEqual(scene.exitWrites,[]);assert.equal(scene.interaction,1);assert.equal(els['.hero'].dataset.state,'1');
  els['#step-out'].emit('keyup',{code:'Enter'});assert.equal(scene.interaction,0);
  els['#scene'].focus();assert(els['#scene'].emit('keydown',{code:'Space',repeat:false}).defaultPrevented);
  assert(els['#scene'].emit('keydown',{code:'Space',repeat:true}).defaultPrevented);
  assert(els['#scene'].emit('keydown',{code:'Enter',repeat:true}).defaultPrevented);
  els['#scene'].emit('keyup',{code:'Space'});assert.equal(scene.interaction,0);
  scene.advance({phase:'choice',holdProgress:1,canExit:true,choiceHoldProgress:0});down(43);window.emit('blur');assert.equal(scene.interaction,0);assert.equal(els['#scene'].captured.size,0);
  // Virtual button activation remains available to assistive technology.
  els['#step-out'].emit('click',{detail:0});assert.deepEqual(scene.exitWrites,[1]);
  return;
 }
 pump(2000);scene.advance({holdProgress:.2});down(11);pump(30000);
 assert.deepEqual(scene.progressWrites,[]);assert.equal(scene.interaction,1);assert.equal(els['.hero'].dataset.state,'0');assert.equal(els['#scene-completion'].hidden,true);
 assert(Math.abs(Number(els['#press-progress'].style.strokeDashoffset)-62.83*.8)<1e-9);
 up(11);assert.equal(scene.interaction,0);assert.equal(els['#scene'].captured.size,0);
 // Default light walking can reach the choice without another hold. The
 // already-finished scene reveal must not wait for an unrelated input timer.
 for(const phase of ['picking','returning','reconsidering'])scene.advance({phase});
 scene.advance({phase:'revealing',holdProgress:.9});assert.equal(els['.hero'].dataset.state,'1');assert.equal(els['#scene-completion'].hidden,true);
 scene.advance({phase:'choice',holdProgress:1,canExit:true});assert.equal(els['#scene-completion'].hidden,false);
 els['#step-out'].emit('click');assert.deepEqual(scene.exitWrites,[1]);assert.equal(scene.interaction,0);assert.equal(els['#scene'].attrs['aria-disabled'],'false');assert.equal(document.activeElement,els['#scene']);
 pump(30000);assert.deepEqual(scene.exitWrites,[1]);assert.equal(els['#scene-final-actions'].hidden,true);
 els['#scene'].emit('keydown',{code:'Space',repeat:false});assert.equal(scene.interaction,1);scene.advance({phase:'crossing',exitProgress:.45});
 assert(Math.abs(Number(els['#press-progress'].style.strokeDashoffset)-62.83*.55)<1e-9);
 els['#scene'].emit('keyup',{code:'Space'});assert.equal(scene.interaction,0);pump(30000);assert.equal(els['#scene-final-actions'].hidden,true);
 down(12);window.emit('blur');assert.equal(scene.interaction,0);assert.equal(els['#scene'].captured.size,0);
 down(13);observer([{isIntersecting:false}]);assert.equal(scene.interaction,0);assert.equal(scene.active,false);observer([{isIntersecting:true}]);assert.equal(scene.interaction,0);
 down(14);document.hidden=true;document.emit('visibilitychange');assert.equal(scene.interaction,0);assert.equal(scene.active,false);document.hidden=false;document.emit('visibilitychange');assert.equal(scene.interaction,0);
 down(14);els['#pause'].emit('click');assert.equal(scene.paused,true);assert.equal(scene.interaction,0);down(15);assert.equal(scene.interaction,0);els['#pause'].emit('click');
 down(16);scene.advance({phase:'leaving',exitProgress:.8});assert.equal(els['#scene-final-actions'].hidden,true);
 scene.advance({phase:'complete',exitProgress:1,exitComplete:true,...(delayedPresentation?{presentationReady:false}:{})});
 if(delayedPresentation){
  assert.equal(els['.hero'].dataset.state,'2');assert.equal(scene.interaction,0);assert.equal(els['#scene-completion'].hidden,true);
  pump(30000);assert.equal(els['#scene-final-actions'].hidden,true);
  scene.advance({presentationReady:true});
 }
 assert.equal(scene.interaction,0);assert.equal(els['#scene'].captured.size,0);assert.equal(els['#scene-final-actions'].hidden,false);assert.equal(els['#step-out'].hidden,true);assert.equal(els['#scene'].attrs['aria-disabled'],'true');
 els['#replay-final'].emit('click');assert.equal(scene.resetCalls,1);assert.equal(els['.hero'].dataset.state,'0');assert.equal(els['#scene-completion'].hidden,true);
 els['#scene'].emit('keydown',{code:'Space',repeat:false});scene.advance({phase:'choice',holdProgress:1,canExit:true});assert.equal(document.activeElement,els['#step-out']);
 media.emit('change',{matches:true});els['#step-out'].emit('click');assert.equal(els['#scene-final-actions'].hidden,false);els['#replay-final'].emit('click');
 staticCycle();assert.equal(scene.resetCalls,3);assert.equal(els['#pause'].disabled,true);
 media.emit('change',{matches:false});scene.advance({phase:'choice',holdProgress:1,canExit:true});assert.equal(scene.interaction,0);assert.equal(els['#scene-completion'].hidden,false);
 // A preference change during the exit must use the scene's static choice
 // contract; setExit alone only accepts choice and would otherwise deadlock.
 for(const phase of ['placing','crossing']){
  els['#step-out'].emit('click');scene.advance({phase,canExit:false});media.emit('change',{matches:true});down(17);
  assert.equal(els['#scene-final-actions'].hidden,false);els['#replay-final'].emit('click');media.emit('change',{matches:false});scene.advance({phase:'choice',holdProgress:1,canExit:true});
 }
}
(async()=>{await check(false);await check(false,false,true);await check(false,false,true,true);await check(true);await check(true,false,false,true);await check(false,true);await check(false,true,false,true);console.log('PASS: scene-owned reveal/exit and closing camera, continuous held choice with pointer/keyboard/virtual button, held input lifecycle, static replay and mid-exit preference changes, WebGL fallback without rig')})().catch(e=>{console.error(e);process.exitCode=1});
'''
        controller=Path(__file__).resolve().parents[1]/'assets'/'cihou'/'quiet'/'report.js'
        result=subprocess.run([node,'-e',script,str(controller)],capture_output=True,text=True,timeout=15)
        self.assertEqual(0,result.returncode,result.stdout+result.stderr)

    def test_quiet_rejects_incompatible_diagrams_and_unsourced_states(self):
        self.quiet();original=copy.deepcopy(self.model)
        for mutation,error in [
            (lambda m:m['diagram'].update(type='threshold'),'loop model'),
            (lambda m:m['presentation'].update(style='unknown'),'presentation style'),
            (lambda m:m['presentation']['hero_states'].pop(),'three hero states'),
            (lambda m:m['presentation']['hero_states'][0].update(refs=['user:99']),'section references'),
            (lambda m:m['presentation']['hero_states'][0].update(node_id='missing'),'unknown node')]:
            self.model=copy.deepcopy(original);mutation(self.model);self.save()
            with self.assertRaisesRegex(HarnessError,error):generate(self.s,self.model_path,self.out)
        self.assertFalse(self.out.exists())

    def test_quiet_data_and_rich_card_fields_are_escaped(self):
        self.quiet()
        payload='</script><script>alert(1)</script>'
        self.model['presentation']['hero_states'][0]['description']=payload
        self.model['chapters'][0]['cards'][0].update(eyebrow=payload,items=[payload],counterexample=payload)
        self.save();generate(self.s,self.model_path,self.out)
        result=self.out.read_text()
        self.assertNotIn(payload,result)
        self.assertIn('\\u003c/script',result)
        self.assertIn('&lt;/script&gt;',result)

    def mobius(self):
        """Upgrade only this synthetic fixture to the new fixed contract."""
        supersede(self.s,self.state,scope=None,artifact_ids=[self.tech['id']],reason='synthetic source template upgrade')
        _, technical_sections=sections((ASSETS/'technical-report-template.md').read_text())
        text='# Synthetic fixed technical report\n\n'+''.join('## '+part['title']+'\n\nSynthetic declared evidence.\n\n' for part in technical_sections)
        lock=active_artifacts(self.state,'chart_lock')[0]
        self.tech=self.reg('technical_report','technical_v2.md',text,['prior_output'],[lock['id']])
        self.state['report_template']='cihou-mobius-v1';write_state(self.s,self.state)
        self.model['sources']['technical']={'artifact_id':self.tech['id'],'sha256':self.tech['sha256']}
        self.quiet()
        self.model['template_id']='cihou-mobius-v1'
        self.model['chapters']=[{'id':ident,'layout':layout,'title':'Synthetic '+ident,'lead':'Synthetic explanation',
            'cards':[{'title':'Synthetic observation','text':'A condition, not a guaranteed result.','refs':['user:2']}],
            'covers':list(covers)} for ident,layout,covers in MOBIUS_CHAPTERS]
        self.save()

    def test_new_session_requires_fixed_mobius_template_before_registration(self):
        self.state['report_template']='cihou-mobius-v1';write_state(self.s,self.state)
        with self.assertRaisesRegex(HarnessError,'requires template_id'):
            generate(self.s,self.model_path,self.out,register=True)
        self.assertFalse(self.out.exists())
        self.assertFalse(active_artifacts(read_state(self.s),'visual_report_model'))

    def test_mobius_complete_delivery_is_source_bound_and_deterministic(self):
        self.mobius()
        generate(self.s,self.model_path,self.out,register=True)
        self.assertEqual('complete',session_lifecycle(read_state(self.s)))
        self.assertTrue(generate(self.s,self.model_path,self.out,check=True)['ok'])
        result=self.out.read_text()
        self.assertEqual(9,result.count('<section class="reading-section chapter-'))
        for i in range(1,12):self.assertIn(f'id="source-technical-{i}"',result)

    def test_mobius_rejects_reordering_missing_chapters_and_wrong_coverage(self):
        self.mobius();original=copy.deepcopy(self.model)
        for mutation in [
            lambda m:m['chapters'].pop(),
            lambda m:m['chapters'].reverse(),
            lambda m:m['chapters'][1].update(layout='story'),
            lambda m:m['chapters'][0].update(covers=['user:1']),
        ]:
            self.model=copy.deepcopy(original);mutation(self.model);self.save()
            with self.assertRaisesRegex(HarnessError,'nine fixed chapters'):
                generate(self.s,self.model_path,self.out)
        self.assertFalse(self.out.exists())

    def test_mobius_scaffold_is_current_source_bound_and_cannot_be_delivered(self):
        self.mobius();path=self.s/'draft_model.json'
        result=init_model(self.s,path)
        scaffold=json.loads(path.read_text())
        self.assertTrue(result['draft']);self.assertEqual(self.state['session_id'],scaffold['session_id'])
        self.assertEqual(self.model['sources'],scaffold['sources'])
        self.assertEqual('cihou-mobius-v1',scaffold['template_id'])
        self.assertEqual(list(MOBIUS_CHAPTERS),[(c['id'],c['layout'],tuple(c['covers'])) for c in scaffold['chapters']])
        with self.assertRaisesRegex(HarnessError,'draft'):
            generate(self.s,path,self.out,register=True)
        scaffold['draft']=False;path.write_text(json.dumps(scaffold))
        with self.assertRaisesRegex(HarnessError,'unfilled template placeholders'):
            generate(self.s,path,self.out,register=True)
        self.assertFalse(self.out.exists());self.assertFalse(active_artifacts(read_state(self.s),'visual_report_model'))
        with self.assertRaisesRegex(HarnessError,'new model filename'):init_model(self.s,path)

    def test_mobius_initialization_requires_current_reports_and_session_boundary(self):
        self.mobius()
        with self.assertRaisesRegex(HarnessError,'inside the session'):
            init_model(self.s,self.s.parent/'outside.json')
        supersede(self.s,self.state,scope=None,artifact_ids=[self.tech['id']],reason='synthetic missing report')
        with self.assertRaisesRegex(HarnessError,'active technical_report'):
            init_model(self.s,self.s/'missing_source_model.json')
        self.assertFalse((self.s/'missing_source_model.json').exists())

    def test_mobius_sources_require_full_outlines_and_filled_content(self):
        self.mobius();sources=load_sources(self.s,self.state)
        for key in ['user','technical']:
            changed=copy.deepcopy(sources);changed[key]['text']+='\n'+PLACEHOLDER
            with self.assertRaisesRegex(HarnessError,'source reports contain'):
                validate_model(self.model,self.state,changed)
        changed=copy.deepcopy(sources);changed['technical']['text']=changed['technical']['text'].rsplit('## ',1)[0]
        with self.assertRaisesRegex(HarnessError,'eleven canonical'):
            validate_model(self.model,self.state,changed)

    def test_blank_or_nonstring_report_content_cannot_complete_delivery(self):
        self.mobius();original=copy.deepcopy(self.model)
        changes=[
            lambda m,v:m['chapters'][0].update(title=v),
            lambda m,v:m['chapters'][0].update(lead=v),
            lambda m,v:m['chapters'][0]['cards'][0].update(title=v),
            lambda m,v:m['chapters'][0]['cards'][0].update(text=v),
            lambda m,v:m.update(technical_intro=v),
            lambda m,v:m.update(limits=v),
            lambda m,v:m['technical_cards'][0].update(title=v),
            lambda m,v:m['technical_cards'][0].update(text=v),
        ]
        state_before=(self.s/'session_state.json').read_bytes()
        for change in changes:
            for invalid in [' \n\t ', 123]:
                self.model=copy.deepcopy(original);change(self.model,invalid);self.save()
                with self.assertRaisesRegex(HarnessError,'incomplete|technical explanation'):
                    generate(self.s,self.model_path,self.out,register=True)
                self.assertFalse(self.out.exists())
                self.assertEqual(state_before,(self.s/'session_state.json').read_bytes())
        self.assertEqual('unfinished',session_lifecycle(read_state(self.s)))

    def test_mobius_keeps_unknowns_and_requires_controllable_last_scene(self):
        self.mobius()
        self.model['diagram']['nodes'][0]['kind']='unknown'
        self.model['diagram']['edges']=[];self.save()
        generate(self.s,self.model_path,self.out)
        self.model['diagram']['nodes'][-1]['kind']='hypothesis';self.save()
        with self.assertRaisesRegex(HarnessError,'controllable action'):
            generate(self.s,self.model_path,self.s/'invalid.html')

if __name__=='__main__':unittest.main()

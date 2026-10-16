"""Synthetic-only regression coverage for personal HTML delivery and source lineage."""
import copy
import json
from pathlib import Path
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
        self.model['presentation']={'style':'quiet-v1','hero_states':[
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
        self.assertEqual(2,result.count('src="data:image/png;base64,'))
        self.assertIn('State description 2',result)
        self.assertIn('<noscript>',result)

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

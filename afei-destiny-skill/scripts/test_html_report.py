"""Synthetic-only regression coverage for personal HTML delivery and source lineage."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
from consultation_harness import (HarnessError, initialize_session, register_artifact, transition_stage,
    read_state, session_lifecycle, supersede, audit_state, active_artifacts)
from consultation_output_router import build_output_plan
from generate_html_report import generate, load_sources, validate_model, render, markdown
from validate_final_report import REQUIRED_HEADINGS

class HtmlReportTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.s=Path(self.tmp.name)/'session'
        self.state=initialize_session(self.s,'focused','synthetic')
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

if __name__=='__main__':unittest.main()

#!/usr/bin/env python3
"""Build an offline personal report from audited, registered reports and a sourced model."""
from __future__ import annotations
import argparse
import base64
import hashlib
import html
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit
from consultation_harness import (HarnessError, active_artifacts, audit_state, ensure_inside_session,
    file_hash, read_state, register_artifact, write_json_atomic, DEFAULT_REPORT_TEMPLATE)
from validate_final_report import validate_report_text, REQUIRED_HEADINGS

ASSETS = Path(__file__).resolve().parents[1] / 'assets' / 'cihou'
SOURCE_KINDS = {'user': 'markdown_report', 'technical': 'technical_report'}
PLACEHOLDER = '__CIHOU_FILL__'
MOBIUS_CHAPTERS = (
    ('focus', 'story', ('user:1', 'user:2')),
    ('pattern', 'path', ()),
    ('scenes', 'story', ()),
    ('experiment', 'path', ('user:5',)),
    ('choices', 'topics', ()),
    ('future', 'timeline', ('user:4',)),
    ('panorama', 'topics', ('user:3',)),
    ('calibration', 'feedback', ('user:6',)),
    ('boundaries', 'closing', ('user:7', 'user:8')),
)


def require(value, message):
    if not value:
        raise HarnessError(message)


def nonempty_string(value):
    return isinstance(value, str) and bool(value.strip())


def sections(text):
    chunks = re.split(r'(?m)^## (.+)\n', text)
    return chunks[0], [{'title': chunks[i], 'body': chunks[i + 1]} for i in range(1, len(chunks), 2)]


def load_sources(session, state):
    issues = audit_state(session, state)
    require(not issues, 'source audit failed: ' + '; '.join(issues))
    result = {}
    for key, kind in SOURCE_KINDS.items():
        rows = active_artifacts(state, kind)
        require(len(rows) == 1, 'requires exactly one active ' + kind)
        row = rows[0]
        p = ensure_inside_session(session, session / row['path'])
        require(file_hash(p) == row['sha256'], 'source hash mismatch: ' + key)
        text = p.read_text(encoding='utf-8')
        if key == 'user':
            require(not validate_report_text(text), 'user report structure must pass validation')
        preface, parts = sections(text)
        require(parts, 'report has no sections: ' + key)
        result[key] = {'artifact': row, 'text': text, 'preface': preface, 'sections': parts}
    return result


def validate_model(model, state, sources):
    require(isinstance(model, dict) and model.get('schema_version') == 1, 'invalid visual model schema')
    require(model.get('draft', False) is False, 'model is a draft; complete the sourced content before delivery')
    require(PLACEHOLDER not in json.dumps(model, ensure_ascii=False), 'model contains unfilled template placeholders')
    require(model.get('session_id') == state['session_id'], 'visual model belongs to another session')
    for key, source in sources.items():
        expected = {'artifact_id': source['artifact']['id'], 'sha256': source['artifact']['sha256']}
        require(model.get('sources', {}).get(key) == expected, 'visual model source is stale: ' + key)
    valid_refs = {f'{key}:{i+1}' for key, src in sources.items() for i in range(len(src['sections']))}
    def refs(item):
        rr = item.get('refs', [])
        require(isinstance(rr, list) and rr and all(r in valid_refs for r in rr), 'missing or invalid section references')
    for field in ('title', 'subtitle', 'closing'):
        require(isinstance(model.get(field), str) and model[field].strip(), 'missing ' + field)
    diagram = model.get('diagram', {})
    require(diagram.get('type') in {'threshold', 'chain', 'confluence', 'loop', 'sparse'}, 'unsupported diagram type')
    nodes = diagram.get('nodes', [])
    require(2 <= len(nodes) <= 12, 'diagram requires 2–12 focused nodes; use report for additional detail')
    ids = set()
    for n in nodes:
        require(re.fullmatch(r'[a-z][a-z0-9_-]{0,35}', n.get('id', '')) and n['id'] not in ids, 'invalid or duplicate node id')
        ids.add(n['id'])
        require(n.get('kind') in {'fact', 'hypothesis', 'action', 'condition', 'unknown'}, 'invalid node kind')
        for key in ('label', 'title', 'text'):
            require(isinstance(n.get(key), str) and n[key].strip(), 'missing node ' + key)
        require(len(n['label']) <= 14, 'node labels must stay short')
        refs(n)
    require(diagram.get('type') != 'sparse' or not diagram.get('edges'), 'sparse diagrams must not invent connections')
    for edge in diagram.get('edges', []):
        require(edge.get('from') in ids and edge.get('to') in ids, 'edge has unknown node')
        require(edge.get('kind') in {'known', 'hypothesis', 'conditional'}, 'edge must declare its meaning')
        refs(edge)
    tour = diagram.get('tour', [])
    require(tour and len(tour) <= len(nodes) and len(set(tour)) == len(tour) and all(n in ids for n in tour), 'invalid narration order')
    require(all(next(n for n in nodes if n['id'] == t)['kind'] != 'condition' for t in tour), 'autoplay must not decide external responses')
    presentation = model.get('presentation')
    if presentation is not None:
        require(isinstance(presentation, dict) and presentation.get('style') == 'quiet-v1', 'unsupported presentation style')
        runtime = presentation.get('hero_runtime', 'wayfinder-v21')
        require(runtime in {'wayfinder-v21', 'wayfinder-v20', 'wayfinder-v19', 'wayfinder-v18', 'wayfinder-v17', 'wayfinder-v16', 'paper-v15'}, 'unsupported hero runtime')
        require(diagram['type'] == 'loop', 'quiet-v1 requires a sourced loop model')
        states = presentation.get('hero_states')
        require(isinstance(states, list) and len(states) == 3, 'quiet-v1 requires three hero states')
        for scene in states:
            require(isinstance(scene, dict), 'invalid hero state')
            lines = scene.get('lines')
            require(isinstance(lines, list) and len(lines) == 2 and all(isinstance(v, str) and v.strip() and len(v) <= 18 for v in lines), 'hero requires two short lines')
            if 'anchors' in scene:
                require(isinstance(scene['anchors'], list) and len(scene['anchors']) == 3
                        and all(isinstance(v, str) and v.strip() and len(v) <= 80 for v in scene['anchors']),
                        'hero anchors require three short sourced strings')
            for field in ('description', 'hint', 'label'):
                require(isinstance(scene.get(field), str) and scene[field].strip(), 'missing hero ' + field)
            require(scene.get('node_id') in ids, 'hero has unknown node')
            require(next(n for n in nodes if n['id'] == scene['node_id'])['kind'] != 'condition', 'hero must not decide external responses')
            refs(scene)
        loop_story = presentation.get('loop_story')
        if runtime in {'wayfinder-v21', 'wayfinder-v20', 'wayfinder-v19', 'wayfinder-v18', 'wayfinder-v17'} or loop_story is not None:
            require(isinstance(loop_story, dict), 'Wayfinder requires a sourced loop_story')
            loop_nodes = loop_story.get('nodes')
            require(isinstance(loop_nodes, list) and len(loop_nodes) == 6
                    and all(isinstance(node, dict) for node in loop_nodes), 'loop_story requires six fixed nodes')
            require([node.get('id') for node in loop_nodes] ==
                    ['trigger', 'meaning', 'response', 'relief', 'cost', 'return'], 'invalid loop_story node order')
            for node in loop_nodes:
                for field, limit in [('text', 24), ('detail', 300)]:
                    require(nonempty_string(node.get(field)) and len(node[field]) <= limit,
                            'invalid loop_story node ' + field)
                refs(node)
            for field in ('present', 'past', 'future'):
                if field == 'past' and field not in loop_story:
                    continue
                section = loop_story.get(field)
                require(isinstance(section, dict) and nonempty_string(section.get('text'))
                        and len(section['text']) <= 600, 'invalid loop_story ' + field)
                refs(section)
        choices = presentation.get('hero_choices', [])
        require(isinstance(choices, list) and len(choices) in {0, 3}, 'hero choices require three conditional alternatives')
        choice_ids = set()
        feedback_modes = []
        for choice in choices:
            require(isinstance(choice, dict), 'invalid hero choice')
            choice_id = choice.get('id', '')
            require(isinstance(choice_id, str) and re.fullmatch(r'[a-z][a-z0-9_-]{0,35}', choice_id)
                    and choice_id not in choice_ids, 'invalid or duplicate hero choice id')
            choice_ids.add(choice_id)
            for field, limit in [('title', 32), ('condition', 80), ('text', 400)]:
                require(isinstance(choice.get(field), str) and choice[field].strip()
                        and len(choice[field]) <= limit, 'invalid hero choice ' + field)
            refs(choice)
            feedback = choice.get('feedback')
            if runtime in {'wayfinder-v21', 'wayfinder-v20'} or feedback is not None:
                require(isinstance(feedback, dict), 'hero choice requires feedback')
                require(isinstance(feedback.get('mode'), str)
                        and feedback['mode'] in {'attempt', 'prepare', 'sustain'}, 'invalid hero choice feedback mode')
                lines = feedback.get('lines')
                require(isinstance(lines, list) and len(lines) == 3
                        and all(nonempty_string(line) and len(line) <= 32 for line in lines),
                        'hero choice feedback requires three short lines')
                require(nonempty_string(feedback.get('result')), 'missing hero choice feedback result')
                # The entire feedback is sourced by its enclosing choice, so it
                # cannot silently introduce a second, unrelated citation set.
                require('refs' not in feedback, 'hero choice feedback inherits choice references')
                feedback_modes.append(feedback['mode'])
        if runtime in {'wayfinder-v21', 'wayfinder-v20'} and choices:
            require(sorted(feedback_modes) == ['attempt', 'prepare', 'sustain'],
                    'V20+ hero choices require each feedback mode once')
    chapters = model.get('chapters', [])
    require(3 <= len(chapters) <= 10, 'requires a complete editorial report')
    validate_template_contract(model, state, sources)
    covered = []
    for c in chapters:
        require(c.get('layout') in {'story', 'path', 'topics', 'timeline', 'feedback', 'closing'}, 'invalid chapter layout')
        require(all(nonempty_string(c.get(field)) for field in ('title', 'lead')) and
                isinstance(c.get('cards'), list) and c['cards'], 'incomplete chapter')
        for card in c['cards']:
            require(all(nonempty_string(card.get(field)) for field in ('title', 'text')), 'incomplete card')
            for field in ('eyebrow', 'counterexample'):
                require(field not in card or isinstance(card[field], str), 'invalid card ' + field)
            require('items' not in card or (isinstance(card['items'], list) and all(isinstance(v, str) and v.strip() for v in card['items'])), 'invalid card items')
            refs(card)
        cc = c.get('covers', [])
        require(isinstance(cc, list) and all(x in valid_refs and x.startswith('user:') for x in cc), 'invalid coverage map')
        covered.extend(cc)
    expected = [f'user:{i+1}' for i in range(len(sources['user']['sections']))]
    require(sorted(covered) == sorted(expected), 'each user report section must be covered exactly once')
    require(all(nonempty_string(model.get(field)) for field in ('technical_intro', 'limits')) and
            isinstance(model.get('technical_cards'), list) and model['technical_cards'], 'technical explanation and limits required')
    for card in model['technical_cards']:
        require(all(nonempty_string(card.get(field)) for field in ('title', 'text')), 'incomplete technical summary')
        refs(card)


def validate_template_contract(model, state, sources):
    """Enforce the fixed edition only for new sessions or explicitly opted-in models.

    Old sessions and models without a template ID retain their original renderer
    contract, so a format upgrade does not invalidate a delivered report.
    """
    required = state.get('report_template')
    template = model.get('template_id')
    require(required in {None, DEFAULT_REPORT_TEMPLATE}, 'unsupported session report template')
    require(template in {None, DEFAULT_REPORT_TEMPLATE}, 'unsupported model template')
    if required:
        require(template == required, 'session requires template_id=' + required)
    if template is None:
        return
    require(model.get('presentation', {}).get('style') == 'quiet-v1', 'Mobius template requires quiet-v1 presentation')
    require(model['diagram']['type'] == 'loop', 'Mobius template requires loop diagram')
    validate_template_sources(sources)

    actual = [(chapter.get('id'), chapter.get('layout'), tuple(chapter.get('covers', [])))
              for chapter in model['chapters']]
    require(actual == list(MOBIUS_CHAPTERS), 'Mobius template requires the nine fixed chapters, order, layouts and coverage')
    final_id = model['presentation']['hero_states'][-1]['node_id']
    final_node = next(node for node in model['diagram']['nodes'] if node['id'] == final_id)
    require(final_node['kind'] == 'action', 'Mobius final scene must describe a controllable action, not an outcome')


def validate_template_sources(sources):
    """Check the fixed source outlines without changing historical source contracts."""
    for key, source in sources.items():
        validate_source_contract(SOURCE_KINDS[key], source['text'])


def validate_source_contract(kind, text):
    """Validate one new-template source before it enters the active lineage.

    Each source can be registered independently: this check never reads the other
    report and therefore preserves the technical source firewall.
    """
    require(kind in SOURCE_KINDS.values(), 'unsupported report source kind')
    require(PLACEHOLDER not in text, 'source reports contain unfilled template placeholders')
    _, parts = sections(text)
    actual_titles = [part['title'] for part in parts]
    if kind == 'markdown_report':
        require(not validate_report_text(text), 'user report structure must pass validation')
        expected_titles = [heading.removeprefix('## ') for heading in REQUIRED_HEADINGS]
        require(actual_titles == expected_titles, 'Mobius template requires the eight canonical user report sections')
    else:
        _, technical_sections = sections((ASSETS / 'technical-report-template.md').read_text(encoding='utf-8'))
        require(len(technical_sections) == 11, 'invalid bundled technical report template')
        require(actual_titles == [section['title'] for section in technical_sections],
                'Mobius template requires the eleven canonical technical report sections')


def init_model(session, output):
    """Create an explicitly unfinished model bound to this session's current reports."""
    session = session.resolve()
    state = read_state(session)
    require(state['stage'] == 'report_ready', 'model initialization requires report_ready')
    output = ensure_inside_session(session, output)
    require(not output.exists(), 'use a new model filename; preserve existing artifacts')
    sources = load_sources(session, state)
    validate_template_sources(sources)
    model = json.loads((ASSETS / 'mobius-model-template.json').read_text(encoding='utf-8'))
    model['session_id'] = state['session_id']
    model['sources'] = {key: {'artifact_id': source['artifact']['id'], 'sha256': source['artifact']['sha256']}
                        for key, source in sources.items()}
    write_json_atomic(output, model)
    return {'ok': True, 'model': str(output), 'draft': True, 'template_id': DEFAULT_REPORT_TEMPLATE,
            'next': 'Read both complete reports; replace all __CIHOU_FILL__ placeholders with sourced content, review unknowns and conditions, then set draft=false and generate --register.'}


def inline(text):
    text = html.escape(text)
    def link(m):
        label, url = m.group(1), html.unescape(m.group(2))
        if url == 'technical_analysis.md':
            return f'<a href="#technical">{label}</a>'
        if urlsplit(url).scheme in {'https', 'http'}:
            return f'<a href="{html.escape(url, quote=True)}" target="_blank" rel="noopener noreferrer">{label}</a>'
        return label  # Local source paths remain readable without broken or unsafe links.
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', link, text)
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
    return text


def markdown(text):
    lines = text.splitlines(); out = []; i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1; continue
        if line.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                row = [c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-+:?', c) for c in row):
                    rows.append(row)
                i += 1
            out.append('<div class="table-wrap" tabindex="0" aria-label="可横向阅读的数据表"><table>')
            for j, row in enumerate(rows):
                tag = 'th' if j == 0 else 'td'
                out.append('<tr>' + ''.join(f'<{tag}>{inline(c)}</{tag}>' for c in row) + '</tr>')
            out.append('</table></div>'); continue
        heading = re.match(r'^#{1,6}\s+(.+)', line)
        if heading:
            out.append('<h4>' + inline(heading[1]) + '</h4>'); i += 1; continue
        if line.startswith('```'):
            code = []; i += 1
            while i < len(lines) and not lines[i].strip().startswith('```'):
                code.append(lines[i]); i += 1
            out.append('<pre><code>' + html.escape('\n'.join(code)) + '</code></pre>'); i += 1; continue
        if re.match(r'^(- |\d+\. )', line):
            out.append('<ul>')
            while i < len(lines) and re.match(r'^(- |\d+\. )', lines[i].strip()):
                out.append('<li>' + inline(re.sub(r'^(- |\d+\. )', '', lines[i].strip())) + '</li>'); i += 1
            out.append('</ul>'); continue
        if line.startswith('>'):
            out.append('<blockquote>' + inline(line.lstrip('> ')) + '</blockquote>'); i += 1; continue
        para = [line]; i += 1
        while i < len(lines) and lines[i].strip() and not re.match(r'^(#|\||>|- |\d+\. |```)', lines[i].strip()):
            para.append(lines[i].strip()); i += 1
        out.append('<p>' + inline(' '.join(para)) + '</p>')
    return '\n'.join(out)


def safe_json(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')


def render(model, sources):
    if model.get('presentation', {}).get('style') == 'quiet-v1':
        from render_quiet_report import render_quiet
        return render_quiet(model, sources)
    esc = html.escape
    def evidence_links(refs):
        return ' · '.join(f'<a href="#source-{r.replace(":", "-")}">{"解读" if r.startswith("user") else "依据"} {r.split(":")[1]}</a>' for r in dict.fromkeys(refs))
    chapters = []
    for index, c in enumerate(model['chapters'], 1):
        cards = ''.join(f'<article class="insight"><span class="card-index">{j+1:02d}</span><h3>{esc(card["title"])}</h3><p>{esc(card["text"])}</p><div class="source-link">{evidence_links(card["refs"])}</div></article>' for j, card in enumerate(c['cards']))
        originals = []
        for ref in c['covers']:
            source = sources['user']['sections'][int(ref.split(':')[1])-1]
            originals.append(f'<details id="source-{ref.replace(":", "-")}" class="source-detail"><summary>{esc(source["title"])} · 完整解读</summary><div class="prose">{markdown(source["body"])}</div></details>')
        chapters.append(f'<section class="chapter"><header class="chapter-heading"><span class="eyebrow">{index:02d} / {esc(c.get("kicker", "继续理解"))}</span><h2>{esc(c["title"])}</h2><p>{esc(c["lead"])}</p></header><div class="insights {c["layout"]}">{cards}</div><div class="originals">{"".join(originals)}</div></section>')
    technical = ''.join(f'<details class="source-detail" id="source-technical-{i+1}"><summary>{esc(part["title"])}</summary><div class="prose">{markdown(part["body"])}</div></details>' for i, part in enumerate(sources['technical']['sections']))
    technical_cards = ''.join(f'<article class="insight"><h3>{esc(card["title"])}</h3><p>{esc(card["text"])}</p><div class="source-link">{evidence_links(card["refs"])}</div></article>' for card in model['technical_cards'])
    downloads = ''.join(f'<a download="{esc(source["artifact"]["path"].split("/")[-1], quote=True)}" href="data:text/markdown;base64,{base64.b64encode(source["text"].encode()).decode()}">{label}</a>' for key,label in [('user','下载解读底稿'),('technical','下载技术底稿')] for source in [sources[key]])
    payload = {'diagram':model['diagram']}
    provenance = {'schema_version':1,'session_id':model['session_id'],'sources':model['sources'],'model_sha256':hashlib.sha256(safe_json(model).encode()).hexdigest()}
    fallback = ''.join(f'<li><strong>{esc(n["label"])}</strong>：{esc(n["text"])}</li>' for n in model['diagram']['nodes'])
    template = (ASSETS/'report.html').read_text()
    replacements = {'VERSION':provenance['model_sha256'][:8],'DATE':esc(sources['user']['artifact'].get('created_at','')[:10]),'TITLE':esc(model['title']),'SUBTITLE':esc(model['subtitle']),'CLOSING':esc(model['closing']),
        'CHAPTERS':''.join(chapters),'TECHNICAL':technical,'TECHNICAL_INTRO':esc(model['technical_intro']),
        'TECHNICAL_CARDS':technical_cards,'PREFACE':markdown(sources['user']['preface'])+markdown(sources['technical']['preface']),
        'LIMITS':esc(model['limits']),'DOWNLOADS':downloads,'DATA':safe_json(payload),'PROVENANCE':safe_json(provenance),
        'FALLBACK':fallback,'CSS':(ASSETS/'report.css').read_text(),'JS':(ASSETS/'report.js').read_text()}
    return re.sub(r'@@([A-Z_]+)@@',lambda m:replacements[m[1]],template)


def validate_registration(session, state, kind, path, source_ids):
    sources = load_sources(session, state)
    report_ids = {s['artifact']['id'] for s in sources.values()}
    require(report_ids <= set(source_ids), 'HTML/model must depend directly on both current reports')
    if kind == 'visual_report_model':
        model = json.loads(path.read_text())
        validate_model(model, state, sources)
    else:
        rows = active_artifacts(state, 'visual_report_model')
        require(len(rows) == 1 and rows[0]['id'] in source_ids, 'HTML must depend on active visual model')
        model = json.loads((session/rows[0]['path']).read_text())
        validate_model(model, state, sources)
        require(path.read_text() == render(model, sources), 'HTML does not match validated content and renderer')


def generate(session, model_path, output, register=False, check=False):
    session = session.resolve(); state = read_state(session)
    require(state['stage'] == 'report_ready', 'HTML delivery requires report_ready')
    model_path = ensure_inside_session(session, model_path)
    output = ensure_inside_session(session, output)
    require(output not in {model_path, session/'session_state.json'}, 'output collides with source')
    sources = load_sources(session, state)
    require(output not in {session/s['artifact']['path'] for s in sources.values()}, 'output collides with report')
    model = json.loads(model_path.read_text(encoding='utf-8'))
    validate_model(model, state, sources)
    rendered = render(model, sources)
    if check:
        require(output.is_file() and output.read_text() == rendered, 'HTML is missing or differs from current sources')
        return {'ok':True,'checked':str(output)}
    require(not output.exists() or output.read_text() == rendered, 'use a new output filename; preserve old HTML')
    parents = [s['artifact']['id'] for s in sources.values()]
    if register:
        require(not active_artifacts(state,'html_report'), 'active HTML exists; check it or supersede before rebuilding')
        rows = active_artifacts(state,'visual_report_model')
        if rows:
            require(len(rows)==1 and rows[0]['path']==model_path.relative_to(session).as_posix() and rows[0]['sha256']==file_hash(model_path), 'supersede old visual model first')
            model_artifact = rows[0]
        else:
            model_artifact = register_artifact(session,state,kind='visual_report_model',path=model_path,source_categories=['prior_output'],source_artifact_ids=parents)
        parents.append(model_artifact['id'])
        from consultation_output_router import build_output_plan
        plan = build_output_plan(state, 'html_report')
        plan_path = output.with_name(output.stem + '_source_plan.json')
        require(not plan_path.exists(), 'use a new output filename; preserve old HTML source plan')
        write_json_atomic(plan_path, plan)
        plan_artifact = register_artifact(session,state,kind='output_plan',path=plan_path,source_categories=['prior_output'],source_artifact_ids=parents)
        parents.append(plan_artifact['id'])
    output.write_text(rendered,encoding='utf-8')
    if register:
        artifact = register_artifact(session,state,kind='html_report',path=output,source_categories=['prior_output'],source_artifact_ids=parents)
        return {'ok':True,'html':str(output),'artifact_id':artifact['id'],'sha256':artifact['sha256']}
    return {'ok':True,'html':str(output),'registered':False}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--session-dir',required=True,type=Path)
    p.add_argument('--model',type=Path,help='path relative to session directory')
    mode=p.add_mutually_exclusive_group()
    mode.add_argument('--describe-sources',action='store_true',help='show current report IDs, hashes and section references without writing')
    mode.add_argument('--init-model',type=Path,metavar='FILE',help='create a source-bound Mobius draft; relative to session directory')
    p.add_argument('--output',type=Path,default=Path('final_report.html'))
    group=p.add_mutually_exclusive_group(); group.add_argument('--register',action='store_true'); group.add_argument('--check',action='store_true')
    a=p.parse_args()
    try:
        if a.init_model or a.describe_sources:
            require(not a.model and not a.register and not a.check, '--init-model/--describe-sources cannot generate, register or check HTML')
        if a.init_model:
            output=a.init_model if a.init_model.is_absolute() else a.session_dir/a.init_model
            print(json.dumps(init_model(a.session_dir,output),ensure_ascii=False,indent=2))
            return 0
        if a.describe_sources:
            state=read_state(a.session_dir); sources=load_sources(a.session_dir,state)
            print(json.dumps({'session_id':state['session_id'],'sources':{k:{'artifact_id':v['artifact']['id'],'sha256':v['artifact']['sha256'],'sections':[{ 'ref':f'{k}:{i+1}','title':part['title']} for i,part in enumerate(v['sections'])]} for k,v in sources.items()}},ensure_ascii=False,indent=2))
            return 0
        require(a.model is not None, '--model is required unless --describe-sources or --init-model')
        print(json.dumps(generate(a.session_dir,a.model if a.model.is_absolute() else a.session_dir/a.model,a.output if a.output.is_absolute() else a.session_dir/a.output,a.register,a.check),ensure_ascii=False,indent=2))
        return 0
    except (HarnessError,OSError,ValueError,KeyError,TypeError) as exc:
        print('error: '+str(exc),file=sys.stderr);return 2

if __name__=='__main__':
    raise SystemExit(main())

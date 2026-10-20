"""Embed the source-verified Wayfinder engine and resources in one local report.

Personal text is supplied only by the validated model. The reusable renderer
contains no anonymous example, consultation content, or generated life history.
"""
from __future__ import annotations

import base64
import hashlib
import html
import json
import mimetypes
import re
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'assets' / 'cihou' / 'quiet'
ASSETS = ROOT / 'wayfinder'


def script(text):
    return re.sub(r'</script', r'<\\/script', text, flags=re.I)


@lru_cache(maxsize=1)
def packed_assets():
    """Verify every original resource before embedding; deterministic ordering."""
    entries = json.loads((ASSETS / 'asset-manifest.json').read_text(encoding='utf-8'))
    packed = {}
    for entry in entries:
        raw = (ASSETS / 'assets' / entry['path'].lstrip('/')).read_bytes()
        if hashlib.sha256(raw).hexdigest() != entry['sha256']:
            raise ValueError('Wayfinder asset digest mismatch: ' + entry['path'])
        mime = {'.sheet': 'application/json', '.gltf': 'model/gltf+json',
                '.glb': 'model/gltf-binary', '.woff': 'font/woff',
                '.woff2': 'font/woff2'}.get(Path(entry['path']).suffix)
        mime = mime or mimetypes.guess_type(entry['path'])[0] or 'application/octet-stream'
        packed[entry['path']] = [mime, base64.b64encode(raw).decode('ascii')]
    return packed, entries


def render_wayfinder(model, replacements, provenance):
    from generate_html_report import safe_json

    packed, entries = packed_assets()
    states = model['presentation']['hero_states']
    story = {
        'hero_states': states,
        'anchors': [state.get('anchors', [*state['lines'], ''.join(state['lines'])]) for state in states],
        'choices': model['presentation'].get('hero_choices', []),
        'title': model['title'],
        'reading_chapters': [
            {'id': 'chapter-' + str(chapter.get('id', index)), 'title': chapter['title'],
             'refs': list(dict.fromkeys(ref for card in chapter['cards'] for ref in card['refs']))}
            for index, chapter in enumerate(model['chapters'], 1)
        ],
    }
    replacements['READING_NAV'] = ''.join(
        '<a href="#' + html.escape(chapter['id'], quote=True) + '" data-reading-chapter="'
        + html.escape(chapter['id'], quote=True) + '"><span>' + f'{index:02d}' + '</span>'
        + html.escape(chapter['title']) + '</a>'
        for index, chapter in enumerate(story['reading_chapters'], 1))
    loop_story = model['presentation'].get('loop_story')
    for choice in story['choices']:
        feedback = choice.get('feedback')
        if feedback:
            replacements['FALLBACK'] += '<li><h3>' + html.escape(choice['title']) + '</h3><p>' \
                + html.escape(choice['condition']) + '</p><ol>' + ''.join(
                    '<li>' + html.escape(line) + '</li>' for line in feedback['lines']) \
                + '</ol><p>' + html.escape(feedback['result']) + '</p></li>'
    if loop_story:
        story['loop_story'] = loop_story
        # The complete loop remains readable without WebGL, scripts or motion.
        replacements['FALLBACK'] += '<li class="loop-reading"><h3>这条循环</h3><ol>' + ''.join(
            '<li><strong>' + html.escape(node['text']) + '</strong><p>'
            + html.escape(node['detail']) + '</p></li>' for node in loop_story['nodes']) + '</ol></li>'
        labels = ['现在', '之前', '此后'] if model['presentation'].get('hero_runtime', 'wayfinder-v21') == 'wayfinder-v21' else ['此刻', '来处', '可能']
        for field, label in zip(['present', 'past', 'future'], labels):
            if field in loop_story:
                replacements['FALLBACK'] += '<li><h3>' + label + '</h3><p>' + html.escape(loop_story[field]['text']) + '</p></li>'
    runtime_bytes = (ASSETS / 'runtime' / 'wayfinder.js').read_bytes()
    runtime = runtime_bytes.decode('utf-8')
    provenance['hero'] = {
        'version': model['presentation'].get('hero_runtime', 'wayfinder-v21'),
        'origin': 'https://wayfinder.nfb.ca/',
        'runtime_sha256': hashlib.sha256(runtime_bytes).hexdigest(),
        'adapter_assets': {name: hashlib.sha256((ASSETS / name).read_bytes()).hexdigest()
                           for name in ['adapter.js', 'choice-effects.js', 'bootstrap.js', 'ui.js', 'report.css', 'report.html']},
        'resources': entries,
        'adaptation': 'guided present/past/possibilities with optional hold progression; one-click finite choice playback and original poem card linked to source-related reading chapters',
    }
    css_parts = []
    for filename in ['fonts.525e81a0.css', 'main.7011abb4.css', 'src.1489fb19.css']:
        css = (ASSETS / 'runtime' / filename).read_text(encoding='utf-8')
        def resource(match):
            name = '/' + match[1].split('/')[-1]
            mime, data = packed[name]
            return 'url("data:' + mime + ';base64,' + data + '")'
        css_parts.append(re.sub(r'url\((?:[\'"])?(\.\./assets/[^)\'"\s]+)(?:[\'"])?\)', resource, css))
    replacements.update({
        'ENGINE_CSS': '\n'.join(css_parts),
        'READING_CSS': (ROOT / 'report.css').read_text(encoding='utf-8'),
        'CSS': (ASSETS / 'report.css').read_text(encoding='utf-8'),
        'ASSET_PACK': safe_json(packed),
        'DATA': safe_json(story),
        'PROVENANCE': safe_json(provenance),
        'BOOTSTRAP_JS': script((ASSETS / 'bootstrap.js').read_text(encoding='utf-8')),
        'ENGINE_JS': script(runtime),
        'CHOICE_EFFECTS_JS': script((ASSETS / 'choice-effects.js').read_text(encoding='utf-8')),
        'ADAPTER_JS': script((ASSETS / 'adapter.js').read_text(encoding='utf-8')),
        'UI_JS': script((ASSETS / 'ui.js').read_text(encoding='utf-8')),
    })
    return re.sub(r'@@([A-Z_0-9]+)@@', lambda match: replacements[match[1]],
                  (ASSETS / 'report.html').read_text(encoding='utf-8'))

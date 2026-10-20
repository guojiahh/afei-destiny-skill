"""Render the quiet editorial presentation from a validated personal report model.

The assets contain only the reusable visual metaphor. Consultation content stays
in the model and its registered source reports; it is never stored in this module.
"""
from __future__ import annotations

import base64
import hashlib
import html
import json
import re
from pathlib import Path


ASSETS = Path(__file__).resolve().parents[1] / 'assets' / 'cihou' / 'quiet'
# Historical paper-v15 bundle. New reports use render_wayfinder_report below;
# the model's explicit hero_runtime selector keeps older presentations reproducible.
HERO_BUNDLE = {
    'version': 'wayfinder-v15', 'constructor': 'CihouHeroSceneV15',
    'rig_constructor': 'CihouCharacterRigV8',
    'reveal_duration': 16, 'exit_duration': 6,
    'three': 'three.min.js', 'three_license': 'THREE-LICENSE.txt',
    'rig': 'hero-character-rig-v8.js', 'scene': 'hero-scene-v15.js',
    'controller': 'report-exploration-v15.js',
    'road': 'paper-road-v1.png',
    'character': 'girl-rig-parts-v5.png', 'rig_meta': 'girl-rig-parts-v5.json',
}


def render_quiet(model, sources):
    """Return a self-contained HTML document without external runtime resources."""
    # Delayed import keeps the optional presentation independent of generator dispatch.
    from generate_html_report import markdown, safe_json

    esc = html.escape
    states = model['presentation']['hero_states']

    def paragraphs(text):
        return ''.join('<p>' + esc(p.strip()).replace('\n', '<br>') + '</p>'
                       for p in re.split(r'\n\s*\n', text) if p.strip())

    def card_content(card):
        eyebrow = ('<p class="card-eyebrow">' + esc(card['eyebrow']) + '</p>') if card.get('eyebrow') else ''
        items = ('<ul class="card-items">' + ''.join('<li>' + esc(item) + '</li>' for item in card['items']) + '</ul>') if card.get('items') else ''
        counterexample = ('<p class="counterexample">' + esc(card['counterexample']) + '</p>') if card.get('counterexample') else ''
        return eyebrow + '<h3>' + esc(card['title']) + '</h3><div class="card-body">' + paragraphs(card['text']) + items + counterexample + '</div>'

    def cards(cards_data, layout):
        ordered = layout in {'path', 'timeline'}
        container = 'ol' if ordered else 'div'
        card_tag = 'li' if ordered else 'article'
        result = []
        for index, card in enumerate(cards_data, 1):
            number = '<span class="process-number" aria-hidden="true">' + f'{index:02d}' + '</span>' if ordered else ''
            refs = esc(safe_json(card['refs']), quote=True)
            result.append(f'<{card_tag} class="report-card" data-source-refs="{refs}">{number}<div class="card-copy">{card_content(card)}</div></{card_tag}>')
        return f'<{container} class="report-cards {esc(layout, quote=True)}">' + ''.join(result) + f'</{container}>'

    chapters = []
    for index, chapter in enumerate(model['chapters'], 1):
        heading = ('<header class="reading-heading"><p class="section-index">'
                   + f'{index:02d}' + (' / ' + esc(chapter['kicker']) if chapter.get('kicker') else '')
                   + '</p><h2>' + esc(chapter['title']) + '</h2><div class="section-intro">'
                   + paragraphs(chapter['lead']) + '</div></header>')
        chapters.append('<section class="reading-section chapter-' + esc(chapter['layout'], quote=True) + '">'
                        + heading + cards(chapter['cards'], chapter['layout']) + '</section>')

    def source_markup(text):
        # Original local file references are text, so reading never jumps to another section.
        rendered = markdown(text)
        return re.sub(r'<a href="#[^"]*">(.*?)</a>', r'\1', rendered, flags=re.S)

    def originals(kind):
        rows = []
        for index, section in enumerate(sources[kind]['sections'], 1):
            rows.append('<details class="source-detail" id="source-' + kind + '-' + str(index) + '">'
                        '<summary><span>' + esc(section['title']) + '</span><span class="detail-plus" aria-hidden="true">+</span></summary>'
                        '<div class="prose">' + source_markup(section['body']) + '</div></details>')
        return ''.join(rows)

    downloads = ''.join(
        '<a download="' + esc(Path(source['artifact']['path']).name, quote=True) + '" href="data:text/markdown;base64,'
        + base64.b64encode(source['text'].encode('utf-8')).decode('ascii') + '">' + label + '<span aria-hidden="true">↓</span></a>'
        for source, label in [(sources['user'], '下载咨询底稿'), (sources['technical'], '下载技术底稿')])
    provenance = {'schema_version': 1, 'session_id': model['session_id'], 'sources': model['sources'],
                  'model_sha256': hashlib.sha256(safe_json(model).encode('utf-8')).hexdigest(), 'presentation': 'quiet-v1'}
    fallback = ''.join('<li><h3>' + esc(''.join(state['lines'])) + '</h3><p>' + esc(state['description']) + '</p></li>' for state in states)
    if model['presentation'].get('hero_runtime', 'wayfinder-v19') in {'wayfinder-v16', 'wayfinder-v17', 'wayfinder-v18', 'wayfinder-v19'}:
        from render_wayfinder_report import render_wayfinder
        return render_wayfinder(model, {
            'TITLE': esc(model['title']), 'SUBTITLE': paragraphs(model['subtitle']),
            'CHAPTERS': ''.join(chapters), 'TECHNICAL_INTRO': paragraphs(model['technical_intro']),
            'TECHNICAL_CARDS': cards(model['technical_cards'], 'technical-summary'),
            'USER_ORIGINALS': originals('user'), 'TECHNICAL_ORIGINALS': originals('technical'),
            'PREFACE': source_markup(sources['user']['preface']) + source_markup(sources['technical']['preface']),
            'DOWNLOADS': downloads, 'FALLBACK': fallback,
            'CLOSING': paragraphs(model['closing']), 'LIMITS': paragraphs(model['limits']),
        }, provenance)
    immersive = ASSETS / 'immersive'
    bundle_metadata = {'version', 'constructor', 'rig_constructor', 'reveal_duration', 'exit_duration'}
    bundle_bytes = {key: (immersive / filename).read_bytes()
                    for key, filename in HERO_BUNDLE.items() if key not in bundle_metadata}
    rig_meta = json.loads(bundle_bytes['rig_meta'])
    marker_meta = json.loads(bundle_bytes.get('marker_meta', b'{}'))
    provenance['hero'] = {
        'version': HERO_BUNDLE['version'],
        'assets': {key: {'file': HERO_BUNDLE[key], 'sha256': hashlib.sha256(content).hexdigest()}
                   for key, content in bundle_bytes.items()},
        'character': {'original_generated_artwork': bool(rig_meta.get('originalCharacter')),
                      'rig_metadata': HERO_BUNDLE['rig_meta']},
        'three': {'license': 'MIT', 'license_file': HERO_BUNDLE['three_license']},
    }

    def image_data(key):
        return 'data:image/png;base64,' + base64.b64encode(bundle_bytes[key]).decode('ascii')

    def script_text(key):
        # A literal closing tag in a bundled comment/string must never end the
        # containing script element. Model data uses safe_json independently.
        return re.sub(r'</script', r'<\\/script', bundle_bytes[key].decode('utf-8'), flags=re.I)

    hero_assets = {key: image_data(key) for key in ('road', 'character')}
    for key in ('marker', 'world', 'terrain', 'ground', 'grass'):
        if key in bundle_bytes:
            hero_assets[key] = image_data(key)
    if 'grass_meta' in bundle_bytes:
        hero_assets['grassMetadata'] = json.loads(bundle_bytes['grass_meta'])
    hero_assets.update(version=HERO_BUNDLE['version'], constructor=HERO_BUNDLE['constructor'],
                       rigConstructor=HERO_BUNDLE.get('rig_constructor', 'CihouCharacterRig'))
    if 'exit_duration' in HERO_BUNDLE:
        hero_assets['exitDuration'] = HERO_BUNDLE['exit_duration']
    if 'reveal_duration' in HERO_BUNDLE:
        hero_assets['revealDuration'] = HERO_BUNDLE['reveal_duration']
    first = states[0]
    replacements = {
        'TITLE': esc(model['title']), 'FIRST_DESCRIPTION': esc(first['description']),
        'FIRST_LABEL': esc(first['label'], quote=True), 'SUBTITLE': paragraphs(model['subtitle']),
        'CLOSING': paragraphs(model['closing']), 'LIMITS': paragraphs(model['limits']),
        'CHAPTERS': ''.join(chapters), 'TECHNICAL_INTRO': paragraphs(model['technical_intro']),
        'TECHNICAL_CARDS': cards(model['technical_cards'], 'technical-summary'),
        'USER_ORIGINALS': originals('user'), 'TECHNICAL_ORIGINALS': originals('technical'),
        'PREFACE': source_markup(sources['user']['preface']) + source_markup(sources['technical']['preface']),
        'DOWNLOADS': downloads, 'FALLBACK': fallback,
        'DATA': safe_json({'hero_states': states, 'hero_choices': model['presentation'].get('hero_choices', [])}),
        'PROVENANCE': safe_json(provenance),
        'FIRST_LINE_1': esc(first['lines'][0]), 'FIRST_LINE_2': esc(first['lines'][1]),
        'HERO_ASSETS': safe_json(hero_assets), 'RIG_META': safe_json(rig_meta),
        'MARKER_META': safe_json(marker_meta),
        'THREE_JS': '/*\n' + bundle_bytes['three_license'].decode('utf-8') + '\n*/\n' + script_text('three'),
        'RIG_JS': script_text('rig'), 'SCENE_JS': script_text('scene'),
        'CSS': (ASSETS / 'report.css').read_text(encoding='utf-8'),
        'JS': script_text('controller') if 'controller' in bundle_bytes else (ASSETS / 'report.js').read_text(encoding='utf-8'),
    }
    template = (ASSETS / 'report.html').read_text(encoding='utf-8')
    return re.sub(r'@@([A-Z_0-9]+)@@', lambda match: replacements[match[1]], template)

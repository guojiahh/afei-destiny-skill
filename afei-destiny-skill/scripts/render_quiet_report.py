"""Render the quiet editorial presentation from a validated personal report model.

The assets contain only the reusable visual metaphor. Consultation content stays
in the model and its registered source reports; it is never stored in this module.
"""
from __future__ import annotations

import base64
import hashlib
import html
import re
from pathlib import Path


ASSETS = Path(__file__).resolve().parents[1] / 'assets' / 'cihou' / 'quiet'


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
    first = states[0]
    replacements = {
        'TITLE': esc(model['title']), 'FIRST_TITLE': '<br>'.join(esc(line) for line in first['lines']),
        'FIRST_DESCRIPTION': esc(first['description']), 'FIRST_HINT': esc(first['hint']),
        'FIRST_LABEL': esc(first['label'], quote=True), 'SUBTITLE': paragraphs(model['subtitle']),
        'CLOSING': paragraphs(model['closing']), 'LIMITS': paragraphs(model['limits']),
        'DATE': esc(sources['user']['artifact'].get('created_at', '')[:10]), 'VERSION': provenance['model_sha256'][:8],
        'CHAPTERS': ''.join(chapters), 'TECHNICAL_INTRO': paragraphs(model['technical_intro']),
        'TECHNICAL_CARDS': cards(model['technical_cards'], 'technical-summary'),
        'USER_ORIGINALS': originals('user'), 'TECHNICAL_ORIGINALS': originals('technical'),
        'PREFACE': source_markup(sources['user']['preface']) + source_markup(sources['technical']['preface']),
        'DOWNLOADS': downloads, 'FALLBACK': fallback,
        'DATA': safe_json({'hero_states': states}), 'PROVENANCE': safe_json(provenance),
        'ROAD_IMAGE': 'data:image/png;base64,' + base64.b64encode((ASSETS / 'road.png').read_bytes()).decode('ascii'),
        'LOOP_IMAGE': 'data:image/png;base64,' + base64.b64encode((ASSETS / 'loop.png').read_bytes()).decode('ascii'),
        'CSS': (ASSETS / 'report.css').read_text(encoding='utf-8'),
        'JS': (ASSETS / 'report.js').read_text(encoding='utf-8'),
    }
    template = (ASSETS / 'report.html').read_text(encoding='utf-8')
    return re.sub(r'@@([A-Z_]+)@@', lambda match: replacements[match[1]], template)

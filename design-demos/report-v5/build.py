"""Build the standalone, fictional report demo using only Python's standard library."""
import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def validate(data):
    if data.get('schemaVersion') != 1 or not data.get('profiles'):
        raise ValueError('Expected schemaVersion 1 and at least one fictional profile')
    profile_ids = set()
    for profile in data['profiles']:
        if profile['id'] in profile_ids:
            raise ValueError('Duplicate profile ID')
        profile_ids.add(profile['id'])
        nodes = [*profile['history'], profile['current'], *profile['choices']]
        node_ids = [node['id'] for node in nodes]
        if len(node_ids) != len(set(node_ids)):
            raise ValueError(f"Duplicate node ID in {profile['id']}")
        if profile['current']['label'] != '现在':
            raise ValueError('Exactly one explicit current node is required')
        if any(node['label'] == '现在' for node in [*profile['history'], *profile['choices']]):
            raise ValueError('Past and future nodes cannot be labelled as current')
        for node in nodes:
            for field in ('id', 'label', 'title', 'body', 'source', 'status'):
                if not isinstance(node.get(field), str) or not node[field].strip():
                    raise ValueError(f"Missing {field} in {node.get('id')}")
            if len(node['label']) > 4:
                raise ValueError('Main-map labels must fit four Chinese characters')
        for choice in profile['choices']:
            if not choice.get('condition'):
                raise ValueError('Future routes require a condition')
        def check_refs(value):
            if isinstance(value, dict):
                for key, child in value.items():
                    if key == 'nodeId' and child not in node_ids:
                        raise ValueError(f'Unknown detail node: {child}')
                    check_refs(child)
            elif isinstance(value, list):
                for child in value:
                    check_refs(child)
        check_refs(profile['detail'])


def main():
    data = json.loads((ROOT / 'cases.json').read_text())
    validate(data)
    template = (ROOT / 'template.html').read_text()
    encoded = base64.b64encode((ROOT.parent / 'assets/sailboat-v4.png').read_bytes()).decode()
    boat = '<script id="boat-data" type="application/octet-stream">data:image/png;base64,' + encoded + '</script>'
    payload = json.dumps(data, ensure_ascii=False).replace('<', '\\u003c')
    scripts = '<script id="report-data" type="application/json">' + payload + '</script>\n'
    for filename in ('details.js', 'atlas.js'):
        scripts += '<script>\n' + (ROOT / filename).read_text() + '\n</script>\n'
    html = template.replace('<!-- BOAT_ASSET -->', boat).replace('<!-- DETAILS_CSS -->', (ROOT / 'details.css').read_text()).replace('<!-- V5_SCRIPTS -->', scripts)
    destination = ROOT.parent / 'visual-report-v5.html'
    destination.write_text(html)
    print(f'Built {destination.name}: {len(html.encode()):,} bytes; profiles: ' + ', '.join(f"{p['name']} {len(p['history']) + 1 + len(p['choices'])} nodes" for p in data['profiles']))


if __name__ == '__main__':
    main()

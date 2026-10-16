"""Bundle the fictional phase-one prototype; no consultation inputs are read."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
out = ROOT.parent / "cihou-stage1.html"
html = (ROOT / "template.html").read_text(encoding="utf-8")
for marker, name in (("STYLES", "styles.css"), ("CASES", "cases.js"), ("INTERACTIONS", "interactions.js"), ("SCENE", "scene-editorial.js"), ("KINETIC", "scene-kinetic.js"), ("EXPERIENCE", "experience.js"), ("APP", "app.js")):
    source = (ROOT / name).read_text(encoding="utf-8")
    if marker != "STYLES":
        source = source.replace("</script", "<\\/script")
    html = html.replace("/* " + marker + " */", source)
out.write_text(html, encoding="utf-8")
print(f"Built {out.name}: {len(html.encode('utf-8')):,} bytes, self-contained")

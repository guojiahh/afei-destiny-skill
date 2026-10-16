"""Build the anonymous visual prototype as a self-contained local HTML file."""
import base64
from pathlib import Path


def main():
    source = Path(__file__).resolve().parent
    html = (source / "index.html").read_text(encoding="utf-8")
    html = html.replace('<link rel="stylesheet" href="styles.css">',
                        "<style>\n" + (source / "styles.css").read_text(encoding="utf-8") + "\n</style>")
    html = html.replace('<script src="app.js" defer></script>', "")
    html = html.replace("</body>", "<script>\n" + (source / "app.js").read_text(encoding="utf-8") + "\n</script>\n</body>")
    html = html.replace('href="./"', 'href="#"')
    for name in ("road.png", "loop.png"):
        encoded = base64.b64encode((source / "assets" / name).read_bytes()).decode("ascii")
        html = html.replace("assets/" + name, "data:image/png;base64," + encoded)
    target = source.parent / "cihou-quiet.html"
    target.write_text("\n".join(line.rstrip() for line in html.splitlines()) + "\n", encoding="utf-8")
    print(f"{target} ({target.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()

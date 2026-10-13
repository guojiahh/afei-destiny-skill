#!/usr/bin/env python3
"""Run repository checks without reading ignored consultations or benchmark caches."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]


def run(label: str, command: list[str]) -> bool:
    print(f"\n== {label} ==", flush=True)
    result = subprocess.run(command, cwd=ROOT)
    return result.returncode == 0


def check_markdown_links() -> bool:
    result = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z", "--", "*.md"],
        cwd=ROOT, check=True, capture_output=True,
    )
    paths = sorted(set(os.fsdecode(name) for name in result.stdout.split(b"\0") if name))
    failures = []
    checked = 0
    for name in paths:
        path = ROOT / name
        if not path.is_file():  # A tracked deletion has no links left to check.
            continue
        checked += 1
        content = path.read_text(encoding="utf-8")
        content = re.sub(r"```.*?```|~~~.*?~~~", "", content, flags=re.S)
        destinations = re.findall(r"\[[^\]]*\]\(([^\n]+?)\)", content)
        destinations += re.findall(r'<img\b[^>]*\bsrc=["\']([^"\']+)["\']', content)
        for raw in destinations:
            target = raw[1:raw.find(">")] if raw.startswith("<") else raw.split()[0]
            parsed = urlsplit(target)
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            if not (path.parent / unquote(parsed.path)).exists():
                failures.append(f"{name}: {target}")
    print(f"\nMarkdown local targets: {checked} files, {len(failures)} missing", flush=True)
    for failure in failures:
        print(f"  {failure}")
    return not failures


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skill", action="store_true", help="also run the installed skill-creator validator")
    parser.add_argument("--skill-validator", type=Path, help="explicit path to quick_validate.py (implies --skill)")
    args = parser.parse_args()
    if not (3, 9) <= sys.version_info[:2] <= (3, 13):
        parser.error("use Python 3.9 through 3.13")

    checks = [
        ("Skill tests", [sys.executable, "-m", "unittest", "discover", "-s", "afei-destiny-skill/scripts", "-p", "test_*.py"]),
        ("Evaluation tests", [sys.executable, "-m", "unittest", "discover", "-s", "evaluation", "-p", "test_*.py"]),
        ("Environment", [sys.executable, "afei-destiny-skill/scripts/doctor.py"]),
        ("Whitespace", ["git", "-c", "core.safecrlf=false", "diff", "--check"]),
    ]
    if args.skill or args.skill_validator:
        codex_dir = Path(os.environ.get("CODEX_HOME") or Path.home() / ".codex")
        validator = args.skill_validator or codex_dir / "skills/.system/skill-creator/scripts/quick_validate.py"
        if not validator.is_file():
            parser.error("skill-creator validator not found; supply --skill-validator /path/to/quick_validate.py")
        checks.append(("Skill structure", [sys.executable, str(validator.resolve()), "afei-destiny-skill"]))
    results = [run(label, command) for label, command in checks]
    results.append(check_markdown_links())
    print("\nAll checks passed." if all(results) else "\nWorkspace checks failed.")
    return 0 if all(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())

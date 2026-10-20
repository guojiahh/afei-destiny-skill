#!/usr/bin/env python3
"""Read-only environment diagnostics for Afei Destiny Skill."""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import sys
import tempfile
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
# Current complete release manifest, hashed as UTF-8 JSON with sorted object
# keys and compact separators. Update deliberately when resource inventory changes;
# source indentation and LF/CRLF do not affect this digest.
WAYFINDER_MANIFEST_SHA256 = "e610b2e83752f07e27bc2d84ff3d3b72f33b8b2b83409de6e4a2efa969453be8"


def check(name: str, ok: bool, detail: str) -> dict[str, Any]:
    return {"name": name, "ok": bool(ok), "detail": detail}


def check_report_files(skill_dir: Path) -> dict[str, Any]:
    """Check the installed default report, not files in the development repo."""
    required = [
        "scripts/generate_html_report.py",
        "scripts/render_quiet_report.py",
        "scripts/render_wayfinder_report.py",
        "references/html-report.md",
        "references/loop-narrative.md",
        "assets/cihou/user-report-template.md",
        "assets/cihou/technical-report-template.md",
        "assets/cihou/mobius-model-template.json",
        "assets/cihou/quiet/report.css",
    ]
    required += [
        "assets/cihou/quiet/wayfinder/" + name
        for name in (
            "report.html", "report.css", "bootstrap.js", "adapter.js",
            "choice-effects.js", "ui.js", "runtime/wayfinder.js",
            "runtime/fonts.525e81a0.css", "runtime/main.7011abb4.css",
            "runtime/src.1489fb19.css",
        )
    ]
    missing = [name for name in required if not (skill_dir / name).is_file()]
    return check("html_report_files", not missing,
                 "missing=" + ", ".join(missing) if missing else "default V21 renderer and templates complete")


def check_wayfinder_assets(directory: Path) -> dict[str, Any]:
    """Fail during installation diagnostics if a report resource is incomplete."""
    try:
        entries = json.loads((directory / "asset-manifest.json").read_text(encoding="utf-8"))
        if not isinstance(entries, list) or not entries:
            raise ValueError("asset-manifest.json must contain a nonempty resource list")
        canonical = json.dumps(entries, ensure_ascii=False, sort_keys=True,
                               separators=(",", ":")).encode("utf-8")
        if hashlib.sha256(canonical).hexdigest() != WAYFINDER_MANIFEST_SHA256:
            raise ValueError("asset-manifest.json does not match the complete release inventory")
        asset_root = (directory / "assets").resolve()
        for entry in entries:
            path = (asset_root / entry["path"].lstrip("/")).resolve()
            path.relative_to(asset_root)
            raw = path.read_bytes()
            if hashlib.sha256(raw).hexdigest() != entry["sha256"]:
                raise ValueError("asset digest mismatch: " + entry["path"])
        return check("html_report_assets", True, f"{len(entries)} resources verified (SHA-256)")
    except (OSError, ValueError, KeyError, TypeError, AttributeError) as exc:
        return check("html_report_assets", False,
                     f"{exc}; reinstall the complete afei-destiny-skill directory, including assets/")


def run_checks(session_dir: Path | None = None) -> dict[str, Any]:
    checks: list[dict[str, Any]] = []
    version_ok = (3, 9) <= sys.version_info[:2] < (3, 14)
    checks.append(
        check(
            "python_version",
            version_ok,
            f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}; expected 3.9-3.13",
        )
    )

    required = (
        SKILL_DIR / "SKILL.md",
        SCRIPT_DIR / "calculate_bazi.py",
        SCRIPT_DIR / "blind_opening.py",
        SCRIPT_DIR / "consultation_harness.py",
        SCRIPT_DIR / "consultation_output_router.py",
        SCRIPT_DIR / "validate_final_report.py",
        SKILL_DIR / "references" / "runtime-setup.md",
        SKILL_DIR / "references" / "calculation-conventions.md",
        SKILL_DIR / "references" / "guided-consultation.md",
        SKILL_DIR / "references" / "preblind-analysis.md",
        SKILL_DIR / "references" / "consultation-harness.md",
        SKILL_DIR / "references" / "output-routing.md",
        SKILL_DIR / "references" / "markdown-report.md",
        SKILL_DIR / "references" / "technical-report.md",
    )
    missing = [str(path.relative_to(SKILL_DIR)) for path in required if not path.is_file()]
    checks.append(check("required_files", not missing, "missing=" + ",".join(missing) if missing else "complete"))
    checks.append(check_report_files(SKILL_DIR))
    checks.append(check_wayfinder_assets(SKILL_DIR / "assets/cihou/quiet/wayfinder"))

    vendor_dir = SCRIPT_DIR / "vendor"
    if str(vendor_dir) not in sys.path:
        sys.path.insert(0, str(vendor_dir))
    lunar = importlib.util.find_spec("lunar_python")
    checks.append(
        check(
            "lunar_python",
            lunar is not None,
            str(lunar.origin) if lunar else f"not importable from {vendor_dir}",
        )
    )

    if str(SCRIPT_DIR) not in sys.path:
        sys.path.insert(0, str(SCRIPT_DIR))
    try:
        from calculate_bazi import build_chart

        chart = build_chart(
            calendar="solar",
            year=1974,
            month=4,
            day=28,
            hour=16,
            minute=40,
            gender="male",
        )
        actual = chart["four_pillars"]["text"]
        expected = "甲寅 戊辰 己亥 壬申"
        checks.append(check("calculator_fixture", actual == expected, f"got={actual}; expected={expected}"))
    except Exception as exc:  # diagnostics must report rather than hide import failures
        checks.append(check("calculator_fixture", False, repr(exc)))

    target = session_dir
    temporary: tempfile.TemporaryDirectory[str] | None = None
    try:
        if target is None:
            temporary = tempfile.TemporaryDirectory()
            target = Path(temporary.name)
        target.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryFile(dir=target, prefix=".afei-destiny-skill-doctor-") as probe:
            probe.write(b"ok")
        checks.append(check("session_directory_writable", True, str(target.resolve())))
    except OSError as exc:
        checks.append(check("session_directory_writable", False, repr(exc)))
    finally:
        if temporary is not None:
            temporary.cleanup()

    return {
        "ok": all(row["ok"] for row in checks),
        "skill_dir": str(SKILL_DIR),
        "checks": checks,
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Diagnose the Afei Destiny Skill environment.")
    parser.add_argument("--session-dir", type=Path)
    parser.add_argument("--json", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    result = run_checks(args.session_dir)
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        for row in result["checks"]:
            marker = "OK" if row["ok"] else "FAIL"
            print(f"[{marker}] {row['name']}: {row['detail']}")
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

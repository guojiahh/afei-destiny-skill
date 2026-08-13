#!/usr/bin/env python3
"""Read-only environment diagnostics for the installable Bazi skill."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
import tempfile
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent


def check(name: str, ok: bool, detail: str) -> dict[str, Any]:
    return {"name": name, "ok": bool(ok), "detail": detail}


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
        probe = target / ".bazi-doctor-write-probe"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink()
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
    parser = argparse.ArgumentParser(description="Diagnose the Bazi skill environment.")
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

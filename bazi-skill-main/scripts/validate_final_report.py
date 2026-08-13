#!/usr/bin/env python3
"""Validate the reader-first structure of a generated Bazi final report."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


REQUIRED_HEADINGS = (
    "## 一、一页总览",
    "## 二、本次重点问题",
    "## 三、人生全景图",
    "## 四、当前阶段与未来窗口",
    "## 五、行动与选择提示",
    "## 六、开场判断、用户反馈与修正",
    "## 七、结论边界与未解问题",
    "## 八、技术文档与阅读说明",
)
FORBIDDEN_TECHNICAL_HEADINGS = (
    "命盘与计算口径",
    "四柱、十神与藏干",
    "命局结构完整分析",
    "旺衰、格局、调候与病药",
    "合冲刑害与大运推导",
)


def validate_report_text(text: str) -> list[str]:
    issues: list[str] = []
    positions: list[int] = []
    heading_positions: dict[str, int] = {}
    for heading in REQUIRED_HEADINGS:
        matches = list(re.finditer(rf"(?m)^{re.escape(heading)}\s*$", text))
        if len(matches) != 1:
            issues.append(f"required heading must appear exactly once: {heading}")
        else:
            positions.append(matches[0].start())
            heading_positions[heading] = matches[0].start()
    if len(positions) >= 2 and positions != sorted(positions):
        issues.append("required headings are out of order")

    headings = [line.strip() for line in text.splitlines() if line.startswith("##")]
    for forbidden in FORBIDDEN_TECHNICAL_HEADINGS:
        if any(forbidden in heading for heading in headings):
            issues.append(f"technical content must move to technical_analysis.md: {forbidden}")
    if "technical_analysis.md" not in text:
        issues.append("final report must point readers to technical_analysis.md")

    focus_heading = REQUIRED_HEADINGS[1]
    panorama_heading = REQUIRED_HEADINGS[2]
    if focus_heading in heading_positions and panorama_heading in heading_positions:
        focus_text = text[
            heading_positions[focus_heading]:heading_positions[panorama_heading]
        ]
        for subheading in ("### 现实中的具体场景", "### 心结收束"):
            if not re.search(rf"(?m)^{re.escape(subheading)}\s*$", focus_text):
                issues.append(f"focus section must include: {subheading}")
    return issues


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Validate a user-facing Bazi final report.")
    parser.add_argument("report", type=Path)
    parser.add_argument("--json", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        text = args.report.read_text(encoding="utf-8")
    except OSError as exc:
        issues = [f"cannot read report: {exc}"]
    else:
        issues = validate_report_text(text)
    result = {"ok": not issues, "report": str(args.report), "issues": issues}
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    elif issues:
        for issue in issues:
            print(f"[FAIL] {issue}", file=sys.stderr)
    else:
        print("[OK] final report structure is reader-first")
    return 0 if not issues else 1


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Tests for the reader-first final report validator."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from validate_final_report import REQUIRED_HEADINGS, validate_report_text


def valid_report() -> str:
    sections = ["# 用户报告"]
    for heading in REQUIRED_HEADINGS:
        sections.append(heading)
        if heading == "## 二、本次重点问题":
            sections.extend((
                "### 现实中的具体场景",
                "例如，可能表现为场景一；如果条件变化，也可能表现为场景二。",
                "### 心结收束",
                "分清已经知道、仍然未知和可以选择的部分。",
            ))
    sections.append("详见 technical_analysis.md")
    return "\n\n".join(sections)


class FinalReportValidationTests(unittest.TestCase):
    def test_accepts_reader_first_structure(self):
        self.assertEqual([], validate_report_text(valid_report()))

    def test_rejects_old_technical_first_heading(self):
        report = valid_report().replace(
            "## 二、本次重点问题",
            "## 二、命盘与计算口径\n\n## 二、本次重点问题",
        )
        issues = validate_report_text(report)
        self.assertTrue(any("technical_analysis.md" in issue for issue in issues))

    def test_rejects_reordered_or_missing_sections(self):
        report = valid_report().replace(
            "## 二、本次重点问题", "__FOCUS_HEADING__", 1
        ).replace(
            "## 三、人生全景图", "## 二、本次重点问题", 1
        ).replace(
            "__FOCUS_HEADING__", "## 三、人生全景图", 1
        ).replace("## 六、开场判断、用户反馈与修正", "")
        issues = validate_report_text(report)
        self.assertTrue(any("out of order" in issue for issue in issues))
        self.assertTrue(any("required heading" in issue for issue in issues))

    def test_rejects_focus_without_scenarios_or_emotional_closeout(self):
        report = valid_report().replace("### 现实中的具体场景", "### 普通分析")
        report = report.replace("### 心结收束", "### 普通总结")
        issues = validate_report_text(report)
        self.assertTrue(any("现实中的具体场景" in issue for issue in issues))
        self.assertTrue(any("心结收束" in issue for issue in issues))


if __name__ == "__main__":
    unittest.main()

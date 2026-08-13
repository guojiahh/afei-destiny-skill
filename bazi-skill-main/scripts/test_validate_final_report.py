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
    return "\n\n".join(("# 用户报告", *REQUIRED_HEADINGS, "详见 technical_analysis.md"))


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
            "## 二、本次重点问题\n\n## 三、人生全景图",
            "## 三、人生全景图\n\n## 二、本次重点问题",
        ).replace("## 六、开场判断、用户反馈与修正", "")
        issues = validate_report_text(report)
        self.assertTrue(any("out of order" in issue for issue in issues))
        self.assertTrue(any("required heading" in issue for issue in issues))


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""Regression tests for calculate_bazi.py using independent chart fixtures."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from calculate_bazi import (
    build_chart,
    composite_branch_relations,
    correct_true_solar_time,
    pair_relations,
)


class ChartRegressionTests(unittest.TestCase):
    FIXTURES = (
        ("1974-04-28", "16:40", "male", "甲寅 戊辰 己亥 壬申"),
        ("1981-06-17", "19:00", "male", "辛酉 甲午 丙寅 戊戌"),
        ("1980-08-24", "16:30", "female", "庚申 甲申 己巳 壬申"),
        ("1951-11-14", "09:00", "female", "辛卯 己亥 戊午 丁巳"),
        ("1970-07-22", "15:00", "male", "庚戌 癸未 癸卯 庚申"),
    )

    def test_independent_chart_fixtures(self):
        for date, time, gender, expected in self.FIXTURES:
            with self.subTest(date=date, time=time):
                y, m, d = (int(x) for x in date.split("-"))
                hh, mm = (int(x) for x in time.split(":"))
                result = build_chart(
                    calendar="solar", year=y, month=m, day=d,
                    hour=hh, minute=mm, gender=gender,
                )
                self.assertEqual(expected, result["four_pillars"]["text"])

    def test_target_year_includes_active_cycle(self):
        result = build_chart(
            calendar="solar", year=1983, month=10, day=19,
            hour=9, minute=58, gender="male", target_year=2011,
        )
        self.assertEqual("辛卯", result["target_year"]["ganzhi"])
        self.assertIsNotNone(result["target_year"]["active_luck_cycle"])
        self.assertIn("interactions_of_luck_with_natal_chart", result["target_year"])
        self.assertIn("interactions_between_luck_and_year", result["target_year"])
        self.assertIn("composite_formations", result["target_year"])

    def test_luck_year_matrix_reports_same_stem_and_branch_clash(self):
        result = build_chart(
            calendar="solar", year=1972, month=11, day=2,
            hour=10, minute=0, gender="male", target_year=2004,
        )
        relations = result["target_year"]["interactions_between_luck_and_year"]
        self.assertIn(
            {"context": "大运甲寅-流年2004", "layer": "天干", "relation": "同干"},
            relations,
        )
        self.assertIn(
            {"context": "大运甲寅-流年2004", "layer": "地支", "relation": "六冲"},
            relations,
        )

    def test_zi_hour_convention_is_explicit(self):
        next_day = build_chart(
            calendar="solar", year=2000, month=1, day=1,
            hour=23, minute=30, gender="male", day_boundary="zi-next",
        )
        civil_day = build_chart(
            calendar="solar", year=2000, month=1, day=1,
            hour=23, minute=30, gender="male", day_boundary="civil-midnight",
        )
        self.assertNotEqual(
            next_day["four_pillars"]["pillars"][2]["ganzhi"],
            civil_day["four_pillars"]["pillars"][2]["ganzhi"],
        )

    def test_true_solar_correction_moves_western_location_earlier(self):
        from datetime import datetime

        corrected, details = correct_true_solar_time(
            datetime(2000, 6, 1, 12, 0), longitude=105.0, utc_offset=8.0
        )
        self.assertLess(corrected, datetime(2000, 6, 1, 12, 0))
        self.assertLess(details["total_correction_minutes"], 0)

    def test_relation_layers_and_partial_combinations_are_explicit(self):
        si = {"label": "甲", "stem": "丁", "branch": "巳"}
        you = {"label": "乙", "stem": "癸", "branch": "酉"}
        relations = pair_relations(si, you)
        self.assertIn(
            {"context": "甲-乙", "layer": "天干", "relation": "相冲"},
            relations,
        )
        self.assertIn(
            {"context": "甲-乙", "layer": "地支", "relation": "半合金"},
            relations,
        )
        self.assertNotIn(
            {"context": "甲-乙", "layer": "地支", "relation": "六冲"},
            relations,
        )
        self.assertNotIn(
            {"context": "甲-乙", "layer": "干支", "relation": "伏吟"},
            relations,
        )

    def test_composite_relations_report_contributing_labels(self):
        rows = [
            {"label": "年柱", "branch": "寅"},
            {"label": "日柱", "branch": "午"},
            {"label": "流年", "branch": "戌"},
        ]
        result = composite_branch_relations(rows, "测试")
        self.assertIn(
            {
                "context": "测试",
                "layer": "地支",
                "relation": "三合火局",
                "members": {"午": ["日柱"], "寅": ["年柱"], "戌": ["流年"]},
            },
            result,
        )


if __name__ == "__main__":
    unittest.main()

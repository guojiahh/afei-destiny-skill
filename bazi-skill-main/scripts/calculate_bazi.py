#!/usr/bin/env python3
"""Deterministic BaZi chart calculation for the bundled skill.

The script vendors lunar_python 1.4.8 under scripts/vendor. It calculates
calendar-derived facts and a clearly-labelled strength heuristic; narrative
fortune claims remain the language model's responsibility.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
VENDOR_DIR = SCRIPT_DIR / "vendor"
sys.path.insert(0, str(VENDOR_DIR))

from lunar_python import Lunar, Solar  # noqa: E402


STEM_META = {
    "甲": ("木", "阳"), "乙": ("木", "阴"),
    "丙": ("火", "阳"), "丁": ("火", "阴"),
    "戊": ("土", "阳"), "己": ("土", "阴"),
    "庚": ("金", "阳"), "辛": ("金", "阴"),
    "壬": ("水", "阳"), "癸": ("水", "阴"),
}

BRANCH_ELEMENT = {
    "子": "水", "丑": "土", "寅": "木", "卯": "木",
    "辰": "土", "巳": "火", "午": "火", "未": "土",
    "申": "金", "酉": "金", "戌": "土", "亥": "水",
}

GENERATES = {"木": "火", "火": "土", "土": "金", "金": "水", "水": "木"}
CONTROLS = {"木": "土", "土": "水", "水": "火", "火": "金", "金": "木"}
RESOURCE_FOR = {value: key for key, value in GENERATES.items()}
CONTROLLER_OF = {value: key for key, value in CONTROLS.items()}

STEM_COMBINES = {
    frozenset(("甲", "己")): "合土", frozenset(("乙", "庚")): "合金",
    frozenset(("丙", "辛")): "合水", frozenset(("丁", "壬")): "合木",
    frozenset(("戊", "癸")): "合火",
}
STEM_CLASHES = {
    frozenset(("甲", "庚")), frozenset(("乙", "辛")),
    frozenset(("丙", "壬")), frozenset(("丁", "癸")),
}

BRANCH_COMBINES = {
    frozenset(("子", "丑")): "六合", frozenset(("寅", "亥")): "六合",
    frozenset(("卯", "戌")): "六合", frozenset(("辰", "酉")): "六合",
    frozenset(("巳", "申")): "六合", frozenset(("午", "未")): "六合",
}
BRANCH_CLASHES = {
    frozenset(("子", "午")), frozenset(("丑", "未")),
    frozenset(("寅", "申")), frozenset(("卯", "酉")),
    frozenset(("辰", "戌")), frozenset(("巳", "亥")),
}
BRANCH_HARMS = {
    frozenset(("子", "未")), frozenset(("丑", "午")),
    frozenset(("寅", "巳")), frozenset(("卯", "辰")),
    frozenset(("申", "亥")), frozenset(("酉", "戌")),
}
BRANCH_BREAKS = {
    frozenset(("子", "酉")), frozenset(("丑", "辰")),
    frozenset(("寅", "亥")), frozenset(("卯", "午")),
    frozenset(("巳", "申")), frozenset(("未", "戌")),
}
BRANCH_PUNISH_PAIRS = {
    frozenset(("子", "卯")): "无礼之刑",
}
SELF_PUNISH = {"辰", "午", "酉", "亥"}
BRANCH_HALF_COMBINES = {
    frozenset(("申", "子")): "半合水", frozenset(("子", "辰")): "半合水",
    frozenset(("申", "辰")): "拱水",
    frozenset(("亥", "卯")): "半合木", frozenset(("卯", "未")): "半合木",
    frozenset(("亥", "未")): "拱木",
    frozenset(("寅", "午")): "半合火", frozenset(("午", "戌")): "半合火",
    frozenset(("寅", "戌")): "拱火",
    frozenset(("巳", "酉")): "半合金", frozenset(("酉", "丑")): "半合金",
    frozenset(("巳", "丑")): "拱金",
}
TRIPLE_COMBINES = {
    frozenset(("申", "子", "辰")): "三合水局",
    frozenset(("亥", "卯", "未")): "三合木局",
    frozenset(("寅", "午", "戌")): "三合火局",
    frozenset(("巳", "酉", "丑")): "三合金局",
}
TRIPLE_MEETINGS = {
    frozenset(("寅", "卯", "辰")): "三会木方",
    frozenset(("巳", "午", "未")): "三会火方",
    frozenset(("申", "酉", "戌")): "三会金方",
    frozenset(("亥", "子", "丑")): "三会水方",
}
TRIPLE_PUNISH = {
    frozenset(("寅", "巳", "申")): "寅巳申三刑",
    frozenset(("丑", "戌", "未")): "丑戌未三刑",
}

HIDDEN_WEIGHTS = {
    1: (1.0,),
    2: (0.7, 0.3),
    3: (0.6, 0.3, 0.1),
}

SEASON_FACTORS = {
    "寅": {"木": 1.60, "火": 1.15, "土": 0.85, "金": 0.60, "水": 0.90},
    "卯": {"木": 1.70, "火": 1.15, "土": 0.80, "金": 0.55, "水": 0.85},
    "辰": {"木": 1.10, "火": 1.00, "土": 1.45, "金": 0.80, "水": 0.85},
    "巳": {"木": 0.90, "火": 1.65, "土": 1.15, "金": 0.65, "水": 0.55},
    "午": {"木": 0.80, "火": 1.75, "土": 1.20, "金": 0.55, "水": 0.50},
    "未": {"木": 0.85, "火": 1.10, "土": 1.50, "金": 0.80, "水": 0.55},
    "申": {"木": 0.55, "火": 0.65, "土": 0.95, "金": 1.70, "水": 1.10},
    "酉": {"木": 0.50, "火": 0.60, "土": 0.90, "金": 1.75, "水": 1.10},
    "戌": {"木": 0.65, "火": 0.85, "土": 1.50, "金": 1.05, "水": 0.65},
    "亥": {"木": 1.10, "火": 0.50, "土": 0.65, "金": 0.90, "水": 1.70},
    "子": {"木": 1.10, "火": 0.45, "土": 0.60, "金": 0.85, "水": 1.75},
    "丑": {"木": 0.70, "火": 0.55, "土": 1.45, "金": 1.00, "水": 1.10},
}


def _round_map(values: dict[str, float]) -> dict[str, float]:
    return {key: round(values.get(key, 0.0), 3) for key in ("木", "火", "土", "金", "水")}


def equation_of_time_minutes(moment: datetime) -> float:
    """Return a standard approximation of the equation of time in minutes."""
    day = moment.timetuple().tm_yday
    b = 2 * math.pi * (day - 81) / 365
    return 9.87 * math.sin(2 * b) - 7.53 * math.cos(b) - 1.5 * math.sin(b)


def correct_true_solar_time(
    local_clock: datetime,
    longitude: float,
    utc_offset: float,
    dst_minutes: int = 0,
) -> tuple[datetime, dict[str, Any]]:
    standard_meridian = utc_offset * 15.0
    longitude_minutes = 4.0 * (longitude - standard_meridian)
    eot_minutes = equation_of_time_minutes(local_clock)
    total = longitude_minutes + eot_minutes - dst_minutes
    corrected = local_clock + timedelta(minutes=total)
    return corrected, {
        "method": "apparent-solar-time approximation",
        "longitude": longitude,
        "utc_offset_standard_hours": utc_offset,
        "standard_meridian": standard_meridian,
        "longitude_correction_minutes": round(longitude_minutes, 3),
        "equation_of_time_minutes": round(eot_minutes, 3),
        "dst_removed_minutes": dst_minutes,
        "total_correction_minutes": round(total, 3),
        "corrected_local_datetime": corrected.isoformat(sep=" "),
        "precision_note": "Approximation suitable for boundary checks; verify historically unusual civil-time rules separately.",
    }


def _pillar(
    label: str,
    ganzhi: str,
    hidden: list[str],
    ten_god_stem: str,
    ten_god_hidden: list[str],
    growth_stage: str,
    nayin: str,
) -> dict[str, Any]:
    stem, branch = ganzhi[0], ganzhi[1]
    hidden_rows = []
    for index, hidden_stem in enumerate(hidden):
        hidden_rows.append({
            "stem": hidden_stem,
            "element": STEM_META[hidden_stem][0],
            "yin_yang": STEM_META[hidden_stem][1],
            "ten_god": ten_god_hidden[index],
        })
    return {
        "label": label,
        "ganzhi": ganzhi,
        "stem": stem,
        "branch": branch,
        "stem_element": STEM_META[stem][0],
        "stem_yin_yang": STEM_META[stem][1],
        "branch_element": BRANCH_ELEMENT[branch],
        "ten_god_stem": ten_god_stem,
        "hidden_stems": hidden_rows,
        "growth_stage": growth_stage,
        "nayin": nayin,
    }


def pair_relations(a: dict[str, Any], b: dict[str, Any]) -> list[dict[str, str]]:
    results: list[dict[str, str]] = []
    stem_pair = frozenset((a["stem"], b["stem"]))
    branch_pair = frozenset((a["branch"], b["branch"]))
    context = f'{a["label"]}-{b["label"]}'
    if stem_pair in STEM_COMBINES:
        results.append({"context": context, "layer": "天干", "relation": STEM_COMBINES[stem_pair]})
    if stem_pair in STEM_CLASHES:
        results.append({"context": context, "layer": "天干", "relation": "相冲"})
    if branch_pair in BRANCH_COMBINES:
        results.append({"context": context, "layer": "地支", "relation": BRANCH_COMBINES[branch_pair]})
    if branch_pair in BRANCH_CLASHES:
        results.append({"context": context, "layer": "地支", "relation": "六冲"})
    if branch_pair in BRANCH_HARMS:
        results.append({"context": context, "layer": "地支", "relation": "相害"})
    if branch_pair in BRANCH_BREAKS:
        results.append({"context": context, "layer": "地支", "relation": "相破"})
    if branch_pair in BRANCH_PUNISH_PAIRS:
        results.append({"context": context, "layer": "地支", "relation": BRANCH_PUNISH_PAIRS[branch_pair]})
    if branch_pair in BRANCH_HALF_COMBINES:
        results.append({"context": context, "layer": "地支", "relation": BRANCH_HALF_COMBINES[branch_pair]})
    if a["branch"] == b["branch"] and a["branch"] in SELF_PUNISH:
        results.append({"context": context, "layer": "地支", "relation": "自刑"})
    return results


def natal_relations(pillars: list[dict[str, Any]]) -> list[dict[str, str]]:
    results: list[dict[str, str]] = []
    for index, a in enumerate(pillars):
        for b in pillars[index + 1:]:
            results.extend(pair_relations(a, b))
    branches = {pillar["branch"] for pillar in pillars}
    for pattern_map in (TRIPLE_COMBINES, TRIPLE_MEETINGS, TRIPLE_PUNISH):
        for members, name in pattern_map.items():
            if members.issubset(branches):
                results.append({"context": "命局", "layer": "地支", "relation": name})
    return results


def element_profile(pillars: list[dict[str, Any]]) -> dict[str, Any]:
    raw = defaultdict(float)
    weighted = defaultdict(float)
    day_element = pillars[2]["stem_element"]
    month_branch = pillars[1]["branch"]
    factors = SEASON_FACTORS[month_branch]

    for pillar in pillars:
        stem_element = pillar["stem_element"]
        raw[stem_element] += 1.0
        weighted[stem_element] += 1.0
        hidden = pillar["hidden_stems"]
        weights = HIDDEN_WEIGHTS[len(hidden)]
        branch_multiplier = 1.5 if pillar["label"] == "月柱" else 1.0
        for item, weight in zip(hidden, weights):
            raw[item["element"]] += weight
            weighted[item["element"]] += weight * branch_multiplier

    seasonal = {element: weighted[element] * factors[element] for element in factors}
    total = sum(seasonal.values()) or 1.0
    normalized = {element: seasonal[element] / total for element in seasonal}
    resource_element = RESOURCE_FOR[day_element]
    support_ratio = normalized[day_element] + normalized[resource_element]
    root_count = sum(
        1 for pillar in pillars
        if any(item["element"] == day_element for item in pillar["hidden_stems"])
    )

    if support_ratio >= 0.58 or (support_ratio >= 0.50 and root_count >= 2):
        classification = "偏强"
    elif support_ratio <= 0.36 and root_count == 0:
        classification = "偏弱"
    elif 0.43 <= support_ratio <= 0.57:
        classification = "相对平衡"
    elif support_ratio > 0.57:
        classification = "略偏强"
    else:
        classification = "略偏弱"

    output_element = GENERATES[day_element]
    wealth_element = CONTROLS[day_element]
    officer_element = CONTROLLER_OF[day_element]
    if "强" in classification:
        tendency = [output_element, wealth_element, officer_element]
    elif "弱" in classification:
        tendency = [resource_element, day_element]
    else:
        tendency = sorted(normalized, key=normalized.get)[:2]

    margin = abs(support_ratio - 0.5)
    confidence = "低" if margin < 0.07 else "中" if margin < 0.16 else "较高"
    return {
        "day_master_element": day_element,
        "raw_presence": _round_map(raw),
        "season_adjusted_weight": _round_map(seasonal),
        "normalized_share": _round_map(normalized),
        "support_ratio": round(support_ratio, 3),
        "root_count": root_count,
        "heuristic_strength": classification,
        "heuristic_confidence": confidence,
        "balancing_element_tendency": tendency,
        "warning": "This is a transparent triage heuristic, not a canonical final determination. Recheck transformations, combinations, climate adjustment and follow/transform structures before choosing useful gods.",
    }


def _solar_from_input(
    calendar: str,
    year: int,
    month: int,
    day: int,
    hour: int,
    minute: int,
    second: int,
    leap: bool,
) -> Solar:
    if calendar == "solar":
        return Solar.fromYmdHms(year, month, day, hour, minute, second)
    lunar_month = -month if leap else month
    return Lunar.fromYmdHms(year, lunar_month, day, hour, minute, second).getSolar()


def _format_jie(jie: Any) -> dict[str, str] | None:
    if jie is None:
        return None
    return {"name": jie.getName(), "datetime": jie.getSolar().toYmdHms()}


def _yun_payload(eight_char: Any, gender_value: int, sect: int) -> dict[str, Any]:
    yun = eight_char.getYun(gender_value, sect)
    dayun_rows = []
    for item in yun.getDaYun(11):
        dayun_rows.append({
            "index": item.getIndex(),
            "ganzhi": item.getGanZhi(),
            "start_year": item.getStartYear(),
            "end_year": item.getEndYear(),
            "start_nominal_age": item.getStartAge(),
            "end_nominal_age": item.getEndAge(),
        })
    return {
        "method_sect": sect,
        "forward": yun.isForward(),
        "start_offset": {
            "years": yun.getStartYear(), "months": yun.getStartMonth(),
            "days": yun.getStartDay(), "hours": yun.getStartHour(),
        },
        "start_solar": yun.getStartSolar().toYmdHms(),
        "cycles": dayun_rows,
    }


def build_chart(
    *,
    calendar: str,
    year: int,
    month: int,
    day: int,
    hour: int,
    minute: int,
    second: int = 0,
    gender: str,
    leap: bool = False,
    day_boundary: str = "zi-next",
    longitude: float | None = None,
    utc_offset: float | None = None,
    dst_minutes: int = 0,
    target_year: int | None = None,
) -> dict[str, Any]:
    solar = _solar_from_input(calendar, year, month, day, hour, minute, second, leap)
    civil_moment = datetime(
        solar.getYear(), solar.getMonth(), solar.getDay(),
        solar.getHour(), solar.getMinute(), solar.getSecond(),
    )
    solar_correction = None
    calculation_moment = civil_moment
    if longitude is not None or utc_offset is not None:
        if longitude is None or utc_offset is None:
            raise ValueError("longitude and utc_offset must be supplied together")
        calculation_moment, solar_correction = correct_true_solar_time(
            civil_moment, longitude, utc_offset, dst_minutes
        )

    calculation_solar = Solar.fromYmdHms(
        calculation_moment.year, calculation_moment.month, calculation_moment.day,
        calculation_moment.hour, calculation_moment.minute, calculation_moment.second,
    )
    lunar = calculation_solar.getLunar()
    eight = lunar.getEightChar()
    eight.setSect(1 if day_boundary == "zi-next" else 2)

    pillars = [
        _pillar("年柱", eight.getYear(), eight.getYearHideGan(), eight.getYearShiShenGan(),
                eight.getYearShiShenZhi(), eight.getYearDiShi(), eight.getYearNaYin()),
        _pillar("月柱", eight.getMonth(), eight.getMonthHideGan(), eight.getMonthShiShenGan(),
                eight.getMonthShiShenZhi(), eight.getMonthDiShi(), eight.getMonthNaYin()),
        _pillar("日柱", eight.getDay(), eight.getDayHideGan(), "日主",
                eight.getDayShiShenZhi(), eight.getDayDiShi(), eight.getDayNaYin()),
        _pillar("时柱", eight.getTime(), eight.getTimeHideGan(), eight.getTimeShiShenGan(),
                eight.getTimeShiShenZhi(), eight.getTimeDiShi(), eight.getTimeNaYin()),
    ]

    gender_value = 1 if gender == "male" else 0
    yun_precise = _yun_payload(eight, gender_value, 2)
    yun_traditional = _yun_payload(eight, gender_value, 1)

    payload: dict[str, Any] = {
        "engine": {
            "name": "bazi-skill deterministic calculator",
            "calendar_library": "lunar_python",
            "calendar_library_version": "1.4.8",
        },
        "input": {
            "calendar": calendar,
            "date": f"{year:04d}-{month:02d}-{day:02d}",
            "time": f"{hour:02d}:{minute:02d}:{second:02d}",
            "lunar_leap_month": leap,
            "gender": gender,
        },
        "conventions": {
            "year_boundary": "立春",
            "month_boundary": "十二节",
            "day_boundary": "23:00 counts as next day" if day_boundary == "zi-next" else "23:00 remains on civil day",
            "primary_luck_start_method": "minute conversion (sect 2)",
            "alternative_luck_start_method": "day and shichen conversion (sect 1)",
        },
        "calendar": {
            "civil_solar_datetime": civil_moment.isoformat(sep=" "),
            "calculation_solar_datetime": calculation_moment.isoformat(sep=" "),
            "lunar_date": lunar.toString(),
            "previous_jie": _format_jie(lunar.getPrevJie()),
            "next_jie": _format_jie(lunar.getNextJie()),
            "true_solar_time": solar_correction,
        },
        "four_pillars": {
            "text": " ".join(p["ganzhi"] for p in pillars),
            "day_master": pillars[2]["stem"],
            "pillars": pillars,
        },
        "element_profile": element_profile(pillars),
        "natal_relations": natal_relations(pillars),
        "empty_branches": {
            "year": eight.getYearXunKong(),
            "month": eight.getMonthXunKong(),
            "day": eight.getDayXunKong(),
            "time": eight.getTimeXunKong(),
        },
        "derived_palaces": {
            "tai_yuan": eight.getTaiYuan(),
            "tai_xi": eight.getTaiXi(),
            "ming_gong": eight.getMingGong(),
            "shen_gong": eight.getShenGong(),
        },
        "luck_cycles": {
            "primary": yun_precise,
            "alternative": yun_traditional,
        },
    }

    if target_year is not None:
        target_lunar = Solar.fromYmdHms(target_year, 7, 1, 12, 0, 0).getLunar()
        target_ganzhi = target_lunar.getYearInGanZhiExact()
        target = {
            "label": f"流年{target_year}",
            "ganzhi": target_ganzhi,
            "stem": target_ganzhi[0],
            "branch": target_ganzhi[1],
        }
        interactions = []
        for pillar in pillars:
            interactions.extend(pair_relations(pillar, target))
        active_cycle = next(
            (row for row in yun_precise["cycles"] if row["start_year"] <= target_year <= row["end_year"]),
            None,
        )
        payload["target_year"] = {
            "year": target_year,
            "ganzhi": target_ganzhi,
            "actual_age": target_year - calculation_moment.year,
            "nominal_age": target_year - calculation_moment.year + 1,
            "active_luck_cycle": active_cycle,
            "interactions_with_natal_chart": interactions,
        }
    return payload


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Calculate a structured BaZi chart as JSON.")
    parser.add_argument("--date", required=True, help="YYYY-MM-DD in the selected calendar")
    parser.add_argument("--time", default="12:00", help="HH:MM or HH:MM:SS")
    parser.add_argument("--calendar", choices=("solar", "lunar"), default="solar")
    parser.add_argument("--leap", action="store_true", help="Treat a lunar input month as leap")
    parser.add_argument("--gender", choices=("male", "female"), required=True)
    parser.add_argument("--day-boundary", choices=("zi-next", "civil-midnight"), default="zi-next")
    parser.add_argument("--longitude", type=float, help="Birth longitude, east positive")
    parser.add_argument("--utc-offset", type=float, help="Standard UTC offset at birthplace")
    parser.add_argument("--dst-minutes", type=int, default=0, help="Civil daylight-saving minutes to remove")
    parser.add_argument("--target-year", type=int, help="Include target-year and active-luck-cycle context")
    parser.add_argument("--compact", action="store_true", help="Emit compact JSON")
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    date_parts = [int(part) for part in args.date.split("-")]
    time_parts = [int(part) for part in args.time.split(":" )]
    if len(date_parts) != 3 or len(time_parts) not in (2, 3):
        raise ValueError("date must be YYYY-MM-DD and time must be HH:MM[:SS]")
    if len(time_parts) == 2:
        time_parts.append(0)
    payload = build_chart(
        calendar=args.calendar,
        year=date_parts[0], month=date_parts[1], day=date_parts[2],
        hour=time_parts[0], minute=time_parts[1], second=time_parts[2],
        gender=args.gender, leap=args.leap, day_boundary=args.day_boundary,
        longitude=args.longitude, utc_offset=args.utc_offset,
        dst_minutes=args.dst_minutes, target_year=args.target_year,
    )
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(payload, ensure_ascii=False, indent=None if args.compact else 2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

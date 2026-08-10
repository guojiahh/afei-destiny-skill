#!/usr/bin/env python3
"""Compare candidate years using the same full luck-year matrix for each year."""

from __future__ import annotations

import argparse
import json
from datetime import datetime

from calculate_bazi import build_chart


def parse_date(value: str) -> tuple[int, int, int]:
    parts = tuple(int(item) for item in value.split("-"))
    if len(parts) != 3:
        raise argparse.ArgumentTypeError("date must be YYYY-MM-DD")
    return parts


def parse_time(value: str) -> tuple[int, int, int]:
    parts = [int(item) for item in value.split(":")]
    if len(parts) == 2:
        parts.append(0)
    if len(parts) != 3:
        raise argparse.ArgumentTypeError("time must be HH:MM[:SS]")
    return tuple(parts)


def parse_target_date(value: str) -> datetime:
    moment = datetime.fromisoformat(value)
    if moment.hour == 0 and "T" not in value and " " not in value:
        moment = moment.replace(hour=12)
    return moment


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--date", required=True)
    parser.add_argument("--time", default="12:00")
    parser.add_argument("--gender", choices=("male", "female"), required=True)
    targets = parser.add_mutually_exclusive_group(required=True)
    targets.add_argument("--years", type=int, nargs="+")
    targets.add_argument(
        "--candidate-dates",
        type=parse_target_date,
        nargs="+",
        help="Exact candidate dates, YYYY-MM-DD[THH:MM[:SS]]",
    )
    parser.add_argument("--calendar", choices=("solar", "lunar"), default="solar")
    parser.add_argument("--leap", action="store_true")
    parser.add_argument("--day-boundary", choices=("zi-next", "civil-midnight"), default="zi-next")
    parser.add_argument("--compact", action="store_true")
    args = parser.parse_args()

    year, month, day = parse_date(args.date)
    hour, minute, second = parse_time(args.time)
    rows = []
    natal_text = None
    candidate_values = args.candidate_dates or args.years
    for candidate in candidate_values:
        candidate_date = candidate if isinstance(candidate, datetime) else None
        candidate_year = candidate.year if candidate_date else candidate
        chart = build_chart(
            calendar=args.calendar,
            year=year,
            month=month,
            day=day,
            hour=hour,
            minute=minute,
            second=second,
            gender=args.gender,
            leap=args.leap,
            day_boundary=args.day_boundary,
            target_year=candidate_year,
            target_date=candidate_date,
        )
        natal_text = chart["four_pillars"]["text"]
        target = chart["target_year"]
        rows.append(
            {
                "year": target["year"],
                "target_datetime": target["target_datetime"],
                "target_scope": target["target_scope"],
                "ganzhi": target["ganzhi"],
                "actual_age": target["actual_age"],
                "active_luck_cycle": target["active_luck_cycle"],
                "active_luck_cycle_candidates": target["active_luck_cycle_candidates"],
                "luck_cycle_boundary_warning": target["luck_cycle_boundary_warning"],
                "natal_to_luck": target["interactions_of_luck_with_natal_chart"],
                "natal_to_year": target["interactions_with_natal_chart"],
                "luck_to_year": target["interactions_between_luck_and_year"],
                "composite_formations": target["composite_formations"],
                "luck_cycle_contexts": target["luck_cycle_contexts"],
            }
        )
    payload = {
        "protocol": "same-matrix-for-every-candidate-year-or-date",
        "four_pillars": natal_text,
        "candidate_years": rows,
    }
    print(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=None if args.compact else 2,
            separators=(",", ":") if args.compact else None,
        )
    )


if __name__ == "__main__":
    main()

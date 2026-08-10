#!/usr/bin/env python3
"""Leakage-aware packet generation, scoring and skill isolation checks."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def dump(value: Any) -> None:
    print(json.dumps(value, ensure_ascii=False, indent=2))


def mingli_questions(path: Path) -> list[dict[str, Any]]:
    data = load_json(path)
    return list(data["questions"])


def baziqa_people(path: Path) -> list[dict[str, Any]]:
    data = load_json(path)
    return [item for item in data if "person_id" in item]


def competition_questions(path: Path) -> list[dict[str, Any]]:
    data = load_json(path)
    if not isinstance(data, dict) or "cases" not in data:
        raise ValueError(f"not a normalized competition dataset: {path}")
    return [
        question
        for case in data["cases"]
        for question in case.get("questions", [])
    ]


def parse_range(value: str | None) -> tuple[int, int] | None:
    if value is None:
        return None
    match = re.fullmatch(r"(\d+):(\d+)", value)
    if not match:
        raise argparse.ArgumentTypeError("range must be START:END, inclusive")
    start, end = map(int, match.groups())
    if start > end:
        raise argparse.ArgumentTypeError("range start must be <= end")
    return start, end


def packet_mingli(args: argparse.Namespace) -> None:
    selected = mingli_questions(args.input)
    if args.question_range:
        start, end = args.question_range
        selected = [q for q in selected if start <= q["question_number"] <= end]
    if args.case_ids:
        allowed = set(args.case_ids)
        selected = [q for q in selected if q["case_id"] in allowed]

    packet = {
        "protocol": "answers-redacted",
        "source": str(args.input),
        "count": len(selected),
        "questions": [
            {
                "id": q["id"],
                "question_number": q["question_number"],
                "case_id": q["case_id"],
                "birth_info": q["birth_info"],
                "question": q["question"],
                "options": q["options"],
                "category": q.get("category"),
            }
            for q in selected
        ],
    }
    dump(packet)


def short_person_id(person_id: str) -> str:
    match = re.search(r"(P\d+)$", person_id)
    return match.group(1) if match else person_id


def short_question_id(question_id: str) -> str:
    match = re.search(r"(P\d+-Q\d+)$", question_id)
    return match.group(1) if match else question_id


def packet_baziqa(args: argparse.Namespace) -> None:
    people = baziqa_people(args.input)
    if args.persons:
        allowed = set(args.persons)
        people = [
            p for p in people
            if p["person_id"] in allowed or short_person_id(p["person_id"]) in allowed
        ]

    packet_people = []
    for person in people:
        person_id = short_person_id(person["person_id"]) if args.anonymize else person["person_id"]
        packet_people.append(
            {
                "person_id": person_id,
                "profile": person.get("profile", {}),
                "extra_info": person.get("extra_info"),
                "questions": [
                    {
                        "question_id": (
                            short_question_id(q["question_id"])
                            if args.anonymize
                            else q["question_id"]
                        ),
                        "question": q["question"],
                        "options": q["options"],
                    }
                    for q in person["questions"]
                ],
            }
        )
    dump(
        {
            "protocol": "answers-redacted",
            "source": str(args.input),
            "people": packet_people,
            "count": sum(len(p["questions"]) for p in packet_people),
        }
    )


def prediction_map(path: Path) -> dict[str, str]:
    data = load_json(path)
    raw = data.get("predictions", data)
    result = {}
    if isinstance(raw, list):
        items = []
        for row in raw:
            if not isinstance(row, dict) or "id" not in row:
                raise ValueError(f"invalid prediction row in {path}: {row!r}")
            value = row.get("prediction", row.get("answer"))
            if value is None:
                raise ValueError(f"prediction row has no answer in {path}: {row!r}")
            items.append((row["id"], value))
    elif isinstance(raw, dict):
        items = raw.items()
    else:
        raise ValueError(f"predictions must be an object or list in {path}")

    for key, value in items:
        answer = str(value).strip().upper()
        if answer not in {"A", "B", "C", "D", "E"}:
            raise ValueError(f"invalid prediction for {key}: {value!r}")
        result[str(key)] = answer
    return result


def aggregate_predictions(args: argparse.Namespace) -> None:
    runs = [prediction_map(path) for path in args.inputs]
    expected = set(runs[0])
    for index, run in enumerate(runs[1:], start=2):
        if set(run) != expected:
            missing = sorted(expected - set(run))
            extra = sorted(set(run) - expected)
            raise ValueError(
                f"run {index} key mismatch; missing={missing[:8]}, extra={extra[:8]}"
            )

    predictions = {}
    ties = []
    for question_id in sorted(expected):
        votes = [run[question_id] for run in runs]
        counts = Counter(votes)
        top_count = max(counts.values())
        leaders = {answer for answer, count in counts.items() if count == top_count}
        if len(leaders) == 1:
            predictions[question_id] = next(iter(leaders))
        else:
            predictions[question_id] = votes[0]
            ties.append(question_id)

    dump(
        {
            "protocol": "per-question-majority-vote",
            "runs": [str(path) for path in args.inputs],
            "tie_break": "first input",
            "ties": ties,
            "predictions": predictions,
        }
    )


def merge_predictions(args: argparse.Namespace) -> None:
    merged = {}
    for path in args.inputs:
        run = prediction_map(path)
        duplicates = sorted(set(merged) & set(run))
        if duplicates:
            raise ValueError(f"duplicate prediction IDs in {path}: {duplicates[:8]}")
        merged.update(run)
    dump(
        {
            "protocol": "answers-redacted-merged-segments",
            "segments": [str(path) for path in args.inputs],
            "predictions": dict(sorted(merged.items())),
        }
    )


def score_rows(rows: Iterable[dict[str, Any]], predictions: dict[str, str]) -> dict[str, Any]:
    rows = list(rows)
    expected_ids = {row["id"] for row in rows}
    missing = sorted(expected_ids - predictions.keys())
    extra = sorted(predictions.keys() - expected_ids)
    if missing:
        raise ValueError(f"missing {len(missing)} predictions: {missing[:8]}")

    by_category: dict[str, list[bool]] = defaultdict(list)
    details = []
    for row in rows:
        correct = predictions[row["id"]] == row["answer"]
        by_category[row.get("category") or "未分类"].append(correct)
        details.append(
            {
                "id": row["id"],
                "prediction": predictions[row["id"]],
                "answer": row["answer"],
                "correct": correct,
                "category": row.get("category") or "未分类",
            }
        )

    correct_count = sum(item["correct"] for item in details)
    return {
        "count": len(details),
        "correct": correct_count,
        "accuracy": round(correct_count / len(details), 4) if details else 0.0,
        "per_category": {
            key: {
                "count": len(values),
                "correct": sum(values),
                "accuracy": round(sum(values) / len(values), 4),
            }
            for key, values in sorted(by_category.items())
        },
        "missing": missing,
        "extra": extra,
        "details": details,
    }


def score_mingli(args: argparse.Namespace) -> None:
    selected = mingli_questions(args.input)
    if args.question_range:
        start, end = args.question_range
        selected = [q for q in selected if start <= q["question_number"] <= end]
    rows = [
        {"id": q["id"], "answer": q["answer"], "category": q.get("category")}
        for q in selected
    ]
    dump(score_rows(rows, prediction_map(args.predictions)))


def score_baziqa(args: argparse.Namespace) -> None:
    if "2021" in args.input.name and not args.unlock_heldout:
        raise SystemExit(
            "Refusing to score the 2021 holdout without --unlock-heldout. "
            "Save final predictions first."
        )
    people = baziqa_people(args.input)
    if args.persons:
        allowed = set(args.persons)
        people = [
            p for p in people
            if p["person_id"] in allowed or short_person_id(p["person_id"]) in allowed
        ]
    predictions = prediction_map(args.predictions)
    rows = []
    for person in people:
        for q in person["questions"]:
            full_id = q["question_id"]
            short_id = short_question_id(full_id)
            row_id = short_id if short_id in predictions else full_id
            rows.append(
                {
                    "id": row_id,
                    "answer": q["answer"],
                    "category": short_person_id(person["person_id"]),
                }
            )
    dump(score_rows(rows, predictions))


def text_files(root: Path) -> list[Path]:
    suffixes = {".md", ".yaml", ".yml", ".py", ".txt", ".json"}
    return [p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in suffixes]


def leak_check(args: argparse.Namespace) -> None:
    corpus_parts = []
    for path in text_files(args.skill):
        if "vendor" in path.parts:
            continue
        corpus_parts.append(path.read_text(encoding="utf-8", errors="ignore"))
    corpus = "\n".join(corpus_parts)

    ids: list[str] = []
    questions: list[str] = []
    for source in args.sources:
        source_data = load_json(source)
        if isinstance(source_data, dict) and "cases" in source_data:
            for q in competition_questions(source):
                ids.append(q["id"])
                questions.append(q["question"])
        elif "MingLi" in str(source) or source.name == "data.json":
            for q in mingli_questions(source):
                ids.append(q["id"])
                questions.append(q["question"])
        else:
            for person in baziqa_people(source):
                for q in person["questions"]:
                    ids.append(q["question_id"])
                    questions.append(q["question"])

    matched_ids = sorted({item for item in ids if item and item in corpus})
    matched_questions = sorted(
        {item for item in questions if len(item.strip()) >= 10 and item.strip() in corpus}
    )
    result = {
        "skill": str(args.skill),
        "files_scanned": len(text_files(args.skill)),
        "benchmark_ids_found": matched_ids,
        "exact_questions_found": matched_questions,
        "pass": not matched_ids and not matched_questions,
    }
    dump(result)
    if not result["pass"]:
        raise SystemExit(1)


def add_common_selection(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--range", dest="question_range", type=parse_range)
    parser.add_argument("--persons", nargs="*")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    packet = sub.add_parser("packet", help="print an answer-redacted packet")
    packet.add_argument("--benchmark", choices=("mingli", "baziqa"), required=True)
    packet.add_argument("--input", type=Path, required=True)
    packet.add_argument("--case-ids", nargs="*")
    packet.add_argument(
        "--anonymize",
        action="store_true",
        help="replace BaziQA person and question IDs with P### aliases",
    )
    add_common_selection(packet)

    score = sub.add_parser("score", help="score a saved prediction JSON")
    score.add_argument("--benchmark", choices=("mingli", "baziqa"), required=True)
    score.add_argument("--input", type=Path, required=True)
    score.add_argument("--predictions", type=Path, required=True)
    score.add_argument("--unlock-heldout", action="store_true")
    add_common_selection(score)

    aggregate = sub.add_parser(
        "aggregate", help="print a per-question majority vote over prediction files"
    )
    aggregate.add_argument("--inputs", type=Path, nargs="+", required=True)

    merge = sub.add_parser("merge", help="print merged disjoint prediction files")
    merge.add_argument("--inputs", type=Path, nargs="+", required=True)

    leak = sub.add_parser("leak-check", help="scan skill text for copied benchmark items")
    leak.add_argument("--skill", type=Path, required=True)
    leak.add_argument("--sources", type=Path, nargs="+", required=True)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    if args.command == "packet":
        if args.benchmark == "mingli":
            packet_mingli(args)
        else:
            packet_baziqa(args)
    elif args.command == "score":
        if args.benchmark == "mingli":
            score_mingli(args)
        else:
            score_baziqa(args)
    elif args.command == "aggregate":
        aggregate_predictions(args)
    elif args.command == "merge":
        merge_predictions(args)
    else:
        leak_check(args)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Prepare, lock, reveal and summarize leakage-aware contest iterations."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


VALID_ANSWERS = {"A", "B", "C", "D", "E"}
FAILURE_REASONS = [
    "calculation",
    "strength_pattern",
    "role_attribution",
    "timing",
    "event_mapping",
    "option_reasoning",
    "knowledge_gap",
    "uncalibrated_guess",
]


def load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def skill_hash(skill: Path) -> str:
    digest = hashlib.sha256()
    files = (
        path
        for path in skill.rglob("*")
        if path.is_file()
        and "__pycache__" not in path.parts
        and path.suffix.lower() not in {".pyc", ".pyo"}
    )
    for path in sorted(files):
        digest.update(path.relative_to(skill).as_posix().encode("utf-8"))
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()


def flatten(dataset: dict[str, Any]) -> list[tuple[dict[str, Any], dict[str, Any]]]:
    return [
        (case, question)
        for case in dataset["cases"]
        for question in case["questions"]
    ]


def redacted_packet(dataset: dict[str, Any]) -> dict[str, Any]:
    return {
        "protocol": "answers-redacted-before-prediction",
        "contest_id": dataset["contest_id"],
        "year": dataset["year"],
        "source_url": dataset["source_url"],
        "count": dataset["question_count"],
        "cases": [
            {
                key: value
                for key, value in case.items()
                if key != "questions"
            }
            | {
                "questions": [
                    {key: value for key, value in question.items() if key != "answer"}
                    for question in case["questions"]
                ]
            }
            for case in dataset["cases"]
        ],
    }


def prediction_map(path: Path) -> dict[str, str]:
    data = load(path)
    raw = data.get("predictions", data)
    if not isinstance(raw, dict):
        raise ValueError("predictions must be an object keyed by question id")
    result = {str(key): str(value).strip().upper() for key, value in raw.items()}
    invalid = {key: value for key, value in result.items() if value not in VALID_ANSWERS}
    if invalid:
        raise ValueError(f"invalid answers: {invalid}")
    return result


def prepare(args: argparse.Namespace) -> None:
    if args.round_dir.exists() and any(args.round_dir.iterdir()):
        raise SystemExit(f"refusing to overwrite non-empty round: {args.round_dir}")
    dataset = load(args.input)
    packet = redacted_packet(dataset)
    args.round_dir.mkdir(parents=True, exist_ok=True)
    write(args.round_dir / "questions.json", packet)
    ids = [question["id"] for _, question in flatten(dataset)]
    write(
        args.round_dir / "predictions.template.json",
        {
            "protocol": "answers-redacted",
            "predictions": {question_id: "" for question_id in ids},
        },
    )
    write(
        args.round_dir / "manifest.json",
        {
            "status": "prepared",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "dataset_path": str(args.input),
            "dataset_sha256": sha256_file(args.input),
            "skill_path": str(args.skill),
            "skill_sha256": skill_hash(args.skill),
            "model": args.model,
            "count": len(ids),
            "contamination": args.contamination,
            "failure_reason_schema": FAILURE_REASONS,
        },
    )
    print(f"prepared {len(ids)} answer-redacted questions in {args.round_dir}")


def lock(args: argparse.Namespace) -> None:
    target = args.round_dir / "locked_predictions.json"
    if target.exists():
        raise SystemExit(f"refusing to overwrite locked predictions: {target}")
    packet = load(args.round_dir / "questions.json")
    expected = {
        question["id"]
        for case in packet["cases"]
        for question in case["questions"]
    }
    predictions = prediction_map(args.predictions)
    missing = sorted(expected - predictions.keys())
    extra = sorted(predictions.keys() - expected)
    if missing or extra:
        raise ValueError(f"prediction key mismatch; missing={missing}, extra={extra}")
    shutil.copyfile(args.predictions, target)
    write(
        args.round_dir / "lock.json",
        {
            "locked_at": datetime.now(timezone.utc).isoformat(),
            "prediction_sha256": sha256_file(target),
            "count": len(predictions),
        },
    )
    print(f"locked {len(predictions)} predictions")


def reveal(args: argparse.Namespace) -> None:
    score_path = args.round_dir / "score.json"
    if score_path.exists():
        raise SystemExit(f"refusing to overwrite revealed score: {score_path}")
    dataset = load(args.input)
    manifest = load(args.round_dir / "manifest.json")
    if sha256_file(args.input) != manifest["dataset_sha256"]:
        raise ValueError("dataset hash changed after round preparation")
    locked_path = args.round_dir / "locked_predictions.json"
    lock_metadata = load(args.round_dir / "lock.json")
    if sha256_file(locked_path) != lock_metadata["prediction_sha256"]:
        raise ValueError("locked predictions changed after lock")
    predictions = prediction_map(locked_path)

    details = []
    by_tag: dict[str, list[bool]] = defaultdict(list)
    answer_distribution: Counter[str] = Counter()
    for case, question in flatten(dataset):
        prediction = predictions[question["id"]]
        answer = question["answer"]
        correct = prediction == answer
        answer_distribution[answer] += 1
        for tag in question.get("tags") or ["其他"]:
            by_tag[tag].append(correct)
        details.append(
            {
                "id": question["id"],
                "case_id": case["case_id"],
                "prediction": prediction,
                "answer": answer,
                "correct": correct,
                "tags": question.get("tags") or ["其他"],
            }
        )

    correct_count = sum(item["correct"] for item in details)
    score = {
        "protocol": "locked-predictions-then-reveal",
        "count": len(details),
        "correct": correct_count,
        "accuracy": round(correct_count / len(details), 4) if details else 0,
        "answer_distribution": dict(sorted(answer_distribution.items())),
        "per_tag": {
            tag: {
                "count": len(values),
                "correct": sum(values),
                "accuracy": round(sum(values) / len(values), 4),
            }
            for tag, values in sorted(by_tag.items())
        },
        "details": details,
    }
    write(score_path, score)

    error_rows = []
    question_lookup = {
        question["id"]: (case, question) for case, question in flatten(dataset)
    }
    for item in details:
        if item["correct"]:
            continue
        case, question = question_lookup[item["id"]]
        error_rows.append(
            {
                "id": item["id"],
                "case_id": item["case_id"],
                "profile_text": case.get("profile_text"),
                "question": question["question"],
                "options": question["options"],
                "prediction": item["prediction"],
                "answer": item["answer"],
                "tags": item["tags"],
                "failure_reason": None,
                "evidence": [],
                "generalizable_change": None,
            }
        )
    write(
        args.round_dir / "error_review.json",
        {
            "allowed_failure_reasons": FAILURE_REASONS,
            "errors": error_rows,
        },
    )
    print(f"score: {correct_count}/{len(details)} = {score['accuracy']:.2%}")


def summarize(args: argparse.Namespace) -> None:
    rows = []
    for score_path in sorted(args.root.glob("*/score.json")):
        score = load(score_path)
        manifest = load(score_path.parent / "manifest.json")
        rows.append(
            {
                "round": score_path.parent.name,
                "skill_sha256": manifest["skill_sha256"],
                "count": score["count"],
                "correct": score["correct"],
                "accuracy": score["accuracy"],
                "contamination": manifest.get("contamination", []),
            }
        )
    total = sum(row["count"] for row in rows)
    correct = sum(row["correct"] for row in rows)
    write(
        args.output,
        {
            "rounds": rows,
            "count": total,
            "correct": correct,
            "micro_accuracy": round(correct / total, 4) if total else 0,
        },
    )
    print(f"summarized {len(rows)} rounds into {args.output}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    prepare_parser = sub.add_parser("prepare")
    prepare_parser.add_argument("--input", type=Path, required=True)
    prepare_parser.add_argument("--round-dir", type=Path, required=True)
    prepare_parser.add_argument("--skill", type=Path, required=True)
    prepare_parser.add_argument("--model", required=True)
    prepare_parser.add_argument("--contamination", action="append", default=[])

    lock_parser = sub.add_parser("lock")
    lock_parser.add_argument("--round-dir", type=Path, required=True)
    lock_parser.add_argument("--predictions", type=Path, required=True)

    reveal_parser = sub.add_parser("reveal")
    reveal_parser.add_argument("--input", type=Path, required=True)
    reveal_parser.add_argument("--round-dir", type=Path, required=True)

    summary_parser = sub.add_parser("summarize")
    summary_parser.add_argument("--root", type=Path, required=True)
    summary_parser.add_argument("--output", type=Path, required=True)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    if args.command == "prepare":
        prepare(args)
    elif args.command == "lock":
        lock(args)
    elif args.command == "reveal":
        reveal(args)
    else:
        summarize(args)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Prepare, audit, lock, reveal, compare and summarize contest iterations."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
import shutil
import subprocess
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


VALID_ANSWERS = {"A", "B", "C", "D", "E"}
PRIMARY_FAILURE_REASONS = [
    "data_issue",
    "option_parse",
    "calculation",
    "knowledge_gap",
    "reasoning_error",
    "execution_error",
    "unresolved",
]
SECONDARY_FAILURE_REASONS = [
    "input_extraction",
    "calendar_chart",
    "luck_cycle",
    "relation_matrix",
    "strength_pattern",
    "role_attribution",
    "timing",
    "event_mapping",
    "option_negation",
    "compound_option",
    "base_rate",
    "uncalibrated_guess",
]
TOP_INPUT_FIELDS = {
    "answers_available",
    "case_count",
    "cases",
    "contest_id",
    "question_count",
    "source_sha256",
    "source_url",
    "year",
}
CASE_INPUT_FIELDS = {
    "author",
    "birth_date",
    "case_id",
    "chart_url",
    "four_pillars",
    "gender",
    "profile_text",
    "profile_tokens",
    "questions",
    "school",
    "source_url",
}
QUESTION_INPUT_FIELDS = {
    "answer",
    "id",
    "options",
    "question",
    "question_number",
    "tags",
}
FORBIDDEN_PACKET_KEYS = {
    "answer",
    "answers",
    "correct",
    "correct_answer",
    "correct_option",
    "explanation",
    "ground_truth",
    "is_correct",
    "label",
    "source_url",
    "chart_url",
}


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


def git_fingerprint() -> dict[str, Any]:
    try:
        commit = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()
        dirty = bool(
            subprocess.run(
                ["git", "status", "--porcelain"],
                check=True,
                capture_output=True,
                text=True,
            ).stdout.strip()
        )
        return {"commit": commit, "dirty": dirty}
    except (OSError, subprocess.CalledProcessError):
        return {"commit": None, "dirty": None}


def flatten(dataset: dict[str, Any]) -> list[tuple[dict[str, Any], dict[str, Any]]]:
    return [
        (case, question)
        for case in dataset["cases"]
        for question in case["questions"]
    ]


def _reject_unknown(actual: set[str], expected: set[str], scope: str) -> None:
    unknown = sorted(actual - expected)
    if unknown:
        raise ValueError(f"unreviewed fields in {scope}: {unknown}")


def redacted_packet(dataset: dict[str, Any]) -> dict[str, Any]:
    """Build a fail-closed packet from explicit safe fields only."""
    _reject_unknown(set(dataset), TOP_INPUT_FIELDS, "dataset")
    cases = []
    for case in dataset["cases"]:
        _reject_unknown(set(case), CASE_INPUT_FIELDS, f"case {case.get('case_id')}")
        questions = []
        for question in case["questions"]:
            _reject_unknown(
                set(question), QUESTION_INPUT_FIELDS, f"question {question.get('id')}"
            )
            questions.append(
                {
                    "id": question["id"],
                    "question_number": question.get("question_number"),
                    "question": question["question"],
                    "options": question["options"],
                    "tags": question.get("tags", []),
                }
            )
        cases.append(
            {
                "case_id": case["case_id"],
                "gender": case.get("gender"),
                "birth_date": case.get("birth_date"),
                "four_pillars": case.get("four_pillars"),
                "profile_text": case.get("profile_text"),
                "questions": questions,
            }
        )
    return {
        "protocol": "explicit-whitelist-answer-redaction-v2",
        "contest_id": dataset["contest_id"],
        "year": dataset["year"],
        "count": sum(len(case["questions"]) for case in cases),
        "cases": cases,
    }


def _walk_forbidden_keys(value: Any, path: str = "$") -> list[str]:
    findings = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}"
            if key.lower() in FORBIDDEN_PACKET_KEYS:
                findings.append(child_path)
            findings.extend(_walk_forbidden_keys(child, child_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            findings.extend(_walk_forbidden_keys(child, f"{path}[{index}]"))
    return findings


def prediction_records(path: Path) -> dict[str, dict[str, Any]]:
    data = load(path)
    raw = data.get("predictions", data)
    if not isinstance(raw, dict):
        raise ValueError("predictions must be an object keyed by question id")
    result: dict[str, dict[str, Any]] = {}
    for key, value in raw.items():
        if isinstance(value, str):
            record = {"answer": value.strip().upper(), "confidence": None}
        elif isinstance(value, dict):
            record = dict(value)
            record["answer"] = str(record.get("answer", "")).strip().upper()
        else:
            raise ValueError(f"prediction {key} must be a letter or object")
        if record["answer"] not in VALID_ANSWERS:
            raise ValueError(f"invalid answer for {key}: {record['answer']}")
        confidence = record.get("confidence")
        if confidence is not None:
            confidence = float(confidence)
            if not 0 <= confidence <= 1:
                raise ValueError(f"confidence for {key} must be between 0 and 1")
            record["confidence"] = confidence
        decisive_facts = record.get("decisive_facts", [])
        if not isinstance(decisive_facts, list) or not all(
            isinstance(item, str) for item in decisive_facts
        ):
            raise ValueError(f"decisive_facts for {key} must be a string list")
        record["decisive_facts"] = decisive_facts
        result[str(key)] = record
    return result


def prediction_map(path: Path) -> dict[str, str]:
    """Backward-compatible answer-only view."""
    return {key: value["answer"] for key, value in prediction_records(path).items()}


def _manifest_path(round_dir: Path) -> Path:
    return round_dir / "manifest.json"


def _verify_pre_reveal_integrity(round_dir: Path, skill: Path | None = None) -> dict[str, Any]:
    manifest = load(_manifest_path(round_dir))
    packet_path = round_dir / "questions.json"
    if sha256_file(packet_path) != manifest["question_packet_sha256"]:
        raise ValueError("question packet changed after preparation")
    findings = _walk_forbidden_keys(load(packet_path))
    if findings:
        raise ValueError(f"forbidden fields in question packet: {findings[:5]}")
    if skill is not None and skill_hash(skill) != manifest["skill_sha256"]:
        raise ValueError("skill changed after round preparation")
    return manifest


def prepare(args: argparse.Namespace) -> None:
    if args.round_dir.exists() and any(args.round_dir.iterdir()):
        raise SystemExit(f"refusing to overwrite non-empty round: {args.round_dir}")
    dataset = load(args.input)
    packet = redacted_packet(dataset)
    args.round_dir.mkdir(parents=True, exist_ok=True)
    packet_path = args.round_dir / "questions.json"
    write(packet_path, packet)
    ids = [question["id"] for _, question in flatten(dataset)]
    write(
        args.round_dir / "predictions.template.json",
        {
            "protocol": "structured-predictions-v2",
            "predictions": {
                question_id: {
                    "answer": "",
                    "confidence": None,
                    "alternative": None,
                    "calculation_status": "not_recorded",
                    "decisive_facts": [],
                }
                for question_id in ids
            },
        },
    )
    prompt_file = getattr(args, "prompt_file", None)
    protocol_file = getattr(args, "protocol_file", None)
    git = git_fingerprint()
    write(
        _manifest_path(args.round_dir),
        {
            "schema_version": 2,
            "status": "prepared",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "dataset_id": dataset["contest_id"],
            "dataset_sha256": sha256_file(args.input),
            "question_packet_sha256": sha256_file(packet_path),
            "skill_sha256": skill_hash(args.skill),
            "git_commit": git["commit"],
            "git_dirty": git["dirty"],
            "model": args.model,
            "reasoning_effort": getattr(args, "reasoning_effort", "unspecified"),
            "split": getattr(args, "split", "development"),
            "prompt_sha256": sha256_file(prompt_file) if prompt_file else None,
            "protocol_sha256": sha256_file(protocol_file) if protocol_file else None,
            "count": len(ids),
            "contamination": args.contamination,
            "solver_context": "fresh subagent with fork_turns=none",
            "isolation_level": "procedural allowlist on shared filesystem",
            "isolation_limit": "not an OS sandbox; cannot exclude model pretraining memory",
            "primary_failure_reason_schema": PRIMARY_FAILURE_REASONS,
            "secondary_failure_reason_schema": SECONDARY_FAILURE_REASONS,
        },
    )
    _verify_pre_reveal_integrity(args.round_dir, args.skill)
    print(f"prepared {len(ids)} answer-redacted questions in {args.round_dir}")


def audit(args: argparse.Namespace) -> None:
    manifest = _verify_pre_reveal_integrity(args.round_dir, args.skill)
    if manifest.get("contamination"):
        print("audit passed, but round is training-only because contamination is declared")
    else:
        print("audit passed: packet, skill and forbidden-field checks are clean")


def lock(args: argparse.Namespace) -> None:
    target = args.round_dir / "locked_predictions.json"
    if target.exists():
        raise SystemExit(f"refusing to overwrite locked predictions: {target}")
    manifest = _verify_pre_reveal_integrity(args.round_dir, args.skill)
    packet = load(args.round_dir / "questions.json")
    expected = {
        question["id"] for case in packet["cases"] for question in case["questions"]
    }
    predictions = prediction_records(args.predictions)
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
            "question_packet_sha256": manifest["question_packet_sha256"],
            "skill_sha256": manifest["skill_sha256"],
            "count": len(predictions),
        },
    )
    manifest["status"] = "locked"
    manifest["locked_at"] = datetime.now(timezone.utc).isoformat()
    write(_manifest_path(args.round_dir), manifest)
    print(f"locked {len(predictions)} predictions")


def _wilson_interval(successes: int, total: int) -> list[float]:
    if total == 0:
        return [0.0, 0.0]
    z = 1.959963984540054
    p = successes / total
    denominator = 1 + z * z / total
    centre = (p + z * z / (2 * total)) / denominator
    margin = z * math.sqrt((p * (1 - p) + z * z / (4 * total)) / total) / denominator
    return [round(max(0.0, centre - margin), 4), round(min(1.0, centre + margin), 4)]


def reveal(args: argparse.Namespace) -> None:
    score_path = args.round_dir / "score.json"
    if score_path.exists():
        raise SystemExit(f"refusing to overwrite revealed score: {score_path}")
    dataset = load(args.input)
    # The Skill was verified at lock time. After predictions are locked the live
    # Skill may legitimately advance; reveal verifies the locked Skill hash
    # recorded in lock.json instead of requiring the old files to remain live.
    manifest = _verify_pre_reveal_integrity(args.round_dir)
    if manifest["status"] != "locked":
        raise ValueError("round must be locked before reveal")
    if sha256_file(args.input) != manifest["dataset_sha256"]:
        raise ValueError("dataset hash changed after round preparation")
    locked_path = args.round_dir / "locked_predictions.json"
    lock_metadata = load(args.round_dir / "lock.json")
    if lock_metadata["skill_sha256"] != manifest["skill_sha256"]:
        raise ValueError("locked skill hash does not match round manifest")
    if sha256_file(locked_path) != lock_metadata["prediction_sha256"]:
        raise ValueError("locked predictions changed after lock")
    predictions = prediction_records(locked_path)

    details = []
    by_tag: dict[str, list[bool]] = defaultdict(list)
    by_case: dict[str, list[bool]] = defaultdict(list)
    answer_distribution: Counter[str] = Counter()
    random_probabilities = []
    confidence_rows = []
    for case, question in flatten(dataset):
        record = predictions[question["id"]]
        prediction = record["answer"]
        answer = question["answer"]
        correct = prediction == answer
        answer_distribution[answer] += 1
        random_probabilities.append(1 / len(question["options"]))
        by_case[case["case_id"]].append(correct)
        for tag in question.get("tags") or ["其他"]:
            by_tag[tag].append(correct)
        if record.get("confidence") is not None:
            confidence_rows.append((record["confidence"], int(correct)))
        details.append(
            {
                "id": question["id"],
                "case_id": case["case_id"],
                "prediction": prediction,
                "answer": answer,
                "correct": correct,
                "confidence": record.get("confidence"),
                "alternative": record.get("alternative"),
                "calculation_status": record.get("calculation_status"),
                "decisive_facts": record.get("decisive_facts", []),
                "tags": question.get("tags") or ["其他"],
            }
        )

    correct_count = sum(item["correct"] for item in details)
    case_accuracies = [sum(values) / len(values) for values in by_case.values()]
    top_label_brier = (
        sum((confidence - outcome) ** 2 for confidence, outcome in confidence_rows)
        / len(confidence_rows)
        if confidence_rows
        else None
    )
    score = {
        "protocol": "locked-predictions-then-reveal-v2",
        "split": manifest.get("split"),
        "count": len(details),
        "correct": correct_count,
        "accuracy": round(correct_count / len(details), 4) if details else 0,
        "accuracy_wilson_95": _wilson_interval(correct_count, len(details)),
        "case_count": len(case_accuracies),
        "case_macro_accuracy": round(sum(case_accuracies) / len(case_accuracies), 4)
        if case_accuracies
        else 0,
        "random_choice_expected_accuracy": round(
            sum(random_probabilities) / len(random_probabilities), 4
        )
        if random_probabilities
        else 0,
        "confidence_count": len(confidence_rows),
        "top_label_brier": round(top_label_brier, 4)
        if top_label_brier is not None
        else None,
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
                "pre_reveal_confidence": item.get("confidence"),
                "pre_reveal_decisive_facts": item.get("decisive_facts", []),
                "tags": item["tags"],
                "primary_failure_reason": None,
                "secondary_failure_reason": None,
                "root_cause": None,
                "evidence": [],
                "counterfactual_fix": None,
                "would_change_answer": None,
                "recurrence_key": None,
                "fix_type": None,
                "decision": None,
                "overfit_risk": None,
                "regression_tests": [],
            }
        )
    write(
        args.round_dir / "error_review.json",
        {
            "primary_failure_reasons": PRIMARY_FAILURE_REASONS,
            "secondary_failure_reasons": SECONDARY_FAILURE_REASONS,
            "errors": error_rows,
        },
    )
    manifest["status"] = "revealed"
    manifest["revealed_at"] = datetime.now(timezone.utc).isoformat()
    write(_manifest_path(args.round_dir), manifest)
    print(f"score: {correct_count}/{len(details)} = {score['accuracy']:.2%}")


def validate_review(args: argparse.Namespace) -> None:
    review = load(args.review)
    required = {
        "primary_failure_reason",
        "secondary_failure_reason",
        "root_cause",
        "evidence",
        "counterfactual_fix",
        "would_change_answer",
        "recurrence_key",
        "fix_type",
        "decision",
        "overfit_risk",
        "regression_tests",
    }
    incomplete = []
    for item in review.get("errors", []):
        missing = sorted(key for key in required if item.get(key) in (None, [], ""))
        if missing:
            incomplete.append({"id": item.get("id"), "missing": missing})
        if item.get("primary_failure_reason") not in PRIMARY_FAILURE_REASONS:
            incomplete.append({"id": item.get("id"), "invalid_primary_reason": True})
    if incomplete:
        raise ValueError(f"incomplete error review: {incomplete[:5]}")
    print(f"validated {len(review.get('errors', []))} reviewed errors")


def _aggregate_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    total = sum(row["count"] for row in rows)
    correct = sum(row["correct"] for row in rows)
    case_total = sum(row.get("case_count", 0) for row in rows)
    weighted_case = sum(
        row.get("case_macro_accuracy", 0) * row.get("case_count", 0) for row in rows
    )
    return {
        "round_count": len(rows),
        "question_count": total,
        "correct": correct,
        "micro_accuracy": round(correct / total, 4) if total else 0,
        "case_macro_accuracy": round(weighted_case / case_total, 4)
        if case_total
        else 0,
        "rounds": rows,
    }


def summarize(args: argparse.Namespace) -> None:
    clean_groups: dict[tuple[str, str, str], list[dict[str, Any]]] = defaultdict(list)
    contaminated = []
    for score_path in sorted(args.root.glob("*/score.json")):
        score = load(score_path)
        manifest = load(score_path.parent / "manifest.json")
        row = {
            "round": score_path.parent.name,
            "skill_sha256": manifest["skill_sha256"],
            "model": manifest.get("model"),
            "split": manifest.get("split", "legacy-unspecified"),
            "count": score["count"],
            "correct": score["correct"],
            "accuracy": score["accuracy"],
            "case_count": score.get("case_count", 0),
            "case_macro_accuracy": score.get("case_macro_accuracy", 0),
            "contamination": manifest.get("contamination", []),
        }
        if row["contamination"]:
            contaminated.append(row)
            continue
        key = (row["skill_sha256"], row["model"], row["split"])
        clean_groups[key].append(row)
    groups = []
    for (skill_sha, model, split), rows in sorted(clean_groups.items()):
        groups.append(
            {
                "skill_sha256": skill_sha,
                "model": model,
                "split": split,
                **_aggregate_rows(rows),
            }
        )
    write(
        args.output,
        {
            "protocol": "no-cross-version-or-contamination-aggregation-v2",
            "clean_groups": groups,
            "contaminated_training_only": contaminated,
        },
    )
    print(
        f"summarized {sum(len(rows) for rows in clean_groups.values())} clean rounds "
        f"into {len(groups)} non-mixed groups; excluded {len(contaminated)} contaminated"
    )


def compare(args: argparse.Namespace) -> None:
    base_dirs = args.base if isinstance(args.base, list) else [args.base]
    candidate_dirs = args.candidate if isinstance(args.candidate, list) else [args.candidate]
    base_details = [
        item for directory in base_dirs for item in load(directory / "score.json")["details"]
    ]
    candidate_details = [
        item
        for directory in candidate_dirs
        for item in load(directory / "score.json")["details"]
    ]
    base_map = {item["id"]: item for item in base_details}
    candidate_map = {item["id"]: item for item in candidate_details}
    if len(base_map) != len(base_details) or len(candidate_map) != len(candidate_details):
        raise ValueError("paired round sets contain duplicate question ids")
    if set(base_map) != set(candidate_map):
        raise ValueError("paired rounds must contain identical question ids")
    rows = []
    by_case: dict[str, list[tuple[int, int]]] = defaultdict(list)
    for question_id in sorted(base_map):
        old = int(base_map[question_id]["correct"])
        new = int(candidate_map[question_id]["correct"])
        case_id = base_map[question_id]["case_id"]
        rows.append((old, new))
        by_case[case_id].append((old, new))
    deltas = [new - old for old, new in rows]
    case_ids = sorted(by_case)
    rng = random.Random(args.seed)
    bootstrap = []
    for _ in range(args.bootstrap_samples):
        sampled = [rng.choice(case_ids) for _ in case_ids]
        sampled_rows = [pair for case_id in sampled for pair in by_case[case_id]]
        bootstrap.append(
            sum(new - old for old, new in sampled_rows) / len(sampled_rows)
        )
    bootstrap.sort()
    low_index = int(0.025 * (len(bootstrap) - 1))
    high_index = int(0.975 * (len(bootstrap) - 1))
    result = {
        "protocol": "paired-question-comparison-case-bootstrap-v1",
        "base_rounds": [directory.name for directory in base_dirs],
        "candidate_rounds": [directory.name for directory in candidate_dirs],
        "count": len(rows),
        "case_count": len(case_ids),
        "base_accuracy": round(sum(old for old, _ in rows) / len(rows), 4),
        "candidate_accuracy": round(sum(new for _, new in rows) / len(rows), 4),
        "paired_delta": round(sum(deltas) / len(deltas), 4),
        "wins": sum(delta == 1 for delta in deltas),
        "losses": sum(delta == -1 for delta in deltas),
        "ties": sum(delta == 0 for delta in deltas),
        "case_bootstrap_95": [
            round(bootstrap[low_index], 4),
            round(bootstrap[high_index], 4),
        ],
        "bootstrap_samples": args.bootstrap_samples,
        "seed": args.seed,
    }
    write(args.output, result)
    print(
        f"paired delta {result['paired_delta']:+.2%}; "
        f"95% case bootstrap {result['case_bootstrap_95']}"
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    prepare_parser = sub.add_parser("prepare")
    prepare_parser.add_argument("--input", type=Path, required=True)
    prepare_parser.add_argument("--round-dir", type=Path, required=True)
    prepare_parser.add_argument("--skill", type=Path, required=True)
    prepare_parser.add_argument("--model", required=True)
    prepare_parser.add_argument("--reasoning-effort", default="unspecified")
    prepare_parser.add_argument(
        "--split", choices=["development", "regression", "holdout"], required=True
    )
    prepare_parser.add_argument("--prompt-file", type=Path)
    prepare_parser.add_argument("--protocol-file", type=Path)
    prepare_parser.add_argument("--contamination", action="append", default=[])

    audit_parser = sub.add_parser("audit")
    audit_parser.add_argument("--round-dir", type=Path, required=True)
    audit_parser.add_argument("--skill", type=Path, required=True)

    lock_parser = sub.add_parser("lock")
    lock_parser.add_argument("--round-dir", type=Path, required=True)
    lock_parser.add_argument("--predictions", type=Path, required=True)
    lock_parser.add_argument("--skill", type=Path, required=True)

    reveal_parser = sub.add_parser("reveal")
    reveal_parser.add_argument("--input", type=Path, required=True)
    reveal_parser.add_argument("--round-dir", type=Path, required=True)

    review_parser = sub.add_parser("validate-review")
    review_parser.add_argument("--review", type=Path, required=True)

    summary_parser = sub.add_parser("summarize")
    summary_parser.add_argument("--root", type=Path, required=True)
    summary_parser.add_argument("--output", type=Path, required=True)

    compare_parser = sub.add_parser("compare")
    compare_parser.add_argument("--base", type=Path, nargs="+", required=True)
    compare_parser.add_argument("--candidate", type=Path, nargs="+", required=True)
    compare_parser.add_argument("--output", type=Path, required=True)
    compare_parser.add_argument("--bootstrap-samples", type=int, default=10000)
    compare_parser.add_argument("--seed", type=int, default=20260810)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    if args.command == "prepare":
        prepare(args)
    elif args.command == "audit":
        audit(args)
    elif args.command == "lock":
        lock(args)
    elif args.command == "reveal":
        reveal(args)
    elif args.command == "validate-review":
        validate_review(args)
    elif args.command == "summarize":
        summarize(args)
    else:
        compare(args)


if __name__ == "__main__":
    main()

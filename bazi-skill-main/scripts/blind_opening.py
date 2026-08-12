#!/usr/bin/env python3
"""Select and settle a chart-only opening blind reading.

The model proposes auditable candidates. This script enforces eligibility,
domain diversity, immutable selection, and honest feedback labels. It does not
generate astrological claims and its score is not an accuracy statistic.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any


SCHEMA_VERSION = 1
POLICY_VERSION = "blind-opening-v1"
ALLOWED_DOMAINS = {
    "family_structure",
    "learning_path",
    "mobility",
    "work_role",
    "relationship_pattern",
    "resource_pattern",
    "behavior_pattern",
    "timing_event",
}
ALLOWED_FEEDBACK = {"hit", "partial", "miss", "unknown", "broad", "known_fact"}
EVIDENCE_SCORE = {"strong": 4, "medium": 2}
SPECIFICITY_SCORE = {"high": 3, "medium": 1}
BASE_RATE_SCORE = {"low": 2, "medium": 0}


class ProtocolError(ValueError):
    """Raised when a blind-opening artifact violates the protocol."""


def read_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ProtocolError(f"cannot read JSON {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise ProtocolError(f"top-level JSON must be an object: {path}")
    return value


def write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=False) + "\n",
        encoding="utf-8",
    )


def canonical_bytes(value: dict[str, Any]) -> bytes:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def artifact_hash(value: dict[str, Any]) -> str:
    payload = {key: item for key, item in value.items() if key != "manifest_sha256"}
    return hashlib.sha256(canonical_bytes(payload)).hexdigest()


def require_bool(candidate: dict[str, Any], field: str) -> bool:
    value = candidate.get(field)
    if not isinstance(value, bool):
        raise ProtocolError(f"candidate {candidate.get('id', '?')} field {field} must be bool")
    return value


def candidate_rejection_reasons(candidate: dict[str, Any]) -> list[str]:
    reasons: list[str] = []
    candidate_id = candidate.get("id")
    if not isinstance(candidate_id, str) or not candidate_id.strip():
        reasons.append("missing_id")
    if candidate.get("domain") not in ALLOWED_DOMAINS:
        reasons.append("unsupported_or_sensitive_domain")
    if not isinstance(candidate.get("claim"), str) or not candidate["claim"].strip():
        reasons.append("missing_claim")
    evidence = candidate.get("evidence")
    if not isinstance(evidence, list) or not evidence or not all(
        isinstance(item, str) and item.strip() for item in evidence
    ):
        reasons.append("missing_evidence")
    counterevidence = candidate.get("counterevidence")
    if not isinstance(counterevidence, list) or not counterevidence or not all(
        isinstance(item, str) and item.strip() for item in counterevidence
    ):
        reasons.append("missing_disconfirming_condition")
    if candidate.get("evidence_strength") not in EVIDENCE_SCORE:
        reasons.append("weak_or_invalid_evidence")
    if candidate.get("specificity") not in SPECIFICITY_SCORE:
        reasons.append("low_or_invalid_specificity")
    if candidate.get("base_rate_risk") not in BASE_RATE_SCORE:
        reasons.append("high_or_invalid_base_rate_risk")
    for field, reason in (
        ("falsifiable", "not_falsifiable"),
        ("biography_independent", "biography_contaminated"),
        ("atomic", "compound_claim"),
    ):
        try:
            if not require_bool(candidate, field):
                reasons.append(reason)
        except ProtocolError:
            reasons.append(f"invalid_{field}")
    try:
        if require_bool(candidate, "sensitive"):
            reasons.append("sensitive_claim")
    except ProtocolError:
        reasons.append("invalid_sensitive")

    window = candidate.get("time_window")
    if window is not None:
        if not isinstance(window, dict):
            reasons.append("invalid_time_window")
        else:
            start = window.get("start_year")
            end = window.get("end_year")
            if not isinstance(start, int) or not isinstance(end, int) or end < start:
                reasons.append("invalid_time_window")
            elif end - start > 1:
                reasons.append("time_window_too_broad")
    return sorted(set(reasons))


def candidate_score(candidate: dict[str, Any]) -> int:
    score = EVIDENCE_SCORE[candidate["evidence_strength"]]
    score += SPECIFICITY_SCORE[candidate["specificity"]]
    score += BASE_RATE_SCORE[candidate["base_rate_risk"]]
    score += 1  # an explicit disconfirming condition is required for eligibility
    if candidate.get("time_window") is not None:
        score += 1
    return score


def select_candidates(packet: dict[str, Any], count: int) -> dict[str, Any]:
    if packet.get("schema_version") != SCHEMA_VERSION:
        raise ProtocolError(f"schema_version must be {SCHEMA_VERSION}")
    if packet.get("source_scope") != "chart_only":
        raise ProtocolError("source_scope must be chart_only")
    chart_lock_id = packet.get("chart_lock_id")
    if not isinstance(chart_lock_id, str) or not chart_lock_id.strip():
        raise ProtocolError("chart_lock_id is required")
    candidates = packet.get("candidates")
    if not isinstance(candidates, list):
        raise ProtocolError("candidates must be a list")
    if count < 1 or count > 5:
        raise ProtocolError("count must be between 1 and 5")

    seen: set[str] = set()
    eligible: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []
    for raw in candidates:
        if not isinstance(raw, dict):
            rejected.append({"id": None, "reasons": ["candidate_not_object"]})
            continue
        candidate = dict(raw)
        candidate_id = candidate.get("id")
        reasons = candidate_rejection_reasons(candidate)
        if isinstance(candidate_id, str) and candidate_id in seen:
            reasons.append("duplicate_id")
        if isinstance(candidate_id, str):
            seen.add(candidate_id)
        if reasons:
            rejected.append({"id": candidate_id, "reasons": sorted(set(reasons))})
            continue
        candidate["selection_score"] = candidate_score(candidate)
        eligible.append(candidate)

    eligible.sort(key=lambda row: (-row["selection_score"], row["id"]))
    selected: list[dict[str, Any]] = []
    used_domains: set[str] = set()
    for candidate in eligible:
        if len(selected) >= count:
            break
        if candidate["domain"] in used_domains:
            continue
        selected.append(candidate)
        used_domains.add(candidate["domain"])
    if len(selected) < count:
        selected_ids = {row["id"] for row in selected}
        for candidate in eligible:
            if len(selected) >= count:
                break
            if candidate["id"] not in selected_ids:
                selected.append(candidate)
                selected_ids.add(candidate["id"])

    for rank, candidate in enumerate(selected, start=1):
        candidate["selection_rank"] = rank
    selected_ids = {row["id"] for row in selected}
    for candidate in eligible:
        if candidate["id"] not in selected_ids:
            rejected.append({"id": candidate["id"], "reasons": ["not_selected_by_rank"]})

    manifest: dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "policy_version": POLICY_VERSION,
        "chart_lock_id": chart_lock_id,
        "source_scope": "chart_only",
        "requested_count": count,
        "status": "ready" if len(selected) == count else "insufficient_candidates",
        "selected": selected,
        "rejected": rejected,
    }
    manifest["manifest_sha256"] = artifact_hash(manifest)
    return manifest


def validate_manifest(manifest: dict[str, Any]) -> None:
    if manifest.get("schema_version") != SCHEMA_VERSION:
        raise ProtocolError(f"manifest schema_version must be {SCHEMA_VERSION}")
    if manifest.get("policy_version") != POLICY_VERSION:
        raise ProtocolError(f"manifest policy_version must be {POLICY_VERSION}")
    expected = manifest.get("manifest_sha256")
    if not isinstance(expected, str) or expected != artifact_hash(manifest):
        raise ProtocolError("manifest hash mismatch; selection was modified after lock")
    selected = manifest.get("selected")
    if not isinstance(selected, list) or not selected:
        raise ProtocolError("manifest has no selected probes")


def settle_feedback(manifest: dict[str, Any], feedback: dict[str, Any]) -> dict[str, Any]:
    validate_manifest(manifest)
    if feedback.get("schema_version") != SCHEMA_VERSION:
        raise ProtocolError(f"feedback schema_version must be {SCHEMA_VERSION}")
    if feedback.get("chart_lock_id") != manifest.get("chart_lock_id"):
        raise ProtocolError("feedback chart_lock_id does not match manifest")
    if feedback.get("manifest_sha256") != manifest.get("manifest_sha256"):
        raise ProtocolError("feedback does not reference the locked manifest")
    responses = feedback.get("responses")
    if not isinstance(responses, list):
        raise ProtocolError("responses must be a list")

    selected_ids = {row["id"] for row in manifest["selected"]}
    seen: set[str] = set()
    normalized: list[dict[str, str]] = []
    counts = {label: 0 for label in sorted(ALLOWED_FEEDBACK)}
    for response in responses:
        if not isinstance(response, dict):
            raise ProtocolError("each response must be an object")
        probe_id = response.get("probe_id")
        label = response.get("label")
        if probe_id not in selected_ids:
            raise ProtocolError(f"unknown probe_id: {probe_id}")
        if probe_id in seen:
            raise ProtocolError(f"duplicate response for probe_id: {probe_id}")
        if label not in ALLOWED_FEEDBACK:
            raise ProtocolError(f"invalid feedback label for {probe_id}: {label}")
        seen.add(probe_id)
        normalized.append({"probe_id": probe_id, "label": label})
        counts[label] += 1

    pending = sorted(selected_ids - seen)
    scored = counts["hit"] + counts["partial"] + counts["miss"] + counts["broad"]
    support_points = counts["hit"] * 2 + counts["partial"]
    integrity_flags: list[str] = []
    if counts["known_fact"]:
        integrity_flags.append("known_fact_cannot_count_as_blind_hit")
    if counts["broad"]:
        integrity_flags.append("broad_match_has_zero_support_weight")

    if pending:
        route = "collect_remaining_feedback"
        confidence_effect = "pending"
    elif scored == 0:
        route = "continue_without_calibration"
        confidence_effect = "unchanged"
    elif counts["miss"] >= 2 or (scored >= 2 and support_points <= 1):
        route = "recheck_inputs_and_lower_resolution"
        confidence_effect = "downgrade"
    elif support_points >= 4 and counts["miss"] == 0:
        route = "proceed_to_deep_dive"
        confidence_effect = "limited_upgrade"
    else:
        route = "proceed_with_caution"
        confidence_effect = "hold"

    return {
        "schema_version": SCHEMA_VERSION,
        "policy_version": POLICY_VERSION,
        "chart_lock_id": manifest["chart_lock_id"],
        "manifest_sha256": manifest["manifest_sha256"],
        "responses": sorted(normalized, key=lambda row: row["probe_id"]),
        "counts": counts,
        "support_points": support_points,
        "support_points_note": "routing aid only; not an accuracy percentage or scientific score",
        "pending_probe_ids": pending,
        "integrity_flags": integrity_flags,
        "route": route,
        "confidence_effect": confidence_effect,
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Select and settle a chart-only opening blind reading."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    select = subparsers.add_parser("select", help="select eligible blind probes")
    select.add_argument("--input", required=True, type=Path)
    select.add_argument("--output", required=True, type=Path)
    select.add_argument("--count", type=int, default=3)

    settle = subparsers.add_parser("settle", help="settle user feedback")
    settle.add_argument("--manifest", required=True, type=Path)
    settle.add_argument("--feedback", required=True, type=Path)
    settle.add_argument("--output", required=True, type=Path)

    validate = subparsers.add_parser("validate", help="validate a locked manifest")
    validate.add_argument("--manifest", required=True, type=Path)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command == "select":
            result = select_candidates(read_json(args.input), args.count)
            write_json(args.output, result)
            print(
                f"selected {len(result['selected'])}/{result['requested_count']} probes; "
                f"status={result['status']}; manifest={result['manifest_sha256']}"
            )
        elif args.command == "settle":
            result = settle_feedback(read_json(args.manifest), read_json(args.feedback))
            write_json(args.output, result)
            print(
                f"settled {len(result['responses'])} responses; "
                f"route={result['route']}; confidence={result['confidence_effect']}"
            )
        else:
            validate_manifest(read_json(args.manifest))
            print("manifest is valid")
    except ProtocolError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

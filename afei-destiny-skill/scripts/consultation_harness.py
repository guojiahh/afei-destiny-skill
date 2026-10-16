#!/usr/bin/env python3
"""State, lineage, and source-policy harness for Bazi consultations.

The harness does not generate astrological conclusions. It makes the consultation
recoverable and rejects invalid phase transitions, stale artifact reuse, and
declared biography contamination in chart-only artifacts.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


SCHEMA_VERSION = 1
POLICY_VERSION = "bazi-consultation-harness-v1"
STATE_NAME = "session_state.json"
ROOT_MARKER_NAME = ".consultation-root.json"
STAGES = (
    "intake",
    "chart_ready",
    "first_read",
    "calibration",
    "deep_dive",
    "forecast",
    "report_ready",
)
MODES = {"guided", "focused", "one_shot"}
SOURCE_CATEGORIES = {
    "operational_input",
    "chart_fact",
    "traditional_rule",
    "locked_claim",
    "feedback_label",
    "biography",
    "user_preference",
    "prior_output",
    "benchmark_material",
}

# Declared-source policies do not provide OS-level or model-context isolation.
# They prevent contaminated artifacts from being accepted into the official lineage.
ARTIFACT_SOURCE_POLICIES = {
    "inputs": {"operational_input"},
    "consultation_brief": {"user_preference"},
    "chart_facts": {"operational_input"},
    "chart_lock": {"operational_input", "chart_fact", "traditional_rule"},
    "preblind_analysis": {"operational_input", "chart_fact", "traditional_rule"},
    "blind_candidates": {"operational_input", "chart_fact", "traditional_rule"},
    "blind_manifest": {
        "operational_input",
        "chart_fact",
        "traditional_rule",
        "locked_claim",
    },
    "feedback_result": {
        "operational_input",
        "chart_fact",
        "traditional_rule",
        "locked_claim",
        "feedback_label",
    },
    "feedback_log": {
        "operational_input",
        "chart_fact",
        "traditional_rule",
        "locked_claim",
        "feedback_label",
        "biography",
        "user_preference",
    },
    "consultation_context": {"biography", "user_preference", "feedback_label"},
    "deep_dive": {
        "operational_input",
        "chart_fact",
        "traditional_rule",
        "locked_claim",
        "feedback_label",
        "biography",
        "user_preference",
    },
    "forecast": {
        "operational_input",
        "chart_fact",
        "traditional_rule",
        "locked_claim",
        "feedback_label",
        "biography",
        "user_preference",
    },
    "report_section": SOURCE_CATEGORIES - {"benchmark_material"},
    "markdown_report": SOURCE_CATEGORIES - {"benchmark_material"},
    "visual_report_model": SOURCE_CATEGORIES - {"benchmark_material"},
    "html_report": SOURCE_CATEGORIES - {"benchmark_material"},
    "technical_report": {
        "operational_input",
        "chart_fact",
        "traditional_rule",
        "locked_claim",
        "feedback_label",
        "prior_output",
    },
    "output_plan": SOURCE_CATEGORIES - {"benchmark_material"},
}
PURPOSE_POLICIES = {
    "chart_calculation": {"operational_input"},
    "blind_generation": {"operational_input", "chart_fact", "traditional_rule"},
    "feedback_settlement": {"locked_claim", "feedback_label"},
    "consultation_mapping": SOURCE_CATEGORIES - {"benchmark_material", "prior_output"},
    "report_composition": SOURCE_CATEGORIES - {"benchmark_material"},
}

EXCLUSIVE_KINDS = {
    "inputs",
    "consultation_brief",
    "chart_facts",
    "chart_lock",
    "preblind_analysis",
    "blind_candidates",
    "blind_manifest",
    "feedback_result",
    "markdown_report",
    "technical_report",
    "visual_report_model",
    "html_report",
}
KIND_EARLIEST_STAGE = {
    "inputs": "intake",
    "consultation_brief": "intake",
    "chart_facts": "intake",
    "chart_lock": "chart_ready",
    "preblind_analysis": "chart_ready",
    "blind_candidates": "first_read",
    "blind_manifest": "first_read",
    "feedback_result": "calibration",
    "feedback_log": "calibration",
    "consultation_context": "calibration",
    "deep_dive": "deep_dive",
    "forecast": "forecast",
    "report_section": "deep_dive",
    "markdown_report": "report_ready",
    "technical_report": "report_ready",
    "visual_report_model": "report_ready",
    "html_report": "report_ready",
    "output_plan": "deep_dive",
}
SCOPE_KINDS = {
    "chart": set(ARTIFACT_SOURCE_POLICIES) - {"consultation_brief"},
    "interpretation": {
        "chart_lock",
        "preblind_analysis",
        "blind_candidates",
        "blind_manifest",
        "feedback_result",
        "feedback_log",
        "deep_dive",
        "forecast",
        "report_section",
        "output_plan",
    },
    "calibration": {
        "feedback_result",
        "feedback_log",
        "deep_dive",
        "forecast",
        "report_section",
        "output_plan",
    },
    "output": {"report_section", "markdown_report", "technical_report", "visual_report_model", "html_report", "output_plan"},
}
SCOPE_ROLLBACK = {
    "chart": "intake",
    "interpretation": "chart_ready",
    "calibration": "calibration",
    "output": None,
}


class HarnessError(ValueError):
    """Raised when session state or an operation violates the harness."""


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def canonical_bytes(value: dict[str, Any], hash_field: str) -> bytes:
    payload = {key: item for key, item in value.items() if key != hash_field}
    return json.dumps(
        payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")


def object_hash(value: dict[str, Any], hash_field: str = "state_sha256") -> str:
    return hashlib.sha256(canonical_bytes(value, hash_field)).hexdigest()


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def state_path(session_dir: Path) -> Path:
    return session_dir.resolve() / STATE_NAME


def session_lifecycle(state: dict[str, Any]) -> str:
    required = {"markdown_report", "technical_report"}
    if state.get("delivery_format", "markdown") == "html":
        required |= {"visual_report_model", "html_report"}
    available = {a["kind"] for a in active_artifacts(state)}
    return "complete" if state.get("stage") == "report_ready" and required <= available else "unfinished"


def safe_session_label(value: str | None, mode: str) -> str:
    raw = (value or mode).strip().lower()
    normalized = re.sub(r"[^\w-]+", "_", raw, flags=re.UNICODE).strip("_-")
    return (normalized or mode)[:40]


def discover_sessions(state_root: Path) -> dict[str, Any]:
    root = state_root.resolve()
    candidates: list[tuple[Path, str]] = []
    if (root / STATE_NAME).is_file():
        candidates.append((root, "legacy_root"))
    if root.is_dir():
        for child in sorted(root.iterdir(), key=lambda path: path.name.lower()):
            if child.is_dir() and (child / STATE_NAME).is_file():
                candidates.append((child, "isolated_subdirectory"))

    sessions: list[dict[str, Any]] = []
    invalid_sessions: list[dict[str, str]] = []
    for directory, layout in candidates:
        try:
            state = read_state(directory)
            issues = audit_state(directory, state)
        except HarnessError as exc:
            invalid_sessions.append(
                {"session_dir": str(directory), "storage_layout": layout, "error": str(exc)}
            )
            continue
        summary = status_summary(state)
        sessions.append(
            {
                "session_dir": str(directory),
                "directory_name": directory.name,
                "storage_layout": layout,
                "lifecycle": session_lifecycle(state),
                "audit_ok": not issues,
                "audit_issues": issues,
                "updated_at": state.get("updated_at"),
                **summary,
            }
        )

    sessions.sort(key=lambda row: row.get("updated_at") or "", reverse=True)
    sessions.sort(key=lambda row: row["lifecycle"] != "unfinished")
    unfinished = [row for row in sessions if row["lifecycle"] == "unfinished" and row["audit_ok"]]
    audit_problems = [row for row in sessions if not row["audit_ok"]]
    if len(unfinished) == 1:
        decision = "ask_continue_or_start_new"
    elif len(unfinished) > 1:
        decision = "ask_choose_session_or_start_new"
    elif invalid_sessions or audit_problems:
        decision = "review_invalid_state_or_start_new"
    else:
        decision = "start_new"
    return {
        "schema_version": 1,
        "state_root": str(root),
        "decision": decision,
        "unfinished_count": len(unfinished),
        "audit_problem_count": len(audit_problems),
        "sessions": sessions,
        "invalid_sessions": invalid_sessions,
        "rules": [
            "never merge artifacts from different session_dir values",
            "do not resume an unfinished session until the user chooses it",
            "start_new always creates a new isolated subdirectory",
        ],
    }


def start_isolated_session(
    state_root: Path,
    mode: str,
    topic: str | None,
    label: str | None,
) -> tuple[Path, dict[str, Any]]:
    root = state_root.resolve()
    root.mkdir(parents=True, exist_ok=True)
    marker = root / ROOT_MARKER_NAME
    if not marker.exists():
        write_json_atomic(
            marker,
            {
                "schema_version": 1,
                "purpose": "bazi_consultation_session_collection",
                "session_layout": "one_subdirectory_per_consultation",
            },
        )
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%SZ")
    name = f"{stamp}_{safe_session_label(label or topic, mode)}_{uuid.uuid4().hex[:8]}"
    session_dir = root / name
    state = initialize_session(session_dir, mode, topic)
    state["storage_layout"] = "isolated_session_v1"
    state["session_label"] = label or topic
    state["revision"] += 1
    append_history(state, "isolated_session_created", state_root=str(root), session_dir=name)
    write_state(session_dir, state)
    return session_dir, state


def legacy_migration_preview(state_root: Path) -> dict[str, Any]:
    root = state_root.resolve()
    legacy_state = root / STATE_NAME
    if not legacy_state.is_file():
        return {
            "schema_version": 1,
            "state_root": str(root),
            "legacy_session_found": False,
            "action": "none",
        }
    state = read_state(root)
    registered = {STATE_NAME}
    for artifact in state.get("artifacts", []):
        path = artifact.get("path")
        if isinstance(path, str) and path:
            registered.add(Path(path).as_posix())
    loose_files = {
        path.name
        for path in root.iterdir()
        if path.is_file() and path.name != ROOT_MARKER_NAME
    }
    registered_root_files = {path for path in registered if "/" not in path}
    unassigned = sorted(loose_files - registered_root_files)
    nested_registered = sorted(path for path in registered if "/" in path)
    target = f"legacy_{state.get('session_id', 'unknown')[:8]}"
    return {
        "schema_version": 1,
        "state_root": str(root),
        "legacy_session_found": True,
        "session_id": state.get("session_id"),
        "stage": state.get("stage"),
        "suggested_target": str(root / target),
        "registered_paths": sorted(registered),
        "unassigned_root_files": unassigned,
        "nested_registered_paths": nested_registered,
        "safe_to_auto_migrate": not unassigned and not nested_registered,
        "action": "preview_only_requires_user_confirmation",
        "note": "No files were moved. Mixed or unassigned files require manual mapping before migration.",
    }


def validate_low_level_init_target(session_dir: Path) -> None:
    resolved = session_dir.resolve()
    if resolved.name.lower() == "consultation_state" or (resolved / ROOT_MARKER_NAME).exists():
        raise HarnessError(
            "init cannot target the consultation collection root; use start --state-root so each consultation gets an isolated subdirectory"
        )


def validate_start_choice(discovery: dict[str, Any], user_choice: str | None) -> None:
    if discovery.get("decision") != "start_new" and user_choice != "new":
        raise HarnessError(
            "existing or invalid consultation state requires an explicit user choice; run discover, ask the user, then pass --user-choice new"
        )


def ensure_inside_session(session_dir: Path, artifact_path: Path) -> Path:
    root = session_dir.resolve()
    resolved = artifact_path.resolve()
    try:
        resolved.relative_to(root)
    except ValueError as exc:
        raise HarnessError("artifact path must stay inside the session directory") from exc
    return resolved


def write_json_atomic(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=False) + "\n",
        encoding="utf-8",
    )
    os.replace(temporary, path)


def write_state(session_dir: Path, state: dict[str, Any]) -> None:
    state["updated_at"] = utc_now()
    state["state_sha256"] = object_hash(state)
    write_json_atomic(state_path(session_dir), state)


def read_state(session_dir: Path) -> dict[str, Any]:
    path = state_path(session_dir)
    try:
        state = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HarnessError(f"cannot read session state: {exc}") from exc
    if not isinstance(state, dict):
        raise HarnessError("session state must be a JSON object")
    if state.get("schema_version") != SCHEMA_VERSION:
        raise HarnessError(f"unsupported schema_version: {state.get('schema_version')}")
    if state.get("policy_version") != POLICY_VERSION:
        raise HarnessError(f"unsupported policy_version: {state.get('policy_version')}")
    expected = state.get("state_sha256")
    if not isinstance(expected, str) or expected != object_hash(state):
        raise HarnessError("session state hash mismatch; state was modified outside the harness")
    return state


def append_history(state: dict[str, Any], event: str, **details: Any) -> None:
    state["history"].append({"at": utc_now(), "event": event, **details})


def initialize_session(session_dir: Path, mode: str, topic: str | None) -> dict[str, Any]:
    if mode not in MODES:
        raise HarnessError(f"mode must be one of: {', '.join(sorted(MODES))}")
    path = state_path(session_dir)
    if path.exists():
        raise HarnessError("session already exists; use status or resume it instead of overwriting")
    session_dir.mkdir(parents=True, exist_ok=True)
    now = utc_now()
    state: dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "policy_version": POLICY_VERSION,
        "session_id": str(uuid.uuid4()),
        "mode": mode,
        "stage": "intake",
        "delivery_format": "html",
        "selected_topic": topic,
        "revision": 1,
        "privacy": {
            "biography_storage": "minimal_summary_only",
            "skill_directory_storage_forbidden": True,
            "declared_source_firewall": True,
            "absolute_context_isolation_claimed": False,
        },
        "artifacts": [],
        "history": [
            {
                "at": now,
                "event": "initialized",
                "mode": mode,
                "topic": topic,
            }
        ],
        "created_at": now,
        "updated_at": now,
    }
    write_state(session_dir, state)
    return state


def active_artifacts(state: dict[str, Any], kind: str | None = None) -> list[dict[str, Any]]:
    return [
        row
        for row in state["artifacts"]
        if row.get("status") == "active" and (kind is None or row.get("kind") == kind)
    ]


def find_artifact(state: dict[str, Any], artifact_id: str) -> dict[str, Any]:
    for row in state["artifacts"]:
        if row.get("id") == artifact_id:
            return row
    raise HarnessError(f"unknown artifact id: {artifact_id}")


def validate_sources(kind: str, categories: Iterable[str]) -> list[str]:
    if kind not in ARTIFACT_SOURCE_POLICIES:
        raise HarnessError(f"unsupported artifact kind: {kind}")
    normalized = sorted(set(categories))
    unknown = set(normalized) - SOURCE_CATEGORIES
    if unknown:
        raise HarnessError(f"unknown source categories: {', '.join(sorted(unknown))}")
    forbidden = set(normalized) - ARTIFACT_SOURCE_POLICIES[kind]
    if forbidden:
        raise HarnessError(
            f"source firewall rejected {kind}: {', '.join(sorted(forbidden))}"
        )
    return normalized


def register_artifact(
    session_dir: Path,
    state: dict[str, Any],
    *,
    kind: str,
    path: Path,
    source_categories: Iterable[str],
    source_artifact_ids: Iterable[str],
) -> dict[str, Any]:
    current_index = STAGES.index(state["stage"])
    earliest = KIND_EARLIEST_STAGE.get(kind)
    if earliest is None:
        raise HarnessError(f"unsupported artifact kind: {kind}")
    if current_index < STAGES.index(earliest):
        raise HarnessError(f"{kind} cannot be registered during {state['stage']}")
    if kind in EXCLUSIVE_KINDS and active_artifacts(state, kind):
        raise HarnessError(
            f"active {kind} already exists; supersede the old lineage before registering a replacement"
        )

    resolved = ensure_inside_session(session_dir, path)
    if not resolved.is_file():
        raise HarnessError(f"artifact file does not exist: {resolved}")

    source_ids = list(dict.fromkeys(source_artifact_ids))
    inherited_categories: set[str] = set(source_categories)
    for source_id in source_ids:
        source = find_artifact(state, source_id)
        if source.get("status") != "active":
            raise HarnessError(f"source artifact is not active: {source_id}")
        inherited_categories.update(source.get("source_categories", []))
    normalized_categories = validate_sources(kind, inherited_categories)

    if kind in {"visual_report_model", "html_report"}:
        from generate_html_report import validate_registration
        validate_registration(session_dir, state, kind, resolved, source_ids)

    artifact = {
        "id": f"{kind}-{uuid.uuid4().hex[:12]}",
        "kind": kind,
        "path": resolved.relative_to(session_dir.resolve()).as_posix(),
        "sha256": file_hash(resolved),
        "status": "active",
        "created_stage": state["stage"],
        "source_artifact_ids": source_ids,
        "source_categories": normalized_categories,
        "contains_biography": "biography" in normalized_categories,
        "created_at": utc_now(),
    }
    state["artifacts"].append(artifact)
    state["revision"] += 1
    append_history(state, "artifact_registered", artifact_id=artifact["id"], kind=kind)
    write_state(session_dir, state)
    return artifact


def transition_requirements(state: dict[str, Any], target: str) -> list[str]:
    requirements = {
        "chart_ready": {"chart_facts"},
        "first_read": {"chart_lock", "preblind_analysis"},
        "calibration": {"blind_manifest"},
        "deep_dive": {"chart_lock"},
        "forecast": {"deep_dive"},
        "report_ready": {"deep_dive"},
    }.get(target, set())
    if target == "deep_dive" and state["mode"] == "guided":
        requirements = requirements | {"feedback_result"}
    return sorted(kind for kind in requirements if not active_artifacts(state, kind))


def allowed_next_stages(state: dict[str, Any]) -> set[str]:
    stage = state["stage"]
    mode = state["mode"]
    if stage == "intake":
        return {"chart_ready"}
    if stage == "chart_ready":
        return {"first_read"} if mode == "guided" else {"deep_dive"}
    if stage == "first_read":
        return {"calibration"}
    if stage == "calibration":
        return {"deep_dive"}
    if stage == "deep_dive":
        return {"forecast", "report_ready"}
    if stage == "forecast":
        return {"report_ready"}
    return set()


def transition_stage(
    session_dir: Path,
    state: dict[str, Any],
    target: str,
    *,
    operator_override: bool,
    reason: str | None,
) -> None:
    if target not in STAGES:
        raise HarnessError(f"unknown stage: {target}")
    if target == state["stage"]:
        raise HarnessError("session is already at that stage")
    if STAGES.index(target) < STAGES.index(state["stage"]):
        raise HarnessError("backward transition requires reset so downstream artifacts are invalidated")
    normal = target in allowed_next_stages(state)
    if not normal and not operator_override:
        raise HarnessError(
            f"transition {state['stage']} -> {target} is not allowed without operator override"
        )
    if operator_override and not reason:
        raise HarnessError("operator override requires a reason")
    missing = transition_requirements(state, target)
    if missing and not operator_override:
        raise HarnessError(f"transition requires active artifacts: {', '.join(missing)}")
    previous = state["stage"]
    state["stage"] = target
    state["revision"] += 1
    append_history(
        state,
        "stage_transition",
        previous=previous,
        target=target,
        operator_override=operator_override,
        reason=reason,
        waived_requirements=missing if operator_override else [],
    )
    write_state(session_dir, state)


def dependent_ids(state: dict[str, Any], seed_ids: set[str]) -> set[str]:
    affected = set(seed_ids)
    changed = True
    while changed:
        changed = False
        for artifact in state["artifacts"]:
            if artifact["id"] in affected:
                continue
            if affected.intersection(artifact.get("source_artifact_ids", [])):
                affected.add(artifact["id"])
                changed = True
    return affected


def supersede(
    session_dir: Path,
    state: dict[str, Any],
    *,
    scope: str | None,
    artifact_ids: Iterable[str],
    reason: str,
) -> dict[str, Any]:
    requested_ids = set(artifact_ids)
    if scope:
        if scope not in SCOPE_KINDS:
            raise HarnessError(f"unknown supersede scope: {scope}")
        requested_ids.update(
            row["id"]
            for row in active_artifacts(state)
            if row["kind"] in SCOPE_KINDS[scope]
        )
    if not requested_ids:
        raise HarnessError("supersede requires an active scope or artifact id")
    for artifact_id in requested_ids:
        if find_artifact(state, artifact_id).get("status") != "active":
            raise HarnessError(f"artifact is not active: {artifact_id}")

    affected = dependent_ids(state, requested_ids)
    for artifact in state["artifacts"]:
        if artifact["id"] in requested_ids:
            artifact["status"] = "superseded"
            artifact["status_reason"] = reason
        elif artifact["id"] in affected and artifact.get("status") == "active":
            artifact["status"] = "stale"
            artifact["status_reason"] = f"depends on superseded lineage: {reason}"

    rollback = SCOPE_ROLLBACK[scope] if scope else None
    if scope is None and requested_ids:
        earliest_index = min(
            STAGES.index(find_artifact(state, artifact_id)["created_stage"])
            for artifact_id in requested_ids
        )
        rollback = STAGES[earliest_index]
    if rollback and STAGES.index(rollback) < STAGES.index(state["stage"]):
        state["stage"] = rollback
    state["revision"] += 1
    append_history(
        state,
        "superseded",
        scope=scope,
        requested_artifact_ids=sorted(requested_ids),
        affected_artifact_ids=sorted(affected),
        rollback_stage=rollback,
        reason=reason,
    )
    write_state(session_dir, state)
    return {"superseded": sorted(requested_ids), "affected": sorted(affected), "stage": state["stage"]}


def reset_to_stage(session_dir: Path, state: dict[str, Any], target: str, reason: str) -> list[str]:
    if target not in STAGES:
        raise HarnessError(f"unknown reset stage: {target}")
    target_index = STAGES.index(target)
    if target_index > STAGES.index(state["stage"]):
        raise HarnessError("reset cannot move forward; use transition")
    invalidated: list[str] = []
    for artifact in state["artifacts"]:
        if artifact.get("status") != "active":
            continue
        if STAGES.index(artifact["created_stage"]) >= target_index:
            artifact["status"] = "stale"
            artifact["status_reason"] = f"reset to {target}: {reason}"
            invalidated.append(artifact["id"])
    state["stage"] = target
    state["revision"] += 1
    append_history(
        state,
        "reset",
        target=target,
        invalidated_artifact_ids=sorted(invalidated),
        reason=reason,
    )
    write_state(session_dir, state)
    return sorted(invalidated)


def firewall_check(purpose: str, categories: Iterable[str]) -> list[str]:
    if purpose not in PURPOSE_POLICIES:
        raise HarnessError(f"unknown firewall purpose: {purpose}")
    normalized = sorted(set(categories))
    unknown = set(normalized) - SOURCE_CATEGORIES
    if unknown:
        raise HarnessError(f"unknown source categories: {', '.join(sorted(unknown))}")
    forbidden = set(normalized) - PURPOSE_POLICIES[purpose]
    if forbidden:
        raise HarnessError(
            f"source firewall rejected {purpose}: {', '.join(sorted(forbidden))}"
        )
    return normalized


def audit_state(session_dir: Path, state: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    ids = {row.get("id") for row in state["artifacts"]}
    if len(ids) != len(state["artifacts"]):
        issues.append("duplicate artifact ids")
    for artifact in state["artifacts"]:
        try:
            path = ensure_inside_session(session_dir, session_dir / artifact["path"])
        except (HarnessError, KeyError) as exc:
            issues.append(f"{artifact.get('id', '?')}: invalid path: {exc}")
            continue
        if artifact.get("status") == "active":
            if not path.is_file():
                issues.append(f"{artifact['id']}: active artifact is missing")
            elif file_hash(path) != artifact.get("sha256"):
                issues.append(f"{artifact['id']}: active artifact hash mismatch")
        for source_id in artifact.get("source_artifact_ids", []):
            if source_id not in ids:
                issues.append(f"{artifact['id']}: unknown source artifact {source_id}")
            elif artifact.get("status") == "active" and find_artifact(state, source_id).get("status") != "active":
                issues.append(f"{artifact['id']}: active artifact depends on inactive {source_id}")
        try:
            validate_sources(artifact["kind"], artifact.get("source_categories", []))
        except HarnessError as exc:
            issues.append(f"{artifact.get('id', '?')}: {exc}")
    missing = transition_requirements(state, state["stage"])
    if state["stage"] != "intake" and missing:
        issues.append(f"current stage lacks active artifacts: {', '.join(missing)}")
    return issues


def status_summary(state: dict[str, Any]) -> dict[str, Any]:
    counts: dict[str, int] = {}
    for artifact in active_artifacts(state):
        counts[artifact["kind"]] = counts.get(artifact["kind"], 0) + 1
    return {
        "session_id": state["session_id"],
        "mode": state["mode"],
        "stage": state["stage"],
        "lifecycle": session_lifecycle(state),
        "delivery_format": state.get("delivery_format", "markdown"),
        "session_label": state.get("session_label"),
        "selected_topic": state.get("selected_topic"),
        "revision": state["revision"],
        "active_artifacts": counts,
        "allowed_next_stages": sorted(allowed_next_stages(state)),
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Manage a stateful Bazi consultation.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    init = subparsers.add_parser("init", help="initialize a consultation session")
    init.add_argument("--session-dir", required=True, type=Path)
    init.add_argument("--mode", choices=sorted(MODES), default="guided")
    init.add_argument("--topic")

    discover = subparsers.add_parser("discover", help="discover isolated consultation sessions")
    discover.add_argument("--state-root", required=True, type=Path)

    start = subparsers.add_parser("start", help="start a new isolated consultation session")
    start.add_argument("--state-root", required=True, type=Path)
    start.add_argument("--mode", choices=sorted(MODES), default="guided")
    start.add_argument("--topic")
    start.add_argument("--label")
    start.add_argument("--user-choice", choices=("new",))

    preview = subparsers.add_parser(
        "migration-preview", help="preview legacy root-session migration without moving files"
    )
    preview.add_argument("--state-root", required=True, type=Path)

    for name in ("status", "audit"):
        command = subparsers.add_parser(name, help=f"{name} a consultation session")
        command.add_argument("--session-dir", required=True, type=Path)

    resume = subparsers.add_parser("resume", help="resume a user-selected consultation session")
    resume.add_argument("--session-dir", required=True, type=Path)
    resume.add_argument("--user-choice", required=True, choices=("continue",))

    delivery = subparsers.add_parser("set-delivery", help="set an explicitly requested delivery format")
    delivery.add_argument("--session-dir", required=True, type=Path)
    delivery.add_argument("--format", required=True, choices=("html", "markdown"))
    delivery.add_argument("--reason", required=True)

    register = subparsers.add_parser("register", help="register a lineage artifact")
    register.add_argument("--session-dir", required=True, type=Path)
    register.add_argument("--kind", required=True, choices=sorted(ARTIFACT_SOURCE_POLICIES))
    register.add_argument("--path", required=True, type=Path)
    register.add_argument("--source-category", action="append", default=[])
    register.add_argument("--source-artifact", action="append", default=[])

    transition = subparsers.add_parser("transition", help="move to another stage")
    transition.add_argument("--session-dir", required=True, type=Path)
    transition.add_argument("--to", required=True, choices=STAGES)
    transition.add_argument("--operator-override", action="store_true")
    transition.add_argument("--reason")

    replace = subparsers.add_parser("supersede", help="invalidate an old lineage")
    replace.add_argument("--session-dir", required=True, type=Path)
    replace.add_argument("--scope", choices=sorted(SCOPE_KINDS))
    replace.add_argument("--artifact-id", action="append", default=[])
    replace.add_argument("--reason", required=True)

    reset = subparsers.add_parser("reset", help="restart from a named checkpoint")
    reset.add_argument("--session-dir", required=True, type=Path)
    reset.add_argument("--to", required=True, choices=STAGES)
    reset.add_argument("--reason", required=True)

    firewall = subparsers.add_parser("firewall-check", help="check declared sources")
    firewall.add_argument("--purpose", required=True, choices=sorted(PURPOSE_POLICIES))
    firewall.add_argument("--source-category", action="append", default=[])
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command == "discover":
            print(json.dumps(discover_sessions(args.state_root), ensure_ascii=False, indent=2))
            return 0
        if args.command == "start":
            discovery = discover_sessions(args.state_root)
            validate_start_choice(discovery, args.user_choice)
            session_dir, state = start_isolated_session(
                args.state_root,
                args.mode,
                args.topic,
                args.label,
            )
            print(
                json.dumps(
                    {"session_dir": str(session_dir), "status": status_summary(state)},
                    ensure_ascii=False,
                    indent=2,
                )
            )
            return 0
        if args.command == "migration-preview":
            print(json.dumps(legacy_migration_preview(args.state_root), ensure_ascii=False, indent=2))
            return 0
        if args.command == "init":
            validate_low_level_init_target(args.session_dir)
            state = initialize_session(args.session_dir, args.mode, args.topic)
            print(json.dumps(status_summary(state), ensure_ascii=False, indent=2))
            return 0
        if args.command == "firewall-check":
            categories = firewall_check(args.purpose, args.source_category)
            print(
                json.dumps(
                    {
                        "allowed": True,
                        "purpose": args.purpose,
                        "source_categories": categories,
                        "note": "declared-source check only; not absolute model-context isolation",
                    },
                    ensure_ascii=False,
                    indent=2,
                )
            )
            return 0

        state = read_state(args.session_dir)
        if args.command == "status":
            print(json.dumps(status_summary(state), ensure_ascii=False, indent=2))
        elif args.command == "resume":
            issues = audit_state(args.session_dir, state)
            if issues:
                raise HarnessError("cannot resume: " + "; ".join(issues))
            append_history(state, "resumed", stage=state["stage"])
            state["revision"] += 1
            write_state(args.session_dir, state)
            print(json.dumps(status_summary(state), ensure_ascii=False, indent=2))
        elif args.command == "set-delivery":
            issues = audit_state(args.session_dir, state)
            if issues:
                raise HarnessError("cannot change delivery: " + "; ".join(issues))
            old = state.get("delivery_format", "markdown")
            state["delivery_format"] = args.format
            state["revision"] += 1
            append_history(state, "delivery_format_changed", previous=old, target=args.format, reason=args.reason)
            write_state(args.session_dir, state)
            print(json.dumps(status_summary(state), ensure_ascii=False, indent=2))
        elif args.command == "register":
            artifact = register_artifact(
                args.session_dir,
                state,
                kind=args.kind,
                path=args.path,
                source_categories=args.source_category,
                source_artifact_ids=args.source_artifact,
            )
            print(json.dumps(artifact, ensure_ascii=False, indent=2))
        elif args.command == "transition":
            transition_stage(
                args.session_dir,
                state,
                args.to,
                operator_override=args.operator_override,
                reason=args.reason,
            )
            print(json.dumps(status_summary(state), ensure_ascii=False, indent=2))
        elif args.command == "supersede":
            result = supersede(
                args.session_dir,
                state,
                scope=args.scope,
                artifact_ids=args.artifact_id,
                reason=args.reason,
            )
            print(json.dumps(result, ensure_ascii=False, indent=2))
        elif args.command == "reset":
            invalidated = reset_to_stage(args.session_dir, state, args.to, args.reason)
            print(
                json.dumps(
                    {"stage": state["stage"], "invalidated": invalidated},
                    ensure_ascii=False,
                    indent=2,
                )
            )
        else:
            issues = audit_state(args.session_dir, state)
            print(
                json.dumps(
                    {"ok": not issues, "issues": issues, "status": status_summary(state)},
                    ensure_ascii=False,
                    indent=2,
                )
            )
            return 0 if not issues else 1
    except HarnessError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

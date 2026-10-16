#!/usr/bin/env python3
"""Select active consultation artifacts for a requested output.

This router selects active sources. generate_html_report.py renders and registers
the default HTML delivery after the two source reports and visual model are ready.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from consultation_harness import (
    HarnessError,
    active_artifacts,
    audit_state,
    ensure_inside_session,
    read_state,
    register_artifact,
    write_json_atomic,
)


ROUTES = {
    "html_report": {
        "required_all": ("markdown_report", "technical_report", "visual_report_model"),
        "preferred": ("markdown_report", "technical_report", "visual_report_model"),
        "presentation": "self_contained_html",
    },
    "guided_turn": {
        "preferred": (
            "chart_facts",
            "chart_lock",
            "preblind_analysis",
            "blind_manifest",
            "feedback_result",
            "deep_dive",
            "forecast",
        ),
        "presentation": "chat",
    },
    "focused_answer": {
        "required_all": ("chart_lock",),
        "preferred": ("chart_facts", "chart_lock", "feedback_result", "deep_dive", "forecast"),
        "presentation": "chat",
    },
    "technical_audit": {
        "required_all": ("chart_facts", "chart_lock"),
        "preferred": (
            "chart_facts",
            "chart_lock",
            "preblind_analysis",
            "blind_manifest",
            "feedback_result",
        ),
        "presentation": "markdown",
        "forbidden_categories": ("biography", "user_preference"),
    },
    "consultation_summary": {
        "required_all": ("chart_lock",),
        "preferred": (
            "chart_facts",
            "chart_lock",
            "preblind_analysis",
            "feedback_result",
            "deep_dive",
            "forecast",
            "report_section",
        ),
        "presentation": "markdown",
    },
    "report_source": {
        "required_all": ("chart_lock",),
        "required_any": ("deep_dive", "report_section"),
        "preferred": (
            "inputs",
            "consultation_brief",
            "chart_facts",
            "chart_lock",
            "preblind_analysis",
            "blind_manifest",
            "feedback_result",
            "feedback_log",
            "consultation_context",
            "deep_dive",
            "forecast",
            "report_section",
        ),
        "presentation": "structured_markdown",
    },
    "technical_report_source": {
        "required_all": ("chart_facts", "chart_lock", "preblind_analysis"),
        "preferred": (
            "inputs",
            "chart_facts",
            "chart_lock",
            "preblind_analysis",
            "blind_manifest",
            "feedback_result",
            "forecast",
            "report_section",
        ),
        "presentation": "technical_markdown",
        "forbidden_categories": ("biography", "user_preference"),
    },
}


def build_output_plan(state: dict[str, Any], intent: str) -> dict[str, Any]:
    if intent not in ROUTES:
        raise HarnessError(f"unsupported output intent: {intent}")
    route = ROUTES[intent]
    active = active_artifacts(state)
    by_kind: dict[str, list[dict[str, Any]]] = {}
    for artifact in active:
        by_kind.setdefault(artifact["kind"], []).append(artifact)

    missing = [kind for kind in route.get("required_all", ()) if kind not in by_kind]
    required_any = route.get("required_any", ())
    if required_any and not any(kind in by_kind for kind in required_any):
        missing.append("one_of:" + "|".join(required_any))
    if missing:
        raise HarnessError(f"output route lacks active artifacts: {', '.join(missing)}")

    forbidden = set(route.get("forbidden_categories", ()))
    selected: list[dict[str, Any]] = []
    excluded: list[dict[str, str]] = []
    for kind in route["preferred"]:
        for artifact in by_kind.get(kind, []):
            blocked = forbidden.intersection(artifact.get("source_categories", []))
            if blocked:
                excluded.append(
                    {
                        "artifact_id": artifact["id"],
                        "reason": "forbidden source categories: " + ", ".join(sorted(blocked)),
                    }
                )
                continue
            selected.append(
                {
                    "artifact_id": artifact["id"],
                    "kind": artifact["kind"],
                    "path": artifact["path"],
                    "sha256": artifact["sha256"],
                    "source_categories": artifact.get("source_categories", []),
                }
            )

    return {
        "schema_version": 1,
        "intent": intent,
        "session_id": state["session_id"],
        "session_revision": state["revision"],
        "stage": state["stage"],
        "presentation": route["presentation"],
        "status": "ready",
        "selected_artifacts": selected,
        "excluded_artifacts": excluded,
        "rules": [
            "use only active artifacts listed in selected_artifacts",
            "do not restore stale or superseded conclusions",
            "do not convert user feedback into independent chart evidence",
            "presentation may simplify language but must not change confidence or lineage",
        ],
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Route Bazi consultation outputs.")
    parser.add_argument("--session-dir", required=True, type=Path)
    parser.add_argument(
        "--intent",
        required=True,
        choices=sorted(set(ROUTES) | {"html_report"}),
    )
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument(
        "--register",
        action="store_true",
        help="register the generated plan in the session lineage",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        state = read_state(args.session_dir)
        if args.intent == "html_report":
            issues = audit_state(args.session_dir, state)
            if issues:
                raise HarnessError("HTML source audit failed: " + "; ".join(issues))
        output = args.output
        if not output.is_absolute():
            output = args.session_dir / output
        output = ensure_inside_session(args.session_dir, output)
        plan = build_output_plan(state, args.intent)
        write_json_atomic(output, plan)
        result: dict[str, Any] = {"plan": str(output), "status": plan["status"]}
        if args.register:
            artifact = register_artifact(
                args.session_dir,
                state,
                kind="output_plan",
                path=output,
                source_categories=["prior_output"],
                source_artifact_ids=[row["artifact_id"] for row in plan["selected_artifacts"]],
            )
            result["artifact_id"] = artifact["id"]
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except HarnessError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

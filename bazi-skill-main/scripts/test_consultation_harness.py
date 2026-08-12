#!/usr/bin/env python3
"""Tests for consultation state, lineage, firewall, routing, and diagnostics."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from consultation_harness import (
    HarnessError,
    active_artifacts,
    audit_state,
    firewall_check,
    initialize_session,
    read_state,
    register_artifact,
    reset_to_stage,
    status_summary,
    supersede,
    transition_stage,
)
from consultation_output_router import build_output_plan
from doctor import run_checks


class ConsultationHarnessTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.session_dir = Path(self.temporary.name) / "consultation_state"
        self.state = initialize_session(self.session_dir, "guided", None)

    def tearDown(self):
        self.temporary.cleanup()

    def make_file(self, name: str, value=None) -> Path:
        path = self.session_dir / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(value if value is not None else {"name": name}),
            encoding="utf-8",
        )
        return path

    def register(
        self,
        kind: str,
        *,
        categories=(),
        sources=(),
        name: str | None = None,
    ):
        return register_artifact(
            self.session_dir,
            self.state,
            kind=kind,
            path=self.make_file(name or f"{kind}.json"),
            source_categories=categories,
            source_artifact_ids=sources,
        )

    def reach_chart_ready(self):
        chart = self.register("chart_facts", categories=("operational_input",))
        transition_stage(
            self.session_dir,
            self.state,
            "chart_ready",
            operator_override=False,
            reason=None,
        )
        lock = self.register(
            "chart_lock",
            categories=("chart_fact", "traditional_rule"),
            sources=(chart["id"],),
        )
        return chart, lock

    def reach_deep_dive(self):
        chart, lock = self.reach_chart_ready()
        transition_stage(
            self.session_dir,
            self.state,
            "first_read",
            operator_override=False,
            reason=None,
        )
        candidates = self.register(
            "blind_candidates",
            categories=("chart_fact", "traditional_rule"),
            sources=(lock["id"],),
        )
        manifest = self.register(
            "blind_manifest",
            categories=("locked_claim",),
            sources=(candidates["id"],),
        )
        transition_stage(
            self.session_dir,
            self.state,
            "calibration",
            operator_override=False,
            reason=None,
        )
        feedback = self.register(
            "feedback_result",
            categories=("feedback_label",),
            sources=(manifest["id"],),
        )
        transition_stage(
            self.session_dir,
            self.state,
            "deep_dive",
            operator_override=False,
            reason=None,
        )
        deep = self.register(
            "deep_dive",
            categories=("biography", "user_preference"),
            sources=(lock["id"], feedback["id"]),
        )
        return chart, lock, manifest, feedback, deep

    def test_init_creates_hashed_recoverable_state(self):
        recovered = read_state(self.session_dir)
        self.assertEqual("intake", recovered["stage"])
        self.assertFalse(recovered["privacy"]["absolute_context_isolation_claimed"])
        self.assertEqual(["chart_ready"], status_summary(recovered)["allowed_next_stages"])

    def test_transition_rejects_missing_prerequisite(self):
        with self.assertRaisesRegex(HarnessError, "chart_facts"):
            transition_stage(
                self.session_dir,
                self.state,
                "chart_ready",
                operator_override=False,
                reason=None,
            )

    def test_backward_transition_requires_reset(self):
        self.reach_chart_ready()
        with self.assertRaisesRegex(HarnessError, "reset"):
            transition_stage(
                self.session_dir,
                self.state,
                "intake",
                operator_override=True,
                reason="go back",
            )

    def test_full_guided_flow_reaches_report_ready(self):
        self.reach_deep_dive()
        transition_stage(
            self.session_dir,
            self.state,
            "forecast",
            operator_override=False,
            reason=None,
        )
        self.register("forecast", categories=("chart_fact", "traditional_rule"))
        transition_stage(
            self.session_dir,
            self.state,
            "report_ready",
            operator_override=False,
            reason=None,
        )
        self.assertEqual("report_ready", self.state["stage"])
        self.assertEqual([], audit_state(self.session_dir, self.state))

    def test_operator_override_is_explicit_and_recorded(self):
        transition_stage(
            self.session_dir,
            self.state,
            "deep_dive",
            operator_override=True,
            reason="user requested direct answer without chart artifacts",
        )
        event = self.state["history"][-1]
        self.assertTrue(event["operator_override"])
        self.assertIn("chart_lock", event["waived_requirements"])

    def test_blind_firewall_rejects_biography(self):
        self.reach_chart_ready()
        transition_stage(
            self.session_dir,
            self.state,
            "first_read",
            operator_override=False,
            reason=None,
        )
        with self.assertRaisesRegex(HarnessError, "biography"):
            self.register(
                "blind_candidates",
                categories=("chart_fact", "traditional_rule", "biography"),
            )
        with self.assertRaises(HarnessError):
            firewall_check("blind_generation", ("chart_fact", "biography"))

    def test_exclusive_artifact_cannot_be_silently_overwritten(self):
        self.register("chart_facts", categories=("operational_input",), name="chart-v1.json")
        with self.assertRaisesRegex(HarnessError, "supersede"):
            self.register("chart_facts", categories=("operational_input",), name="chart-v2.json")

    def test_chart_supersede_invalidates_downstream_and_rolls_back(self):
        chart, _, _, _, deep = self.reach_deep_dive()
        result = supersede(
            self.session_dir,
            self.state,
            scope="chart",
            artifact_ids=(),
            reason="birth time corrected",
        )
        self.assertEqual("intake", result["stage"])
        self.assertEqual("superseded", chart["status"])
        self.assertNotEqual("active", deep["status"])
        self.assertEqual([], active_artifacts(self.state))

    def test_reset_to_first_read_preserves_chart_lock(self):
        _, lock, manifest, _, _ = self.reach_deep_dive()
        invalidated = reset_to_stage(
            self.session_dir,
            self.state,
            "first_read",
            "restart blind opening",
        )
        self.assertEqual("active", lock["status"])
        self.assertIn(manifest["id"], invalidated)
        self.assertEqual("first_read", self.state["stage"])

    def test_artifact_tampering_is_reported(self):
        chart = self.register("chart_facts", categories=("operational_input",))
        (self.session_dir / chart["path"]).write_text("changed", encoding="utf-8")
        issues = audit_state(self.session_dir, self.state)
        self.assertTrue(any("hash mismatch" in issue for issue in issues))

    def test_output_router_uses_only_active_lineage_and_defers_html(self):
        _, _, _, _, deep = self.reach_deep_dive()
        plan = build_output_plan(self.state, "report_source")
        ids = {row["artifact_id"] for row in plan["selected_artifacts"]}
        self.assertIn(deep["id"], ids)
        with self.assertRaisesRegex(HarnessError, "deferred"):
            build_output_plan(self.state, "html_report")

    def test_guided_turn_can_open_before_chart_exists(self):
        plan = build_output_plan(self.state, "guided_turn")
        self.assertEqual("intake", plan["stage"])
        self.assertEqual([], plan["selected_artifacts"])

    def test_technical_audit_excludes_biography_artifact(self):
        _, _, _, _, deep = self.reach_deep_dive()
        plan = build_output_plan(self.state, "technical_audit")
        ids = {row["artifact_id"] for row in plan["selected_artifacts"]}
        self.assertNotIn(deep["id"], ids)

    def test_doctor_passes_against_installed_skill(self):
        result = run_checks(self.session_dir)
        self.assertTrue(result["ok"], result)


if __name__ == "__main__":
    unittest.main()

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
        analysis = self.register(
            "preblind_analysis",
            categories=("chart_fact", "traditional_rule"),
            sources=(chart["id"], lock["id"]),
        )
        return chart, lock, analysis

    def reach_deep_dive(self):
        chart, lock, analysis = self.reach_chart_ready()
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
            sources=(analysis["id"],),
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
        return chart, lock, analysis, manifest, feedback, deep

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
        chart, _, _, _, _, deep = self.reach_deep_dive()
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
        _, lock, analysis, manifest, _, _ = self.reach_deep_dive()
        invalidated = reset_to_stage(
            self.session_dir,
            self.state,
            "first_read",
            "restart blind opening",
        )
        self.assertEqual("active", lock["status"])
        self.assertEqual("active", analysis["status"])
        self.assertIn(manifest["id"], invalidated)
        self.assertEqual("first_read", self.state["stage"])

    def test_artifact_tampering_is_reported(self):
        chart = self.register("chart_facts", categories=("operational_input",))
        (self.session_dir / chart["path"]).write_text("changed", encoding="utf-8")
        issues = audit_state(self.session_dir, self.state)
        self.assertTrue(any("hash mismatch" in issue for issue in issues))

    def test_output_router_uses_only_active_lineage_and_defers_html(self):
        _, _, analysis, _, feedback, deep = self.reach_deep_dive()
        feedback_log = self.register(
            "feedback_log",
            categories=("feedback_label", "biography"),
            sources=(feedback["id"],),
        )
        context = self.register(
            "consultation_context",
            categories=("biography", "user_preference"),
        )
        plan = build_output_plan(self.state, "report_source")
        ids = {row["artifact_id"] for row in plan["selected_artifacts"]}
        self.assertIn(deep["id"], ids)
        self.assertIn(analysis["id"], ids)
        self.assertIn(feedback_log["id"], ids)
        self.assertIn(context["id"], ids)
        with self.assertRaisesRegex(HarnessError, "deferred"):
            build_output_plan(self.state, "html_report")

    def test_final_markdown_is_registered_only_at_report_ready(self):
        _, _, _, _, _, deep = self.reach_deep_dive()
        with self.assertRaisesRegex(HarnessError, "cannot be registered during deep_dive"):
            self.register(
                "markdown_report",
                categories=("prior_output",),
                sources=(deep["id"],),
                name="final_report.md",
            )
        transition_stage(
            self.session_dir,
            self.state,
            "report_ready",
            operator_override=False,
            reason=None,
        )
        report = self.register(
            "markdown_report",
            categories=("prior_output",),
            sources=(deep["id"],),
            name="final_report.md",
        )
        self.assertEqual("markdown_report", report["kind"])
        self.assertEqual([], audit_state(self.session_dir, self.state))

    def test_guided_turn_can_open_before_chart_exists(self):
        plan = build_output_plan(self.state, "guided_turn")
        self.assertEqual("intake", plan["stage"])
        self.assertEqual([], plan["selected_artifacts"])

    def test_technical_audit_excludes_biography_artifact(self):
        _, _, analysis, _, _, deep = self.reach_deep_dive()
        plan = build_output_plan(self.state, "technical_audit")
        ids = {row["artifact_id"] for row in plan["selected_artifacts"]}
        self.assertNotIn(deep["id"], ids)
        self.assertIn(analysis["id"], ids)

    def test_preblind_analysis_is_required_and_rejects_user_context(self):
        chart = self.register("chart_facts", categories=("operational_input",))
        transition_stage(
            self.session_dir,
            self.state,
            "chart_ready",
            operator_override=False,
            reason=None,
        )
        self.register(
            "chart_lock",
            categories=("chart_fact", "traditional_rule"),
            sources=(chart["id"],),
        )
        with self.assertRaisesRegex(HarnessError, "preblind_analysis"):
            transition_stage(
                self.session_dir,
                self.state,
                "first_read",
                operator_override=False,
                reason=None,
            )
        with self.assertRaisesRegex(HarnessError, "user_preference"):
            self.register(
                "preblind_analysis",
                categories=("chart_fact", "traditional_rule", "user_preference"),
                sources=(chart["id"],),
            )

    def test_intake_brief_guides_report_but_not_blind_sources(self):
        brief = self.register(
            "consultation_brief",
            categories=("user_preference",),
            name="consultation_brief.json",
        )
        self.reach_deep_dive()
        report_plan = build_output_plan(self.state, "report_source")
        report_ids = {row["artifact_id"] for row in report_plan["selected_artifacts"]}
        self.assertIn(brief["id"], report_ids)
        with self.assertRaises(HarnessError):
            firewall_check("blind_generation", ("chart_fact", "user_preference"))
        supersede(
            self.session_dir,
            self.state,
            scope="chart",
            artifact_ids=(),
            reason="birth input corrected",
        )
        self.assertEqual("active", brief["status"])

    def test_technical_report_has_separate_biography_free_route(self):
        _, _, analysis, _, feedback, deep = self.reach_deep_dive()
        plan = build_output_plan(self.state, "technical_report_source")
        ids = {row["artifact_id"] for row in plan["selected_artifacts"]}
        self.assertIn(analysis["id"], ids)
        self.assertIn(feedback["id"], ids)
        self.assertNotIn(deep["id"], ids)
        transition_stage(
            self.session_dir,
            self.state,
            "report_ready",
            operator_override=False,
            reason=None,
        )
        with self.assertRaisesRegex(HarnessError, "biography"):
            self.register(
                "technical_report",
                categories=("prior_output", "biography"),
                sources=(analysis["id"],),
                name="contaminated_technical_analysis.md",
            )
        report = self.register(
            "technical_report",
            categories=("prior_output",),
            sources=(analysis["id"], feedback["id"]),
            name="technical_analysis.md",
        )
        self.assertEqual("technical_report", report["kind"])

    def test_doctor_passes_against_installed_skill(self):
        result = run_checks(self.session_dir)
        self.assertTrue(result["ok"], result)


if __name__ == "__main__":
    unittest.main()

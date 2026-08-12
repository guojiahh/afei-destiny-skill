#!/usr/bin/env python3
"""Tests for the opening blind-reading selector and feedback settlement."""

from __future__ import annotations

import unittest
import sys
import json
import tempfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from blind_opening import ProtocolError, main, select_candidates, settle_feedback


def candidate(
    candidate_id: str,
    domain: str,
    *,
    evidence_strength: str = "strong",
    specificity: str = "high",
    base_rate_risk: str = "low",
    sensitive: bool = False,
    atomic: bool = True,
    biography_independent: bool = True,
    time_window=None,
):
    return {
        "id": candidate_id,
        "domain": domain,
        "claim": f"claim {candidate_id}",
        "scenario": f"scenario {candidate_id}",
        "observable_result": f"observable result {candidate_id}",
        "examples": [f"example {candidate_id}"],
        "evidence": ["chart fact"],
        "counterevidence": ["opposite condition"],
        "evidence_strength": evidence_strength,
        "specificity": specificity,
        "base_rate_risk": base_rate_risk,
        "falsifiable": True,
        "biography_independent": biography_independent,
        "atomic": atomic,
        "sensitive": sensitive,
        "time_window": time_window,
    }


def packet(candidates):
    return {
        "schema_version": 1,
        "source_scope": "chart_only",
        "chart_lock_id": "chart-001",
        "candidates": candidates,
    }


class BlindOpeningTests(unittest.TestCase):
    def test_default_cli_selects_four_diverse_probes(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            input_path = root / "candidates.json"
            manifest_path = root / "manifest.json"
            input_path.write_text(
                json.dumps(
                    packet(
                        [
                            candidate("work", "work_role"),
                            candidate("timing", "timing_event"),
                            candidate("relation", "relationship_pattern"),
                            candidate("resource", "resource_pattern"),
                        ]
                    ),
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )
            self.assertEqual(
                0,
                main(
                    [
                        "select",
                        "--input",
                        str(input_path),
                        "--output",
                        str(manifest_path),
                    ]
                ),
            )
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            self.assertEqual(4, manifest["requested_count"])
            self.assertEqual(4, len(manifest["selected"]))

    def test_selects_three_diverse_eligible_probes(self):
        manifest = select_candidates(
            packet(
                [
                    candidate("work-a", "work_role"),
                    candidate("work-b", "work_role", evidence_strength="medium"),
                    candidate("family", "family_structure"),
                    candidate(
                        "timing",
                        "timing_event",
                        time_window={"start_year": 2018, "end_year": 2019},
                    ),
                ]
            ),
            3,
        )
        self.assertEqual("ready", manifest["status"])
        self.assertEqual(
            {"work_role", "family_structure", "timing_event"},
            {row["domain"] for row in manifest["selected"]},
        )
        self.assertEqual(64, len(manifest["manifest_sha256"]))

    def test_rejects_sensitive_broad_compound_and_biography_candidates(self):
        manifest = select_candidates(
            packet(
                [
                    candidate("good", "learning_path"),
                    candidate("sensitive", "family_structure", sensitive=True),
                    candidate("broad", "mobility", base_rate_risk="high"),
                    candidate("compound", "work_role", atomic=False),
                    candidate(
                        "contaminated",
                        "relationship_pattern",
                        biography_independent=False,
                    ),
                    candidate(
                        "wide-time",
                        "timing_event",
                        time_window={"start_year": 2018, "end_year": 2020},
                    ),
                ]
            ),
            3,
        )
        self.assertEqual("insufficient_candidates", manifest["status"])
        reasons = {row["id"]: row["reasons"] for row in manifest["rejected"]}
        self.assertIn("sensitive_claim", reasons["sensitive"])
        self.assertIn("high_or_invalid_base_rate_risk", reasons["broad"])
        self.assertIn("compound_claim", reasons["compound"])
        self.assertIn("biography_contaminated", reasons["contaminated"])
        self.assertIn("time_window_too_broad", reasons["wide-time"])

    def test_rejects_candidate_without_concrete_user_facing_fields(self):
        vague = candidate("vague", "behavior_pattern")
        vague.pop("scenario")
        vague.pop("observable_result")
        vague["examples"] = []
        manifest = select_candidates(packet([vague]), 1)
        reasons = manifest["rejected"][0]["reasons"]
        self.assertIn("missing_scenario", reasons)
        self.assertIn("missing_observable_result", reasons)
        self.assertIn("missing_or_invalid_examples", reasons)

    def test_settlement_routes_supported_reading_to_deep_dive(self):
        manifest = select_candidates(
            packet(
                [
                    candidate("a", "work_role"),
                    candidate("b", "family_structure"),
                    candidate("c", "mobility"),
                ]
            ),
            3,
        )
        feedback = {
            "schema_version": 1,
            "chart_lock_id": "chart-001",
            "manifest_sha256": manifest["manifest_sha256"],
            "responses": [
                {"probe_id": "a", "label": "hit", "note": "not persisted"},
                {"probe_id": "b", "label": "hit"},
                {"probe_id": "c", "label": "partial"},
            ],
        }
        result = settle_feedback(manifest, feedback)
        self.assertEqual("proceed_to_deep_dive", result["route"])
        self.assertEqual("limited_upgrade", result["confidence_effect"])
        self.assertNotIn("note", result["responses"][0])

    def test_two_misses_lower_resolution(self):
        manifest = select_candidates(
            packet(
                [
                    candidate("a", "work_role"),
                    candidate("b", "family_structure"),
                    candidate("c", "mobility"),
                ]
            ),
            3,
        )
        result = settle_feedback(
            manifest,
            {
                "schema_version": 1,
                "chart_lock_id": "chart-001",
                "manifest_sha256": manifest["manifest_sha256"],
                "responses": [
                    {"probe_id": "a", "label": "miss"},
                    {"probe_id": "b", "label": "miss"},
                    {"probe_id": "c", "label": "unknown"},
                ],
            },
        )
        self.assertEqual("recheck_inputs_and_lower_resolution", result["route"])
        self.assertEqual("downgrade", result["confidence_effect"])

    def test_manifest_tampering_is_rejected(self):
        manifest = select_candidates(
            packet([candidate("a", "work_role")]),
            1,
        )
        manifest["selected"][0]["claim"] = "changed after lock"
        with self.assertRaises(ProtocolError):
            settle_feedback(
                manifest,
                {
                    "schema_version": 1,
                    "chart_lock_id": "chart-001",
                    "manifest_sha256": manifest["manifest_sha256"],
                    "responses": [{"probe_id": "a", "label": "hit"}],
                },
            )

    def test_cli_select_and_validate_round_trip(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            input_path = root / "candidates.json"
            manifest_path = root / "manifest.json"
            input_path.write_text(
                json.dumps(packet([candidate("a", "work_role")]), ensure_ascii=False),
                encoding="utf-8",
            )
            self.assertEqual(
                0,
                main(
                    [
                        "select",
                        "--input",
                        str(input_path),
                        "--output",
                        str(manifest_path),
                        "--count",
                        "1",
                    ]
                ),
            )
            self.assertTrue(manifest_path.exists())
            self.assertEqual(0, main(["validate", "--manifest", str(manifest_path)]))


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import json
import tempfile
import unittest
from argparse import Namespace
from pathlib import Path

from evaluation.competition_iteration import (
    audit,
    compare,
    lock,
    prepare,
    reveal,
    summarize,
)
from evaluation.import_competition_questions import parse_page


FIXTURE_HTML = """
<article id="e01-c1">
  <header><span>命例一</span><span>出题：</span><span>测试老师</span>
  <a href="/bazi/quiz/e01-c1">查看排盘</a></header>
  <div><span>女</span><span>公历 1982-09-27 · 申时</span>
  <span>中国香港</span><span>坤造</span><span>壬</span><span>戌</span>
  <span>己</span><span>酉</span><span>癸</span><span>丑</span>
  <span>庚</span><span>申</span></div>
  <ol><li><div class="flex items-start gap-2 mb-1.5"><span>Q1</span>
  <p class="text-sm font-medium leading-relaxed flex-1">命主何年结婚？</p></div>
  <ul><li class="flex items-start text-sm leading-relaxed"><span class="rounded-full">A</span><span>2001</span></li>
  <li class="flex items-start text-sm leading-relaxed"><span class="rounded-full bg-primary text-white">B</span><span>2002</span></li></ul>
  </li></ol>
</article>
"""


class CompetitionPipelineTests(unittest.TestCase):
    def test_parser_extracts_answer_without_leaking_into_packet(self) -> None:
        dataset = parse_page(FIXTURE_HTML, 2010, "https://example.test/2010")
        question = dataset["cases"][0]["questions"][0]
        self.assertEqual("B", question["answer"])
        self.assertIn("年份事件", question["tags"])
        self.assertEqual(["壬戌", "己酉", "癸丑", "庚申"], dataset["cases"][0]["four_pillars"])

    def test_prepare_lock_reveal(self) -> None:
        dataset = parse_page(FIXTURE_HTML, 2010, "https://example.test/2010")
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            dataset_path = root / "dataset.json"
            dataset_path.write_text(json.dumps(dataset, ensure_ascii=False), encoding="utf-8")
            skill = root / "skill"
            skill.mkdir()
            (skill / "SKILL.md").write_text("test", encoding="utf-8")
            round_dir = root / "round"
            prepare(
                Namespace(
                    input=dataset_path,
                    round_dir=round_dir,
                    skill=skill,
                    model="test-model",
                    reasoning_effort="high",
                    split="development",
                    prompt_file=None,
                    protocol_file=None,
                    contamination=[],
                )
            )
            packet_text = (round_dir / "questions.json").read_text(encoding="utf-8")
            self.assertNotIn('"answer"', packet_text)
            self.assertNotIn("source_url", packet_text)
            self.assertNotIn("chart_url", packet_text)
            audit(Namespace(round_dir=round_dir, skill=skill))
            question_id = dataset["cases"][0]["questions"][0]["id"]
            predictions = root / "predictions.json"
            predictions.write_text(
                json.dumps(
                    {
                        "predictions": {
                            question_id: {
                                "answer": "B",
                                "confidence": 0.8,
                                "decisive_facts": ["fixture evidence"],
                            }
                        }
                    }
                ),
                encoding="utf-8",
            )
            lock(Namespace(round_dir=round_dir, predictions=predictions, skill=skill))
            reveal(Namespace(input=dataset_path, round_dir=round_dir, skill=skill))
            score = json.loads((round_dir / "score.json").read_text(encoding="utf-8"))
            self.assertEqual(1, score["correct"])
            self.assertEqual(1.0, score["case_macro_accuracy"])
            self.assertEqual(0.04, score["top_label_brier"])
            manifest = json.loads((round_dir / "manifest.json").read_text(encoding="utf-8"))
            self.assertEqual("revealed", manifest["status"])

    def test_reveal_rejects_tampered_locked_predictions(self) -> None:
        dataset = parse_page(FIXTURE_HTML, 2010, "https://example.test/2010")
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            dataset_path = root / "dataset.json"
            dataset_path.write_text(json.dumps(dataset, ensure_ascii=False), encoding="utf-8")
            skill = root / "skill"
            skill.mkdir()
            (skill / "SKILL.md").write_text("test", encoding="utf-8")
            round_dir = root / "round"
            prepare(
                Namespace(
                    input=dataset_path,
                    round_dir=round_dir,
                    skill=skill,
                    model="test-model",
                    reasoning_effort="high",
                    split="development",
                    prompt_file=None,
                    protocol_file=None,
                    contamination=[],
                )
            )
            question_id = dataset["cases"][0]["questions"][0]["id"]
            predictions = root / "predictions.json"
            predictions.write_text(
                json.dumps({"predictions": {question_id: "B"}}), encoding="utf-8"
            )
            lock(Namespace(round_dir=round_dir, predictions=predictions, skill=skill))
            (round_dir / "locked_predictions.json").write_text(
                json.dumps({"predictions": {question_id: "A"}}), encoding="utf-8"
            )
            with self.assertRaisesRegex(ValueError, "changed after lock"):
                reveal(Namespace(input=dataset_path, round_dir=round_dir, skill=skill))

    def test_lock_rejects_skill_changed_after_prepare(self) -> None:
        dataset = parse_page(FIXTURE_HTML, 2010, "https://example.test/2010")
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            dataset_path = root / "dataset.json"
            dataset_path.write_text(json.dumps(dataset, ensure_ascii=False), encoding="utf-8")
            skill = root / "skill"
            skill.mkdir()
            skill_file = skill / "SKILL.md"
            skill_file.write_text("before", encoding="utf-8")
            round_dir = root / "round"
            prepare(
                Namespace(
                    input=dataset_path,
                    round_dir=round_dir,
                    skill=skill,
                    model="test-model",
                    reasoning_effort="high",
                    split="development",
                    prompt_file=None,
                    protocol_file=None,
                    contamination=[],
                )
            )
            question_id = dataset["cases"][0]["questions"][0]["id"]
            predictions = root / "predictions.json"
            predictions.write_text(
                json.dumps({"predictions": {question_id: "B"}}), encoding="utf-8"
            )
            skill_file.write_text("after", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "skill changed"):
                lock(Namespace(round_dir=round_dir, predictions=predictions, skill=skill))

    def test_summary_excludes_contaminated_and_separates_skill_versions(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for name, skill_sha, contamination in [
                ("clean-a", "sha-a", []),
                ("clean-b", "sha-b", []),
                ("dirty", "sha-a", ["answer seen"]),
            ]:
                round_dir = root / name
                round_dir.mkdir()
                (round_dir / "manifest.json").write_text(
                    json.dumps(
                        {
                            "skill_sha256": skill_sha,
                            "model": "test-model",
                            "split": "development",
                            "contamination": contamination,
                        }
                    ),
                    encoding="utf-8",
                )
                (round_dir / "score.json").write_text(
                    json.dumps(
                        {
                            "count": 1,
                            "correct": 1,
                            "accuracy": 1.0,
                            "case_count": 1,
                            "case_macro_accuracy": 1.0,
                        }
                    ),
                    encoding="utf-8",
                )
            output = root / "summary.json"
            summarize(Namespace(root=root, output=output))
            result = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(2, len(result["clean_groups"]))
            self.assertEqual(1, len(result["contaminated_training_only"]))

    def test_paired_compare_reports_candidate_gain(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            base = root / "base"
            candidate = root / "candidate"
            base.mkdir()
            candidate.mkdir()
            base_details = [
                {"id": "q1", "case_id": "c1", "correct": False},
                {"id": "q2", "case_id": "c2", "correct": True},
            ]
            candidate_details = [
                {"id": "q1", "case_id": "c1", "correct": True},
                {"id": "q2", "case_id": "c2", "correct": True},
            ]
            (base / "score.json").write_text(
                json.dumps({"details": base_details}), encoding="utf-8"
            )
            (candidate / "score.json").write_text(
                json.dumps({"details": candidate_details}), encoding="utf-8"
            )
            output = root / "comparison.json"
            compare(
                Namespace(
                    base=base,
                    candidate=candidate,
                    output=output,
                    bootstrap_samples=100,
                    seed=7,
                )
            )
            result = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(0.5, result["paired_delta"])
            self.assertEqual(1, result["wins"])
            self.assertEqual(0, result["losses"])


if __name__ == "__main__":
    unittest.main()

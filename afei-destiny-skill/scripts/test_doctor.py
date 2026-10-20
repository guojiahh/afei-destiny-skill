"""Installation diagnostics must catch failures before a full consultation."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from doctor import SKILL_DIR, check_wayfinder_assets, run_checks


class DoctorInstallationTests(unittest.TestCase):
    def test_install_without_assets_fails_even_when_calculator_works(self):
        with tempfile.TemporaryDirectory(prefix="afei 安装 ") as root:
            skill = Path(root) / "独立 skill"
            shutil.copytree(Path(__file__).resolve().parents[1], skill,
                            ignore=shutil.ignore_patterns("assets", "__pycache__"))
            result = subprocess.run(
                [sys.executable, str(skill / "scripts/doctor.py"), "--json"],
                cwd=root, capture_output=True, text=True, encoding="utf-8")
            self.assertEqual(result.returncode, 1, result.stderr)
            checks = {row["name"]: row for row in json.loads(result.stdout)["checks"]}
            self.assertTrue(checks["calculator_fixture"]["ok"])
            self.assertFalse(checks["html_report_files"]["ok"])
            self.assertFalse(checks["html_report_assets"]["ok"])

    def test_asset_damage_and_missing_files_are_actionable(self):
        with tempfile.TemporaryDirectory() as root:
            directory = Path(root)
            assets = directory / "assets"
            assets.mkdir()
            resource = assets / "sample.png"
            resource.write_bytes(b"original")
            entries = [{
                "path": "/sample.png",
                "sha256": hashlib.sha256(b"original").hexdigest(),
            }]
            digest = hashlib.sha256(json.dumps(entries, ensure_ascii=False, sort_keys=True,
                                               separators=(",", ":")).encode("utf-8")).hexdigest()
            # Deliberately different layout and CRLF exercise JSON normalization.
            (directory / "asset-manifest.json").write_bytes(
                json.dumps(entries, indent=4).replace("\n", "\r\n").encode("utf-8"))
            with patch("doctor.WAYFINDER_MANIFEST_SHA256", digest):
                self.assertTrue(check_wayfinder_assets(directory)["ok"])
                resource.write_bytes(b"damaged")
                damaged = check_wayfinder_assets(directory)
                self.assertFalse(damaged["ok"])
                self.assertIn("/sample.png", damaged["detail"])
                resource.unlink()
                missing = check_wayfinder_assets(directory)
                self.assertFalse(missing["ok"])
                self.assertIn("sample.png", missing["detail"])

    def test_truncated_valid_manifest_cannot_hide_missing_release_resources(self):
        release = SKILL_DIR / "assets/cihou/quiet/wayfinder"
        entries = json.loads((release / "asset-manifest.json").read_text(encoding="utf-8"))
        with tempfile.TemporaryDirectory() as root:
            directory = Path(root)
            (directory / "assets").mkdir()
            first = entries[0]["path"].lstrip("/")
            shutil.copyfile(release / "assets" / first, directory / "assets" / first)
            for name, invalid in [("truncated", entries[:1]),
                                  ("same-count duplicates", [entries[0]] * len(entries))]:
                with self.subTest(manifest=name):
                    (directory / "asset-manifest.json").write_text(
                        json.dumps(invalid), encoding="utf-8")
                    result = check_wayfinder_assets(directory)
                    self.assertFalse(result["ok"])
                    self.assertIn("complete release inventory", result["detail"])

    def test_missing_runtime_guide_fails_otherwise_complete_install(self):
        with tempfile.TemporaryDirectory(prefix="afei 安装 ") as root:
            skill = Path(root) / "独立 skill"
            shutil.copytree(SKILL_DIR, skill, ignore=shutil.ignore_patterns("__pycache__"))
            (skill / "references/runtime-setup.md").unlink()
            result = subprocess.run(
                [sys.executable, str(skill / "scripts/doctor.py"), "--json"],
                cwd=root, capture_output=True, text=True, encoding="utf-8")
            self.assertEqual(result.returncode, 1, result.stderr)
            checks = {row["name"]: row for row in json.loads(result.stdout)["checks"]}
            self.assertFalse(checks["required_files"]["ok"])
            self.assertIn("runtime-setup.md", checks["required_files"]["detail"])
            for name in ["calculator_fixture", "html_report_files", "html_report_assets"]:
                self.assertTrue(checks[name]["ok"], checks[name]["detail"])

    def test_writability_probe_preserves_existing_files(self):
        with tempfile.TemporaryDirectory() as root:
            directory = Path(root)
            existing = directory / ".afei-destiny-skill-doctor-write-probe"
            existing.write_bytes(b"existing user data")
            self.assertTrue(run_checks(directory)["ok"])
            self.assertEqual(existing.read_bytes(), b"existing user data")
            self.assertEqual(list(directory.iterdir()), [existing])


if __name__ == "__main__":
    unittest.main()

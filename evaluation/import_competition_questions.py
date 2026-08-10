#!/usr/bin/env python3
"""Import public Global Fortune Teller Competition pages into an ignored cache.

The normalized corpus contains answer keys and must stay outside the installable
skill.  Use ``competition_iteration.py prepare`` to create answer-redacted rounds.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any


BASE_URL = "https://asklingxi.com/mingli-dasai/{year}"
ANSWER_LABELS = {"A", "B", "C", "D", "E"}


def classes(attrs: list[tuple[str, str | None]]) -> set[str]:
    values = dict(attrs).get("class") or ""
    return set(values.split())


def clean_text(parts: list[str]) -> str:
    return " ".join(" ".join(parts).split())


class CompetitionPageParser(HTMLParser):
    """Parse the server-rendered contest page without third-party packages."""

    def __init__(self, year: int, source_url: str) -> None:
        super().__init__(convert_charrefs=True)
        self.year = year
        self.source_url = source_url
        self.cases: list[dict[str, Any]] = []
        self.current_case: dict[str, Any] | None = None
        self.preamble: list[str] = []
        self.question_parts: list[str] | None = None
        self.current_question: dict[str, Any] | None = None
        self.option_parts: list[str] | None = None
        self.option_correct = False
        self.in_question_header = 0
        self.capture_question = 0
        self.capture_option = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr = dict(attrs)
        cls = classes(attrs)

        if tag == "article" and attr.get("id"):
            self.current_case = {
                "case_id": attr["id"],
                "source_url": f"{self.source_url}#{attr['id']}",
                "profile_tokens": [],
                "questions": [],
            }
            self.preamble = []
            return

        if self.current_case is None:
            return

        if tag == "a" and attr.get("href", "").startswith("/bazi/quiz/"):
            self.current_case["chart_url"] = "https://asklingxi.com" + attr["href"]

        if tag == "div" and {"mb-1.5", "items-start", "flex"}.issubset(cls):
            self.in_question_header += 1

        if tag == "p" and self.in_question_header and "flex-1" in cls:
            self.question_parts = []
            self.capture_question += 1

        if (
            tag == "li"
            and self.current_question is not None
            and "leading-relaxed" in cls
            and "items-start" in cls
        ):
            self.option_parts = []
            self.option_correct = False
            self.capture_option += 1

        if (
            tag == "span"
            and self.capture_option
            and "rounded-full" in cls
            and "bg-primary" in cls
        ):
            self.option_correct = True

    def handle_data(self, data: str) -> None:
        text = clean_text([data])
        if not text or self.current_case is None:
            return
        if self.capture_option and self.option_parts is not None:
            self.option_parts.append(text)
        elif self.capture_question and self.question_parts is not None:
            self.question_parts.append(text)
        elif not self.current_case["questions"] and not self.in_question_header:
            self.preamble.append(text)

    def handle_endtag(self, tag: str) -> None:
        if self.current_case is None:
            return

        if tag == "p" and self.capture_question:
            question_text = clean_text(self.question_parts or [])
            number = len(self.current_case["questions"]) + 1
            self.current_question = {
                "id": f"gfc_{self.year}_{self.current_case['case_id']}_q{number:02d}",
                "question_number": number,
                "question": question_text,
                "options": {},
                "answer": None,
                "tags": classify_question(question_text),
            }
            self.current_case["questions"].append(self.current_question)
            self.question_parts = None
            self.capture_question -= 1
            return

        if tag == "li" and self.capture_option:
            parts = [part for part in (self.option_parts or []) if part]
            if len(parts) >= 2 and parts[0] in ANSWER_LABELS:
                label = parts[0]
                self.current_question["options"][label] = clean_text(parts[1:])
                if self.option_correct:
                    self.current_question["answer"] = label
            self.option_parts = None
            self.option_correct = False
            self.capture_option -= 1
            return

        if tag == "div" and self.in_question_header:
            self.in_question_header -= 1

        if tag == "article":
            self._finish_case()

    def _finish_case(self) -> None:
        assert self.current_case is not None
        tokens = [item for item in self.preamble if item not in {"查看排盘"}]
        self.current_case["profile_tokens"] = tokens
        self.current_case["profile_text"] = clean_text(tokens)
        self.current_case["author"] = value_after(tokens, "出题：")
        self.current_case["school"] = value_after(tokens, "流派：")
        self.current_case["gender"] = next(
            (item for item in tokens if item in {"男", "女"}), None
        )
        self.current_case["birth_date"] = next(
            (item for item in tokens if re.fullmatch(r"\d{4}-\d{2}-\d{2}", item)),
            None,
        )
        polarity_index = next(
            (i for i, item in enumerate(tokens) if item in {"乾造", "坤造"}), None
        )
        if polarity_index is not None:
            pillars = [
                item
                for item in tokens[polarity_index + 1 : polarity_index + 9]
                if len(item) == 1
            ]
            if len(pillars) == 8:
                self.current_case["four_pillars"] = [
                    "".join(pillars[i : i + 2]) for i in range(0, 8, 2)
                ]

        self.cases.append(self.current_case)
        self.current_case = None
        self.current_question = None
        self.preamble = []


def value_after(tokens: list[str], label: str) -> str | None:
    try:
        index = tokens.index(label)
    except ValueError:
        return None
    return tokens[index + 1] if index + 1 < len(tokens) else None


def classify_question(text: str) -> list[str]:
    rules = {
        "年份事件": r"何年|哪年|那年|什么时候|何时|哪个时候|发生何事|发生什么|\d{4}年|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]年",
        "婚姻感情": r"婚|恋|感情|男朋友|女朋友|配偶|夫妻|桃花|离婚|结婚",
        "六亲子女": r"父|母|兄|弟|姐|妹|祖|子女|儿子|女儿|生育|堕胎",
        "健康灾厄": r"病|健康|手术|开刀|死亡|去世|仙逝|灾|车祸|意外|官非|牢|骗",
        "事业财富": r"事业|工作|职业|财|钱|物业|收入|公司|创业|升职|失业|经商|投资",
        "性格外貌学业": r"性格|个性|外貌|样貌|体型|身高|学历|学业|读书|考试",
    }
    tags = [name for name, pattern in rules.items() if re.search(pattern, text)]
    return tags or ["其他"]


def parse_page(html: str, year: int, source_url: str) -> dict[str, Any]:
    parser = CompetitionPageParser(year, source_url)
    parser.feed(html)
    parser.close()
    questions = [q for case in parser.cases for q in case["questions"]]
    missing_answers = [q["id"] for q in questions if not q["answer"]]
    if year <= 2025 and missing_answers:
        raise ValueError(
            f"{year}: {len(missing_answers)} questions have no highlighted answer: "
            f"{missing_answers[:5]}"
        )
    if not parser.cases or not questions:
        raise ValueError(f"{year}: no cases or questions parsed")
    return {
        "contest_id": f"global_fortune_competition_{year}",
        "year": year,
        "source_url": source_url,
        "case_count": len(parser.cases),
        "question_count": len(questions),
        "answers_available": not missing_answers,
        "cases": parser.cases,
    }


def fetch(url: str) -> str:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "bazi-skill-evaluation-import/1.0"},
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read().decode("utf-8")


def parse_years(value: str) -> list[int]:
    if re.fullmatch(r"\d{4}:\d{4}", value):
        start, end = map(int, value.split(":"))
        if start > end:
            raise argparse.ArgumentTypeError("year range start must be <= end")
        return list(range(start, end + 1))
    years = [int(item) for item in value.split(",")]
    if not years:
        raise argparse.ArgumentTypeError("at least one year is required")
    return years


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--years", type=parse_years, default=parse_years("2010:2025"))
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(".benchmark-cache/global-fortune-competition"),
    )
    parser.add_argument(
        "--html-dir",
        type=Path,
        help="read YEAR.html files instead of downloading; useful for tests/offline runs",
    )
    args = parser.parse_args()

    args.output.mkdir(parents=True, exist_ok=True)
    raw_dir = args.output / "raw"
    raw_dir.mkdir(exist_ok=True)
    index: list[dict[str, Any]] = []
    for year in args.years:
        url = BASE_URL.format(year=year)
        raw_path = raw_dir / f"{year}.html"
        if args.html_dir:
            html = (args.html_dir / f"{year}.html").read_text(encoding="utf-8")
        elif raw_path.exists():
            html = raw_path.read_text(encoding="utf-8")
        else:
            html = fetch(url)
            raw_path.write_text(html, encoding="utf-8")
        normalized = parse_page(html, year, url)
        normalized["source_sha256"] = sha256_text(html)
        output_path = args.output / f"contest_{year}.json"
        output_path.write_text(
            json.dumps(normalized, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        index.append(
            {
                "year": year,
                "path": output_path.name,
                "case_count": normalized["case_count"],
                "question_count": normalized["question_count"],
                "answers_available": normalized["answers_available"],
                "source_url": url,
                "source_sha256": normalized["source_sha256"],
            }
        )
        print(
            f"{year}: {normalized['case_count']} cases, "
            f"{normalized['question_count']} questions"
        )

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "protocol": "answer-bearing-cache-outside-installable-skill",
        "contests": index,
        "total_cases": sum(item["case_count"] for item in index),
        "total_questions": sum(item["question_count"] for item in index),
    }
    (args.output / "index.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()

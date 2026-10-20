#!/usr/bin/env python3
"""Build original-runtime story data from the explicit V15 synthetic example.

No consultation, birth data, or private report is opened. This builds content,
its source plan, and complete HTML through the production renderer. The runtime
adapter owns the artwork and interaction.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
SYNTHETIC_BUILDER = HERE.parent / "cihou-wayfinder-v15" / "build_demo.py"
SPEC = importlib.util.spec_from_file_location("cihou_synthetic_job_source", SYNTHETIC_BUILDER)
source = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(source)
source.DEMO_ID = "synthetic-wayfinder-job-v16"


def sha(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def safe_json(value):
    return json.dumps(value, ensure_ascii=False, indent=2).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


def anchor(identifier, text, explanation, refs, kind="hypothesis"):
    return dict(id=identifier, text=text, explanation=explanation, refs=refs, kind=kind)


def build_files(include_html=True):
    user_text = source.source_text("匿名求职示例 · 用户底稿", source.USER_SECTIONS)
    technical_rows = list(source.TECHNICAL_SECTIONS)
    technical_rows[-1] = (technical_rows[-1][0],
        "合成内容源为 ../cihou-wayfinder-v15/build_demo.py 中的固定八节用户材料与十一节技术边界。"
        "本目录 build_demo.py 复用这些匿名设计材料，生成独立来源哈希、内容模型、九章正文与场景锚点。"
        "没有真实会话、出生资料、计算产物、个人底稿或评测材料。来源计划见 source-plan.json；"
        "它是设计示例的构建来源记录，不是咨询 Harness 的登记或完成证明。")
    technical_text = source.source_text("匿名求职示例 · 技术边界底稿", technical_rows)
    texts = {"user": ("final_report.md", user_text),
             "technical": ("technical_analysis.md", technical_text)}
    sources = {}
    for kind, (filename, text) in texts.items():
        source.validate_source_contract("markdown_report" if kind == "user" else "technical_report", text)
        preface, parts = source.sections(text)
        sources[kind] = dict(text=text, preface=preface, sections=parts,
                             artifact=dict(id="synthetic-" + kind + "-source-v16",
                                           path=filename, sha256=sha(text)))
    model = source.build_model(sources)
    model["presentation"]["hero_runtime"] = "wayfinder-v16"
    model["authoring_notes"].append("V16 复用匿名合成内容，以原站运行时的文字投影承载锚点；不从画面补造个人事实。")
    source.validate_model(model, {"session_id": source.DEMO_ID, "report_template": "cihou-mobius-v1"}, sources)
    stages = [
        dict(id="past", title="来处", biome="forest", kind="hypothesis",
             lines=model["presentation"]["hero_states"][0]["lines"],
             description=model["presentation"]["hero_states"][0]["description"],
             condition="仅适用于示例设定：决定继续准备之后，眼前的不安暂时减轻。更早经历未知。",
             refs=["user:1", "user:2"],
             anchors=[
                 anchor("past-preparation", "再准备一点", "准备能改善材料。在这份示例里，它也暂时推迟了面对评价的时刻。", ["user:2"]),
                 anchor("past-relief", "先安心一会儿", "如果决定推迟后确实轻松了一些，这可能是这份应对反复被使用的一个原因。", ["user:2"]),
                 anchor("past-unknown", "更早的来处，还未知", "没有更早经历，不能补写童年、家庭期待或人格成因。过去也可能包含已经走过的不同道路。", ["user:2", "user:7"], "unknown"),
             ]),
        dict(id="present", title="此刻", biome="grasslands", kind="hypothesis",
             lines=model["presentation"]["hero_states"][1]["lines"],
             description=model["presentation"]["hero_states"][1]["description"],
             condition="需要核对：关键材料已完成；投递却继续推迟；缺少反馈是否使下一次开始更难。",
             refs=["user:2", "user:7"],
             anchors=[
                 anchor("present-effort", "一直在做事", "努力和准备都可能是真实的。要核对的是，投递需要的必要条件，是否还在不断增加。", ["user:2"]),
                 anchor("present-feedback", "却少了一次真实反馈", "推迟可能减少接触真实岗位的机会。没有新信息，就更难判断材料与岗位哪里匹配。", ["user:2"]),
                 anchor("present-return", "又回到准备", "如果缺少把握再次促使继续准备，这些步骤就可能构成循环。若本人体验不同，应改写这个解释。", ["user:2", "user:7"]),
             ]),
        dict(id="possibilities", title="可能", biome="tundra", kind="action",
             lines=model["presentation"]["hero_states"][2]["lines"],
             description=model["presentation"]["hero_states"][2]["description"],
             condition="路线同等可选，先看今日的资格、材料、精力、方向与支持；不预先选择正确答案。",
             refs=["user:5", "user:6"],
             anchors=[
                 anchor("choice-conditions", "先看今天的条件", "具备关键条件时可以小试；确有缺口时有限准备；负担或方向未清时先确认支持。", ["user:5"], "action"),
                 anchor("choice-small-step", "只选一步，试试看", "选择的是一个本人愿意承受的小尝试。可以改选、缩小或暂缓，不需要一次回答整个人生。", ["user:5"], "action"),
                 anchor("choice-feedback", "再听现实的回答", "完成行动不保证回复或录用。新的事实、感受与支持条件，会帮助调整下一步。", ["user:4", "user:5"], "condition"),
             ]),
    ]
    # Both language lanes intentionally contain the same original Chinese copy.
    # The recovered runtime rejects language='zh'; its en/fr keys are protocol.
    for stage in stages:
        stage["poem"] = [{"en": item["text"], "fr": item["text"]} for item in stage["anchors"]]
    for state, stage in zip(model["presentation"]["hero_states"], stages):
        state["anchors"] = [item["text"] for item in stage["anchors"]]
    source.validate_model(model, {"session_id": source.DEMO_ID, "report_template": "cihou-mobius-v1"}, sources)
    choices = model["presentation"]["hero_choices"]
    story = dict(
        schema_version=1, id=source.DEMO_ID, synthetic_demo=True,
        title=model["title"], notice=source.NOTICE,
        runtime=dict(language="en", document_language="zh-CN",
                     query=dict(nolanding=True, nointro=True, nointroseq=True, nocard=True),
                     query_string="nolanding=1&nointro=1&nointroseq=1&nocard=1",
                     ready_ui_state=dict(state=None, intro=False, initGame=True, active=True, pause=False),
                     direct_entry_requires_preload=True,
                     retained_attribution=True),
        locale=dict(
            introBlurbOne="沿着熟悉的路", introBlurbTwo="看见更多走法", startButton="进入", resumeButton="继续",
            aboutButton="说明", skipButton="跳过", continueButton="继续", journalTitle="回看", journalButton="回看",
            newMemory="留下一句，回头再看", introPlaceholder="有些路，走着走着又回到了这里。",
            tapOrClickAndHold="点击并按住", tutorialTapHold="点击并按住，沿路走走",
            tutorialCollect="沿途遇见一些句子，看看哪一句像你的处境。",
            tutorialResolve="回到树旁，换一个视角看看。场景变化不代表现实已改变。",
            introVideoLine0="准备，有它的用处", introVideoLine1="也许，一直绕回熟悉的位置", introVideoLine2="还可以看一眼别的可能",
            playHeader="行走", aboutHeader="说明", creditsHeader="原作署名",
            collectText="停留", orientText="回望", returnText="再看一眼",
            endState0="这段示例，先走到这里。", endState1="理解可以改写，现实还有新的信息。",
            endState2A="带着一个可承受的小问题继续。"),
        stages=stages, choices=choices, hero_states=model["presentation"]["hero_states"],
        report={field: model[field] for field in ("title", "subtitle", "closing", "technical_intro", "technical_cards", "limits", "chapters")},
        sources=model["sources"],
        reading=dict(anchor="reading", choices_are_previews=True, changes_consultation_state=False,
                     correction="如果这与你的体验不同，请回到具体经历改写这张图。页面选择不会提交或保存咨询纠正。"),
    )
    story_js = "/* Original Chinese synthetic story data. No private consultation data. */\nwindow.CIHOU_STORY_DATA = " + safe_json(story) + ";\n"
    model_text = json.dumps(model, ensure_ascii=False, indent=2) + "\n"
    plan = dict(schema_version=1, purpose="synthetic_design_content_build", consultation_registered=False,
                id=source.DEMO_ID, synthetic_demo=True, notice=source.NOTICE,
                inputs=[dict(path="../cihou-wayfinder-v15/build_demo.py", sha256=hashlib.sha256(SYNTHETIC_BUILDER.read_bytes()).hexdigest(),
                             use="Explicit synthetic user outline, technical non-calculation boundaries and nine-chapter content"),
                        dict(path="build_demo.py", sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                             use="Three-stage original Chinese anchors, runtime locale copy and source-bound orchestration")],
                sources={key: dict(path=value["artifact"]["path"], artifact_id=value["artifact"]["id"],
                                   sha256=value["artifact"]["sha256"],
                                   sections=[dict(ref=key + ":" + str(i + 1), title=part["title"]) for i, part in enumerate(value["sections"])])
                         for key, value in sources.items()},
                outputs={"report-model.json": dict(sha256=sha(model_text)), "story-data.js": dict(sha256=sha(story_js))},
                exclusions=["No real consultation files", "No birth input or chart facts", "No historical benchmark", "No clinical diagnosis", "No real user feedback or action outcome"])
    files = {"final_report.md": user_text, "technical_analysis.md": technical_text,
             "report-model.json": model_text, "story-data.js": story_js}
    if include_html:
        files["final_report.html"] = source.render(model, sources)
        plan["outputs"]["final_report.html"] = dict(sha256=sha(files["final_report.html"]))
    files["source-plan.json"] = json.dumps(plan, ensure_ascii=False, indent=2) + "\n"
    return files


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--content-only", action="store_true", help="build content while the runtime adapter is under development")
    args = parser.parse_args()
    files = build_files(include_html=not args.content_only)
    if args.check:
        stale = [name for name, text in files.items() if not (HERE / name).is_file() or (HERE / name).read_text(encoding="utf-8") != text]
        if stale:
            raise SystemExit("Rebuild synthetic story content: " + ", ".join(stale))
        print("[OK] V16 story data, nine-chapter model, double sources and source plan match")
        return
    for filename, text in files.items():
        (HERE / filename).write_text(text, encoding="utf-8")
        print(str(HERE / filename) + " (" + str(len(text.encode("utf-8"))) + " bytes)")


if __name__ == "__main__":
    main()

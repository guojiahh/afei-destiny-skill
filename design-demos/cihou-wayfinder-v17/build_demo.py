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
source.DEMO_ID = "synthetic-wayfinder-job-v17"


def sha(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def safe_json(value):
    return json.dumps(value, ensure_ascii=False, indent=2).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


def anchor(identifier, text, explanation, refs, kind="hypothesis"):
    return dict(id=identifier, text=text, explanation=explanation, refs=refs, kind=kind)


def build_files(include_html=True):
    user_rows = list(source.USER_SECTIONS)
    user_rows[1] = (user_rows[1][0], user_rows[1][1] + """

### 六个可以核对的位置

以下六步是同一合成情境的分解，不是已确认的真实经历：

| 位置 | 示例内容 | 核对重点 |
|---|---|---|
| 触发 | 想到投递和被评价 | 最近一次具体发生在什么时候 |
| 赋予的含义 | 如果被拒，是不是说明自己不够好 | 这是本人描述的担忧，还是解释者的猜测 |
| 应对 | 再修改一轮，推迟投递 | 是必要修改、流程不清，还是准备条件又增加 |
| 即时作用 | 暂时安心，不必立刻面对结果 | 推迟之后是否真的减轻了不安 |
| 后续代价 | 投递减少，较难获得真实反馈 | 反馈是否确实不足，也要核对外部门槛 |
| 再次回到 | 没有新的把握，又想继续准备 | 后果是否促使同一应对再发生 |

如果本人说没有轻松、尚缺必要资格，或已经反复投递，就需要改写以上联系。相同的视觉路线，不足以证明同一种原因。
""")
    user_text = source.source_text("匿名求职示例 · 用户底稿", user_rows)
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
                             artifact=dict(id="synthetic-" + kind + "-source-v17",
                                           path=filename, sha256=sha(text)))
    model = source.build_model(sources)
    model["presentation"]["hero_runtime"] = "wayfinder-v17"
    model["authoring_notes"].append("V17 首屏按住沿固定路线重复六节点循环，松开停下；一圈结束不自动切换人生阶段。更早经历未知，未来是有条件的小尝试。")
    model["diagram"]["tour"] = ["pattern", "experience", "action"]
    states = model["presentation"]["hero_states"]
    past_state, present_state, future_state = states
    present_state.update(
        lines=["再准备一轮，", "又回到这一步。"],
        description="在这份合成情境里，准备使投递前的不安暂时减轻；投递推迟又减少了反馈。没有新信息，便更想继续准备。这条联系仍需要本人核对。",
        hint="按住，沿固定的路向前；松开停下。走完一圈，仍可以回到熟悉的位置。",
        label="此刻。按住沿固定路线经过触发、含义、应对、即时作用、后续代价和再次回到六个位置；它们是一种待核对的循环。",
        node_id="pattern", refs=["user:2", "user:7"])
    past_state.update(
        lines=["这条熟悉的路，", "是怎样走来的？"],
        description="准备曾带来短暂安心，是示例中能回看的眼下作用。它怎样学来、更早发生过什么，仍没有材料；不需要把未知补成一套身世。",
        hint="过去没有谈到，可以留白；也可以回到此刻，或看看更多走法。",
        label="来处。更早经历未知，只保留示例中准备带来暂时安心的作用；不从画面推断童年与家庭。",
        node_id="experience", refs=["user:2", "user:7"])
    model["presentation"]["hero_states"] = [present_state, past_state, future_state]
    loop_nodes = [
        dict(id="trigger", text="想到投递和被评价", detail="示例从最近一次接近投递的时刻开始。真实报告应写本人讲过的具体情境，不能仅从“没投递”猜测原因。", refs=["user:2"]),
        dict(id="meaning", text="如果被拒，是不是我不够好", detail="这是示例设定的担忧。真实材料需要核对本人当时怎样理解评价；同样的推迟，也可能只是不了解流程或并不想做这份工作。", refs=["user:2"]),
        dict(id="response", text="再改一轮，今天先不投", detail="修改材料本身可能有价值。要分清是在补必要缺口，还是每次接近完成又增加了一个条件，投递因此继续推迟。", refs=["user:2"]),
        dict(id="relief", text="暂时安心，还不用面对结果", detail="只在本人确认推迟后确实松一口气时，才能把即时缓解写进循环。这个示例假设它发生；不据此认定所有准备都在回避。", refs=["user:2"]),
        dict(id="cost", text="投递推迟，真实反馈更少", detail="后续可能少了一次接触岗位与核对匹配的信息。反馈不足仍受招聘流程和市场机会影响，不能都归因于个人做法。", refs=["user:2", "user:7"]),
        dict(id="return", text="没有把握，又想继续准备", detail="如果缺少新信息又促使继续准备，就可能回到原来的应对。若事实不支持这条回连，应改写解释；环的形状本身不是因果证据。", refs=["user:2", "user:7"]),
    ]
    model["presentation"]["loop_story"] = dict(
        nodes=loop_nodes,
        past=dict(text="没有关于更早经历的材料。这种做法是怎样学来的，仍然未知。眼下能回看的，是示例设定中“继续准备后暂时轻松”的作用；不能从中补写童年、父母期待或只有优秀才被接纳。", refs=["user:2", "user:7"]),
        present=dict(text="这份示例假设：基本材料已经完成，临近投递时担心被拒绝，决定继续准备后会暂时轻松。我们暂时把“想到评价→担心不够好→继续准备→短暂安心→缺少反馈→更不确定”连起来；是否真的这样发生，需要最近一次具体经过来核对。", refs=["user:1", "user:2", "user:7"]),
        future=dict(text="如果确实愿意申请、关键要求已满足且基本材料可用，可以为必要检查约定结束时间，尝试投出一份；之后观察最难的环节和需要的支持。若存在必要缺口，就先做有限准备；若精力或方向不足，就先确认负担、支持与意愿。三种走法同等可选，都不保证回复或录用。", refs=["user:4", "user:5"]))
    stages = [
        dict(id="present", title="此刻", biome="forest", kind="hypothesis",
             lines=model["presentation"]["hero_states"][0]["lines"],
             description=model["presentation"]["hero_states"][0]["description"],
             condition="这是一种待核对的维持循环；首屏走完一圈仍停留此刻，不以完成圈数自动解释过去或承诺改变。",
             refs=["user:2", "user:7"],
             anchors=[
                 anchor("present-trigger", "到了投递这一步", "先还原一次具体经过，观察什么时候开始增加条件或继续准备。", ["user:2"]),
                 anchor("present-relief", "再准备，先安心一会儿", "这个示例设定推迟后暂时轻松，真实材料需要本人确认。", ["user:2"]),
                 anchor("present-return", "少了反馈，又回到准备", "后果可能让同一种应对更容易再发生；这个回连可以被实际经历推翻。", ["user:2", "user:7"]),
             ]),
        dict(id="past", title="来处", biome="grasslands", kind="unknown",
             lines=model["presentation"]["hero_states"][1]["lines"],
             description=model["presentation"]["hero_states"][1]["description"],
             condition="更早经历没有提供，不从循环画面补写个人历史，也不要求先找到过去原因才能尝试改变。",
             refs=["user:2", "user:7"],
             anchors=[
                 anchor("past-unknown", "更早的来处，仍未知", "真实报告只写本人讲过的经历。没有材料就留白，不补写童年与家庭。", ["user:2", "user:7"], "unknown"),
                 anchor("past-function", "先看，它曾怎样帮忙", "这个示例只设定眼下准备能改善材料，也暂时减轻不安；不能倒推完整成因。", ["user:2"]),
                 anchor("past-exception", "也许，还有不同的路", "可以询问曾经不完全有把握也尝试过的例外。示例没有提供答案，不虚构已经拥有的能力或支持。", ["user:2", "user:7"], "unknown"),
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
        loop_story=model["presentation"]["loop_story"],
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
        print("[OK] V17 story data, nine-chapter model, double sources and source plan match")
        return
    for filename, text in files.items():
        (HERE / filename).write_text(text, encoding="utf-8")
        print(str(HERE / filename) + " (" + str(len(text.encode("utf-8"))) + " bytes)")


if __name__ == "__main__":
    main()

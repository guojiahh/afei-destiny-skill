#!/usr/bin/env python3
"""Build the synthetic job-search demo through the production report validator.

This file and its outputs are design material, never a consultation record or an
installable Skill asset. No private session, birth input, or chart is loaded.
The eight-section source, eleven-section technical source, bound content model,
and complete nine-chapter HTML are rebuilt together with the current renderer.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import sys


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SCRIPTS = ROOT / "afei-destiny-skill" / "scripts"
sys.path.insert(0, str(SCRIPTS))

from generate_html_report import (  # noqa: E402
    MOBIUS_CHAPTERS,
    render,
    sections,
    validate_model,
    validate_source_contract,
)


DEMO_ID = "synthetic-wayfinder-job-v15"
NOTICE = (
    "匿名求职示例 · 合成情境。所有经历、顾虑和路径均用于展示报告结构，"
    "没有对应真实咨询者；未提供出生资料，未排盘，未进行心理诊断。"
)


USER_SECTIONS = [
    ("一、一页总览", """
这份示例围绕一个问题：已经投入了不少准备，为什么投递仍一次次往后移？

示例只设定三件事：基本投递材料已完成；临近投递时担心被拒绝；决定再准备一下后，会暂时轻松。这些是情境设定，不是从动画或命盘推断出的真实经历。

- 最稳定的理解：准备具有实际价值，也可能在这个情境中减轻眼前的不安。
- 目前最重要的选择：核对关键条件之后，给准备一个完成线，或先调整缺口与支持。
- 最值得留意的不确定性：岗位要求、经济压力、可用精力、本人真实意愿与更早经历均未了解。

先看当前处境与可能循环，再比较小尝试与现实条件。页面中的环可以帮助观察，也可以被你的实际情况改写。
"""),
    ("二、本次重点问题", """
### 你真正想解决的事

情境中的人希望靠近一份自己愿意做的工作，已经完成基本材料，却仍推迟投递。材料完成不等于满足所有岗位条件；是否具备必要资格，仍需逐项核对。

### 从过去到现在

这里能回看的，是最近一次的应对：决定再准备一轮之后，暂时不用面对别人怎样评价自己的不确定。准备因此可能既改善材料，也带来短暂安心。

更早为什么学会这种做法，示例没有提供信息。不能据此补写童年被苛责、考试成功或家庭期待。过去也可能包含愿意尝试的例外，只是尚未了解。

### 为什么可能绕回原处

一种待核对的解释是：想到投递和被评价，出现不安；继续准备使不安暂时减轻，投递却继续推迟；缺少岗位反馈，使人更难判断材料是否有效，于是又回到“还得再准备”。

这个解释只在示例前提下成立。若关键资格确有缺口，或者推迟并没有带来轻松，主要卡点就可能是信息、资源、任务范围或方向，而非这条循环。

### 现实中的具体场景

#### 场景一：材料又改了一轮

假设临近投递时出现“如果连机会都没有，是不是说明我不够好”的担忧；决定继续修改后暂时轻松。需要留意，新增修改是否解决必要缺口，还是每次接近完成又增加一个条件。

#### 场景二：必要条件还没具备

另一种可能是岗位要求明确证书，而证书尚未取得。这时补齐条件具有现实作用。不能把合理准备解释成害怕行动，也不能要求用投递证明勇气。

### 能改变哪一环

若关键要求已满足，可以试着松动“足够安心才能开始”的条件：选一个确实愿意去的岗位，完成必要检查，投出一份，再观察卡点。岗位反馈只是一次匹配的信息，不概括一个人的全部能力与价值。

### 心结收束

认真准备可以继续成为能力。新的尝试，是让它陪你进入现实反馈。是否投递、补齐缺口或先争取支持，要结合今天的条件决定；动画不替你作选择。
"""),
    ("三、人生全景图", """
### 自我认识与行为节奏

示例只讨论接近投递时的反应，不能推广为“总是拖延”。其他情境和例外均未知。

### 学习、考试与能力形成

已设定基本材料完成；学习投入、实际作品与能力水平未知。准备时间不能直接换算成能力。

### 事业、职责与发展方式

关注求职启动；目标行业、岗位职责、关键资格、招聘流程及市场机会仍待了解。

### 财务、资源与现金流

收入、存款和等待成本未知。急需收入时，行动范围和支持安排可能不同。

### 感情、亲密关系与边界

本次未展开。不能从求职行为补出关系模式。

### 家庭角色与代际互动

本次未展开。照料责任、家庭期待和可获得支持都没有事实材料。

### 迁移、居住与环境变化

本次未展开。是否愿意异地、居住成本和迁移条件均未知。

### 身心节奏与安全提醒

健康状况、作息与疲惫程度未知。若可用精力很少，先核对负担与支持，不把这直接解释为缺乏意愿。
"""),
    ("四、当前阶段与未来窗口", """
这里使用行动顺序，不使用命理时间窗口。未提供出生资料，未排盘，也没有关于录用时间或成功概率的推断。

| 观察阶段 | 可以观察什么 | 成立条件与边界 |
|---|---|---|
| 开始之前 | 关键要求、基本材料、真实意愿与可用精力 | 有缺口时先确定缺口，不急于投递 |
| 一次尝试之后 | 最难的环节、增加修改条件的冲动、需要的支持 | 完成一次可控行动，不等于获得回复 |
| 获得反馈或到达回看点 | 材料、岗位匹配与流程是否需要调整 | 无回复也是有限信息，不能据此否定个人价值 |

回看点由本人结合招聘流程约定；示例不规定统一天数。下一步受岗位机会、招聘决定、资源和实际感受共同影响。
"""),
    ("五、行动与选择提示", """
### 先保护与确认什么

先确认这份工作是不是自己愿意靠近的方向，是否满足关键要求，是否有完成一次小尝试的时间与精力。现实限制需要进入计划。

### 一个可以验证的改变

- 适用前提：确实想申请，关键要求已满足，基本材料可用。
- 最小尝试：选一个岗位，为必要检查约定结束时间，尝试投出一份。
- 观察反馈：最难的是点击之前还是等待回复；“再改一点”的念头出现时，需要什么支持。
- 完成、调整或暂停的条件：投递即完成本轮行动；发现资格缺口或负担超出承受范围时，改计划或暂停。
- 不由这一步保证的结果：回复、面试、录用、焦虑消失或自我评价改变。

### 还有哪些选择

条件已具备时：带着一定的不确定投一次。它能增加接触机会的可能，也包含被拒绝或没有回复的可能。

存在必要缺口时：把准备变成一个有限任务。只列清一项必要缺口、完成线与核对方式；补齐后再决定下一步。

精力或方向不足时：先为自己留出条件。核对可用时间、照料责任、支持与真实意愿，可以暂缓，不把投递作为唯一正确答案。

三条路没有统一优先级。比较条件和代价，比选出一条看起来更勇敢的路更有帮助。
"""),
    ("六、开场判断、用户反馈与修正", """
未进行开场判断锁定、盲测或真实用户反馈。这里的设定不能计作被验证的判断，也不能计算准确率。

可供核对的解释是：“继续准备是否使你暂时轻松，却也减少了获得反馈的机会？”

如果本人说“推迟后没有轻松，我只是不知道从哪里投”，应把重点改为申请流程。如果本人说“资格尚未具备”，应转向必要准备。如果本人说“我已经试过多次”，应回到实际反馈重新理解。

页面中的路线切换只供阅读比较，不表示已经执行行动、提交纠正或保存咨询状态。真实纠正需要回到原对话说明。
"""),
    ("七、结论边界与未解问题", """
- 相对稳定的内容：在情境设定中，准备与暂时安心同时出现；基本材料完成，投递仍推迟。
- 待核对的解释：安心、推迟、缺少反馈和继续准备是否相互维持。
- 未知内容：更早经历、能力水平、关键资格、经济约束、照料责任、精力和实际求职反馈。
- 已经撤回的判断：没有真实判断与反馈，不能编写“已撤回”经历；示例未作人格判断。
- 时间与流派边界：没有历法计算或传统窗口；所有时间表达是现实行动顺序。
- 最有价值的新信息：最近一次本来打算投递、后来继续准备，那前后具体发生了什么？

环是可修正的观察工具。解释不符合体验时，应改解释；小尝试没发生时，也应重新检查目标、步子与支持条件。
"""),
    ("八、技术文档与阅读说明", """
technical_analysis.md 保留十一节技术结构，逐项说明本示例未提供出生资料、未进行历法计算、未形成传统解释与未来预测。

HTML 使用固定三态主图和九章正文；相同的视觉框架不证明每个人都存在同一种循环。页面保留完整双底稿与下载。来源绑定用于核对文案出自哪一节合成材料，不构成临床证据或真实用户确认。

这是一份匿名设计演示，经正式报告内容校验器与渲染器生成；它没有登记为真实咨询，没有已完成咨询或实际行动的含义。
"""),
]


TECHNICAL_SECTIONS = [
    ("一、计算版本与时间口径", "本示例没有出生日期、时间、地点、性别或历法输入，未调用 calculate_bazi.py，没有计算产物或计算哈希。不存在主盘、候选时间口径或输入精度裁决。"),
    ("二、四柱、十神与原局事实", "未计算四柱、十神、藏干或原局事实。不能为了填满报告而生成这些内容。"),
    ("三、月令、根气与承载", "无原局计算事实，未使用相关传统规则，未作月令、根气或承载判断，置信度不适用。"),
    ("四、格局与四类用神的竞争解释", "没有格局、扶抑、调候、病药或通关的传统分析。求职示例中的应对解释不从命盘推出。"),
    ("五、合冲刑害的结构裁决", "没有可引用的原局关系事实，未作合冲刑害裁决，也未把视觉中的路口映射为传统关系。"),
    ("六、大运事实与口径差异", "未计算大运方向、起运、交运或流年，没有计算时间边界或口径差异。"),
    ("七、领域映射的证据边界", "技术层未对自我、学习、事业、财务、亲密关系、家庭、迁移或身心作传统映射。固定环形画面不能补充任何领域事实；视觉示例不构成心理诊断。"),
    ("八、历史与未来窗口", "没有历史候选或未来命理窗口。页面中的开始之前、尝试之后和回看点，是设计用的行动顺序，不能读作时间预测。"),
    ("九、候选筛选、锁定与反馈", "未进行候选筛选、判断锁定、盲测或真实反馈校准。示例设定不能充当独立验证，不计算准确率。"),
    ("十、最强反证与未解疑点", "无计算输入和传统规则依据，因此不能形成任何命理结论。技术层不读取求职叙事作为盘面证据。用户层的循环解释也可能被必要资格不足、流程未知、目标不清或负担过重等情况替代。"),
    ("十一、来源与可复核文件", "本技术底稿由同目录 build_demo.py 的 TECHNICAL_SECTIONS 明确生成。该部分仅记录本匿名设计示例没有进行哪些计算与校准，不使用真实会话、题库、个人底稿、出生数据或外部临床材料作为个体证据。final_report.md 与 report-model.json 是合成内容；来源 SHA-256 可由构建脚本重算。"),
]


def source_text(title, rows):
    return "# " + title + "\n\n" + NOTICE + "\n\n" + "\n\n".join(
        "## " + heading + "\n\n" + body.strip() for heading, body in rows
    ) + "\n"


def card(title, text, refs, **extra):
    return dict(title=title, text=text, refs=refs, **extra)


def build_model(sources):
    model = {
        "schema_version": 1,
        "template_id": "cihou-mobius-v1",
        "draft": False,
        "session_id": DEMO_ID,
        "synthetic_demo": True,
        "sources": {key: {"artifact_id": source["artifact"]["id"],
                          "sha256": source["artifact"]["sha256"]}
                    for key, source in sources.items()},
        "authoring_notes": [NOTICE, "来源标识 synthetic-* 仅用于匿名设计材料绑定，不是已登记咨询产物。",
                            "过去的具体经历未知；不得用美术中的回看补造童年或人格成因。"],
        "title": "此后 · 匿名求职示例",
        "subtitle": NOTICE + "\n\n准备有它的用处。一起看清它在什么时候帮助你，又在什么时候让开始变得更远。",
        "closing": "不必用一次选择回答整个人生。先核对今天的条件，让一个可承受的小尝试带来新的信息。\n\n如果这张图不像你的处境，应从具体经历重新画起。",
        "technical_intro": "本示例没有出生输入与历法计算。技术底稿保留十一节结构，明确哪些分析没有进行；求职叙事不作为命盘证据。",
        "technical_cards": [
            card("没有排盘，也没有命理预测", "页面没有四柱、大运或录用时间判断。阶段顺序只是现实行动安排。", ["technical:1", "technical:6", "technical:8"]),
            card("来源绑定不等于事实验证", "底稿和模型均是显式合成材料；没有真实用户反馈、心理诊断或已完成行动。", ["technical:9", "technical:10", "technical:11"]),
        ],
        "limits": "匿名设计演示。更早经历、岗位资格、经济压力、照料责任、精力和实际反馈均未知。图中的循环是条件式解释，离环不承诺录用；路线切换只改变阅读视角，不保存咨询状态。",
        "diagram": {
            "type": "loop",
            "nodes": [
                {"id": "experience", "kind": "unknown", "label": "准备的用处", "title": "准备曾带来短暂安心", "text": "情境只设定最近的应对作用。更早如何学来，未知。", "refs": ["user:2"]},
                {"id": "pattern", "kind": "hypothesis", "label": "可能的循环", "title": "安心与反馈之间", "text": "准备暂时减轻不安，推迟却减少反馈；缺少反馈又可能促使继续准备。这需要本人核对。", "refs": ["user:2", "user:7"]},
                {"id": "action", "kind": "action", "label": "比较可行选择", "title": "按今天的条件选一步", "text": "条件具备时投一次；有缺口时有限准备；精力或方向不足时先确认支持。", "refs": ["user:5"]},
            ],
            "edges": [{"from": "experience", "to": "pattern", "kind": "hypothesis", "refs": ["user:2"]},
                      {"from": "pattern", "to": "action", "kind": "conditional", "refs": ["user:5"]}],
            "tour": ["experience", "pattern", "action"],
        },
        "presentation": {
            "style": "quiet-v1",
            # Pin this historical demo to its programmatic V15 environment.
            # A later default runtime must not silently replace its artwork.
            "hero_runtime": "paper-v15",
            "hero_states": [
                {"lines": ["一路认真准备，", "也曾换来安心。"], "description": "匿名示例：继续准备曾让投递前的不安暂时减轻，也让材料更完整。这样的用处值得看见；它是怎样学来的，更早有哪些经历，仍然未知。", "hint": "左右移动鼠标，沿着熟悉的路走一走", "label": "匿名求职示例第一态。准备具有实际作用，也可能暂时减轻不安；更早经历未知。", "node_id": "experience", "refs": ["user:1", "user:2"]},
                {"lines": ["一直在做事，", "又回到准备。"], "description": "一种待核对的循环：准备带来短暂安心，推迟减少真实反馈；缺少新信息，又让你觉得还要准备。如果这与你的体验不同，这条联系也应该改写。", "hint": "停在这里看一会儿，也可以继续比较不同的选择", "label": "第二态看见完整环。呈现准备、暂时安心、推迟与缺少反馈之间的假设联系。", "node_id": "pattern", "refs": ["user:2", "user:7"]},
                {"lines": ["不必一次，", "改变全部。"], "description": "条件够就小试；有缺口就有限准备；精力或方向不足时，先为自己留出条件。选中的只是一个可以观察的方向，现实怎样回应，还要一步步了解。", "hint": "选择一条路线查看条件与代价，随时可以换一个视角", "label": "第三态比较三种有条件的选择。路线不代表实际行动或已获得现实回应。", "node_id": "action", "refs": ["user:5", "user:6"]},
            ],
            "hero_choices": [
                {"id": "try", "title": "带着不确定，投一次", "condition": "确实愿意申请，关键要求已满足，基本材料可用。", "text": "给必要检查一个结束时间，尝试投出一份。观察最难的环节；回复与录用仍由现实决定。", "refs": ["user:5"]},
                {"id": "prepare", "title": "让准备有一个完成线", "condition": "资格、材料或申请信息确有必要缺口。", "text": "只列一项必要缺口、完成线与核对方式。补齐以后再决定下一步，不把合理准备当成问题。", "refs": ["user:2", "user:5"]},
                {"id": "support", "title": "先为自己留出条件", "condition": "可用精力不足，负担过重，或方向尚未清楚。", "text": "先核对时间、支持与真实意愿。可以缩小步子、争取帮助或暂缓，再决定是否投递。", "refs": ["user:3", "user:5"]},
            ],
        },
        "chapters": [],
    }
    content = [
        ("本次主要矛盾", "准备已经很多，开始仍然很远", "这份示例只讨论一次求职启动。想靠近的目标、已经付出的努力与现实限制，需要一起进入理解。", [
            card("先承认准备的用处", "基本材料已经完成，准备也曾减轻眼前的不安。它有实际作用，反复使用并非不可理解。", ["user:1", "user:2"]),
            card("不急着解释整个人", "更早经历、必要资格、精力与经济约束都未知。一次推迟，不能概括一个人的性格或一生。", ["user:2", "user:7"]),
        ]),
        ("困局如何重复", "从局部的安心，看见整体的循环", "下面是一种可以被纠正的解释。重点在于应对的短期作用，怎样与长期后果联系起来。", [
            card("接近投递", "想到被评价与被拒绝，觉得自己还不够好。此处来自情境设定，真实报告需要本人描述。", ["user:2"]),
            card("继续准备，暂时轻松", "修改材料有明确的事情可以做，也暂时不用承受一个由别人决定的结果。", ["user:2"]),
            card("没有新信息，又想再准备", "投递推迟，真实反馈减少；难以判断差在哪里，于是更想用准备增加把握。", ["user:2"], counterexample="若必要条件尚未具备，或推迟并未缓解不安，需要改写这条解释。"),
        ]),
        ("回到具体场景", "同一个动作，可能有不同的原因", "只有把最近一次经过讲清楚，才知道需要改变的是开始条件、申请流程，还是外部支持。", [
            card("材料又改了一轮", "假设决定再改一下后明显轻松，可以核对：新修改解决了必要问题，还是完成线又往后移了一点？", ["user:2"]),
            card("资格确实还缺一项", "如果岗位有明确资格要求，补齐条件就是现实任务。此时需要完成线，不需要被催促证明勇气。", ["user:2", "user:5"]),
            card("过去也可能有不同的路", "有没有一次，没有完全准备好，也做出了尝试？那次有哪些支持？示例没有答案，真实报告应从事实寻找。", ["user:2", "user:7"]),
        ]),
        ("一轮可以结束的尝试", "只改一个环节，让现实多说一句", "当关键要求、材料和意愿都具备时，可以尝试松动“足够安心才能开始”这条条件。", [
            card("先核对前提", "选择自己确实愿意申请的岗位，核对关键要求与可用精力；不满足时转去补缺口或争取支持。", ["user:5"]),
            card("约定结束线", "给最后一轮必要检查约定结束时间，尝试投出一份。完成线是本轮行动，不是被录用。", ["user:5"]),
            card("观察，再决定下一步", "最难的是点击之前、等待回复，还是收到结果之后？出现“再改一点”的念头时，什么支持有用？", ["user:5"], counterexample="如果这一步仍然太大，可以缩小或暂停；这也是重新理解卡点的信息。"),
        ]),
        ("面对分岔时如何选择", "今天具备什么，就从哪里开始", "三条路线用于比较条件和代价，没有统一的正确顺序。", [
            card("条件具备：投一次", "增加一次接触真实机会的可能，也容许拒绝与没有回复。只把结果当作这次匹配的信息。", ["user:5"], eyebrow="关键要求已满足"),
            card("必要缺口：有限准备", "明确一项缺口和完成线。合理准备继续保留，避免没有尽头地增加任务。", ["user:5"], eyebrow="缺口可以具体核对"),
            card("精力或方向不足：先留条件", "核对负担、支持与真实意愿。缩小步子、争取帮助或暂缓，都可以是当前选择。", ["user:3", "user:5"], eyebrow="支持与意愿需要先确认"),
        ]),
        ("未来如何观察", "下一步由新信息来调整", "这里安排的是现实观察顺序，没有录用时间、成功概率或命理窗口。", [
            card("开始之前", "核对必要条件、申请意愿与可用精力，决定本轮范围。", ["user:4"]),
            card("尝试之后", "记录最难的环节、是否移动完成线，以及需要什么支持。", ["user:4", "user:5"]),
            card("到达约定回看点", "结合招聘流程与实际反馈，调整材料、岗位或计划。没有回复提供的信息仍然有限。", ["user:4"]),
        ]),
        ("其他生活方面", "这一处困扰，不等于你的全部", "未谈到的领域保持空白。下面只列本示例知道什么，以及还不知道什么。", [
            card("自我与学习", "只设定了投递前的反应和基本材料完成。学习方式、能力水平与其他情境中的节奏未知。", ["user:3"]),
            card("事业与财务", "关注求职启动。行业、资格、现金流和等待成本未知，会影响可选步子。", ["user:3"]),
            card("关系与家庭", "本次未展开。不能从求职行为补出亲密关系、父母期待或照料责任。", ["user:3"]),
            card("环境与身心", "迁移意愿、居住条件、作息与健康未知。负担和支持需要另行核对。", ["user:3"]),
        ]),
        ("哪些保留，哪些修正", "你的纠正，会改变这张图", "没有真实用户反馈。下列情况展示解释应该怎样被推翻或修订。", [
            card("“推迟并没有让我轻松。”", "减少对即时安心的假设，询问当时发生了什么，是否存在流程或任务范围问题。", ["user:6"]),
            card("“我缺的是必要资格。”", "改为核对资格与有限准备；不再把合理等待当作回避。", ["user:6"]),
            card("“我已经试过很多次。”", "回到实际投递与反馈，重新理解卡点；不能继续套用没有开始的解释。", ["user:6"]),
        ]),
        ("还不知道什么", "保留疑问，也保留选择", "一个能被修正的解释，比一段完整却无从核对的人生故事更有用。", [
            card("最值得补的一次经过", "最近一次本来打算投递、后来又继续准备，那前后发生了什么？先从这一个具体时刻开始。", ["user:7"]),
            card("这份演示的边界", "没有真实咨询、排盘、临床判断或实际行动记录。环呈现一种条件式理解，场景变换不证明人生已经改变。", ["user:7", "user:8"]),
            card("完整依据留在这里", "页尾可展开合成用户底稿与技术底稿，也可下载。它们与模型的来源绑定用于复核内容结构。", ["user:8"]),
        ]),
    ]
    for contract, chapter in zip(MOBIUS_CHAPTERS, content):
        chapter_id, layout, covers = contract
        kicker, title, lead, cards = chapter
        model["chapters"].append(dict(id=chapter_id, layout=layout, covers=list(covers),
                                      kicker=kicker, title=title, lead=lead, cards=cards))
    return model


def build_files():
    source_content = {
        "user": ("final_report.md", source_text("匿名求职示例 · 用户底稿", USER_SECTIONS)),
        "technical": ("technical_analysis.md", source_text("匿名求职示例 · 技术边界底稿", TECHNICAL_SECTIONS)),
    }
    sources = {}
    for key, (filename, text) in source_content.items():
        validate_source_contract("markdown_report" if key == "user" else "technical_report", text)
        preface, parts = sections(text)
        sources[key] = {"text": text, "preface": preface, "sections": parts,
                        "artifact": {"id": "synthetic-" + key + "-source-v15", "path": filename,
                                     "sha256": hashlib.sha256(text.encode("utf-8")).hexdigest()}}
    model = build_model(sources)
    validate_model(model, {"session_id": DEMO_ID, "report_template": "cihou-mobius-v1"}, sources)
    rendered = render(model, sources)
    if re.search(r'<(?:script|link)\b[^>]*(?:src=|rel=["\']stylesheet)', rendered, re.I):
        raise ValueError("demo must not load external scripts or stylesheets")
    if "@@" in rendered:
        raise ValueError("demo contains an unresolved renderer placeholder")
    return {**{filename: text for filename, text in source_content.values()},
            "report-model.json": json.dumps(model, ensure_ascii=False, indent=2) + "\n",
            "final_report.html": rendered}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify all four outputs match sources and current renderer")
    args = parser.parse_args()
    files = build_files()
    if args.check:
        mismatches = [name for name, content in files.items()
                      if not (HERE / name).is_file() or (HERE / name).read_text(encoding="utf-8") != content]
        if mismatches:
            raise SystemExit("demo requires rebuilding: " + ", ".join(mismatches))
        print("[OK] synthetic sources, bound model and complete HTML match the current renderer")
        return
    for filename, content in files.items():
        (HERE / filename).write_text(content, encoding="utf-8")
        print(str(HERE / filename) + " (" + str(len(content.encode("utf-8"))) + " bytes)")


if __name__ == "__main__":
    main()

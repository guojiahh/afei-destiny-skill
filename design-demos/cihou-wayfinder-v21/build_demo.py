#!/usr/bin/env python3
"""Build V21 guided reading from the unchanged synthetic V20 analysis.

All content is synthetic. Possible formation pathways remain interpretation in
the source model and plan; no concrete life event is invented or verified here.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
SYNTHETIC_BUILDER = HERE.parent / "cihou-wayfinder-v15" / "build_demo.py"
SPEC = importlib.util.spec_from_file_location("cihou_synthetic_job_source_v21", SYNTHETIC_BUILDER)
source = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(source)
source.DEMO_ID = "synthetic-wayfinder-job-v21"
NOTICE = "匿名求职演示。人物情境为合成内容，来处以可能的形成路径表达；没有对应真实咨询者。"
PAST = "你可能有过这样的经验：准备充分时，更容易得到认可；太早拿出一个想法，又容易被挑出问题。久而久之，‘再做好一点’成了让自己安心的办法。到了求职，你也想先把一切准备妥当，再让别人看见。只是这一次，有些答案要走出去才会出现。"
PRESENT = "你已经为求职做了不少准备。每次靠近投递，‘我是不是还不够好’又让你回去改一点。继续准备让你松一口气，却也推迟了真实反馈；没有新的把握，你又想再准备一轮。"
FUTURE = "你可以把‘完全安心以后再开始’，换成‘材料够用了，就做一次小尝试’。选一个愿意去、也符合关键要求的岗位，给最后一轮检查一个结束时间，投出一份。之后看看，最难的是点击之前，还是等待回应。若还有必要缺口，就先补一项；若改变需要慢慢积累，就给时间、可持续的小步与支持留位置。"


def sha(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def safe_json(value):
    return json.dumps(value, ensure_ascii=False, indent=2).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


USER_SECTIONS = [
    ("一、一页总览", """你想找到一份愿意投入的工作，也已经为它做了不少准备。只是每次走到投递这一步，心里又会冒出一句：再准备一点，会不会更好？

准备让材料更完整，也让你暂时松一口气。时间久了，开始的时刻却越来越远。这次我们一起看清这条路怎样绕回来，再为它留一个可以走出去的位置。

- 已有的资源：你愿意认真做事，也能持续打磨材料。
- 眼前的选择：让准备有完成线，或者先补清一项必要缺口。
- 需要照顾的条件：岗位要求、可用精力、现金流和你自己愿意靠近的方向。

先看现在的循环，再回看之前怎样形成熟悉的做法，最后为此后选一小步。"""),
    ("二、本次重点问题", """### 你真正想解决的事

你希望自己的努力能走到真实机会面前。基本投递材料已经完成，但按下按钮这件事，始终比再修改一遍更难。

### 从过去到现在

""" + PAST + """

### 为什么可能绕回原处

""" + PRESENT + """

你在用一个自己很熟悉、也确实有用的办法，解决两件不同的事：把材料做好，以及让自己少受一点被评价的压力。前一件事可以逐项完成，后一件事很难靠继续修改彻底结束。于是，“准备好了”总像在前面一点点。

### 现实中的具体场景

#### 场景一：最后一轮，又多了一轮

你打开申请页面，看到要提交的简历，开始想到别人会怎样看。再改一处表达、再补一点材料，能让你暂时轻松。可是申请还停在那里，岗位会如何回应，你仍然没有机会知道。

#### 场景二：需要补的，确实还有一项

有时岗位真的要求一项证书，或材料里缺少必要作品。那就把缺口列清楚，给它一个能完成的范围。这样准备有了落点，也更容易知道什么时候可以往前。

### 能改变哪一环

""" + FUTURE + """

### 心结收束

你不需要丢掉认真。可以让它继续陪着你，同时不再独自承担“必须先知道结果”的任务。一次岗位回应会告诉你这次匹配的情况，你仍然可以据此调整，而不用让它替整个人生下结论。"""),
    ("三、人生全景图", """### 自我认识与行为节奏

这次先看接近投递时的节奏：你怎样准备，又在什么时候停住。生活里也许有行动更自然的场合，值得把那里的条件借过来。

### 学习、考试与能力形成

把已有材料送进一次实际使用，能帮助你分清接下来最值得学什么。学习和尝试可以轮流进行。

### 事业、职责与发展方式

先看一份工作的真实任务、关键要求和你愿不愿意做，再决定把力气放在哪里。

### 财务、资源与现金流

求职等待有成本。若收入已很紧迫，可以同时考虑过渡工作、可承受的等待长度和身边可用的帮助。

### 感情、亲密关系与边界

这次把重心留给求职。关系中的需要与相处方式，可以在你愿意时另留一段完整的时间。

### 家庭角色与代际互动

若你还承担照料或家庭事务，行动计划要为这些安排留位置，而不是把全部时间都算成求职时间。

### 迁移、居住与环境变化

工作地点也影响选择。可以把距离、居住成本和愿意改变的生活范围放在一起比较。

### 身心节奏与安全提醒

可用精力少的时候，先缩小任务、安排恢复与支持。一个能持续的小步，比勉强挤出一次很大的行动更适合眼下。"""),
    ("四、当前阶段与未来窗口", """这里按一次实际尝试来安排节奏。

| 阶段 | 先做什么 | 留意什么 |
|---|---|---|
| 出发之前 | 选定岗位，列清关键要求和必要检查 | 这份工作是否值得你靠近，今天有没有余力 |
| 投出一份之后 | 记录最难的环节，让本轮行动有结束点 | 想继续修改时，什么支持能帮你停下来 |
| 到约定回看点 | 结合招聘进度与反馈调整材料或岗位 | 没有回复时，是否需要换一个获取信息的方式 |

回看的日期可以跟着招聘流程约定。你能安排尝试与调整的节奏，单位也有自己的选择与时间。"""),
    ("五、行动与选择提示", """### 先保护与确认什么

先照顾好你愿意去哪里、能投入多少，以及眼前是否真的还缺一项必要条件。

### 一个可以验证的改变

- 适用前提：你愿意申请，关键要求已满足，基本材料可用。
- 最小尝试：选一个岗位，为最后一轮必要检查约定结束时间，投出一份。
- 观察反馈：点击之前、等待回应和看到结果，哪一段最费力；什么支持有用。
- 完成、调整或暂停的条件：投出即完成这一轮；发现必要缺口就改成有限准备，负担过大就缩小或暂停。
- 外部结果：单位是否回复或录用，还取决于匹配、竞争和招聘安排。

### 还有哪些选择

条件够了，就投一次：多接触一个真实机会，让岗位信息帮助你调整。

确有缺口，就补一项：写清具体缺口、完成线与检验方式，完成后再决定下一步。

留给时间跟坚持：把今天能做的一点留在路上，有休息和支持，小步才能持续。让时间留下变化，也留下记录。若你需要恢复精力或认识方向，就先缩小任务、减少负担，给身边的帮助留位置。

一次尝试可以这样开始：先让一份材料走到机会面前；按下之前，心里仍可能有一点紧；这一步可以先停在一次尝试。材料够用时，一次投递就能成为本轮的完成点，随后留意紧张、等待和回应带来的信息。

有限准备可以这样展开：把眼前的缺口缩成一件事；给它范围，也给它完成线；准备到这里，可以停下。写明要补的那一项、检验方式和可用时间，完成以后再让现实带来新的信息。

慢慢积累也有具体做法：按可承受的节奏记录一次进展，留意负担是否减轻、方向是否更清楚；看不见变化时，可以调整节奏和帮助。时间与坚持需要适合你的行动和支持共同参与。

哪一步适合今天，比哪一步看起来更勇敢更有用。"""),
    ("六、开场判断、用户反馈与修正", """这次还没有实际回访记录。你可以从最近一次准备投递的经过开始，把这张图改得更像自己。

如果推迟后并没有轻松，而是根本找不到申请入口，下一步就先把流程弄清楚。如果已经投过许多次，就把这些回应带进来，一起看看真正卡在哪里。

你也可以说说哪一句最贴近自己、哪一句不太像。无需让所有解释都留下。"""),
    ("七、结论边界与未解问题", """这条路最值得看清的，是准备怎样让你暂时轻松，又怎样推迟了获得反馈的机会。眼前若有资格、收入、照料或精力上的限制，也要一起放进计划。

接下来最有帮助的一件事，是回想最近一次本来打算投递、后来又去修改的那一刻：你看到了什么，心里出现了哪句话，决定再准备以后又发生了什么？

新的经历可以改变这张图。准备仍然有价值，能开始的条件也可以比从前宽松一点。"""),
    ("八、技术文档与阅读说明", """technical_analysis.md 保存内容来源、解释层级和计算口径。来处段用“你可能”提出一条形成路径，供你结合自己的经历理解；具体的过去，仍由你来补充。

HTML 先带你看“现在”：按住沿路走过六个循环位置；再看“之前”：按住回看一种做法怎样形成；到“此后”点击一个选择，画面换场并自动展开一段有限体验，停在诗卡和结果。带着这张卡，可以继续读相关章节，也可以从头读完整的九章解读。你随时都能切换阶段、停下或阅读，不需要收齐三张卡。页尾保留完整底稿与下载，现实中的尝试仍按自己的节奏进行。"""),
]


def source_text(title, rows):
    return "# " + title + "\n\n" + "\n\n".join("## " + heading + "\n\n" + body.strip() for heading, body in rows) + "\n"


def build_files(include_html=True):
    user_text = source_text("让准备，陪你走向一次尝试", USER_SECTIONS)
    technical_bodies = [
        "本演示没有出生输入，未运行历法计算；下列技术项目仅保留报告结构。",
        "四柱、十神和藏干不适用于本次设计内容。",
        "月令、根气与承载不参与本次解释。",
        "格局与用神不参与本次解释。",
        "合冲刑害不用于推演求职场景。",
        "行动顺序不使用大运或交运日期。",
        "来源层级：当前求职过程来自显式合成设定；来处段是 mechanism-grounded formation hypothesis，以当下准备—安心的作用为起点提出可能的学习路径。没有具体人物、事件、年龄或已核实的传记记录，kind=hypothesis，不能回写为事实。",
        "未来部分为条件式行动安排，外部招聘回应仍开放。V21 的三个 choice.feedback 沿用各 choice.refs：attempt 表达一次向外尝试，prepare 表达必要准备的完成线，sustain 表达有支持的持续与记录。点击后叶片换场、有限运动和效果、三句短话及结果文字属于视觉体验，不证明现实中已投递、已补齐、获得回应或已改善；不含第二轮选择。",
        "没有真实盲测、判断锁定或实际用户反馈，不计算准确率。",
        "替代解释包括必要资格、流程信息、岗位意愿、经济压力与可用精力；这些条件改变时，应调整机制理解和行动。",
        "合成用户底稿与九章由本目录 build_demo.py 提供；通用模型结构复用 ../cihou-wayfinder-v15/build_demo.py。机器来源计划保留 synthetic 标记、解释类型和文件哈希。未读取真实咨询或评测材料。",
    ]
    technical_rows = [(row[0], body) for row, body in zip(source.TECHNICAL_SECTIONS, technical_bodies)]
    technical_text = source_text("内容来源与解释口径", technical_rows)
    sources = {}
    for kind, filename, text in [("user", "final_report.md", user_text), ("technical", "technical_analysis.md", technical_text)]:
        source.validate_source_contract("markdown_report" if kind == "user" else "technical_report", text)
        preface, parts = source.sections(text)
        sources[kind] = dict(text=text, preface=preface, sections=parts,
                             artifact=dict(id="synthetic-" + kind + "-source-v21", path=filename, sha256=sha(text)))
    model = source.build_model(sources)
    model.update(title="此后 · 让准备，陪你走出去", subtitle=NOTICE + "\n\n你已经走了很久。先看清为什么会绕回来，再选一小步，让现实带来新的信息。",
                 closing="你可以继续认真准备，也让准备有一个结束的时刻。接下来，选一小步，让新的经历慢慢告诉你，哪条路更适合自己。",
                 limits="这张图可以随你的经历改变。把现实条件、需要的支持和自己的感受放在一起，再决定下一步。",
                 technical_intro="这里保留内容来源和解释口径，方便你需要时展开阅读。来处以可能的形成路径表达，现实安排按实际条件调整。",
                 technical_cards=[source.card("关于来处的写法", "从眼前应对的作用，提出一条可能的学习路径；它可以帮助理解，也可以随你的经历调整。", ["technical:7"]),
                                  source.card("关于未来的安排", "行动安排围绕一次有限尝试。招聘回应、匹配与外部机会共同影响之后的路。", ["technical:8", "technical:10"])])
    model["authoring_notes"] = ["Synthetic narrative demo; no real consultation records.", "Possible past is a formation hypothesis, not verified biography. No specific person, event, age or trauma asserted."]
    model["evidence_notes"] = [dict(id="formation-pathway", kind="hypothesis", inference_type="mechanism-grounded-possible-past", refs=["user:2", "technical:7"], verified_biography=False)]
    model["diagram"]["tour"] = ["pattern", "experience", "action"]
    for node in model["diagram"]["nodes"]:
        if node["id"] == "experience":
            node.update(kind="hypothesis", title="准备成为出发的底气", text=PAST)
        elif node["id"] == "pattern":
            node.update(title="眼前的安心，与迟来的反馈", text=PRESENT)
        else:
            node.update(title="给准备一个结束的时刻", text=FUTURE)
    states = [
        dict(lines=["再准备一轮，", "就能安心出发。"], description=PRESENT, hint="按住，看看现在怎样一次次绕回这里；松开可以停下。", label="现在。沿固定路线看见准备、安心、推迟与缺少反馈怎样连成一圈。", node_id="pattern", refs=["user:1", "user:2"], anchors=["到了投递这一步", "再准备，先安心一会儿", "少了反馈，又回到准备"]),
        dict(lines=["你把准备，", "当成了出发的底气。"], description=PAST, hint="按住，回看之前怎样学会用准备让自己安心。", label="之前。一条可能的学习路径：准备带来认可与把握，逐渐成为熟悉的出发条件。", node_id="experience", refs=["user:2"], anchors=["准备充分时，心里更稳", "再做好一点，就更敢被看见", "熟悉的办法，也可以换个用法"]),
        dict(lines=["让准备，", "陪你走出去。"], description=FUTURE, hint="点选适合此后的一步，留下一张卡，再读完整解读。", label="此后。根据材料、资格、精力和意愿，点击一次投递、有限准备或留给时间跟坚持；换场后自动完成一段有限体验，停在结果文字。", node_id="action", refs=["user:5"], anchors=["先看今天的条件", "只选一步，试试看", "再听现实的回答"]),
    ]
    nodes = [
        dict(id="trigger", text="到了投递这一步", detail="你已经准备了不少，也希望这次能有一个好结果。申请页面就在眼前，别人会怎样看你，忽然变得很近。", refs=["user:2"]),
        dict(id="meaning", text="如果被拒，是不是我还不够好", detail="你在意这次机会，也容易让一次拒绝承担太多含义。于是，开始像是在交出一份关于自己的答案。", refs=["user:2"]),
        dict(id="response", text="再改一点，今天先不投", detail="你回到熟悉的准备里。这里有一项项可以做好、可以掌握的事，也能让出发晚一点发生。", refs=["user:2"]),
        dict(id="relief", text="先松一口气", detail="决定再准备一下，你暂时不用面对那个由别人决定的结果。肩上的压力轻了一点，也更愿意继续做下去。", refs=["user:2"]),
        dict(id="cost", text="机会还在远处，反馈也没有来", detail="材料又完整了一些，但你还没接触到真实岗位。哪些地方已经够用、哪里值得再改，仍然少了现实的回答。", refs=["user:2"]),
        dict(id="return", text="没有新的把握，又想再准备一轮", detail="心里仍然没底，你又想靠多做一点来稳住自己。走了很久，脚下却再次回到熟悉的位置。", refs=["user:2"]),
    ]
    loop = dict(nodes=nodes, past=dict(text=PAST, refs=["user:2"], kind="hypothesis"), present=dict(text=PRESENT, refs=["user:1", "user:2"]), future=dict(text=FUTURE, refs=["user:5"]))
    choices = [
        dict(id="try", title="材料够了，先投一份", condition="你愿意申请，关键要求已满足，基本材料可用。", text="给最后一轮检查一个结束时间，让一次投递成为这一轮的完成点，随后留意紧张、等待和回应带来的信息。", refs=["user:5"],
             feedback=dict(mode="attempt", lines=["先让一份材料，走到机会面前", "按下之前，心里仍可能有一点紧", "这一步可以先停在一次尝试"], result="材料够用时，一次投递就能成为本轮的完成点。随后留下紧张、等待和回应的信息，供你慢慢调整。")),
        dict(id="prepare", title="还缺一项，就把它补清楚", condition="岗位要求或材料中，确实有一项必要缺口。", text="写清要补什么、做到哪里算完成。让准备有范围，也给完成之后的自己留一个出发点。", refs=["user:2", "user:5"],
             feedback=dict(mode="prepare", lines=["把眼前的缺口，缩成一件事", "给它范围，也给它完成线", "准备到这里，可以停下"], result="必要准备可以有清楚的范围和结束处。写明要补的那一项、检验方式和可用时间，完成以后再让现实带来新的信息。")),
        dict(id="support", title="留给时间跟坚持", condition="这件事需要积累，也能为小步、休息与支持留出可持续的安排。", text="把今天能做的一点留在路上，按可承受的节奏记录进展。需要恢复精力或认识方向时，先缩小任务、减少负担，让帮助跟得上。", refs=["user:3", "user:5"],
             feedback=dict(mode="sustain", lines=["把今天能做的一点，留在路上", "有休息和支持，小步才能持续", "让时间留下变化，也留下记录"], result="有些变化需要时间，也需要能持续的小步与支持。按可承受的节奏记录一次进展，留意负担是否减轻、方向是否更清楚；看不见变化时，可以调整节奏和帮助。")),
    ]
    model["presentation"].update(hero_runtime="wayfinder-v21", hero_states=states, hero_choices=choices, loop_story=loop)
    chapter_copy = [
        ("你想让努力，走到机会面前", "你已经认真准备，也期待找到一份愿意投入的工作。这次先把目光放在投递前后那一小段路。", [("准备里，有你的认真", "你愿意打磨材料，也希望把事情做好。这份能力可以继续陪你，走到一次实际尝试里。"), ("出发前，心里总还有一点没底", "当‘再好一点’成了开始的条件，完成线就容易一直向前移动。我们先看看它是怎样发生的。")]),
        ("安心来得很近，反馈却越来越远", PRESENT, [("走到投递面前", "机会靠近时，被评价的压力也靠近了。你开始想，自己的材料还能不能再好一点。"), ("回到准备，先轻松一点", "再修改有明确的事可以做，也让你暂时不用面对由别人决定的结果。"), ("少了反馈，又回去准备", "没有新的信息，下一次开始仍然没底。于是，原本让你安心的做法，又被用了一次。")]),
        ("同样是准备，也可以有不同的用处", "有时你需要补一项条件，有时你是在等心里更踏实一点。分清这两件事，下一步就会具体一些。", [("最后一轮，又多了一轮", "问问自己：这处修改解决了岗位真正需要的问题，还是让我晚一点按下按钮？"), ("必要的缺口，就认真补齐", "把证书、作品或流程问题写成一个有限任务。准备有了落点，出发也会有时刻。"), ("把好用的条件借过来", "想一想，什么时候你开始得比较自然？清楚的要求、一起做事的人，或一个更小的任务，都值得留意。")]),
        ("先让一轮准备，真正结束", "这次不用回答整个人生。材料够用、关键要求满足时，完成一次小尝试就可以。", [("选一个愿意靠近的岗位", "看看真实任务和关键要求，也照顾好自己今天能投入多少。"), ("给最后检查约定结束时间", "把必要事项做完，尝试投出一份。投递完成，就是这一轮的结束点。"), ("看见最费力的那一刻", "点击之前、等待回应、看到结果，哪一段更难？把需要的支持记下来，下一次可以少独自承担一点。")]),
        ("今天适合哪一步，就从哪里开始", "把条件放在眼前，选一个现在能承受的范围。先看清一段有限体验怎样展开，再把适合自己的部分带回生活。", [(x["title"], x["text"]) for x in choices]),
        ("让下一次经历，带来新的信息", "行动和回看可以有节奏，单位也有自己的招聘安排。", [("出发之前", "选定岗位、列清关键要求和必要检查，让任务有边界。"), ("投出一份之后", "留意身体和心里的变化，把最难的环节记下来。"), ("到约定的回看点", "结合进度与反馈，调整材料、岗位或获取信息的方式。一次回应，是这次匹配的信息。")]),
        ("这段路，也要放进你的生活里", "求职需要力气。时间、收入、生活安排与身边的帮助，都可以参与决定步子多大。", [("学习与能力", "让学习和实际尝试轮流发生。你会更容易看清，下一份精力值得投在哪里。"), ("工作与资源", "比较岗位内容、等待成本和过渡安排，让行动贴近眼前的生活。"), ("关系与家庭", "为重要的人和承担的事务留出位置。需要时，把支持说具体一点。"), ("环境与恢复", "把地点、居住成本和可用精力一起考虑。很累的时候，可以先缩小一步。")]),
        ("把你的感受，放回这张图", "哪一句像你，哪一句不太像，都值得说。你自己的经历，会让这条路越来越清楚。", [("如果卡住的是入口", "先把申请流程拆清楚，找到第一步从哪里开始。"), ("如果关键条件还缺一项", "把重点放在补齐必要条件，让准备有一个可以完成的范围。"), ("如果你已经尝试了很多次", "把真实回应带进来，看看材料、岗位匹配或获取反馈的方式，哪里值得调整。")]),
        ("认真可以留下，开始也可以靠近", "你可以继续把事情做好，同时给自己一个走进现实的时刻。", [("先回看最近的一次", "本来打算投递，后来又去修改，那一刻你心里出现了哪句话？这会帮助你看见，哪里最需要一点支持。"), ("留意现实里的条件", "资格、现金流、照料责任和精力，都会影响今天的选择。把它们放进计划，步子会更贴近自己。"), ("给下一步留一点余地", "尝试之后可以调整、缩小或改选。你不必靠一次结果，回答自己究竟够不够好。")]),
    ]
    chapter_refs = [["user:1", "user:2"], ["user:2"], ["user:2"], ["user:5"], ["user:5"], ["user:4"], ["user:3"], ["user:6"], ["user:7", "user:8"]]
    for chapter, copy, refs in zip(model["chapters"], chapter_copy, chapter_refs):
        chapter["title"], chapter["lead"], cards = copy
        chapter["cards"] = [source.card(title, text, refs) for title, text in cards]
    source.validate_model(model, {"session_id": source.DEMO_ID, "report_template": "cihou-mobius-v1"}, sources)
    stages = [dict(id=key, title=title, lines=state["lines"], description=state["description"], anchors=state["anchors"], refs=state["refs"]) for key, title, state in zip(["present", "past", "possibilities"], ["现在", "之前", "此后"], states)]
    story = dict(schema_version=1, id=source.DEMO_ID, synthetic_demo=True, notice=NOTICE, hero_states=states, stages=stages, choices=choices, loop_story=loop,
                 evidence_notes=model["evidence_notes"], sources=model["sources"], report={key: model[key] for key in ["title", "subtitle", "closing", "chapters", "limits"]})
    story["reading_chapters"] = [dict(id="chapter-" + chapter["id"], title=chapter["title"],
                                       refs=list(dict.fromkeys(ref for card in chapter["cards"] for ref in card["refs"])))
                                 for chapter in model["chapters"]]
    story_js = "/* Synthetic narrative; possible past remains an interpretation. */\nwindow.CIHOU_STORY_DATA = " + safe_json(story) + ";\n"
    model_text = json.dumps(model, ensure_ascii=False, indent=2) + "\n"
    plan = dict(schema_version=1, id=source.DEMO_ID, synthetic_demo=True, consultation_registered=False, notice=NOTICE,
                inputs=[dict(path="build_demo.py", sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()), dict(path="../cihou-wayfinder-v15/build_demo.py", sha256=hashlib.sha256(SYNTHETIC_BUILDER.read_bytes()).hexdigest())],
                inference=model["evidence_notes"], sources={key: dict(path=value["artifact"]["path"], artifact_id=value["artifact"]["id"], sha256=value["artifact"]["sha256"]) for key, value in sources.items()},
                choice_feedback=[dict(choice_id=choice["id"], mode=choice["feedback"]["mode"], refs=choice["refs"]) for choice in choices],
                outputs={"report-model.json": dict(sha256=sha(model_text)), "story-data.js": dict(sha256=sha(story_js))})
    files = {"final_report.md": user_text, "technical_analysis.md": technical_text, "report-model.json": model_text, "story-data.js": story_js}
    if include_html:
        files["final_report.html"] = source.render(model, sources)
        plan["outputs"]["final_report.html"] = dict(sha256=sha(files["final_report.html"]))
    files["source-plan.json"] = json.dumps(plan, ensure_ascii=False, indent=2) + "\n"
    return files


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--content-only", action="store_true")
    args = parser.parse_args()
    files = build_files(include_html=not args.content_only)
    if args.check:
        stale = [name for name, text in files.items() if not (HERE / name).is_file() or (HERE / name).read_bytes() != text.encode("utf-8")]
        if stale:
            raise SystemExit("Rebuild V21 narrative content: " + ", ".join(stale))
        print("[OK] V21 narrative sources, inference metadata and complete model match")
        return
    for filename, text in files.items():
        (HERE / filename).write_bytes(text.encode("utf-8"))
        print(str(HERE / filename) + " (" + str(len(text.encode("utf-8"))) + " bytes)")


if __name__ == "__main__":
    main()

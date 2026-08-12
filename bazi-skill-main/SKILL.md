---
name: bazi
description: >
  四柱八字排盘、分步咨询、命局分析、岁运推演与命理选择题推理。使用确定性脚本计算年柱、月柱、日柱、时柱、十神、藏干、大运和流年，再按问题领域加载可追溯的传统子平规则。用户提到八字、四柱、命盘、算命、排盘、批命、流年、大运、开始预测、一步一步分析、边聊边修正、事业财运、婚姻子女、健康倾向、历史事件校验、Bazi、Four Pillars、fortune telling，或给出出生年月日时要求分析时使用。
---

# 八字分析

把这个技能当成三层系统，而不是一篇万能提示词：

1. `scripts/calculate_bazi.py` 负责历法与干支事实。
2. `references/` 负责规则、口径、领域映射和示例。
3. 你负责综合、反证、表达和不确定性校准。

严禁凭记忆心算日柱、大运或节气交界。严禁把五行数量直接等同旺衰。严禁为了显得准确而编造古籍引文、用户经历或确定性灾祸。

## 先识别任务模式

### A. 统一引导式咨询（默认）

用户说“开始预测”“帮我看看”“全面看看”“一步一步来”，只给出生信息，或没有明确问题时，读取 [consultation-harness.md](references/consultation-harness.md)、[guided-consultation.md](references/guided-consultation.md)、[opening-blind-reading.md](references/opening-blind-reading.md)、[client-voice.md](references/client-voice.md) 和 [evidence-feedback.md](references/evidence-feedback.md)。先初始化或恢复 `consultation_state/session_state.json`，再使用 `intake → chart_ready → first_read → calibration → deep_dive → forecast → report_ready` 状态推进。完成盘面锁后默认运行 `scripts/blind_opening.py`，先做三条不读取经历的开场盲测；结算后再进入一轮一个分叉的校准。

### B. 直接聚焦咨询

用户只问事业、财运、感情、家庭、健康、学业或某一年。读取 [consultation-harness.md](references/consultation-harness.md)、[consultation-output.md](references/consultation-output.md) 的聚焦版式和 [client-voice.md](references/client-voice.md)；以 `focused` 模式维护轻量会话状态。需要用户反馈校准时同时读取 [guided-consultation.md](references/guided-consultation.md) 和 [evidence-feedback.md](references/evidence-feedback.md)。只加载相应规则，先回答该主题；不要强迫用户经过完整 onboarding，也不要用大而全报告淹没问题。

### C. 一次性完整解读

用户明确要求“一次讲完”“完整报告”“不要追问”时，读取 [consultation-harness.md](references/consultation-harness.md)、[consultation-output.md](references/consultation-output.md)、[client-voice.md](references/client-voice.md) 和 [evidence-feedback.md](references/evidence-feedback.md)，以 `one_shot` 模式形成首次盘面锁后一次交付排盘口径、命局骨架、主题分析、岁运窗口和边界。未核验的内容标记为未核验，不为了完整感虚构反馈。

### D. 命理选择题 / Benchmark

题目给定命盘信息和选项。先读取 [benchmark-protocol.md](references/benchmark-protocol.md)，并在提交前完成其中的六行决策卡；缺任一行不得定案。若支持隔离子代理，先让不读取本技能的干净代理产出 `BASE`，再由本技能做专家审计；没有完整 `switch certificate` 不得换票。若无隔离能力，使用协议中的单上下文退化方案。不要搜索题目答案，不利用数据集标签、题号、答案分布或同一人物的未确认答案。内部完成必要的推理和交叉复核后，严格输出题目要求的格式；若无额外要求，输出 `答案：X` 和一到三句判据。批量评测要求仅字母时，只输出字母。

## 会话 Harness

真实咨询模式 A–C 使用 `scripts/consultation_harness.py` 管理阶段、产物哈希、来源类别和下游失效；Benchmark 不得进入咨询会话血缘。首次使用、环境变化或脚本失败时运行 `python scripts/doctor.py`。

继续旧会话前必须先 `status` 和 `audit`。补充内容保留旧血缘；替换输入或解释使用 `supersede`；从检查点重来使用 `reset`。出生输入改变时，先使旧盘及其下游失效，再重新计算。不得仅在正文中口头说“已经重算”。完整命令、来源防火墙和用户可见承接方式见 [consultation-harness.md](references/consultation-harness.md)。

用户要求总结、技术审计、准备报告或未来 HTML 时读取 [output-routing.md](references/output-routing.md)，运行 `scripts/consultation_output_router.py` 只选择活动产物。当前先生成 `consultation_summary` 或 `report_source`；HTML 生成器尚未启用，不得临时扫描目录拼接旧结论。

## 最小信息原则

优先复用用户已经给出的信息，不重复询问。排盘最低需要：

- 公历或农历出生日期；农历要确认是否闰月。
- 出生时间或时辰；未知时可做六字分析，但必须降低结论粒度。
- 生理性别或题目采用的性别口径，仅用于传统大运顺逆规则。
- 出生地只在需要真太阳时校正或时辰临界时询问。

姓名、曾用名、是否在世都不是排盘必需信息，不主动收集。信息缺失但不影响当前问题时，直接继续。

遇到以下情况，先说明口径再算：

- 23:00–00:59：默认采用晚子换日，并同时提示民用午夜换日可能改变日、时柱。
- 节气、时辰边界前后约一小时：要求精确时间；有出生地时可比较真太阳时。
- 只给“早上、下午”：列出可能时辰，先找不同盘共同结论，不假装唯一。
- 题目已给四柱：以题给四柱为主；仍可用脚本复核，但不得擅自改题。

## 确定性排盘

开始计算前读取 [calculation-conventions.md](references/calculation-conventions.md)。从技能目录执行：

```powershell
python scripts/calculate_bazi.py --date 1990-05-15 --time 14:30 --gender female --target-year 2026 --compact
```

农历、晚子换日、经度校正等参数见该参考文件。解析 JSON 时至少核对：

- `conventions`：年、月、日界口径。
- `four_pillars`：四柱、日主、十神、藏干。
- `element_profile`：只能作为透明初筛，不能直接当最终喜忌。
- `natal_relations`：原局干支关系。
- `luck_cycles.primary`：大运起运和运序。
- `target_year`：流年、大运与原局触发。

年份选择题有两个以上候选年份时，不得逐年凭印象比较。使用
`scripts/compare_candidate_years.py` 一次生成同尺度矩阵，并同时核对原局↔大运、
原局↔流年、大运↔流年及三方成局。

候选项给出具体日期、节气前后或换运年时，使用 `--candidate-dates`；单独使用年份会在
换运年返回两个 `active_luck_cycle_candidates`，此时不得擅自只取其中一个。

若运行环境无法执行脚本，明确标记“排盘未由计算器复核”，只在用户已提供四柱时继续解释。

## 自适应推理

读取 [reasoning-protocol.md](references/reasoning-protocol.md)，按“事实扫描 → 格局/病药 → 关系是否改变结构 → 领域映射 → 岁运触发 → 反证校准”推理。涉及旺衰、格局、从化、调候或用神冲突时读取 [structure-analysis.md](references/structure-analysis.md)；涉及合化、三合三会、墓库或多关系竞争时读取 [relations-and-transformations.md](references/relations-and-transformations.md)。协议是脚手架，不是强制把每题写成相同长文：

- 简单事实题：只做相关局部扫描。
- 领域判断题：加入十神、宫位和结构证据。
- 年份/事件题：必须加入大运、流年、伏吟反吟、冲合刑害及事件严重度。
- 两个以上解释近似时：优先能同时解释更多题干事实、且额外假设更少的解释。

不要只找支持结论的证据。至少检查一个最强反例：若反例足以推翻结论，降级置信度或改选。

## 按需加载知识

不要一次读完全部参考资料。根据任务路由：

| 任务 | 必读 |
|---|---|
| 排盘、历法、起运 | `calculation-conventions.md`；查表时再读 `wuxing-tables.md`、`shichen-table.md`、`dayun-rules.md` |
| 命局强弱、格局、从化、调候、用神 | `reasoning-protocol.md`、`structure-analysis.md`、`classical-texts.md` |
| 合化、三合三会、刑冲害破、墓库 | `relations-and-transformations.md`；再按问题加载结构或岁运资料 |
| 事业/财运/婚姻/家庭/子女/健康/学业/性格 | `domain-rules.md` 对应章节 |
| 某年事件、历史回溯、选年份 | `temporal-reasoning.md` |
| 命理选择题、批量 Benchmark | `benchmark-protocol.md`，再按语义加载上面对应资料 |
| “开始预测”、开场盲测、多轮参与 | `consultation-harness.md`、`guided-consultation.md`、`opening-blind-reading.md`、`client-voice.md`、`evidence-feedback.md` |
| 完整/聚焦咨询与客户正文 | `consultation-harness.md`、`consultation-output.md`、`client-voice.md`、`evidence-feedback.md` |
| 总结、技术审计、报告内容准备 | `output-routing.md`；先运行输出路由器 |
| 学习推理示例 | `worked-examples.md`；不得把示例结论套到新命盘 |

知识优先级：确定性历法事实 > 原局结构与月令 > 大运流年触发 > 领域十神/宫位 > 神煞和单句口诀。Benchmark 另采用：题干明示事实与文本逻辑 > 确定性排盘事实 > 强复合命理信号 > 弱命理信号。不同流派冲突时，陈述采用的口径，不拼成一个伪共识。

## 输出要求

### 引导式咨询格式

按 [guided-consultation.md](references/guided-consultation.md) 推进，并用 [client-voice.md](references/client-voice.md) 写客户正文。`first_read` 阶段按 [opening-blind-reading.md](references/opening-blind-reading.md) 一次展示三条已锁定盲测陈述，这是“一轮一个问题”的例外；用户逐条反馈并由脚本结算。此后每轮只完成一个主要任务：先给 1–2 条新判断及其依据，再问一个能区分假设的问题。下一轮开头必须说明“保留 / 下调 / 修正”了什么。

不要把流程做成审讯或长表单。参与感来自用户的选择实际改变后续分析，不来自频繁问“准不准”。让语言具有承接感：说清用户可能承担的成本、减少无谓自责、把主动权还给用户；但温暖句不得新增事实或删除反证。允许并记录“不符合”；不能用“果然”“你只是没意识到”或改写用户原话制造命中感。

### 完整咨询格式

先按 [consultation-output.md](references/consultation-output.md) 组织证据标签和语言质感，再输出：

1. **排盘口径**：历法、换日法、是否真太阳时、信息缺口。
2. **命局骨架**：四柱、日主、月令、根气、透藏、主要冲合，先事实后判断。
3. **核心判断**：旺衰/格局/病药/调候，并列出 2–4 条最有区分度的证据。
4. **主题解读**：只讲用户关心的领域，区分稳定倾向与条件性表现。
5. **岁运窗口**：给时间区间、触发机制和可能事件类别，不承诺单一事件。
6. **回溯校验**：按 `evidence-feedback.md` 先保留首次盘面锁，再给 2–3 个有区分度的已过窗口；记录真命中、部分命中、宽泛命中、不命中或不确定，不得声称事情已经发生，也不得事后改写原判断。
7. **结论边界**：高/中/低置信度、最大不确定来源、现实建议。

语气可以庄重、凝练、有仪式感，但专业感来自结构、证据和一致口径，不来自绝对化措辞。优先使用“更易表现为”“在某条件下被引动”“倾向”而不是“必定”。

### 高风险主题

- 健康：只谈传统象意和应关注的系统，不诊断疾病，不预测死亡；建议以体检和医生意见为准。
- 财务/职业：不替代投资或职业决策，不给高杠杆、孤注一掷建议。
- 婚姻/生育：不以命盘断言不孕、出轨、离婚或性取向；只描述关系模式与压力窗口。
- 灾祸/官非：避免恐吓，使用风险管理语言和现实可控建议。

本技能用于传统文化研究与娱乐参考。Benchmark 模式仍可选择最符合传统命理规则的选项，但不得把该选择包装成科学事实。

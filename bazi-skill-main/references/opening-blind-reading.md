# 开场盲测选择与结算协议

本文件规定统一入口的 `first_read` 阶段。它把“不读取经历的第一层判断”变成可锁定、可结算、可失败的开场盲测。模型负责从命盘生成候选；`scripts/blind_opening.py` 只负责资格过滤、跨领域选择、清单锁定和反馈路由，不负责创造命理结论。

## 目录

1. [进入条件](#一进入条件)
2. [候选池](#二候选池)
3. [资格门禁](#三资格门禁)
4. [运行选择器](#四运行选择器)
5. [用户看到的首屏](#五用户看到的首屏)
6. [反馈与结算](#六反馈与结算)
7. [转场规则](#七转场规则)
8. [状态与隐私](#八状态与隐私)
9. [验收标准](#九验收标准)

## 一、进入条件

完成以下事项后进入，并由 `consultation_harness.py` 确认当前会话处于 `first_read`：

1. 出生信息和计算口径已确认；
2. `calculate_bazi.py` 已运行，或题给四柱已明确采用；
3. 已形成 `chart_lock`；
4. 生成候选时不读取用户传记、上一轮反馈或已知人生结果。

用户明确说“跳过盲测”“直接回答问题”“一次讲完”时可以跳过。出生时间未知或处于边界时仍可做，但只能选择对候选时辰稳定的共同结论，并在首屏说明精度降低。

## 二、候选池

先从命盘独立生成 6–10 个候选，再交给脚本选择。候选领域：

| `domain` | 允许内容 | 不允许内容 |
|---|---|---|
| `family_structure` | 家庭角色、照顾与权责结构 | 父母生死、疾病、道德评价 |
| `learning_path` | 学习方式、过程起伏、制度适配 | 凭盘断具体学校或学历证书 |
| `mobility` | 离乡、迁移、居住重组 | 无时间边界的“环境有变化” |
| `work_role` | 承责、协作、岗位扩张/收缩 | 具体公司、收入和职位名称 |
| `relationship_pattern` | 建立、边界、承载与互动模式 | 出轨、性取向、生育能力 |
| `resource_pattern` | 资源获得、保存、责任成本 | 财富数额、投资承诺、破产断言 |
| `behavior_pattern` | 有触发条件和反向条件的行为模式 | “敏感、善良、外冷内热”等巴纳姆标签 |
| `timing_event` | 1–2 年内一个领域的一种事件形态 | 多领域并列、超过三年的高频人生变化 |

不要为了凑齐领域而使用弱信号。若全盘只有两条达到门槛，就诚实输出两条，并把状态标记为 `insufficient_candidates`。

## 三、资格门禁

每个候选必须：

- 只来自 `chart_only` 材料；
- 是一条原子陈述，不能把三件事绑在一起；
- 至少有一条命盘证据和一条真正的反向条件；
- 用户可以回答准、部分准、不准或不确定；
- 信号强度至少为 `medium`，具体度至少为 `medium`；
- 基础率风险不能为 `high`；
- 不包含健康诊断、死亡、犯罪、灾祸、不孕、出轨、收入数额等敏感判断；
- 时间候选的起止年份跨度不得超过两年。

“大多数人都可能点头”的陈述即使温暖，也不能进入盲测。先问：随机同龄人是否很容易命中？如果是，标 `base_rate_risk: high`，让脚本拒绝。

候选输入示意：

```json
{
  "schema_version": 1,
  "source_scope": "chart_only",
  "chart_lock_id": "session-001-chart-v1",
  "candidates": [
    {
      "id": "probe-work-01",
      "domain": "work_role",
      "claim": "在职责明确的环境里，你往往先接住任务，压力通常晚于责任感出现。",
      "evidence": ["月令与官杀/印比功能链的具体盘面依据"],
      "counterevidence": ["若现实中长期先拒绝责任且边界清楚时也不承接，则本解释降级"],
      "evidence_strength": "strong",
      "specificity": "high",
      "base_rate_risk": "low",
      "falsifiable": true,
      "biography_independent": true,
      "atomic": true,
      "sensitive": false,
      "time_window": null
    }
  ]
}
```

示例只展示字段，不是可套用到用户身上的固定断语。

## 四、运行选择器

所有输入、输出写入当前用户的工作目录，不写入 Skill：

```powershell
python scripts/blind_opening.py select `
  --input consultation_state/blind_candidates.json `
  --output consultation_state/blind_probe_manifest.json `
  --count 3
```

选择器先拒绝不合格候选，再按证据、具体度、基础率风险和反向条件排序；第一轮优先跨三个不同领域选择。`selection_score` 只用于候选排序，不是命理准确率。

输出的 `manifest_sha256` 锁定三条陈述。向用户展示后不得改字、换时间、拆并子项或用用户反馈替换清单；必须改动时建立新的 `chart_lock_id` 并说明重算原因。

选择完成后，把 `blind_candidates` 和 `blind_manifest` 登记到会话血缘；登记来源只能包含 `operational_input`、`chart_fact`、`traditional_rule` 和既有 `locked_claim`。Harness 若检测到 `biography`、反馈、旧报告或 Benchmark 来源，必须拒绝进入正式盲测。

## 五、用户看到的首屏

`first_read` 是“一轮一个问题”的唯一默认例外：一次展示 3 条，形成清楚的开场体验，也方便用户用同一尺度比较。不要先展示候选池、分数或技术审计表。

首屏结构：

```text
盘已经排好。我先不问你的经历，只从命盘里挑三条最有区分度的地方。
你不用配合我，也不用勉强对号入座；说“不准”同样有用。

1.〔原子判断；先说现实感受，再用一句条件收住〕
   依据：〔一行白话证据〕

2.〔不同领域的原子判断〕
   依据：〔一行白话证据〕

3.〔不同领域的原子判断〕
   依据：〔一行白话证据〕

请按 1/2/3 分别回复：准 / 部分准 / 不准 / 不确定。
愿意补一句具体情况也可以，但不用为了证明我而多讲。
```

盲测正文读取 `client-voice.md`。温暖表达只能翻译已经锁定的结论，不能新增事实、夸大确定性或暗示用户应该认同。

## 六、反馈与结算

把用户标签写入反馈文件。自由叙述默认不交给脚本保存，只由模型提取当前陈述对应的标签和必要三轴差异：

```json
{
  "schema_version": 1,
  "chart_lock_id": "session-001-chart-v1",
  "manifest_sha256": "从清单原样复制",
  "responses": [
    {"probe_id": "probe-work-01", "label": "partial"}
  ]
}
```

标签映射：

| 用户反馈 | 脚本标签 | 结算 |
|---|---|---|
| 准 | `hit` | 支持当前候选，但不外推其他结论 |
| 部分准 | `partial` | 只支持命中的领域/形态/时间轴 |
| 不准 | `miss` | 保留失误并下调，不解释成隐藏命中 |
| 不确定 | `unknown` | 不计支持，也不当作否定 |
| 太宽泛 | `broad` | 零支持权重，回查候选门禁 |
| 之前已经告诉过你 | `known_fact` | 不得算盲测命中，触发完整性标记 |

运行：

```powershell
python scripts/blind_opening.py settle `
  --manifest consultation_state/blind_probe_manifest.json `
  --feedback consultation_state/blind_feedback_input.json `
  --output consultation_state/blind_feedback_result.json
```

脚本保留标签，不保存用户自由叙述；`support_points` 只控制转场，禁止在用户面前包装成准确率或科学分数。

结算完成后把结果登记为 `feedback_result`，再由 Harness 从 `calibration` 迁移；不得只在聊天里口头说“已经结算”。

## 七、转场规则

| `route` | 后续动作 |
|---|---|
| `collect_remaining_feedback` | 温和提醒尚未结算的条目，也允许用户跳过 |
| `proceed_to_deep_dive` | 说明盲测支持到什么范围，请用户选择主题 |
| `proceed_with_caution` | 保留分歧，用较低粒度进入一个主题 |
| `recheck_inputs_and_lower_resolution` | 两条以上不准时先核对出生时间、历法、地点和边界；无输入问题则降低结构/时间精度 |
| `continue_without_calibration` | 用户均不确定或跳过时，不声称已经验证，按未校准状态继续 |

转场时读取 `client-voice.md`。反馈结算先说人的感受，再说技术变化，但不能把“安慰用户”变成“不承认失误”。

## 八、状态与隐私

本阶段建议形成：

```text
consultation_state/
  chart_facts.json
  chart_lock.md
  blind_candidates.json
  blind_probe_manifest.json
  blind_feedback_input.json
  blind_feedback_result.json
  feedback_log.md
```

`blind_candidates.json` 和清单只包含盘面候选；用户经历只在 `feedback_log.md` 中以最小必要摘要记录。不得把真实个人材料写入仓库、Skill、合成示例或 Benchmark。

## 九、验收标准

- 三条盲测来自不同领域，或明确说明强信号不足；
- 每条都有反向条件，且用户回答“不准”时真的会降级；
- 没有复合陈述、宽时间窗、多重“或”、高风险主题；
- 清单展示前已经哈希锁定；
- 用户反馈只按原句结算，没有事后改题；
- 两条以上不准会触发输入复核或降低精度；
- 语言让用户感到被认真对待，但不施压、不诱导、不制造依赖。

# 会话 Harness：状态、操作语义与信息防火墙

本文件规定所有真实咨询怎样初始化、恢复、纠正和失效。目标是让用户感受到一条连续、被认真承接的咨询线；底层则确保旧盘、旧判断和新反馈不会被静默混用。Harness 只管理状态与来源，不生成命理结论。

## 目录

1. [基本原则](#一基本原则)
2. [初始化与恢复](#二初始化与恢复)
3. [三种操作语义](#三三种操作语义)
4. [阶段迁移](#四阶段迁移)
5. [产物注册与血缘](#五产物注册与血缘)
6. [用户信息防火墙](#六用户信息防火墙)
7. [用户可见的承接](#七用户可见的承接)
8. [审计与失败处理](#八审计与失败处理)

## 一、基本原则

- 会话状态只写入用户当前工作目录，不写入 Skill、仓库示例或 Benchmark。
- 每次继续咨询前先读取 `session_state.json`；不能凭聊天记忆猜当前阶段。
- 只有 `active` 产物可进入下一阶段。`stale` 和 `superseded` 产物只能用于审计，不得恢复成结论。
- 用户纠正资料时先执行失效操作，再重算；不能先生成新结论，最后才补状态。
- Harness 的来源防火墙只验证声明来源和正式产物血缘，不宣称能隔离模型预训练、完整聊天上下文或共享文件系统。

## 二、初始化与恢复

首次开始咨询：

```powershell
python scripts/doctor.py --session-dir consultation_state
python scripts/consultation_harness.py init `
  --session-dir consultation_state `
  --mode guided
```

模式：

- `guided`：默认七阶段咨询，包含开场盲测和反馈结算。
- `focused`：用户只问一个明确问题，跳过强制盲测，但仍保留盘面锁、血缘和输出路由。
- `one_shot`：用户明确要求一次讲完；未完成的校准项保持未核验。

已有状态时不得重新 `init`。先运行：

```powershell
python scripts/consultation_harness.py status --session-dir consultation_state
python scripts/consultation_harness.py audit --session-dir consultation_state
python scripts/consultation_harness.py resume --session-dir consultation_state
```

`audit` 失败时停止消费产物。先修复缺失、被篡改或依赖失效的问题，再继续。
`resume` 会先审计，再返回当前阶段、活动产物种类和合法下一步；它不会把失效文件重新激活。

## 三、三种操作语义

### Supplement：补充

在不改变旧结论身份和来源的前提下增加材料。注册新的可并存产物就是补充，例如新增一个主题深挖章节。补充不能替换唯一产物：`chart_facts`、`chart_lock`、`blind_manifest` 等已有活动版本时，必须先执行 supersede。

### Supersede：替代

新输入或新方法使旧版本不再权威。必须使被替代产物标记为 `superseded`，并把依赖它的后续产物标记为 `stale`：

```powershell
python scripts/consultation_harness.py supersede `
  --session-dir consultation_state `
  --scope chart `
  --reason "用户将出生时间从 09:00 修正为 08:20"
```

范围：

| scope | 保留什么 | 自动回退 |
|---|---|---|
| `chart` | 只保留与旧盘无关的最小上下文 | `intake` |
| `interpretation` | 保留排盘事实，废弃盘面锁及其下游 | `chart_ready` |
| `calibration` | 保留原盲测，重做反馈结算和后续分析 | `calibration` |
| `output` | 保留推理产物，只废弃旧报告章节和输出计划 | 当前阶段 |

也可以用一个或多个 `--artifact-id` 精确替代。不得删除旧记录；它们需要留给审计。

### Reset：重启

用户明确要求从某个检查点重新开始时使用：

```powershell
python scripts/consultation_harness.py reset `
  --session-dir consultation_state `
  --to first_read `
  --reason "用户要求换一种开场盲测重新开始"
```

重启会使该阶段及之后生成的活动产物失效。已看过的信息不能再声称“从未见过”；需要重新盲测时，要如实说明这是复测而非第一次盲测。

## 四、阶段迁移

使用 Harness 推进，而不是只在正文中声称“进入下一步”：

```powershell
python scripts/consultation_harness.py transition `
  --session-dir consultation_state `
  --to chart_ready
```

正常迁移会检查必需产物。用户明确要求跳过时可使用 `--operator-override --reason ...`，状态历史会记录跳过的门禁；不能静默跳阶段。

`guided` 正常路径：

```text
intake → chart_ready → first_read → calibration → deep_dive → forecast → report_ready
```

`focused` 和 `one_shot` 正常从 `chart_ready` 进入 `deep_dive`。HTML 不属于阶段迁移；它是最后的呈现层。

## 五、产物注册与血缘

先把文件写入会话目录，再登记种类、来源类别和上游产物：

```powershell
python scripts/consultation_harness.py register `
  --session-dir consultation_state `
  --kind chart_facts `
  --path consultation_state/chart_facts.json `
  --source-category operational_input
```

后续产物使用 `--source-artifact <id>` 连接血缘。Harness 会继承上游来源类别、计算文件哈希，并拒绝：

- 会话目录之外的产物；
- 依赖 `stale` 或 `superseded` 上游的产物；
- 已被静默修改的活动产物；
- 唯一产物存在时直接覆盖；
- 与该产物种类不相容的来源类别。

私密自由叙述不要机械写入 JSON。正式状态只保存最小标签、必要摘要和“是否含传记”的标记。

## 六、用户信息防火墙

来源类别：

| 类别 | 内容 |
|---|---|
| `operational_input` | 出生日期时间地点、历法、性别口径、用户问题 |
| `chart_fact` | 计算器确认的四柱、十神、藏干、岁运和关系 |
| `traditional_rule` | 当前加载的子平规则 |
| `locked_claim` | 展示前已锁定的盘面判断或盲测陈述 |
| `feedback_label` | 命中、部分、不命中、不确定等固定标签 |
| `biography` | 用户经历、性格自述和现实结果 |
| `user_preference` | 用户关注主题、表达偏好和咨询节奏 |
| `prior_output` | 已生成的咨询或报告内容 |
| `benchmark_material` | 评测题、答案、历史预测；禁止进入真实咨询产物 |

首次盲测前运行声明检查：

```powershell
python scripts/consultation_harness.py firewall-check `
  --purpose blind_generation `
  --source-category chart_fact `
  --source-category traditional_rule
```

`blind_candidates`、`blind_manifest` 不能含 `biography`、`feedback_label`、`prior_output` 或 Benchmark。进入咨询映射后可以读取最小传记摘要，但必须把它标为咨询上下文，不能改写成独立盘面证据。

## 七、用户可见的承接

状态管理不能露成冷冰冰的工程日志。每轮用户只需要感受到三件事：

1. **我记得我们走到哪里**：不重复问已经确认的信息。
2. **你的回答真的改变了什么**：明确“保留、下调、修正”，并沿新的分叉继续。
3. **你仍然有主动权**：继续核验、换主题、看未来、直接总结或纠正资料。

当底层发生 supersede 或 reset，先用自然语言承接：

> 你刚修正的时间会改变时柱，所以我不沿用刚才那组判断。前面的记录会保留，但从这一刻起只以新盘为准。我先重新确认盘面，再告诉你哪些结论仍然稳定。

这类承接是真实状态变化的翻译，不是为了制造亲密感。客户正文继续遵守 `client-voice.md`。

## 八、审计与失败处理

以下节点运行 `audit`：恢复旧会话、重算后、进入 `report_ready` 前、生成任何最终输出计划前。

失败时：

1. 不消费可疑产物；
2. 说明是状态、文件或来源问题，不把工程错误包装成命理不确定性；
3. 从最后一个有效阶段恢复；
4. 保留用户已经付出的反馈，不要求无意义地重复叙述；
5. 如果必须重问，只问恢复当前阶段所需的最小信息。

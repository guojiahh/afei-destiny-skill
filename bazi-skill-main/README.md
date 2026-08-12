# Bazi Skill 使用说明

这是仓库中**可直接安装**的技能目录。它包含技能入口、确定性排盘器、自动测试和按任务拆分的参考资料，不包含 benchmark 原题、答案或历史预测。

如果你想了解整个项目、评测结果和设计思路，请先看[仓库首页](../README.md)。

## 安装

将当前目录复制到 Codex 的 skills 目录，并将目标文件夹命名为 `bazi`。例如已配置 `CODEX_HOME` 时，可在仓库根目录执行：

```powershell
Copy-Item -Recurse .\bazi-skill-main "$env:CODEX_HOME\skills\bazi"
```

重新打开 Codex 或开始一个新任务后，用 `$bazi` 显式调用技能。

安装成功后，目标目录的第一层应直接包含 `SKILL.md`，而不是再次嵌套一层 `bazi-skill-main/`。

## 怎么提问

### 统一入口：不知道问什么也可以开始

直接说：

```text
请用 $bazi 开始预测，一步一步带着我分析。
```

技能会先确认最低出生信息并排盘，然后从不读取个人经历的候选中筛出默认四条跨方向盲测。你可以直接回复“1准；2部分准，准在……；3不准；4不确定”；清单展示前会被锁定，回答后不能改题圆场。系统只结算一次，再从你愿意展开的话头进入一个现实主问题。深入过程中每轮显示进度，以倾听和承接为主；信息足够后询问是否生成完整 Markdown 报告。

这个流程追求的是“你的回答确实改变了后续分析”，不是通过宽泛问题制造被说中的感觉。

### 直接问一个主题

一个可靠的请求通常包含：

- 公历或农历出生日期；农历需注明是否闰月。
- 出生时间或时辰；不知道时可以明确写“时辰未知”。
- 传统大运顺逆计算采用的性别口径。
- 一个具体问题，例如事业、关系、学业或某个年份。

示例：

```text
请用 $bazi 分析：公历 1990-05-15 14:30，女性，出生地上海。
我只问 2026–2027 年是否适合换工作。请区分排盘事实、命理判断和现实建议，
给出最强支持证据与一个最强反证，不要做确定性承诺。
```

如果时间接近 23:00、节气或时辰边界，技能会优先说明口径差异；出生地只在真太阳时校正有意义时需要。

## 直接使用计算器

```powershell
python scripts/calculate_bazi.py `
  --date 1990-05-15 `
  --time 14:30 `
  --gender female `
  --target-year 2026 `
  --compact
```

常用参数：

| 参数 | 用途 |
|---|---|
| `--calendar solar\|lunar` | 指定公历或农历输入 |
| `--leap` | 农历输入为闰月 |
| `--day-boundary zi-next\|civil-midnight` | 选择晚子换日或民用午夜换日 |
| `--longitude` | 提供出生地经度以计算真太阳时 |
| `--target-year` | 加入指定年份和当步大运上下文 |
| `--compact` | 输出单行 JSON，便于程序处理 |

完整口径见 [`references/calculation-conventions.md`](references/calculation-conventions.md)。

## 目录职责

| 路径 | 职责 |
|---|---|
| `SKILL.md` | 识别任务模式、路由资料、约束输出边界 |
| `scripts/calculate_bazi.py` | 计算历法、四柱、大运、流年和关系事实 |
| `scripts/test_calculate_bazi.py` | 计算器回归测试 |
| `scripts/blind_opening.py` | 开场盲测资格过滤、跨领域选择、哈希锁定与反馈结算 |
| `scripts/test_blind_opening.py` | 盲测引擎回归测试 |
| `scripts/consultation_harness.py` | 会话状态、阶段门禁、产物血缘、替代/重启和来源防火墙 |
| `scripts/consultation_output_router.py` | 对话、技术审计、总结与报告来源的活动产物路由 |
| `scripts/doctor.py` | Python、文件、内置依赖、固定命例和会话目录环境自检 |
| `scripts/test_consultation_harness.py` | 完整会话 Harness 与输出路由回归测试 |
| `scripts/vendor/` | 内置 `lunar_python 1.4.8`，支持离线运行 |
| `references/calculation-conventions.md` | 计算参数和边界口径 |
| `references/reasoning-protocol.md` | 事实、结构、触发和反证流程 |
| `references/structure-analysis.md` | 旺衰、格局、从格、调候和多种用神语义 |
| `references/relations-and-transformations.md` | 合冲刑害、三合三会、合化与墓库的分层判断 |
| `references/domain-rules.md` | 事业、财运、关系等领域映射 |
| `references/temporal-reasoning.md` | 大运、流年与事件窗口 |
| `references/consultation-output.md` | 完整咨询与聚焦咨询的表达方式 |
| `references/guided-consultation.md` | “开始预测”统一入口、七阶段状态与每轮参与闭环 |
| `references/opening-blind-reading.md` | 默认四条开场盲测的候选门禁、运行方式与一次结算转场 |
| `references/client-voice.md` | 温暖、具体、不迎合的客户语言与反馈回应 |
| `references/evidence-feedback.md` | 用户反馈标注、首次锁定与防事后改写协议 |
| `references/consultation-harness.md` | 会话恢复、三种操作语义、状态血缘与信息防火墙 |
| `references/output-routing.md` | 对话、审计、总结、报告来源与未来 HTML 的输出边界 |
| `references/markdown-report.md` | 最终长篇 Markdown 报告的来源、结构、未来展望与交付检查 |
| `references/classical-texts.md` | 古籍来源、流派冲突与新规则入库门槛 |
| `references/worked-examples.md` | 不含评测数据的合成示例 |

技能会按问题读取所需资料，不应一次加载全部参考文件。

## 开发验证

在当前目录执行：

```powershell
python -m unittest -v scripts/test_calculate_bazi.py
python -m unittest -v scripts/test_blind_opening.py
python -m unittest -v scripts/test_consultation_harness.py
python scripts/doctor.py
python scripts/calculate_bazi.py --help
python scripts/blind_opening.py --help
python scripts/consultation_harness.py --help
python scripts/consultation_output_router.py --help
```

修改计算逻辑时应先补测试；修改推理规则时应给出适用条件、反例和冲突口径。Benchmark 相关内容必须继续留在仓库根目录的 `evaluation/` 中。

本轮知识与推理缺口的证据、补全范围和仍待验证事项见 [`../docs/KNOWLEDGE_AUDIT.md`](../docs/KNOWLEDGE_AUDIT.md)。

## 使用边界

- 不凭记忆心算日柱、大运或节气交界。
- 不把五行数量直接等同于旺衰或喜忌。
- 不编造古籍引文、用户经历或确定性灾祸。
- 健康、财务、法律和人生决策以现实证据与专业意见为准。

本技能用于传统文化研究与娱乐参考。

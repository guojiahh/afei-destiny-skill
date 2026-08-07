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
| `scripts/vendor/` | 内置 `lunar_python 1.4.8`，支持离线运行 |
| `references/calculation-conventions.md` | 计算参数和边界口径 |
| `references/reasoning-protocol.md` | 事实、结构、触发和反证流程 |
| `references/domain-rules.md` | 事业、财运、关系等领域映射 |
| `references/temporal-reasoning.md` | 大运、流年与事件窗口 |
| `references/consultation-output.md` | 完整咨询与聚焦咨询的表达方式 |
| `references/worked-examples.md` | 不含评测数据的合成示例 |

技能会按问题读取所需资料，不应一次加载全部参考文件。

## 开发验证

在当前目录执行：

```powershell
python -m unittest -v scripts/test_calculate_bazi.py
python scripts/calculate_bazi.py --help
```

修改计算逻辑时应先补测试；修改推理规则时应给出适用条件、反例和冲突口径。Benchmark 相关内容必须继续留在仓库根目录的 `evaluation/` 中。

## 使用边界

- 不凭记忆心算日柱、大运或节气交界。
- 不把五行数量直接等同于旺衰或喜忌。
- 不编造古籍引文、用户经历或确定性灾祸。
- 健康、财务、法律和人生决策以现实证据与专业意见为准。

本技能用于传统文化研究与娱乐参考。

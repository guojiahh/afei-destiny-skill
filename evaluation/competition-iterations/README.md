# 2010–2025 比赛轮次索引

这里保存当前错题迭代主线的正式原件。轮次目录一旦锁定或揭晓，不覆盖、不回写；需要重跑就创建新版本。

## 先看结论

- [完整迭代报告](iteration_report.md)
- [全局机器可读汇总](summary.json)
- [固定协议](../competition_protocol.json)
- [详细方法报告](../../docs/EVALUATION_AND_ITERATION_METHOD.md)

## 目录分组

### 早期/旧协议记录

| 目录 | 状态 | 用途 |
|---|---|---|
| `2010-v0/` | 污染训练记录 | 解析调试时见过部分答案，不进入正式总分 |
| `2011-v0/` | 旧协议 | 保留历史，不作为新版隔离证据 |
| `2012-v1/` | 旧协议 | 保留历史，不与新版轮次混算 |

### 新鲜开发基线

`2013-v1-baseline/` 至 `2017-v1-baseline/`：冻结 Skill 下完成盲答、锁定、揭晓和错因分析，用于发现复发内核。

### 配对回归

- 旧版：`2018-v1-baseline/` 至 `2021-v1-baseline/`
- 候选版：`2018-v2-candidate/` 至 `2021-v2-candidate/`
- 单年比较：`2018-v1-v2-comparison.json` 等
- 总比较：`2018-2021-v1-v2-comparison.json`
- 变化题审计：`*-paired-review.json`

两套预测均在答案揭晓前锁定。结果为旧版 `55/160`、候选版 `61/160`，净增 `+3.75pp`，但命例级 bootstrap 区间跨 0。

### 一次性保留集

- 旧版：`2022-v1-baseline/` 至 `2025-v1-baseline/`
- 最终版：`2022-v3-final/` 至 `2025-v3-final/`
- 单年比较：`2022-v1-v3-comparison.json` 等
- 总比较：`2022-2025-v1-v3-comparison.json`

结果为旧版 `70/160`、最终版 `71/160`，净增 `+0.63pp`；区间跨 0，不能宣称准确率提高。该保留集已于 2026-08-10 揭晓并耗尽。

## 一个轮次里的八个文件

| 文件 | 阶段 | 内容 |
|---|---|---|
| `manifest.json` | prepare → reveal | 版本、哈希、状态、污染和运行参数 |
| `questions.json` | prepare | 无答案题包 |
| `predictions.template.json` | prepare | 全题号模板 |
| `predictions.json` | solve | 盲答器的结构化输出 |
| `lock.json` | lock | 锁定时间和预测哈希 |
| `locked_predictions.json` | lock | 不可覆盖的预测副本 |
| `score.json` | reveal | 官方答案、逐题结果和汇总指标 |
| `error_review.json` | diagnose | 错题主因、次因和分析证据 |

## 命名规则

```text
<year>-v1-baseline   冻结旧版
<year>-v2-candidate  第一轮候选
<year>-v3-final      保留集前冻结的最终候选
```

版本号代表 Skill/策略版本，不代表同一份预测的补写。任何 Skill 哈希、模型、提示词或数据用途变化都应新建轮次。

## 不可变规则

1. 不修改已锁定目录中的题包、预测或 manifest。
2. 不把 `score.json`、`error_review.json` 或比较结果提供给盲答器。
3. 不把不同 Skill 哈希、模型或数据用途的轮次合并成一个准确率。
4. 已揭晓题目的后续成绩只能称训练/回归成绩。
5. 报告数字必须可追溯到本目录中的机器可读结果。

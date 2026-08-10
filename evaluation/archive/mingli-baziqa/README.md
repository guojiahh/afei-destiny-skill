# MingLi-Bench / BaziQA 评测归档

这个目录保存 2010–2025 比赛错题主线之前的评测实验。文件只做路径归档，内容未改写，便于追溯早期结论。

## 内容分组

| 文件模式 | 内容 |
|---|---|
| `iteration_1_*` 至 `iteration_4_*` | 早期单轮预测和分析 |
| `iteration_5_*` | 有 Skill / 无 Skill 的多次运行与多数票 |
| `iteration_6_*` | 160 题扩展、稳定性与无 Skill 对照 |
| `iteration_7_*`、`iteration_8_*` | 冻结策略后的重复运行与审查 |
| `full160_*` | MingLi-Bench 160 题兼容补跑 |
| `final_holdout_*` | BaziQA 最终保留集直答与审查层 |
| `benchmark_manifest.json` | 早期数据划分和冻结信息 |
| `final_report.md` | 上一代完整结论、限制和数字来源 |

## 使用边界

- MingLi-Bench 160 题和使用过的 BaziQA 子集都已经揭晓，不能再次作为未见集。
- BaziQA 某些子集答案分布偏斜、题面带强文本线索，高分不能归因于命理推理。
- 这些文件不会被复制到可安装 Skill，也不作为当前 2010–2025 优化的直接规则来源。
- 如果引用旧成绩，应同时链接 [上代最终报告](final_report.md) 并保留其中的限制说明。

当前评测主线见 [2010–2025 比赛轮次索引](../../competition-iterations/README.md)。

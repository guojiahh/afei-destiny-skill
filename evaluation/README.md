# 评测实验室

本目录故意位于可安装的 `bazi` 技能之外。Benchmark 问题、答案、预测和误差分析不得复制进 `SKILL.md`、`references/` 或 `scripts/`。

## 目录导航

| 路径 | 作用 | 当前地位 |
|---|---|---|
| `competition_protocol.json` | 2010–2025 比赛固定协议、分区、改动门槛和指标 | 当前主协议 |
| `solver_prompt.md` | 盲答器可读输入和结构化输出契约 | 当前主协议 |
| `competition_iteration.py` | `prepare → audit → lock → reveal → compare` 状态机 | 当前主工具 |
| `import_competition_questions.py` | 导入并标准化公开比赛题 | 当前主工具 |
| `competition-iterations/` | 每年新旧版本、分数、错因和配对比较 | 当前主线证据 |
| `benchmark_tools.py` | 通用题包、评分、聚合和泄漏检查 | 共用工具 |
| `test_competition_pipeline.py` | 状态机、防篡改和污染隔离测试 | 必跑测试 |
| `archive/mingli-baziqa/` | 上一代 MingLi/BaziQA 实验 | 冻结归档 |

先读 [详细评测与迭代方法](../docs/EVALUATION_AND_ITERATION_METHOD.md)，再看 [2010–2025 比赛轮次索引](competition-iterations/README.md)。

## 数据用途

- MingLi 41–80：早期分段开发。
- MingLi 81–160：多轮策略比较；已用于开发，不再视为未见集。
- MingLi 1–80：冻结 v8 后的全量兼容补跑；与 81–160 合并为 160 题开发兼容分。
- BaziQA `contest8_2021` P025–P028：早期小样本保留集，已经揭晓，不能复用为盲测。
- BaziQA `celebrity50_zh` P041–P044：偏差诊断集，已经揭晓。
- BaziQA `celebrity50_zh` P045–P050：最终预登记保留集；预测锁定后已揭晓。

上一代正式结果、版本哈希和适用边界见 `archive/mingli-baziqa/final_report.md`。这些数据已经揭晓，不再是当前保留集。

## 生成无答案问题包

```powershell
python evaluation/benchmark_tools.py packet --benchmark mingli --input .benchmark-cache/MingLi-Bench/data/data.json --range 1:80
```

```powershell
python evaluation/benchmark_tools.py packet --benchmark baziqa --input .benchmark-cache/BaziQA/data/celebrity50_zh.json --persons P045 P046 P047 P048 P049 P050
```

两个命令都按构造省略答案字段。新实验必须先写 manifest，锁定数据范围、模型、运行次数、聚合规则、主指标和技能 Git 哈希，再生成预测。

## 预测格式

```json
{
  "protocol": "answers-redacted-before-prediction",
  "predictions": {
    "ftb_0001": "A",
    "ftb_0002": "C"
  }
}
```

## 评分与聚合

```powershell
python evaluation/benchmark_tools.py aggregate --inputs evaluation/run_a.json evaluation/run_b.json evaluation/run_c.json --output evaluation/majority.json
python evaluation/benchmark_tools.py score --benchmark mingli --input .benchmark-cache/MingLi-Bench/data/data.json --range 1:80 --predictions evaluation/majority.json
```

BaziQA 保留集评分必须显式承认揭晓：

```powershell
python evaluation/benchmark_tools.py score --benchmark baziqa --input .benchmark-cache/BaziQA/data/celebrity50_zh.json --persons P045 P046 P047 P048 P049 P050 --predictions evaluation/archive/mingli-baziqa/final_holdout_review_majority.json --unlock-heldout
```

## 泄漏检查

```powershell
python evaluation/benchmark_tools.py leak-check --skill bazi-skill-main --sources .benchmark-cache/MingLi-Bench/data/data.json .benchmark-cache/BaziQA/data/contest8_2021.json .benchmark-cache/BaziQA/data/celebrity50_zh.json
```

Multiple-choice exact match 只是与固定答案键的一致性指标，不是现实预测有效性的证据。原始分、相对无技能的增益、计算正确性和开放式回答质量必须分开报告。

## 历届全球命理师大赛错题循环

公开题目的含答案标准化缓存必须写入 `.benchmark-cache/global-fortune-competition/`：

```powershell
python evaluation/import_competition_questions.py --years 2010:2025
```

固定协议见 `competition_protocol.json`。2010–2025 实际是 16 届、107 个案例、515 题，按完整年份和完整案例切分：

- 2010–2017：开发集，允许揭晓、归因和重复训练；
- 2018–2021：配对回归集，旧版和候选版必须都在揭晓前锁定；
- 2022–2025：一次性保留集，最终候选冻结后只揭晓一次。

反复刷已经揭晓的 515 题可以作为训练和防回退，但不能再次称为盲测，也不能单独证明泛化提升。

截至 2026-08-10，三个分区均已按协议揭晓；2022–2025 的一次性保留集已经耗尽。后续可用全部 515 题继续做训练和回归，但新的准确率提升声明必须使用未见的新比赛题或另一个外部保留集。当前完整结果见 `competition-iterations/iteration_report.md`。

每轮依次执行 `prepare → audit → 新鲜子代理作答 → lock → reveal`。`prepare` 使用字段白名单删除答案、来源 URL 和回查标识，固定题包、提示词、协议与技能内容哈希；`audit` 拒绝禁用字段及技能/题包篡改；`lock` 验证全部题号并拒绝覆盖；只有评分阶段可以读取含答案缓存。

```powershell
python evaluation/competition_iteration.py prepare --input .benchmark-cache/global-fortune-competition/contest_2013.json --round-dir evaluation/competition-iterations/2013-v1 --skill bazi-skill-main --model gpt-5.6-sol --reasoning-effort high --split development --prompt-file evaluation/solver_prompt.md --protocol-file evaluation/competition_protocol.json
python evaluation/competition_iteration.py audit --round-dir evaluation/competition-iterations/2013-v1 --skill bazi-skill-main
python evaluation/competition_iteration.py lock --round-dir evaluation/competition-iterations/2013-v1 --predictions evaluation/competition-iterations/2013-v1/predictions.json --skill bazi-skill-main
python evaluation/competition_iteration.py reveal --input .benchmark-cache/global-fortune-competition/contest_2013.json --round-dir evaluation/competition-iterations/2013-v1
```

盲答子代理必须使用 `fork_turns=none`，只读取冻结 Skill、单个无答案题包和 `solver_prompt.md`。当前 Codex 子代理仍共享工作区文件系统，因此这是可审计的输入白名单，而非操作系统级硬隔离；公开网页是否存在于模型预训练中也无法排除。不得把这个限制写成“绝对无污染”。

网页解析或调试过程中看见答案、选项高亮或排除信息时，必须写入 manifest 的 `contamination`。污染轮默认从正式汇总中排除，只能作为训练记录。不同 Skill 哈希、模型或数据用途不得混成一个总分。

错因按固定顺序只选一个主因：`data_issue → option_parse → calculation → knowledge_gap → reasoning_error → execution_error → unresolved`。只有可复现的确定性计算错误，或至少跨 3 题、跨 2 个独立案例重复出现的同一内核原因，才进入修改候选。规则修改不得复制原题、答案、人物经历或按字母分布优化。

同题旧版/候选版揭晓后，用命例级 bootstrap 做配对比较：

```powershell
python evaluation/competition_iteration.py compare --base evaluation/competition-iterations/2022-v1 --candidate evaluation/competition-iterations/2022-v2 --output evaluation/competition-iterations/2022-v1-v2-comparison.json
```

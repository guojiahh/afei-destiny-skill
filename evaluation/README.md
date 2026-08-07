# Evaluation protocol

本目录故意位于可安装的 `bazi` 技能之外。Benchmark 问题、答案、预测和误差分析不得复制进 `SKILL.md`、`references/` 或 `scripts/`。

## 数据用途

- MingLi 41–80：早期分段开发。
- MingLi 81–160：多轮策略比较；已用于开发，不再视为未见集。
- MingLi 1–80：冻结 v8 后的全量兼容补跑；与 81–160 合并为 160 题开发兼容分。
- BaziQA `contest8_2021` P025–P028：早期小样本保留集，已经揭晓，不能复用为盲测。
- BaziQA `celebrity50_zh` P041–P044：偏差诊断集，已经揭晓。
- BaziQA `celebrity50_zh` P045–P050：最终预登记保留集；预测锁定后已揭晓。

所有正式结果、版本哈希和适用边界见 `final_report.md`。

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
python evaluation/benchmark_tools.py score --benchmark baziqa --input .benchmark-cache/BaziQA/data/celebrity50_zh.json --persons P045 P046 P047 P048 P049 P050 --predictions evaluation/final_holdout_review_majority.json --unlock-heldout
```

## 泄漏检查

```powershell
python evaluation/benchmark_tools.py leak-check --skill bazi-skill-main --sources .benchmark-cache/MingLi-Bench/data/data.json .benchmark-cache/BaziQA/data/contest8_2021.json .benchmark-cache/BaziQA/data/celebrity50_zh.json
```

Multiple-choice exact match 只是与固定答案键的一致性指标，不是现实预测有效性的证据。原始分、相对无技能的增益、计算正确性和开放式回答质量必须分开报告。

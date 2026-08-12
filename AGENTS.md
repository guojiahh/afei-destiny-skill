# Bazi Skill Repository Guide

## 项目定位

这是一个八字 Codex Skill 的完整研发仓库。真正可安装的技能包是
`bazi-skill-main/`；根目录不是安装包本身。

## 验证命令

从仓库根目录运行：

```powershell
python -m unittest discover -s .\bazi-skill-main\scripts -p "test_*.py"
python -m unittest discover -s .\evaluation -p "test_*.py"
python .\bazi-skill-main\scripts\doctor.py
git diff --check
```

修改 Skill 后还要运行 `skill-creator` 的 `quick_validate.py`；修改 Markdown 后检查本地链接。

## 技术与目录边界

- Python 3.9–3.13；`lunar_python 1.4.8` 内置于 `bazi-skill-main/scripts/vendor/`。
- `bazi-skill-main/`：可分发 Skill。不得放 Benchmark 题目、答案、预测或真实用户会话。
- `evaluation/`：评测协议、工具和实验原件。已锁定/揭晓轮次不可覆盖，重跑必须新建版本。
- `.benchmark-cache/`：被忽略的外部题库克隆和含答案缓存；不是项目源代码。
- `docs/`：权威说明与方法报告；`assets/`、`design-demos/`：展示材料。
- `dist/`：可重建发布包；ZIP 不是源文件，也不代表当前代码版本。

## 工作约定

- 历法事实只由 `scripts/calculate_bazi.py` 计算，不手算日柱、起运或节气边界。
- 计算、解释、真实咨询状态和 Benchmark 必须隔离。
- 用户会话写入 `consultation_state/`；该目录不得提交。
- 继续咨询前先运行 Harness 的 `status`/`audit`/`resume`；输入变化先 `supersede`，回退阶段用 `reset`。
- 当前正式报告是 `consultation_state/final_report.md`：先生成 `report_source` 计划，再按 `references/markdown-report.md` 写入并登记血缘。HTML 尚未实现，不要扫描目录拼接旧产物。
- 不删除、移动或改写历史评测原件、分支、缓存仓库或发布包，除非用户在看过清理预览后明确确认。

## 当前权威入口

- 总览：`README.md`
- 工作区与仓库边界：`docs/WORKSPACE_GUIDE.md`
- Skill 使用：`bazi-skill-main/README.md`
- 评测流程：`evaluation/README.md`
- 咨询状态机：`bazi-skill-main/references/consultation-harness.md`

当前现役能力包括确定性排盘、四条开场盲测、一次反馈转场、倾听式主问题、状态化咨询、来源防火墙、输出路由和完整 Markdown 报告规范；HTML 等用户提供模板后再实现。

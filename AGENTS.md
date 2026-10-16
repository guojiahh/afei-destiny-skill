# Afei Destiny Skill Repository Guide

## 项目定位

这是 afei 的命运探索 Codex Skill 完整研发仓库，当前以四柱八字为分析核心。真正可安装的技能包是
`afei-destiny-skill/`；根目录不是安装包本身。

## 验证命令

从仓库根目录运行；macOS 先用 `source .venv/bin/activate` 激活本地环境。
统一入口 `python tools/check_workspace.py` 会执行下列检查及 Markdown 本地链接检查：

```text
python -m unittest discover -s afei-destiny-skill/scripts -p "test_*.py"
python -m unittest discover -s evaluation -p "test_*.py"
python afei-destiny-skill/scripts/doctor.py
git diff --check
```

修改 Skill 后还要运行 `skill-creator` 的 `quick_validate.py`：已安装该技能和
`requirements-dev.txt` 依赖时，使用 `python tools/check_workspace.py --skill`。
修改 Markdown 后检查本地链接。

## 技术与目录边界

- Python 3.9–3.13；`lunar_python 1.4.8` 内置于 `afei-destiny-skill/scripts/vendor/`。
- `afei-destiny-skill/`：可分发 Skill。不得放 Benchmark 题目、答案、预测或真实用户会话。
- `evaluation/`：评测协议、工具和实验原件。已锁定/揭晓轮次不可覆盖，重跑必须新建版本。
- `.benchmark-cache/`：被忽略的外部题库克隆和含答案缓存；不是项目源代码。
- `docs/`：权威说明与方法报告；`assets/`、`design-demos/`：展示材料。
- `dist/`：可重建发布包；ZIP 不是源文件，也不代表当前代码版本。

## 工作约定

- 历法事实只由 `scripts/calculate_bazi.py` 计算，不手算日柱、起运或节气边界。
- 计算、解释、真实咨询状态和 Benchmark 必须隔离。
- `consultation_state/` 是会话集合，每次咨询使用独立子目录；整体不得提交。
- 开始前先 `discover`；用户选定单一会话后，继续时运行 `status`/`audit`/`resume`；输入变化先 `supersede`，回退阶段用 `reset`。
- 默认最终交付是 `<session-dir>/final_report.html`。先按来源计划完成、校验并登记 `final_report.md` 与 `technical_analysis.md` 底稿，再按 `references/html-report.md` 编排个人模型、生成并登记 HTML；默认回复突出 HTML 一个入口。`report_ready` 不等于交付完成。匿名原型不能直接换名用于个人报告，不要跨会话拼接旧产物。
- 不删除、移动或改写历史评测原件、分支、缓存仓库或发布包，除非用户在看过清理预览后明确确认。

## 当前权威入口

- 总览：`README.md`
- 工作区与仓库边界：`docs/WORKSPACE_GUIDE.md`
- Skill 使用：`afei-destiny-skill/README.md`
- 评测流程：`evaluation/README.md`
- 咨询状态机：`afei-destiny-skill/references/consultation-harness.md`
- 此后当前原型与新对话交接：`docs/CIHOU_HANDOFF.md`；本地 HTML 默认交付已接通，私有在线交付尚未实现。

当前能力与目录说明见 `docs/WORKSPACE_GUIDE.md`；咨询与报告协议以 Skill 内对应参考文件为准。

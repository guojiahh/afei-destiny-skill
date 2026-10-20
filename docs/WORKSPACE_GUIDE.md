# 工作区地图

更新日期：2026-10-16

## 一句话说明

仓库根目录不是一个单独的 Skill 文件夹，而是一个完整的研发仓库：中间的 `afei-destiny-skill/` 才是交给 Codex 运行的技能包；`evaluation/` 是与答案和实验有关的隔离评测区；`docs/`、`assets/`、`design-demos/` 是说明与展示层。

旧文档中的 `E:\bazi-skill-main` 是 Windows 开发机路径，项目不依赖这一位置。
在 Mac 上从实际仓库根目录开始，按[开发初始化指南](../CONTRIBUTING.md)建立本机环境。

最重要的边界是：**含答案题库、预测记录和错题分析永远不能进入可安装 Skill。** 否则下一轮作答会被答案污染。

## Git 仓库边界

当前项目的源代码只有一个主仓库：

| 路径 | Git 身份 | 用途 | 是否项目源码 |
|---|---|---|---|
| 仓库根目录 `.` | `guojiahh/afei-destiny-skill` | 当前完整研发仓库 | 是 |
| `.benchmark-cache/BaziQA` | `ChenJiangxi/BaziQA` | 外部 Benchmark 数据缓存 | 否；被 Git 忽略 |
| `.benchmark-cache/MingLi-Bench` | `DestinyLinker/MingLi-Bench` | 外部 Benchmark 数据缓存 | 否；被 Git 忽略 |

因此 `afei-destiny-skill/`、`evaluation/`、`docs/`、`assets/`、`design-demos/` 和 `dist/` 都只是主仓库里的职责目录。不要把缓存仓库的提交、分支或许可证误当成本项目状态，也不要把它们打进 Skill。

## 顶层结构

```text
.
├─ AGENTS.md                    Agent 项目规则与验证入口
├─ README.md                    仓库总入口
├─ afei-destiny-skill/           可安装、可运行的 Afei Destiny Skill
├─ evaluation/                  评测工具、协议和实验原件
├─ docs/                        面向人的说明、方法报告和演示指南
├─ assets/                      项目主视觉、社交预览与能力说明图
├─ design-demos/                匿名产品原型、历史演示与展示图源稿
├─ dist/                        本地发布包；ZIP 被 Git 忽略
├─ CONTRIBUTING.md              修改、测试和安全约定
├─ requirements-dev.txt         开发验证依赖；不进入 Skill 运行包
├─ tools/check_workspace.py     一条命令执行工作区检查
├─ .github/workflows/           跨平台自动验证
├─ LICENSE                      仓库许可证
├─ .benchmark-cache/            本地含答案缓存；被 Git 忽略
├─ consultation_state/          真实咨询集合根目录；每次咨询一个子目录，整体被 Git 忽略
└─ .git/                        Git 历史
```

## 1. `afei-destiny-skill/`：真正运行的 Skill

这是最核心、也最需要保持干净的目录。安装时复制的是这一层，而不是整个仓库。

| 路径 | 作用 | 什么时候改 |
|---|---|---|
| `SKILL.md` | 技能入口、任务路由、执行顺序和硬约束 | 改整体工作流或路由时 |
| `references/calculation-conventions.md` | 历法和排盘口径 | 发现口径缺失或冲突时 |
| `references/reasoning-protocol.md` | 通用判断顺序、反证和置信度规则 | 出现跨题复发的推理错误时 |
| `references/temporal-reasoning.md` | 大运、流年和具体年份判断 | 年份事件比较反复出错时 |
| `references/domain-rules.md` | 事业、关系、六亲等领域规则 | 同领域错误跨多个案例复发时 |
| `references/consultation-harness.md` | 多会话发现、继续/新开、恢复、操作语义、血缘与信息防火墙 | 改咨询生命周期时 |
| `references/guided-consultation.md` | 七阶段体验和每轮承接 | 改用户参与流程时 |
| `references/opening-blind-reading.md` | 开场盲测门禁和反馈转场 | 改盲测体验时 |
| `references/preblind-analysis.md` | 盲测前完整盘面审计与偏好隔离 | 改盲测准确性和分析深度时 |
| `references/client-voice.md` | 温暖、具体、不迎合的表达层 | 改客户语言时 |
| `references/output-routing.md` | 对话、审计、总结和报告来源边界 | 改输出类型时 |
| `references/html-report.md` | 默认 HTML 交付、个人模型、生成登记、覆盖与更新规则 | 改个人页面与完成条件时 |
| `references/markdown-report.md` | 用户优先的固定章节、重点问题、人生全景、未来展望和来源要求 | 改最终交付时 |
| `references/technical-report.md` | 独立技术文档的规则链、反证和隐私要求 | 改技术交付时 |
| `references/worked-examples.md` | 不含比赛原题的通用示例 | 需要说明抽象规则如何落地时 |
| `scripts/calculate_bazi.py` | 确定性排盘和岁运计算 | 可复现计算错误时 |
| `scripts/compare_candidate_years.py` | 多个候选年同尺度比较 | 时间候选比较工具需要扩展时 |
| `scripts/blind_opening.py` | 盲测筛选、锁定和反馈结算 | 改开场盲测硬门禁时 |
| `scripts/consultation_harness.py` | 会话发现与创建、状态机、来源、血缘和失效 | 改阶段或恢复语义时 |
| `scripts/consultation_output_router.py` | 只选择活动产物的输出计划 | 改输出路由时 |
| `scripts/validate_final_report.py` | 检查用户报告章节顺序并阻止技术章节前置 | 改最终报告固定格式时 |
| `scripts/generate_html_report.py`、`scripts/render_quiet_report.py` | 校验个人模型、生成并登记正式 HTML | 改 HTML 数据契约、完整内容与呈现时 |
| `assets/cihou/` 内的 `mobius-model-template.json`、`user-report-template.md`、`technical-report-template.md` | 新报告固定模型与双底稿骨架 | 改所有报告共同结构时 |
| `assets/cihou/quiet/` | 当前 quiet 正式页面模板、样式、交互和图像 | 改统一莫比乌斯视觉与阅读方式时 |
| `scripts/doctor.py` | 环境与固定命例自检 | 改依赖或运行入口时 |
| `scripts/test_*.py` | Skill 全部回归测试 | 每个脚本修复必须同步补测试 |
| `scripts/vendor/` | 内置第三方依赖 | 只有升级依赖时 |
| `agents/openai.yaml` | Codex 展示元数据 | 改技能名称、描述或入口文案时 |

这里不应出现：题号、官方答案字母、具体参赛人物履历、上一轮预测、错题复盘、按答案分布写的技巧。

## 2. `evaluation/`：评测实验室

这里允许保存问题包、预测、锁定信息、分数和错因，但它不属于安装包。

```text
evaluation/
├─ README.md                         评测入口和命令索引
├─ competition_protocol.json         2010–2025 固定协议
├─ solver_prompt.md                  盲答代理输入/输出契约
├─ competition_iteration.py          prepare/audit/lock/reveal/compare
├─ import_competition_questions.py   抓取并标准化公开比赛题
├─ benchmark_tools.py                上一代及通用题包/评分工具
├─ test_competition_pipeline.py      防泄漏与状态机测试
├─ competition-iterations/           当前主线每轮实验原件
└─ archive/mingli-baziqa/            上一代评测的冻结归档
```

### 当前主线：`competition-iterations/`

每个正式轮次目录固定保留八类文件：

| 文件 | 含义 | 是否可在作答前读取 |
|---|---|---|
| `manifest.json` | 模型、Skill、题包、协议哈希和状态 | 可以 |
| `questions.json` | 白名单生成的无答案题包 | 可以 |
| `predictions.template.json` | 待填预测模板 | 可以 |
| `predictions.json` | 作答器输出 | 本轮作答器可以写 |
| `lock.json` | 锁定时间和预测哈希 | 锁定后生成 |
| `locked_predictions.json` | 不可覆盖的预测副本 | 锁定后生成 |
| `score.json` | 揭晓后的答案、命中和统计 | 作答前禁止 |
| `error_review.json` | 错因归类和修改证据 | 作答前禁止 |

轮次分组和版本含义见 [比赛轮次索引](../evaluation/competition-iterations/README.md)。

### 上一代归档：`archive/mingli-baziqa/`

这里保存早期 MingLi-Bench 与 BaziQA 的 manifest、重复运行、聚合结果和报告。它们仍可复查，但不再是当前优化主线，也不能作为新的盲测集。

## 3. `docs/`：说明层

这里回答“项目是什么、为什么这样做、结果怎么解释”，不放运行依赖。

- `WORKSPACE_GUIDE.md`：本文件，解释整个工作区。
- `EVALUATION_AND_ITERATION_METHOD.md`：详细评测和迭代制度。
- `SHOWCASE.md`：三分钟对外演示。
- [CIHOU_HANDOFF.md](CIHOU_HANDOFF.md)：此后当前基线、个性化边界与新对话交接。
- [CIHOU_PRODUCT_PLAN.md](CIHOU_PRODUCT_PLAN.md)、[CIHOU_REPORT_EXPERIENCE.md](CIHOU_REPORT_EXPERIENCE.md)：现役产品方案与历史体验研究；以交接和 HTML 协议为当前实现合同。
- 当前不保留公开的真实咨询案例；以后仅接收完整走过现行流程、通过隐私审查并取得授权的材料。匿名设计素材单独标注为虚构。

## 4. `assets/` 与 `design-demos/`：展示层

- `assets/showcase/`：README 主视觉、社交预览、能力闭环图和抽象背景。
- `assets/contact/`：联系图片。
- `design-demos/`：匿名产品原型、保留的历史设计，以及上述展示图的 HTML 源稿和渲染脚本；以[设计演示索引](../design-demos/README.md)区分用途。
- 当前完整匿名入口为 [V19 求职示例](../design-demos/cihou-wayfinder-v19/final_report.html)，合成双底稿、模型与构建脚本位于同目录；由正式生成器输出原站引擎与资源内嵌的单份 HTML。`design-demos/cihou-quiet.html`、V8、V15、[V16](../design-demos/cihou-wayfinder-v16/final_report.html)、[V17](../design-demos/cihou-wayfinder-v17/final_report.html)和 [V18](../design-demos/cihou-wayfinder-v18/final_report.html)保留为历史设计对照。正式开发从 [此后交接](CIHOU_HANDOFF.md)进入 Skill 内的生成器与 `assets/cihou/quiet/wayfinder/`。
- `design-demos/cihou-stage1.html` 及同名目录是四个人工匿名案例的历史设计对照，不再是当前开发入口。真实个人报告只保存在对应 `consultation_state/<session>/`。

它们不会影响 Skill 的推理准确率。做功能优化时无需加载这些文件。

## 5. `dist/`：发布产物

当前名称的安装包使用 `dist/afei-destiny-skill-YYYY-MM-DD.zip`。ZIP 被 Git 忽略，是构建产物，不是源文件；源文件发生变化后，旧 ZIP 不会自动更新，发布前应重新打包并验证。旧名称的 `dist/bazi-skill-final.zip` 如仍在本机，属于历史发布产物，应保留，不代表当前版本。

## 6. `.benchmark-cache/`：本地答案库

这个目录被 `.gitignore` 排除，包含标准化题目、官方答案和网页缓存。它只能被控制器在导入、揭晓和评分阶段读取。盲答器禁止读取。

当前主要缓存分三类：

```text
.benchmark-cache/
├─ BaziQA/                         外部 Git 克隆
├─ MingLi-Bench/                   外部 Git 克隆
└─ global-fortune-competition/
   ├─ contest_2010.json
   ├─ ...
   └─ contest_2025.json
```

本地缓存不进入 Git，因此换电脑后必须重新导入或安全迁移；不能只靠仓库恢复答案库。

## 什么任务从哪里开始

| 任务 | 第一个入口 | 必做验证 |
|---|---|---|
| 排盘算错 | `scripts/calculate_bazi.py` | 添加 fixture/边界测试，运行计算器测试 |
| 某类题反复推错 | 对应 `references/*.md` | 先完成跨题错因聚合，再做配对回归 |
| 做新一届比赛题 | `evaluation/README.md` | 先冻结协议和 Skill，再生成无答案题包 |
| 检查当前成绩 | `competition-iterations/iteration_report.md` | 同时看区间、wins/losses 和数据状态 |
| 对外介绍 | 根 `README.md`、`docs/SHOWCASE.md` | 不把选择题分数写成现实预测能力 |
| 发布 Skill | `afei-destiny-skill/`、`dist/` | 验证技能结构、测试、重新打 ZIP |
| 开始或继续真实咨询 | `consultation_harness.py` | 先对根目录 `discover`；用户选择后对单一子目录 `start` 或 `status`、`audit`、`resume` |
| 下一次完整模拟咨询 | [此后交接](CIHOU_HANDOFF.md)和现有 Skill 协议 | 新开独立会话，逐轮由用户提供反馈；完成双底稿、个人模型与 HTML，校验登记后才完成默认交付 |
| 修改正式 HTML 交付 | [HTML 协议](../afei-destiny-skill/references/html-report.md)、`scripts/generate_html_report.py`、`assets/cihou/`（均在 Skill 内） | 运行来源、覆盖、失效与安全回归；核对完整内容和桌面／窄屏交互 |
| 修改此后匿名视觉样机 | [V19 构建脚本](../design-demos/cihou-wayfinder-v19/build_demo.py)、[此后交接](CIHOU_HANDOFF.md) | 重建并 `--check` 单文件 HTML，核对桌面／窄屏、行走、换景、选择、暂停与减少动态；不覆盖历史原型 |
| 生成最终报告 | `consultation_output_router.py`、`references/markdown-report.md`、`references/technical-report.md` | 分别形成来源计划，先写重点问题和人生全景，再写技术报告；用户报告须通过 `validate_final_report.py`，继续按 [HTML 协议](../afei-destiny-skill/references/html-report.md) 编排模型，生成并登记主交付 HTML |

## 文件治理规则

1. **Skill 与评测隔离。** 答案和错题不得复制进 `afei-destiny-skill/`。
2. **已锁轮次不改。** 需要重跑就新建更高版本目录，不覆盖旧目录。
3. **生成物与源文件分开。** ZIP 放 `dist/`，缓存放 `.benchmark-cache/`。
4. **报告指向原始证据。** 总结数字必须能追到 `score.json` 或 comparison JSON。
5. **不靠移动制造整洁。** 已公开或带哈希的当前实验路径优先保持稳定；使用索引分组。
6. **每次正式改动最后进 Git。** 提交中同时包含规则、测试、实验结果和报告，避免只有结论没有证据。

## 当前状态

- Git 主分支：`main`；当前工作分支以 `git branch --show-current` 为准。
- 当前 Skill：确定性排盘、民用时与主口径盘对照、多会话独立目录、继续/新开决策、入口关注方向、盲测前完整审计、四到五条开场盲测、一次反馈转场、倾听式主问题、来源防火墙、输出路由，以及带具体场景和心结收束的读者优先双 Markdown 报告规范已实现；默认个人 HTML 生成、校验、登记与下游失效已接通，双 Markdown 保留为底稿。
- 当前此后：第一阶段已于 2026-10-16 完成并获用户确认；quiet 视觉已用于正式个人 HTML，所有新完整报告统一莫比乌斯隐喻、三态、九章正文与双底稿结构。2026-10-20 的 V19 继续复用 Wayfinder 原站运行时与美术、音频及视频，按住沿固定路线行走，首景重复六节点循环，三态为此刻／来处／可能；每份新模板按[闭环叙事协议](../afei-destiny-skill/references/loop-narrative.md)必填 `loop_story`，采用自然的第二人称与可能的形成路径，方法说明集中于依据，场景短句平滑浮现；原资源与九章全文内嵌为单份 HTML。V19 沿用 V18 文案，仅集中处理首次加载浮字定位。原 V8、V15、V16、V17、V18 与历史交付保留。原作权属、实际验收与私有在线交付的后续范围以[交接说明](CIHOU_HANDOFF.md)为准。
- 当前本地门禁：Skill 与评测两组回归测试（数量以当前检查输出为准）、`doctor.py`、最终报告结构与心结收束校验、Skill 结构校验和 Markdown 链接检查。
- 当前 2010–2025 语料：16 届、107 个案例、515 题。
- 所有 515 题均已揭晓，现阶段只能作为训练/回归池。
- 下一次可宣称泛化提升，必须使用新发布且从未揭晓的比赛题或独立外部保留集。

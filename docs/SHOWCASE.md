# 三分钟演示指南

这份文档用于向第一次接触项目的人快速说明：它解决什么问题、为什么可信度边界更清楚、现场应该展示哪些内容。

## 一句话介绍

> Afei Destiny Skill（阿飞命运探索）是 afei 的实验性命理探索技能，当前以四柱八字为核心：Python 负责可测试的四柱与岁运事实，Codex 按问题加载传统规则，用证据、反证和置信度组织回答，帮助用户观察自己并思考现实选择。

## 推荐演示流程

### 1. 先展示输入（约 20 秒）

```text
请用 $afei-destiny-skill 分析：公历 1990-05-15 14:30，女性。
我只问 2026–2027 年是否适合换工作。
请先说明排盘口径，再给最强证据、最强反证和现实建议。
```

说明重点：用户问的是聚焦问题，技能不会用一份大而全的模板淹没它。

### 2. 展示确定性计算（约 40 秒）

```powershell
python .\afei-destiny-skill\scripts\calculate_bazi.py `
  --date 1990-05-15 --time 14:30 --gender female `
  --target-year 2026 --compact
```

可指出三个字段：

- `conventions`：采用什么换年、换月和换日口径。
- `four_pillars`：四柱及其十神、藏干等事实。
- `target_year`：目标流年、当步大运和与原局的关系。

示例四柱为 `庚午 辛巳 庚辰 癸未`。现场不必逐行讲完整 JSON。

### 3. 展示回答结构（约 60 秒）

让观众关注回答有没有明确分开：

1. 排盘事实：计算器直接得到、可以复核的内容。
2. 结构判断：使用了哪些传统规则，证据强弱如何。
3. 岁运触发：为什么关注某个时间窗口，而不是只报一个年份。
4. 反证与变量：什么信息可能让判断改变。
5. 现实建议：不以命理替代现金流、合同、健康等现实信息。

### 4. 展示工程验证（约 40 秒）

```powershell
python -m unittest discover -s .\afei-destiny-skill\scripts -p "test_*.py"
python -m unittest discover -s .\evaluation -p "test_*.py"
python .\afei-destiny-skill\scripts\doctor.py
```

说明：两组测试分别覆盖 Skill 的计算、盲测、会话、报告门禁，以及评测实验室的脱敏、锁定和污染检查；环境自检确认当前机器能运行这些能力。它们都不是证明八字具有科学预测力。当前选择题方法与限制见[评测与迭代方法报告](EVALUATION_AND_ITERATION_METHOD.md)，上一代实验见[归档报告](../evaluation/archive/mingli-baziqa/final_report.md)。

## 可切换的演示问题

### 时辰不确定

```text
请用 $afei-destiny-skill 分析我的职业方向。出生时间只知道是下午，先比较可能时辰的共同结论，
不要假装存在唯一命盘。
```

展示点：缺少信息时主动降低结论粒度。

### 真太阳时边界

```text
请用 $afei-destiny-skill 比较民用时和真太阳时两种排盘口径；如果时柱发生变化，
分别说明哪些结论稳定、哪些结论需要保留。
```

展示点：边界问题不是悄悄选一个口径，而是显式比较。

### 传统命理选择题

```text
请用 $afei-destiny-skill 解这道题。先核对题干事实并检查最强反例，最后只按题目要求输出选项。
```

展示点：内部推理可以完整，提交格式保持严格。

## 可视化报告设计演示

当前匿名入口为 [V19 求职完整演示](../design-demos/cihou-wayfinder-v19/final_report.html)：原站 Wayfinder 引擎、角色、风景与视听资源承载闭环路线，按住沿固定路线前进、松开停下，首景六句随同一个循环重复并平滑浮现；叙述直接面向读者，来处用自然的“你可能曾经……”连接可能的学习路径。顶部主动切换此刻、来处与可能，比较三项有条件的走法；正文入口打开同页九章和完整依据。

示例采用显式合成的八节用户底稿、十一节技术边界与来源绑定模型，没有出生输入或真实咨询者。完整个人交付沿 [HTML 生成流程](../afei-destiny-skill/references/html-report.md)重新生成，模板一致不等于人生解释一致。

第一阶段于 2026-10-16 获用户确认；V19 是 2026-10-20 的加载期文字定位更新，沿用 V18 叙事，没有新的独立审美评分。全部原资源、正文和下载内嵌为单份 HTML；原作署名与权属见[来源说明](../afei-destiny-skill/assets/cihou/quiet/wayfinder/PROVENANCE.md)。V8、V15、[V16](../design-demos/cihou-wayfinder-v16/final_report.html)、[V17](../design-demos/cihou-wayfinder-v17/final_report.html)、[V18](../design-demos/cihou-wayfinder-v18/final_report.html)、早期 quiet 和 stage1 保留在[历史对照索引](../design-demos/README.md)，真实报告不进入公开示例。

正式开发和实际 QA 记录从[新对话交接](CIHOU_HANDOFF.md)进入。手机尺寸浏览器检查不等于实体手机交付；本机预览服务停止后地址会失效，实际 HTML 文件是本地交付入口。私有在线托管尚未实现。

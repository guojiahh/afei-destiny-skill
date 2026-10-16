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

当前唯一入口是[「此后」第一阶段「回环与积累」原型](../design-demos/cihou-stage1.html)。一张主图承担重点：循环型首次约 16 秒自动讲解，呈现任务流动、积累与行动转向；可直接点图内不同位置接管，图下同一处短解释同步变化，并可暂停继续。向下自然阅读完整图文、反例、覆盖范围与模拟回访，记录与独立分享位于末尾。

循环、接桥、汇流三个案例各有 6 个图内热点，信息不足案例有 4 个；后三类保留上一版图形。主图点选不改写事实或现实行动记录。当前视觉以暖白纸面、墨色中文、蓝色立体回环与铜橙拨片为主，不依赖外部资源，可离线打开。

四例全部是人工编排的匿名虚构素材，未接入正式咨询生成或云端。它们展示不同关系可以有不同形状，尚不能证明同一种图已适配多个人；不能只换姓名或 `cases.js` 后直接交付。正式咨询现已通过独立的 [HTML 生成协议](../afei-destiny-skill/references/html-report.md) 默认交付个人页面；这四个历史样机本身不作为生成器。

源码与实际验收范围见[原型说明](../design-demos/cihou-stage1/README.md)，产品方向见[产品方案](CIHOU_PRODUCT_PLAN.md)与[完整报告体验](CIHOU_REPORT_EXPERIENCE.md)，接续工作见[新对话交接](CIHOU_HANDOFF.md)。此前海图和此后概念均保留在[设计演示索引](../design-demos/README.md)，不与当前入口混用。

本地预览地址只供当前电脑使用，服务停止后会失效；响应式视口检查不等于已经完成真实手机交付。年度作品与动效取舍见[研究记录](../design-demos/cihou-stage1/ANNUAL_AWARDS_RESEARCH.md)，研究材料不全部等于实际原站操作。

## 对外介绍时不要过度承诺

- 可以说“排盘计算可测试、过程可追溯”。
- 可以说“回答会标记口径、证据和不确定性”。
- 不要说“评测高分证明命理有效”。
- 不要把 BaziQA 的 `92.98%` 当作技能净增益；该实验中专家审查层的净增益为 `0`。
- 不要用单个合成示例暗示系统已经预测了真实经历。

## GitHub 社交预览图

仓库已经准备好 [`assets/showcase/social-preview.png`](../assets/showcase/social-preview.png)，尺寸为 `1280 × 640`。它只介绍整个 Skill，不包含个人案例或微信二维码。

上传步骤：

1. 打开 GitHub 仓库主页，进入 **Settings**。
2. 在 **General** 页面找到 **Social preview**。
3. 点击 **Edit** / **Upload an image**，选择 `assets/showcase/social-preview.png`。
4. 保存后回到仓库主页，等待 GitHub 更新分享卡片缓存。

预览图中的项目地址为 `github.com/guojiahh/afei-destiny-skill`。

## 演示前检查

- [ ] 新环境中能识别 `$afei-destiny-skill`。
- [ ] `SKILL.md` 位于安装目录第一层。
- [ ] Python 能运行，58 项 Skill 测试和 6 项评测测试通过；`doctor.py` 全绿。
- [ ] 演示出生信息是虚构信息或已获本人同意。
- [ ] 不在屏幕上展示评测答案缓存或个人敏感信息。
